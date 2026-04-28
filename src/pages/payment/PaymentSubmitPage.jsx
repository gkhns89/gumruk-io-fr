import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../api/paymentService';
import MainLayout from '../../components/layout/MainLayout';
import AddonPaymentCard from '../../components/payment/AddonPaymentCard';
import { showSuccess, showError } from '../../utils/toastUtils';

const STATUS_BADGE = {
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700',
  CONFIRMED:      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-700',
  REJECTED:       'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700',
};
const STATUS_LABEL = {
  PENDING_REVIEW: 'İnceleme Bekliyor',
  CONFIRMED:      'Onaylandı',
  REJECTED:       'Reddedildi',
};
const STATUS_ICON = {
  PENDING_REVIEW: 'schedule',
  CONFIRMED:      'check_circle',
  REJECTED:       'cancel',
};

const RESTRICTION_CONFIG = {
  NONE:         { icon: 'check_circle', label: 'Aktif',         bg: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-800',   text: 'text-green-700 dark:text-green-400' },
  WARNING:      { icon: 'warning',      label: 'Uyarı',         bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-400' },
  WRITE_BLOCKED:{ icon: 'lock',         label: 'Yazma Kısıtlı', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400' },
  FULL_READONLY:{ icon: 'block',        label: 'Tam Kısıtlı',   bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800',       text: 'text-red-700 dark:text-red-400' },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
const fmtMoney = (v) => v != null ? `₺${Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-';

export default function PaymentSubmitPage() {
  const { user } = useAuth();
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
  const [billingPeriodStart, setBillingPeriodStart] = useState('');
  const [billingPeriodEnd, setBillingPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [balanceHistory, setBalanceHistory] = useState([]);

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
      showError('Veriler yüklenirken hata oluştu');
    } finally {
      setDataLoading(false);
    }
  }, [canSubmit]);

  useEffect(() => { load(); }, [load]);

  const selectedMethod = paymentMethods.find(m => String(m.id) === String(selectedMethodId));

  const handleCopyIban = (iban) => {
    navigator.clipboard.writeText(iban).then(() => {
      setCopiedIban(iban);
      setTimeout(() => setCopiedIban(null), 2000);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMethodId || !amount || !billingPeriodStart || !billingPeriodEnd) {
      showError('Lütfen zorunlu alanları doldurun');
      return;
    }
    setSubmitting(true);
    try {
      await paymentService.submitPayment({ paymentMethodId: selectedMethodId, amount, referenceNumber, billingPeriodStart, billingPeriodEnd, notes, receipt });
      showSuccess('Ödeme bildirimi gönderildi');
      setAmount(''); setReferenceNumber(''); setBillingPeriodStart('');
      setBillingPeriodEnd(''); setNotes(''); setReceipt(null); setSelectedMethodId('');
      load();
      setTab('history');
    } catch {
      showError('Ödeme bildirimi gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAddonPaid = async (addonId, useBalance) => {
    try {
      await paymentService.markAddonAsPaid(addonId, { useBalance });
      showSuccess(useBalance ? 'Addon bakiye ile ödenmiştir' : 'Addon ödenmiş olarak işaretlendi');
      load();
    } catch (err) {
      throw new Error(err.response?.data?.error || 'İşlem başarısız');
    }
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
    const cycleLabel = subscriptionStatus.billingCycle === 'YEARLY' ? 'Yıllık' : 'Aylık';

    return (
      <div className={`rounded-2xl border p-5 transition-colors ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined text-3xl ${cfg.text}`}>{cfg.icon}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-text-main">
                  {subscriptionStatus.planName ?? 'Abonelik'} Planı
                </h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-0.5">
                {cycleLabel} fatura
                {subscriptionStatus.planPrice && (
                  <> · <span className="font-medium text-text-main">{fmtMoney(subscriptionStatus.planPrice)}/{subscriptionStatus.billingCycle === 'YEARLY' ? 'yıl' : 'ay'}</span></>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-6 flex-wrap">
            <div className="text-right">
              <p className="text-xs text-text-secondary">Sonraki Ödeme</p>
              <p className={`text-sm font-semibold ${subscriptionStatus.daysOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-text-main'}`}>
                {due ? due.toLocaleDateString('tr-TR') : '—'}
              </p>
              {daysLeft !== null && (
                <p className={`text-xs font-medium ${
                  subscriptionStatus.daysOverdue > 0 ? 'text-red-600 dark:text-red-400'
                  : daysLeft <= 7 ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-green-600 dark:text-green-400'
                }`}>
                  {subscriptionStatus.daysOverdue > 0
                    ? `${subscriptionStatus.daysOverdue} gün gecikmiş`
                    : daysLeft === 0 ? 'Bugün vadesi doluyor'
                    : `${daysLeft} gün kaldı`}
                </p>
              )}
            </div>

            {Number(subscriptionStatus.balance ?? 0) > 0 && (
              <div className="text-right">
                <p className="text-xs text-text-secondary">Mevcut Bakiye</p>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {fmtMoney(subscriptionStatus.balance)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">Dönem kredisi</p>
              </div>
            )}

            {subscriptionStatus.subscriptionEndDate && (
              <div className="text-right">
                <p className="text-xs text-text-secondary">Abonelik Bitiş</p>
                <p className="text-sm font-semibold text-text-main">
                  {new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString('tr-TR')}
                </p>
              </div>
            )}
          </div>
        </div>

        {subscriptionStatus.level === 'WARNING' && (
          <p className="mt-3 text-sm text-yellow-700 dark:text-yellow-300">
            Ödeme geciktiği için uyarı modundasınız. Yeni kayıt oluşturmaya devam edebilirsiniz ancak ödemenizi en kısa sürede yapmanız önerilir.
          </p>
        )}
        {subscriptionStatus.level === 'WRITE_BLOCKED' && (
          <p className="mt-3 text-sm text-orange-700 dark:text-orange-300">
            Ödeme gecikmesi nedeniyle yeni kayıt oluşturma kısıtlandı. Mevcut kayıtları düzenleyebilirsiniz.
          </p>
        )}
        {subscriptionStatus.level === 'FULL_READONLY' && (
          <p className="mt-3 text-sm text-red-700 dark:text-red-300">
            Ödeme gecikmesi kritik seviyede. Tüm yazma işlemleri kısıtlandı. Aşağıdan ödeme bildirin.
          </p>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary">account_balance</span>
            Abonelik &amp; Ödeme
          </h1>
          <p className="text-text-secondary mt-1">Abonelik durumunuzu görüntüleyin ve ödeme bildirin</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">

            {/* Abonelik Durum Kartı — her zaman görünür */}
            {dataLoading ? (
              <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-100 dark:border-gray-700 p-8 flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                <span className="text-text-secondary">Yükleniyor...</span>
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
                  Ödeme Yap
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
                  Ödeme Geçmişi
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
                  Bakiye Hareketleri
                </button>
              </div>

              {/* ── TAB: Ödeme Yap ────────────────────────────── */}
              {tab === 'form' && (
                <div className="p-6 space-y-6">
                  {/* Banka Bilgileri */}
                  {paymentMethods.length > 0 && (
                    <div>
                      <h2 className="text-base font-semibold text-text-main mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">account_balance</span>
                        Banka Bilgileri
                      </h2>
                      <div className="grid gap-3">
                        {paymentMethods.map(method => (
                          <div key={method.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 transition-colors">
                            <p className="font-semibold text-text-main">{method.displayName}</p>
                            {method.bankName && <p className="text-text-secondary text-sm mt-1">Banka: {method.bankName}</p>}
                            {method.accountHolder && <p className="text-text-secondary text-sm">Hesap Sahibi: {method.accountHolder}</p>}
                            {method.iban && (
                              <div className="flex items-center gap-2 mt-2">
                                <code className="text-sm font-mono text-text-main bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 tracking-wider">
                                  {method.iban}
                                </code>
                                <button
                                  onClick={() => handleCopyIban(method.iban)}
                                  className="flex items-center gap-1 text-sm text-primary hover:opacity-70 transition-opacity"
                                  title="IBAN Kopyala"
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    {copiedIban === method.iban ? 'check' : 'content_copy'}
                                  </span>
                                  {copiedIban === method.iban ? 'Kopyalandı' : 'Kopyala'}
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
                      Şu an tanımlı banka hesabı bulunmuyor. Yönetici ile iletişime geçin.
                    </div>
                  )}

                  {/* Ek Ödemeler */}
                  {addons.length > 0 && (
                    <div>
                      <h2 className="text-base font-semibold text-text-main mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">receipt</span>
                        Ek Ödemeler
                      </h2>
                      <div className="grid gap-3">
                        {addons.map(addon => (
                          <AddonPaymentCard
                            key={addon.id}
                            addon={addon}
                            balance={subscriptionStatus?.balance ?? 0}
                            onPay={handleMarkAddonPaid}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ödeme Formu */}
                  {canSubmit ? (
                    <div>
                      <h2 className="text-base font-semibold text-text-main mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">send</span>
                        Ödeme Bildir
                      </h2>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-main">Ödeme Yöntemi *</span>
                            <select
                              value={selectedMethodId}
                              onChange={e => setSelectedMethodId(e.target.value)}
                              required
                              className="form-select rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                            >
                              <option value="">Seçiniz...</option>
                              {paymentMethods.map(m => (
                                <option key={m.id} value={m.id}>{m.displayName}</option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-main">Tutar (₺) *</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={amount} onChange={e => setAmount(e.target.value)}
                              required
                              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                              placeholder="0.00"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-main">Dönem Başlangıç *</span>
                            <input
                              type="date" value={billingPeriodStart} onChange={e => setBillingPeriodStart(e.target.value)}
                              required
                              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-main">Dönem Bitiş *</span>
                            <input
                              type="date" value={billingPeriodEnd} onChange={e => setBillingPeriodEnd(e.target.value)}
                              required
                              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-main">Referans No</span>
                            <input
                              type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)}
                              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                              placeholder="EFT/Havale referans numarası"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-main">Dekont <span className="text-text-secondary font-normal">(PDF/PNG/JPG, max 10MB)</span></span>
                            <input
                              type="file" accept=".pdf,.png,.jpg,.jpeg"
                              onChange={e => setReceipt(e.target.files[0])}
                              className="text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:opacity-80 transition-colors"
                            />
                          </label>
                        </div>
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-text-main">Notlar</span>
                          <textarea
                            value={notes} onChange={e => setNotes(e.target.value)}
                            rows={3}
                            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none"
                            placeholder="Ek bilgi..."
                          />
                        </label>
                        <div className="flex justify-end">
                          <button
                            type="submit" disabled={submitting}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined">send</span>
                            {submitting ? 'Gönderiliyor...' : 'Ödeme Bildir'}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 text-center text-text-secondary text-sm">
                      <span className="material-symbols-outlined text-3xl text-gray-400 mb-2 block">lock</span>
                      Ödeme bildirme yetkisine sahip değilsiniz. Firma yöneticinizle iletişime geçin.
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
                        const labels = { ALL: 'Tümü', PENDING_REVIEW: 'Bekleyen', CONFIRMED: 'Onaylanan', REJECTED: 'Reddedilen' };
                        return (
                          <button
                            key={s}
                            onClick={() => setHistoryFilter(s)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${colors[s]}`}
                          >
                            {labels[s]}
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
                      title="Yenile"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      Yenile
                    </button>
                  </div>

                  {dataLoading ? (
                    <div className="flex items-center justify-center gap-3 py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      <span className="text-text-secondary">Yükleniyor...</span>
                    </div>
                  ) : filteredPayments.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3 block">receipt_long</span>
                      <p className="text-text-secondary text-sm">
                        {historyFilter === 'ALL' ? 'Henüz ödeme bildirimi bulunmuyor' : 'Bu kritere uygun ödeme yok'}
                      </p>
                      {historyFilter === 'ALL' && canSubmit && (
                        <button
                          onClick={() => setTab('form')}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-base">add</span>
                          Ödeme Bildir
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPayments.map(p => {
                        const badge = STATUS_BADGE[p.status] ?? '';
                        const label = STATUS_LABEL[p.status] ?? p.status;
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
                                    Dönem: {fmt(p.billingPeriodStart)} — {fmt(p.billingPeriodEnd)}
                                  </p>
                                  {p.referenceNumber && (
                                    <p className="text-xs text-text-secondary">Ref: {p.referenceNumber}</p>
                                  )}
                                </div>
                              </div>

                              {/* Sağ: Tarih + Dekont */}
                              <div className="flex flex-col items-end gap-2">
                                <p className="text-xs text-text-secondary">{fmt(p.submittedAt)}</p>
                                {p.receiptFilePath && (
                                  <a
                                    href={paymentService.downloadReceipt(p.id)}
                                    target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <span className="material-symbols-outlined text-base">download</span>
                                    Dekont
                                  </a>
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
                                {fmt(p.reviewedAt)} tarihinde onaylandı
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
                    Bakiye Hareket Geçmişi
                  </h2>
                  {balanceHistory.length === 0 ? (
                    <div className="text-center py-10">
                      <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3 block">account_balance_wallet</span>
                      <p className="text-text-secondary text-sm">Henüz bakiye hareketi bulunmuyor</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-text-secondary text-xs">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium">Tarih</th>
                            <th className="px-4 py-2.5 text-left font-medium">Tür</th>
                            <th className="px-4 py-2.5 text-left font-medium">Açıklama</th>
                            <th className="px-4 py-2.5 text-right font-medium">Tutar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-background-dark">
                          {balanceHistory.map(tx => {
                            const isCredit = tx.transactionType === 'CREDIT';
                            const typeLabel = tx.transactionType === 'CREDIT' ? 'Kredi' : tx.transactionType === 'ADDON_DEBIT' ? 'Ek Ödeme' : 'Dönem Ödemesi';
                            const amountColor = isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                            return (
                              <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                                  {new Date(tx.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`font-medium text-xs ${amountColor}`}>{typeLabel}</span>
                                </td>
                                <td className="px-4 py-3 text-text-secondary text-xs max-w-xs truncate">{tx.description ?? '—'}</td>
                                <td className={`px-4 py-3 text-right font-semibold ${amountColor}`}>
                                  {isCredit ? '+' : ''}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
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
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
