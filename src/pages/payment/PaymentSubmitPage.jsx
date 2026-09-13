import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { paymentService } from '../../api/paymentService';
import { gRadarCreditService } from '../../api/gRadarCreditService';
import { configService } from '../../api/configService';
import MainLayout from '../../components/layout/MainLayout';
import AddonPaymentCard from '../../components/payment/AddonPaymentCard';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getBalanceTransactionType } from '../../utils/constants';
import { t, getCurrentLocale } from '../../locales';

const STATUS_BADGE = {
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700',
  CONFIRMED:      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-700',
  REJECTED:       'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700',
};
// Etiketler render anında t() ile okunur
const STATUS_LABEL_KEY = {
  PENDING_REVIEW: 'payment.pending',
  CONFIRMED:      'payment.confirmed',
  REJECTED:       'payment.rejected',
};
const STATUS_ICON = {
  PENDING_REVIEW: 'schedule',
  CONFIRMED:      'check_circle',
  REJECTED:       'cancel',
};

// Etiket `paymentPage.levels.<seviye>` altında
const RESTRICTION_CONFIG = {
  NONE:         { icon: 'check_circle', bg: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-800',   text: 'text-green-700 dark:text-green-400' },
  WARNING:      { icon: 'warning',      bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-400' },
  WRITE_BLOCKED:{ icon: 'lock',         bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400' },
  FULL_READONLY:{ icon: 'block',        bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800',       text: 'text-red-700 dark:text-red-400' },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString(getCurrentLocale()) : '-';
const fmtAmount = (v) => Number(v).toLocaleString(getCurrentLocale(), { minimumFractionDigits: 2 });
// "2026-09-12" gibi saatsiz tarih: new Date() onu UTC gece yarısı sayar, UTC'nin batısında bir gün önceyi gösterirdi
const fmtLocalDate = (value) => {
  const [year, month, day] = String(value).split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day).toLocaleDateString(getCurrentLocale()) : fmt(value);
};
const fmtMoney = (v) => v != null ? `₺${fmtAmount(v)}` : '-';

export default function PaymentSubmitPage() {
  const { user } = useAuth();
  const location = useLocation();
  const canSubmit = user?.globalRole === 'BROKER_ADMIN' || user?.isPaymentResponsible;

  const [tab, setTab] = useState('form');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [payments, setPayments] = useState([]);
  const [addons, setAddons] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [copiedIban, setCopiedIban] = useState(null);

  // History filters
  const [historyFilter, setHistoryFilter] = useState('ALL');

  // Form
  const [submitting, setSubmitting] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [balanceHistory, setBalanceHistory] = useState([]);
  const transferFormRef = useRef(null);
  const addonsSectionRef = useRef(null);
  const receiptInputRef = useRef(null);
  const [reuploadTargetId, setReuploadTargetId] = useState(null);

  const load = useCallback(async () => {
    setDataLoading(true);
    try {
      const [methods, history, status, addonList, balanceTxs] = await Promise.all([
        paymentService.getActivePaymentMethods(),
        paymentService.getMyCompanyPayments(),
        paymentService.getRestrictionStatus(),
        canSubmit ? paymentService.getMyCompanyAddons() : Promise.resolve([]),
        paymentService.getMyCompanyBalanceHistory().catch(() => []),
      ]);
      setPaymentMethods(methods);
      setPayments(history);
      setSubscriptionStatus(status);
      setAddons(addonList.filter(a => !a.isPaid && a.isActive) || []);
      setBalanceHistory(balanceTxs);
    } catch {
      showError(t('paymentPage.loadError'));
    } finally {
      setDataLoading(false);
    }
  }, [canSubmit]);

  useEffect(() => { load(); }, [load]);

  // Bildirimden yönlendirilince addon bölümüne scroll yap
  useEffect(() => {
    if (location.state?.scrollTo === 'addons' && !dataLoading) {
      setTimeout(() => {
        addonsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [location.state, dataLoading]);

  // Hesabım > G-Radar Kredim "Satın Al" butonu /payment/submit?tab=g-radar'ya
  // yönlendirir; bu effect bu tabı otomatik açar.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedTab = params.get('tab');
    if (requestedTab === 'g-radar') setTab('g-radar');
  }, [location.search]);

  // Seçilebilir ödeme dönemlerini hesapla (vadesi geçmiş + yaklaşan)
  const availablePeriods = (() => {
    const npd = subscriptionStatus?.nextPaymentDue;
    const cycle = subscriptionStatus?.billingCycle;
    if (!npd) return [];

    const periods = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const toStr = (d) => d.toISOString().split('T')[0];
    const advance = (d) => {
      const n = new Date(d);
      cycle === 'YEARLY' ? n.setFullYear(n.getFullYear() + 1) : n.setMonth(n.getMonth() + 1);
      return n;
    };
    const periodLabel = (d) => cycle === 'YEARLY'
      ? t('paymentPage.form.yearlyPeriod', { year: d.getFullYear() })
      : d.toLocaleDateString(getCurrentLocale(), { month: 'long', year: 'numeric' });

    let cur = new Date(npd + 'T00:00:00');
    // Vadesi geçmiş dönemler
    while (cur <= today) {
      const start = new Date(cur);
      const next = advance(cur);
      const end = new Date(next); end.setDate(end.getDate() - 1);
      const label = periodLabel(start);
      periods.push({ startDate: toStr(start), endDate: toStr(end), label, isOverdue: true });
      cur = next;
    }
    // Yaklaşan dönem
    const start = new Date(cur);
    const next = advance(cur);
    const end = new Date(next); end.setDate(end.getDate() - 1);
    const label = t('paymentPage.form.upcomingPeriod', { period: periodLabel(start) });
    periods.push({ startDate: toStr(start), endDate: toStr(end), label, isOverdue: false });
    return periods;
  })();

  const togglePeriod = (period) => {
    setSelectedPeriods(prev => {
      const exists = prev.some(p => p.startDate === period.startDate);
      return exists ? prev.filter(p => p.startDate !== period.startDate) : [...prev, period];
    });
  };

  const handleCopyIban = (iban) => {
    navigator.clipboard.writeText(iban).then(() => {
      setCopiedIban(iban);
      setTimeout(() => setCopiedIban(null), 2000);
    });
  };

  const handleReceiptView = async (id) => {
    const result = await paymentService.viewReceipt(id);
    if (!result.success) {
      showError(result.error || t('api.payment.receiptViewError'));
    }
  };

  const handleReceiptDownload = async (id) => {
    const result = await paymentService.downloadReceipt(id);
    if (!result.success) {
      showError(result.error || t('api.payment.receiptDownloadError'));
    }
  };

  const triggerReupload = (id) => {
    setReuploadTargetId(id);
    receiptInputRef.current?.click();
  };

  const handleReuploadFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !reuploadTargetId) return;
    const sizeCheck = configService.validateFileSize(file);
    if (!sizeCheck.valid) {
      showError(sizeCheck.error);
      setReuploadTargetId(null);
      return;
    }
    const result = await paymentService.replaceReceipt(reuploadTargetId, file);
    if (result.success) {
      showSuccess(t('paymentPage.history.receiptReuploaded'));
      load();
    } else {
      showError(result.error || t('api.payment.receiptUploadError'));
    }
    setReuploadTargetId(null);
  };

  // Dekont seçimi: backend sınırını aşan dosya gönderilmeden reddedilir
  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const sizeCheck = configService.validateFileSize(file);
      if (!sizeCheck.valid) {
        showError(sizeCheck.error);
        e.target.value = '';
        setReceipt(null);
        return;
      }
    }
    setReceipt(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMethodId || !amount) {
      showError(t('paymentPage.form.requiredFields'));
      return;
    }
    // Seçili dönemlerden start/end türet
    const sorted = [...selectedPeriods].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const billingPeriodStart = sorted.length > 0 ? sorted[0].startDate : undefined;
    const billingPeriodEnd   = sorted.length > 0 ? sorted[sorted.length - 1].endDate : undefined;

    setSubmitting(true);
    try {
      await paymentService.submitPayment({ paymentMethodId: selectedMethodId, amount, referenceNumber, billingPeriodStart, billingPeriodEnd, notes, receipt });
      showSuccess(t('paymentPage.form.submitted'));
      setAmount(''); setReferenceNumber(''); setSelectedPeriods([]);
      setNotes(''); setReceipt(null); setSelectedMethodId('');
      load();
      setTab('history');
    } catch {
      showError(t('paymentPage.form.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleScrollToTransfer = useCallback(() => {
    setTab('form');
    setTimeout(() => {
      transferFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const handleMarkAddonPaid = async (addonId, useBalance) => {
    const result = await paymentService.markAddonAsPaid(addonId, { useBalance });
    if (result?.status === 'PAID_WITH_BALANCE') {
      showSuccess(t('paymentPage.addonPaidWithBalance'));
      load();
    }
    return result;
  };

  const filteredPayments = historyFilter === 'ALL'
    ? payments
    : payments.filter(p => p.status === historyFilter);

  const pendingCount = payments.filter(p => p.status === 'PENDING_REVIEW').length;

  // ── Abonelik Durum Kartı ──────────────────────────────────────────
  const renderStatusCard = () => {
    if (!subscriptionStatus) return null;
    const cfg = RESTRICTION_CONFIG[subscriptionStatus.level] ?? RESTRICTION_CONFIG.NONE;
    const due = subscriptionStatus.nextPaymentDue ? new Date(subscriptionStatus.nextPaymentDue) : null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysLeft = due ? Math.round((due - today) / 86400000) : null;
    const levelKey = RESTRICTION_CONFIG[subscriptionStatus.level] ? subscriptionStatus.level : 'NONE';
    const isYearly = subscriptionStatus.billingCycle === 'YEARLY';

    return (
      <div className={`rounded-2xl border p-5 transition-colors ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined text-3xl ${cfg.text}`}>{cfg.icon}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-text-main">
                  {t('paymentPage.planName', { name: subscriptionStatus.planName ?? t('paymentPage.defaultPlanName') })}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  {t(`paymentPage.levels.${levelKey}`)}
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-0.5">
                {isYearly ? t('paymentPage.billedYearly') : t('paymentPage.billedMonthly')}
                {subscriptionStatus.planPrice && (
                  <> · <span className="font-medium text-text-main">{t(isYearly ? 'paymentPage.pricePerYear' : 'paymentPage.pricePerMonth', { price: fmtMoney(subscriptionStatus.planPrice) })}</span></>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-6 flex-wrap">
            <div className="text-right">
              <p className="text-xs text-text-secondary">{t('paymentPage.nextPayment')}</p>
              <p className={`text-sm font-semibold ${subscriptionStatus.daysOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-text-main'}`}>
                {due ? due.toLocaleDateString(getCurrentLocale()) : '—'}
              </p>
              {daysLeft !== null && (
                <p className={`text-xs font-medium ${
                  subscriptionStatus.daysOverdue > 0 ? 'text-red-600 dark:text-red-400'
                  : daysLeft <= 7 ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-green-600 dark:text-green-400'
                }`}>
                  {subscriptionStatus.daysOverdue > 0
                    ? t('paymentPage.daysOverdue', { count: subscriptionStatus.daysOverdue })
                    : daysLeft === 0 ? t('paymentPage.dueToday')
                    : t('paymentPage.daysLeft', { count: daysLeft })}
                </p>
              )}
            </div>

            <div className="text-right">
                <p className="text-xs text-text-secondary">{t('paymentPage.currentBalance')}</p>
                <p className={`text-sm font-semibold ${Number(subscriptionStatus.balance ?? 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-text-secondary'}`}>
                  {fmtMoney(subscriptionStatus.balance ?? 0)}
                </p>
                <p className="text-xs text-text-secondary">{t('paymentPage.periodCredit')}</p>
              </div>

            {subscriptionStatus.subscriptionEndDate && (
              <div className="text-right">
                <p className="text-xs text-text-secondary">{t('paymentPage.subscriptionEnd')}</p>
                <p className="text-sm font-semibold text-text-main">
                  {new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString(getCurrentLocale())}
                </p>
              </div>
            )}
          </div>
        </div>

        {subscriptionStatus.level === 'WARNING' && (
          <p className="mt-3 text-sm text-yellow-700 dark:text-yellow-300">
            {t('paymentPage.levelHints.WARNING')}
          </p>
        )}
        {subscriptionStatus.level === 'WRITE_BLOCKED' && (
          <p className="mt-3 text-sm text-orange-700 dark:text-orange-300">
            {t('paymentPage.levelHints.WRITE_BLOCKED')}
          </p>
        )}
        {subscriptionStatus.level === 'FULL_READONLY' && (
          <p className="mt-3 text-sm text-red-700 dark:text-red-300">
            {t('paymentPage.levelHints.FULL_READONLY')}
          </p>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      {/* Kayıp dekont yeniden yükleme için gizli dosya girişi */}
      <input
        ref={receiptInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleReuploadFileChange}
      />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary">account_balance</span>
            {t('paymentPage.title')}
          </h1>
          <p className="text-text-secondary mt-1">{t('paymentPage.subtitle')}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">

            {/* Abonelik Durum Kartı — her zaman görünür */}
            {dataLoading ? (
              <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-100 dark:border-gray-700 p-8 flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                <span className="text-text-secondary">{t('common.loading')}</span>
              </div>
            ) : renderStatusCard()}

            {/* Tab Navigasyon */}
            <div className="bg-white dark:bg-background-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
              <div className="flex border-b border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setTab('form')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${
                    tab === 'form'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-text-secondary hover:text-text-main hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">payment</span>
                  {t('payment.title')}
                </button>
                <button
                  onClick={() => setTab('history')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${
                    tab === 'history'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-text-secondary hover:text-text-main hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">history</span>
                  {t('payment.history')}
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setTab('balance')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${
                    tab === 'balance'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-text-secondary hover:text-text-main hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                  {t('paymentPage.balanceTab')}
                </button>
                {user?.globalRole === 'BROKER_ADMIN' && (
                  <button
                    onClick={() => setTab('g-radar')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${
                      tab === 'g-radar'
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-text-secondary hover:text-text-main hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">travel_explore</span>
                    {t('balanceTransaction.gRadarCreditPurchase.label')}
                  </button>
                )}
              </div>

              {/* ── TAB: Ödeme Yap ────────────────────────────── */}
              {tab === 'form' && (
                <div className="p-6 space-y-6">
                  {/* Banka Bilgileri */}
                  {paymentMethods.length > 0 && (
                    <div>
                      <h2 className="text-base font-semibold text-text-main mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">account_balance</span>
                        {t('payment.bankInfo')}
                      </h2>
                      <div className="grid gap-3">
                        {paymentMethods.map(method => (
                          <div key={method.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 transition-colors">
                            <p className="font-semibold text-text-main">{method.displayName}</p>
                            {method.bankName && <p className="text-text-secondary text-sm mt-1">{t('paymentPage.bank')}: {method.bankName}</p>}
                            {method.accountHolder && <p className="text-text-secondary text-sm">{t('payment.accountHolder')}: {method.accountHolder}</p>}
                            {method.iban && (
                              <div className="flex items-center gap-2 mt-2">
                                <code className="text-sm font-mono text-text-main bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 tracking-wider">
                                  {method.iban}
                                </code>
                                <button
                                  onClick={() => handleCopyIban(method.iban)}
                                  className="flex items-center gap-1 text-sm text-primary hover:opacity-70 transition-opacity"
                                  title={t('payment.copyIban')}
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    {copiedIban === method.iban ? 'check' : 'content_copy'}
                                  </span>
                                  {copiedIban === method.iban ? t('payment.copied') : t('paymentPage.copy')}
                                </button>
                              </div>
                            )}
                            {method.description && <p className="text-text-secondary text-xs mt-2">{method.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {paymentMethods.length === 0 && !dataLoading && (
                    <div className="text-center py-4 text-text-secondary text-sm">
                      {t('paymentPage.noBankAccounts')}
                    </div>
                  )}

                  {/* Ek Ödemeler */}
                  {addons.length > 0 && (
                    <div ref={addonsSectionRef}>
                      <h2 className="text-base font-semibold text-text-main mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">receipt</span>
                        {t('paymentPage.addons')}
                      </h2>
                      <div className="grid gap-3">
                        {addons.map(addon => (
                          <AddonPaymentCard
                            key={addon.id}
                            addon={addon}
                            balance={subscriptionStatus?.balance ?? 0}
                            onPay={handleMarkAddonPaid}
                            onScrollToTransfer={handleScrollToTransfer}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ödeme Formu */}
                  {canSubmit ? (
                    <div ref={transferFormRef}>
                      <h2 className="text-base font-semibold text-text-main mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">send</span>
                        {t('payment.submit')}
                      </h2>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-main">{t('payment.paymentMethod')} *</span>
                            <select
                              value={selectedMethodId}
                              onChange={e => setSelectedMethodId(e.target.value)}
                              required
                              className="form-select rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                            >
                              <option value="">{t('paymentPage.form.selectPlaceholder')}</option>
                              {paymentMethods.map(m => (
                                <option key={m.id} value={m.id}>{m.displayName}</option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-main">{t('payment.amount')} (₺) *</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={amount} onChange={e => setAmount(e.target.value)}
                              required
                              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                              placeholder="0.00"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-main">{t('payment.referenceNumber')}</span>
                            <input
                              type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)}
                              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                              placeholder={t('paymentPage.form.referencePlaceholder')}
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-main">{t('payment.receipt')} <span className="text-text-secondary font-normal">{t('paymentPage.form.receiptHint')}</span></span>
                            <input
                              type="file" accept=".pdf,.png,.jpg,.jpeg"
                              onChange={handleReceiptChange}
                              className="text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:opacity-80 transition-colors"
                            />
                          </label>
                        </div>

                        {/* Dönem Seçici */}
                        {availablePeriods.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-text-main">
                              {t('paymentPage.form.periods')}
                              <span className="ml-1 text-text-secondary font-normal">{t('paymentPage.form.periodsOptional')}</span>
                            </span>
                            <div className="flex flex-col gap-1.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700">
                              {availablePeriods.map(period => {
                                const checked = selectedPeriods.some(p => p.startDate === period.startDate);
                                return (
                                  <label key={period.startDate} className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePeriod(period)}
                                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                                    />
                                    <span className={`text-sm ${period.isOverdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-text-secondary'}`}>
                                      {period.label}
                                      {period.isOverdue && (
                                        <span className="ml-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">{t('paymentPage.overdue')}</span>
                                      )}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                            {selectedPeriods.length > 0 && (
                              <p className="text-xs text-text-secondary">
                                {t('paymentPage.form.selected')} <span className="font-medium text-primary">{t('paymentPage.form.periodCount', { count: selectedPeriods.length })}</span>
                                {' '}({[...selectedPeriods].sort((a,b) => a.startDate.localeCompare(b.startDate))[0].startDate} — {[...selectedPeriods].sort((a,b) => b.endDate.localeCompare(a.endDate))[0].endDate})
                              </p>
                            )}
                          </div>
                        )}
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-text-main">{t('payment.notes')}</span>
                          <textarea
                            value={notes} onChange={e => setNotes(e.target.value)}
                            rows={3}
                            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none"
                            placeholder={t('paymentPage.form.notesPlaceholder')}
                          />
                        </label>
                        <div className="flex justify-end">
                          <button
                            type="submit" disabled={submitting}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined">send</span>
                            {submitting ? t('paymentPage.form.sending') : t('payment.submit')}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 text-center text-text-secondary text-sm">
                      <span className="material-symbols-outlined text-3xl text-gray-400 mb-2 block">lock</span>
                      {t('paymentPage.form.noPermission')}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: Ödeme Geçmişi ────────────────────────── */}
              {tab === 'history' && (
                <div className="p-6">
                  {/* Filtre + Özet */}
                  <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {['ALL', 'PENDING_REVIEW', 'CONFIRMED', 'REJECTED'].map(s => {
                        const count = s === 'ALL' ? payments.length : payments.filter(p => p.status === s).length;
                        const active = historyFilter === s;
                        const colors = {
                          ALL:            active ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                          PENDING_REVIEW: active ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                          CONFIRMED:      active ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                          REJECTED:       active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        };
                        const label = s === 'ALL' ? t('management.all') : t(`paymentPage.history.filters.${s}`);
                        return (
                          <button
                            key={s}
                            onClick={() => setHistoryFilter(s)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${colors[s]}`}
                          >
                            {label}
                            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-black/10 dark:bg-white/20 text-xs font-bold">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={load}
                      className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-main transition-colors"
                      title={t('paymentPage.history.refresh')}
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      {t('paymentPage.history.refresh')}
                    </button>
                  </div>

                  {dataLoading ? (
                    <div className="flex items-center justify-center gap-3 py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      <span className="text-text-secondary">{t('common.loading')}</span>
                    </div>
                  ) : filteredPayments.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3 block">receipt_long</span>
                      <p className="text-text-secondary text-sm">
                        {historyFilter === 'ALL' ? t('paymentPage.history.empty') : t('paymentPage.history.emptyFiltered')}
                      </p>
                      {historyFilter === 'ALL' && canSubmit && (
                        <button
                          onClick={() => setTab('form')}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-base">add</span>
                          {t('payment.submit')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPayments.map(p => {
                        const badge = STATUS_BADGE[p.status] ?? '';
                        const label = STATUS_LABEL_KEY[p.status] ? t(STATUS_LABEL_KEY[p.status]) : p.status;
                        const icon  = STATUS_ICON[p.status] ?? 'info';
                        return (
                          <div
                            key={p.id}
                            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/70"
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              {/* Sol: Durum + Tutar + Dönem */}
                              <div className="flex items-start gap-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge} flex-shrink-0 mt-0.5`}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{icon}</span>
                                  {label}
                                </span>
                                <div>
                                  <p className="text-base font-semibold text-text-main">{fmtMoney(p.amount)}</p>
                                  <p className="text-xs text-text-secondary mt-0.5">
                                    {t('paymentPage.history.period', { start: fmt(p.billingPeriodStart), end: fmt(p.billingPeriodEnd) })}
                                  </p>
                                  {p.referenceNumber && (
                                    <p className="text-xs text-text-secondary">{t('paymentPage.history.reference', { reference: p.referenceNumber })}</p>
                                  )}
                                </div>
                              </div>

                              {/* Sağ: Tarih + Dekont */}
                              <div className="flex flex-col items-end gap-2">
                                <p className="text-xs text-text-secondary">{fmt(p.submittedAt)}</p>
                                {p.receiptFilePath && (
                                  p.receiptExists ? (
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() => handleReceiptView(p.id)}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                      >
                                        <span className="material-symbols-outlined text-base">visibility</span>
                                        {t('common.view')}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleReceiptDownload(p.id)}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                      >
                                        <span className="material-symbols-outlined text-base">download</span>
                                        {t('common.download')}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-end gap-1">
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                                        title={t('paymentPage.history.receiptMissingHint')}
                                      >
                                        <span className="material-symbols-outlined text-sm">error</span>
                                        {t('paymentPage.history.receiptMissing')}
                                      </span>
                                      {canSubmit && (
                                        <button
                                          type="button"
                                          onClick={() => triggerReupload(p.id)}
                                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                        >
                                          <span className="material-symbols-outlined text-base">upload_file</span>
                                          {t('paymentPage.history.reupload')}
                                        </button>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Red gerekçesi */}
                            {p.status === 'REJECTED' && p.rejectionReason && (
                              <div className="mt-3 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
                                <span className="material-symbols-outlined text-red-500 text-base flex-shrink-0 mt-0.5">info</span>
                                <p className="text-xs text-red-700 dark:text-red-300">{p.rejectionReason}</p>
                              </div>
                            )}

                            {/* Onay notu / tarih */}
                            {p.status === 'CONFIRMED' && p.reviewedAt && (
                              <p className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-base">verified</span>
                                {t('paymentPage.history.confirmedOn', { date: fmt(p.reviewedAt) })}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: Bakiye Hareketleri ───────────────────── */}
              {tab === 'balance' && (
                <div className="p-6">
                  <h2 className="text-sm font-semibold text-text-main mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-purple-500">history</span>
                    {t('paymentPage.balance.title')}
                  </h2>
                  {balanceHistory.length === 0 ? (
                    <div className="text-center py-10">
                      <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3 block">account_balance_wallet</span>
                      <p className="text-text-secondary text-sm">{t('paymentPage.balance.empty')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-text-secondary text-xs">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium">{t('paymentPage.balance.date')}</th>
                            <th className="px-4 py-2.5 text-left font-medium">{t('paymentPage.balance.type')}</th>
                            <th className="px-4 py-2.5 text-left font-medium">{t('paymentPage.balance.description')}</th>
                            <th className="px-4 py-2.5 text-right font-medium">{t('payment.amount')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-background-dark">
                          {balanceHistory.map(tx => {
                            const txType = getBalanceTransactionType(tx.transactionType);
                            const isCredit = txType?.isCredit ?? false;
                            // Tanınmayan tür gelirse ham değeri göster — yanlış
                            // bir etiketle göstermektense okunmamış görünsün.
                            const typeLabel = txType?.label ?? tx.transactionType;
                            const amountColor = isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                            return (
                              <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                                  {new Date(tx.createdAt).toLocaleString(getCurrentLocale(), { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`font-medium text-xs ${amountColor}`}>{typeLabel}</span>
                                </td>
                                <td className="px-4 py-3 text-text-secondary text-xs max-w-xs truncate">{tx.description ?? '—'}</td>
                                <td className={`px-4 py-3 text-right font-semibold ${amountColor}`}>
                                  {isCredit ? '+' : ''}{fmtAmount(tx.amount)} ₺
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: G-Radar Kredisi (BROKER_ADMIN only) ───────────── */}
              {tab === 'g-radar' && user?.globalRole === 'BROKER_ADMIN' && (
                <GRadarPurchaseTab
                  currentBalanceTry={subscriptionStatus?.balance ?? 0}
                />
              )}
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}

/**
 * "G-Radar Kredisi" tab body. Lets a BROKER_ADMIN choose a credit amount,
 * see the live TL price (USD × TCMB rate), and either pay from their
 * subscription balance immediately or submit a bank-transfer notification
 * that SuperAdmin will approve.
 *
 * Master pool failures surface as a clear "destekle iletişime geçin" message —
 * the broker never sees the upstream credit figure.
 */
function GRadarPurchaseTab({ currentBalanceTry }) {
  const [credits, setCredits] = React.useState(10);
  const [quote, setQuote] = React.useState(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [quoteError, setQuoteError] = React.useState(null);
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Mount-time opt-in check so we can swap the whole tab for a friendly
  // empty state when the SuperAdmin hasn't enabled G-Radar for this broker.
  // Without this the user would hit the "G-Radar entegrasyonu bu firmaya
  // tanımlanmamış" error only after first typing into the credit field.
  const [optedOut, setOptedOut] = React.useState(false);
  const [optInChecked, setOptInChecked] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const res = await gRadarCreditService.getMyWallet();
      if (!alive) return;
      if (res.success) {
        setOptedOut(res.data?.gRadarEnabled === false);
      }
      setOptInChecked(true);
    })();
    return () => { alive = false; };
  }, []);

  // Debounce the quote fetch so rapid typing does not spam the backend.
  React.useEffect(() => {
    if (!credits || credits < 1 || credits > 100) {
      setQuote(null);
      return;
    }
    let alive = true;
    setQuoteLoading(true);
    setQuoteError(null);
    const handle = setTimeout(async () => {
      const res = await gRadarCreditService.getQuote(credits);
      if (!alive) return;
      setQuoteLoading(false);
      if (res.success) {
        setQuote(res.data);
      } else {
        setQuote(null);
        setQuoteError(res.error);
      }
    }, 300);
    return () => { alive = false; clearTimeout(handle); };
  }, [credits]);

  const balanceEnough = quote && Number(currentBalanceTry) >= Number(quote.totalTry);

  const handlePayFromBalance = async () => {
    if (!quote) return;
    setSubmitting(true);
    const res = await gRadarCreditService.purchaseFromBalance({
      creditAmount: credits, notes,
    });
    setSubmitting(false);
    if (res.success) {
      showSuccess(res.data?.message || t('paymentPage.gRadar.purchased'));
      setNotes('');
      // Reload the surrounding subscription status so the balance figure refreshes.
      window.location.reload();
    } else if (res.code === 'MASTER_POOL_UNAVAILABLE') {
      showError(t('paymentPage.gRadar.poolUnavailable'));
    } else {
      showError(res.error);
    }
  };

  const handleSubmitTransfer = async () => {
    if (!quote) return;
    if (!referenceNumber.trim()) {
      showError(t('paymentPage.gRadar.referenceRequired'));
      return;
    }
    setSubmitting(true);
    const res = await gRadarCreditService.purchaseByTransfer({
      creditAmount: credits, referenceNumber: referenceNumber.trim(), notes,
    });
    setSubmitting(false);
    if (res.success) {
      showSuccess(res.data?.message || t('paymentPage.gRadar.transferSubmitted'));
      setReferenceNumber('');
      setNotes('');
    } else {
      showError(res.error);
    }
  };

  if (optInChecked && optedOut) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-yellow-600 dark:text-yellow-400 mb-2 block">
            lock
          </span>
          <h3 className="text-base font-semibold text-yellow-800 dark:text-yellow-300">
            {t('paymentPage.gRadar.notEnabledTitle')}
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
            {t('paymentPage.gRadar.notEnabledHint')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h2 className="text-base font-semibold text-text-main flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">travel_explore</span>
          {t('paymentPage.gRadar.title')}
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          {t('paymentPage.gRadar.intro')}
        </p>
      </div>

      {/* Kredi seçimi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text-secondary">{t('paymentPage.gRadar.creditAmount')}</span>
          <input
            type="number"
            min={1}
            max={100}
            value={credits}
            onChange={(e) => setCredits(Math.min(100, Math.max(1, Number(e.target.value) || 0)))}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text-secondary">{t('paymentPage.gRadar.myBalance')}</span>
          <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-text-main">
            ₺{fmtAmount(currentBalanceTry)}
          </div>
        </label>
      </div>

      {/* Quote */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/40">
        <h3 className="text-sm font-semibold text-text-main mb-2">{t('paymentPage.gRadar.pricePreview')}</h3>
        {quoteLoading ? (
          <div className="text-xs text-text-secondary">{t('paymentPage.gRadar.calculating')}</div>
        ) : quoteError ? (
          <div className="text-xs text-red-500">{quoteError}</div>
        ) : quote ? (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('paymentPage.gRadar.plan')}</span>
              <span className="text-text-main font-medium">{quote.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('paymentPage.gRadar.unitPrice')}</span>
              <span className="text-text-main">{t('paymentPage.gRadar.perCredit', { price: `$${Number(quote.unitPriceUsd).toFixed(2)}` })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('paymentPage.gRadar.creditsTimesPrice', { count: credits, price: `$${Number(quote.unitPriceUsd).toFixed(2)}` })}</span>
              <span className="text-text-main">${Number(quote.totalUsd).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('paymentPage.gRadar.exchangeRate')}</span>
              <span className="text-text-main">1 USD = ₺{Number(quote.exchangeRateTry).toFixed(4)}</span>
            </div>
            {/* Kurun tarihi: TCMB yayın tarihi, yoksa kurun çekildiği an. Eski kur uyarısı sunucunun eşiğiyle gelir (rateStale). */}
            {(quote.rateSourceDate || quote.tcmbFetchedAt) && (
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('paymentPage.gRadar.rateDate')}</span>
                <span className="text-text-main">
                  {quote.rateSourceDate ? fmtLocalDate(quote.rateSourceDate) : fmt(quote.tcmbFetchedAt)}
                </span>
              </div>
            )}
            {quote.rateStale && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2 text-xs text-amber-700 dark:text-amber-300">
                <span className="material-symbols-outlined text-base">warning</span>
                <span>{t('paymentPage.gRadar.rateStale')}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <span className="text-text-main font-semibold">{t('paymentPage.gRadar.total')}</span>
              <span className="text-primary font-bold text-lg">
                ₺{fmtAmount(quote.totalTry)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-text-secondary">{t('paymentPage.gRadar.enterAmount')}</div>
        )}
      </div>

      {/* Notes */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-secondary">{t('paymentPage.gRadar.note')}</span>
        <textarea
          rows={2}
          value={notes}
          maxLength={500}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('paymentPage.gRadar.notePlaceholder')}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      {/* Ödeme yöntemi seçenekleri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bakiyeden öde */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-background-dark">
          <h4 className="text-sm font-semibold text-text-main flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-green-600">account_balance_wallet</span>
            {t('paymentPage.gRadar.payFromBalance')}
          </h4>
          <p className="text-xs text-text-secondary mt-1">
            {t('paymentPage.gRadar.payFromBalanceHint')}
          </p>
          {!balanceEnough && quote && (
            <p className="text-xs text-red-500 mt-2">
              {t('paymentPage.gRadar.insufficientBalance', { amount: `₺${fmtAmount(Number(quote.totalTry) - Number(currentBalanceTry))}` })}
            </p>
          )}
          <button
            disabled={!quote || !balanceEnough || submitting}
            onClick={handlePayFromBalance}
            className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? t('paymentPage.gRadar.processing') : t('paymentPage.gRadar.payFromBalance')}
          </button>
        </div>

        {/* Havale bildirimi */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-background-dark">
          <h4 className="text-sm font-semibold text-text-main flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary">payments</span>
            {t('paymentPage.gRadar.sendTransfer')}
          </h4>
          <p className="text-xs text-text-secondary mt-1">
            {t('paymentPage.gRadar.transferHint')}
          </p>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder={t('paymentPage.gRadar.referencePlaceholder')}
            className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            disabled={!quote || submitting || !referenceNumber.trim()}
            onClick={handleSubmitTransfer}
            className="mt-3 w-full px-4 py-2 bg-primary hover:opacity-90 text-white rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? t('paymentPage.form.sending') : t('paymentPage.gRadar.sendTransfer')}
          </button>
        </div>
      </div>
    </div>
  );
}
