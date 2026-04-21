import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../api/paymentService';
import MainLayout from '../../components/layout/MainLayout';
import { showSuccess, showError } from '../../utils/toastUtils';

const STATUS_BADGE = {
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};
const STATUS_LABEL = {
  PENDING_REVIEW: 'İnceleme Bekliyor',
  CONFIRMED: 'Onaylandı',
  REJECTED: 'Reddedildi',
};

const RESTRICTION_CONFIG = {
  NONE: { color: 'green', icon: 'check_circle', label: 'Aktif', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-400' },
  WARNING: { color: 'yellow', icon: 'warning', label: 'Uyarı', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-400' },
  WRITE_BLOCKED: { color: 'orange', icon: 'lock', label: 'Yazma Kısıtlı', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400' },
  FULL_READONLY: { color: 'red', icon: 'block', label: 'Tam Kısıtlı', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400' },
};

export default function PaymentSubmitPage() {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [payments, setPayments] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedIban, setCopiedIban] = useState(null);

  // Form
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [billingPeriodStart, setBillingPeriodStart] = useState('');
  const [billingPeriodEnd, setBillingPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(async () => {
    try {
      const [methods, history, status] = await Promise.all([
        paymentService.getActivePaymentMethods(),
        paymentService.getMyCompanyPayments(),
        paymentService.getRestrictionStatus(),
      ]);
      setPaymentMethods(methods);
      setPayments(history);
      setSubscriptionStatus(status);
    } catch {
      showError('Veriler yüklenirken hata oluştu');
    }
  }, []);

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
    setLoading(true);
    try {
      await paymentService.submitPayment({
        paymentMethodId: selectedMethodId,
        amount,
        referenceNumber,
        billingPeriodStart,
        billingPeriodEnd,
        notes,
        receipt,
      });
      showSuccess('Ödeme bildirimi gönderildi');
      setAmount(''); setReferenceNumber(''); setBillingPeriodStart('');
      setBillingPeriodEnd(''); setNotes(''); setReceipt(null); setSelectedMethodId('');
      load();
    } catch {
      showError('Ödeme bildirimi gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <h1 className="text-2xl font-bold text-text-main">Abonelik & Ödeme</h1>

        {/* Abonelik Durum Kartı */}
        {subscriptionStatus && (() => {
          const cfg = RESTRICTION_CONFIG[subscriptionStatus.level] ?? RESTRICTION_CONFIG.NONE;
          const due = subscriptionStatus.nextPaymentDue ? new Date(subscriptionStatus.nextPaymentDue) : null;
          const today = new Date(); today.setHours(0,0,0,0);
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
                        <> · <span className="font-medium text-text-main">₺{Number(subscriptionStatus.planPrice).toLocaleString('tr-TR')}/{subscriptionStatus.billingCycle === 'YEARLY' ? 'yıl' : 'ay'}</span></>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 flex-wrap">
                  {/* Ödeme tarihi */}
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Sonraki Ödeme</p>
                    <p className={`text-sm font-semibold ${subscriptionStatus.daysOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-text-main'}`}>
                      {due ? due.toLocaleDateString('tr-TR') : '—'}
                    </p>
                    {daysLeft !== null && (
                      <p className={`text-xs font-medium ${
                        subscriptionStatus.daysOverdue > 0
                          ? 'text-red-600 dark:text-red-400'
                          : daysLeft <= 7
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {subscriptionStatus.daysOverdue > 0
                          ? `${subscriptionStatus.daysOverdue} gün gecikmiş`
                          : daysLeft === 0
                          ? 'Bugün vadesi doluyor'
                          : `${daysLeft} gün kaldı`}
                      </p>
                    )}
                  </div>

                  {/* Mevcut Bakiye */}
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Mevcut Bakiye</p>
                    <p className={`text-sm font-semibold ${Number(subscriptionStatus.balance ?? 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-text-main'}`}>
                      ₺{Number(subscriptionStatus.balance ?? 0).toLocaleString('tr-TR')}
                    </p>
                    {Number(subscriptionStatus.balance ?? 0) > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400">Dönem kredisi</p>
                    )}
                  </div>

                  {/* Abonelik bitiş */}
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

              {/* Kısıtlama açıklaması */}
              {subscriptionStatus.level === 'WARNING' && (
                <p className="mt-3 text-sm text-yellow-700 dark:text-yellow-300">
                  Ödeme geciktiği için uyarı modundasınız. Yeni kayıt oluşturmaya devam edebilirsiniz ancak ödemenizi en kısa sürede yapmanız önerilir.
                </p>
              )}
              {subscriptionStatus.level === 'WRITE_BLOCKED' && (
                <p className="mt-3 text-sm text-orange-700 dark:text-orange-300">
                  Ödeme gecikmesi nedeniyle yeni kayıt oluşturma işlemleri kısıtlandı. Mevcut kayıtları düzenleyebilirsiniz.
                </p>
              )}
              {subscriptionStatus.level === 'FULL_READONLY' && (
                <p className="mt-3 text-sm text-red-700 dark:text-red-300">
                  Ödeme gecikmesi kritik seviyede. Tüm yazma işlemleri kısıtlandı. Ödemenizi aşağıdaki forma bildirin.
                </p>
              )}
            </div>
          );
        })()}

        {/* Banka Bilgileri */}
        {paymentMethods.length > 0 && (
          <div className="bg-white dark:bg-background-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
            <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_balance</span>
              Banka Bilgileri
            </h2>
            <div className="grid gap-4">
              {paymentMethods.map(method => (
                <div key={method.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                  <p className="font-semibold text-text-main">{method.displayName}</p>
                  {method.bankName && <p className="text-text-secondary text-sm mt-1">Banka: {method.bankName}</p>}
                  {method.accountHolder && <p className="text-text-secondary text-sm">Hesap Sahibi: {method.accountHolder}</p>}
                  {method.iban && (
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-sm font-mono text-text-main bg-white dark:bg-gray-700 px-3 py-1 rounded border dark:border-gray-600">{method.iban}</code>
                      <button
                        onClick={() => handleCopyIban(method.iban)}
                        className="text-primary hover:opacity-70 transition-opacity"
                        title="IBAN Kopyala"
                      >
                        <span className="material-symbols-outlined text-xl">
                          {copiedIban === method.iban ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  )}
                  {method.description && <p className="text-text-secondary text-xs mt-2">{method.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ödeme Formu */}
        <div className="bg-white dark:bg-background-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
          <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payment</span>
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
                <span className="text-sm font-medium text-text-main">Dekont (PDF/PNG/JPG, max 10MB)</span>
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
                type="submit" disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">send</span>
                {loading ? 'Gönderiliyor...' : 'Ödeme Bildir'}
              </button>
            </div>
          </form>
        </div>

        {/* Ödeme Geçmişi */}
        <div className="bg-white dark:bg-background-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
          <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            Ödeme Geçmişi
          </h2>
          {payments.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-8">Henüz ödeme bildirimi yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-3 text-text-secondary font-medium">Tarih</th>
                    <th className="pb-3 text-text-secondary font-medium">Tutar</th>
                    <th className="pb-3 text-text-secondary font-medium">Dönem</th>
                    <th className="pb-3 text-text-secondary font-medium">Referans</th>
                    <th className="pb-3 text-text-secondary font-medium">Durum</th>
                    <th className="pb-3 text-text-secondary font-medium">Dekont</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 text-text-main">{p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('tr-TR') : '-'}</td>
                      <td className="py-3 text-text-main font-medium">{p.amount ? `₺${Number(p.amount).toLocaleString('tr-TR')}` : '-'}</td>
                      <td className="py-3 text-text-secondary">{p.billingPeriodStart} — {p.billingPeriodEnd}</td>
                      <td className="py-3 text-text-secondary">{p.referenceNumber || '-'}</td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                        {p.status === 'REJECTED' && p.rejectionReason && (
                          <p className="text-red-600 text-xs mt-1">{p.rejectionReason}</p>
                        )}
                      </td>
                      <td className="py-3">
                        {p.receiptFilePath ? (
                          <a
                            href={paymentService.downloadReceipt(p.id)}
                            target="_blank" rel="noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-base">download</span>
                          </a>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
