import React, { useState, useEffect, useCallback } from 'react';
import { paymentService } from '../../api/paymentService';
import { gRadarCreditService } from '../../api/gRadarCreditService';
import MainLayout from '../../components/layout/MainLayout';
import { showSuccess, showError } from '../../utils/toastUtils';
import { t, getCurrentLocale } from '../../locales';

const STATUS_BADGE = {
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};
// Etiketler getter: çeviri sabit tanımlanırken değil, okunduğunda alınır
const STATUS_LABEL = {
  get PENDING_REVIEW() { return t('payment.pending'); },
  get CONFIRMED() { return t('payment.confirmed'); },
  get REJECTED() { return t('payment.rejected'); },
};

export default function PaymentManagementPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectReasons, setRejectReasons] = useState({});
  const [filterBrokerId, setFilterBrokerId] = useState('');

  // Bank method form
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [methodForm, setMethodForm] = useState({ displayName: '', bankName: '', accountHolder: '', iban: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, all, methods] = await Promise.all([
        paymentService.getPendingPayments(),
        paymentService.getAllPayments(),
        paymentService.getActivePaymentMethods(),
      ]);
      setPendingPayments(pending);
      setAllPayments(all);
      setPaymentMethods(methods);
    } catch {
      showError(t('paymentPage.loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async (id) => {
    try {
      await paymentService.confirmPayment(id);
      showSuccess(t('paymentManagement.confirmed'));
      load();
    } catch {
      showError(t('paymentManagement.confirmError'));
    }
  };

  const handleReject = async (id) => {
    const reason = rejectReasons[id];
    if (!reason?.trim()) {
      showError(t('adminCommon.rejectionReasonRequired'));
      return;
    }
    try {
      await paymentService.rejectPayment(id, reason);
      showSuccess(t('paymentManagement.rejected'));
      load();
    } catch {
      showError(t('paymentManagement.rejectError'));
    }
  };

  const handleSaveMethod = async (e) => {
    e.preventDefault();
    try {
      if (editingMethod) {
        await paymentService.updatePaymentMethod(editingMethod.id, { ...methodForm, methodType: 'HAVALE_EFT' });
        showSuccess(t('paymentManagement.accountUpdated'));
      } else {
        await paymentService.createPaymentMethod({ ...methodForm, methodType: 'HAVALE_EFT' });
        showSuccess(t('paymentManagement.accountAdded'));
      }
      setShowMethodForm(false);
      setEditingMethod(null);
      setMethodForm({ displayName: '', bankName: '', accountHolder: '', iban: '', description: '' });
      load();
    } catch {
      showError(t('adminCommon.actionFailed'));
    }
  };

  const handleEditMethod = (method) => {
    setEditingMethod(method);
    setMethodForm({ displayName: method.displayName, bankName: method.bankName ?? '', accountHolder: method.accountHolder ?? '', iban: method.iban ?? '', description: method.description ?? '' });
    setShowMethodForm(true);
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

  const handleDeleteMethod = async (id) => {
    try {
      await paymentService.deletePaymentMethod(id);
      showSuccess(t('paymentManagement.accountDisabled'));
      load();
    } catch {
      showError(t('adminCommon.actionFailed'));
    }
  };

  // Tüm ödemelerden benzersiz firma listesi
  const uniqueBrokers = [...new Map(
    allPayments
      .filter(p => p.brokerCompanyId)
      .map(p => [p.brokerCompanyId, { id: p.brokerCompanyId, name: p.brokerCompanyName }])
  ).values()].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const filteredAllPayments = filterBrokerId
    ? allPayments.filter(p => String(p.brokerCompanyId) === filterBrokerId)
    : allPayments;

  const TABS = [
    { key: 'pending', label: t('payment.pendingPayments'), icon: 'pending' },
    { key: 'all', label: t('payment.allPayments'), icon: 'receipt_long' },
    { key: 'g-radar', label: t('paymentManagement.gRadarTab'), icon: 'travel_explore' },
    { key: 'methods', label: t('payment.bankAccounts'), icon: 'account_balance' },
  ];

  const PaymentTable = ({ data }) => (
    data.length === 0 ? (
      <p className="text-text-secondary text-sm text-center py-8">{t('paymentManagement.empty')}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-100 dark:border-gray-700">
              <th className="pb-3 text-text-secondary font-medium">{t('paymentManagement.columns.company')}</th>
              <th className="pb-3 text-text-secondary font-medium">{t('paymentPage.balance.date')}</th>
              <th className="pb-3 text-text-secondary font-medium">{t('payment.amount')}</th>
              <th className="pb-3 text-text-secondary font-medium">{t('paymentManagement.columns.reference')}</th>
              <th className="pb-3 text-text-secondary font-medium">{t('paymentManagement.columns.method')}</th>
              <th className="pb-3 text-text-secondary font-medium">{t('management.status')}</th>
              <th className="pb-3 text-text-secondary font-medium">{t('payment.receipt')}</th>
              {activeTab === 'pending' && <th className="pb-3 text-text-secondary font-medium">{t('paymentManagement.columns.action')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {data.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="py-3 text-text-main font-medium">
                  {p.brokerCompanyName ?? '-'}
                </td>
                <td className="py-3 text-text-secondary">
                  {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString(getCurrentLocale()) : '-'}
                </td>
                <td className="py-3 text-text-main">
                  {p.amount ? `₺${Number(p.amount).toLocaleString(getCurrentLocale())}` : '-'}
                </td>
                <td className="py-3 text-text-secondary">{p.referenceNumber || '-'}</td>
                <td className="py-3 text-text-secondary">{p.methodType ?? '-'}</td>
                <td className="py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  {p.status === 'REJECTED' && p.rejectionReason && (
                    <p className="text-red-600 text-xs mt-1 max-w-xs">{p.rejectionReason}</p>
                  )}
                </td>
                <td className="py-3">
                  {p.receiptFilePath ? (
                    p.receiptExists ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReceiptView(p.id)}
                          className="text-primary hover:text-primary/80"
                          title={t('common.view')}
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReceiptDownload(p.id)}
                          className="text-primary hover:text-primary/80"
                          title={t('common.download')}
                        >
                          <span className="material-symbols-outlined text-base">download</span>
                        </button>
                      </div>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                        title={t('paymentPage.history.receiptMissingHint')}
                      >
                        <span className="material-symbols-outlined text-sm">error</span>
                        {t('paymentPage.history.receiptMissing')}
                      </span>
                    )
                  ) : '-'}
                </td>
                {activeTab === 'pending' && (
                  <td className="py-3">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleConfirm(p.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">check</span> {t('payment.confirm')}
                      </button>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={rejectReasons[p.id] ?? ''}
                          onChange={e => setRejectReasons(prev => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder={t('paymentManagement.rejectionPlaceholder')}
                          className="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500 w-32 transition-colors"
                        />
                        <button
                          onClick={() => handleReject(p.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        <h1 className="text-2xl font-bold text-text-main">{t('payment.management')}</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit transition-colors">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 text-text-main shadow-sm'
                  : 'text-text-secondary hover:text-text-main'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
              {tab.key === 'pending' && pendingPayments.length > 0 && (
                <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5">{pendingPayments.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-background-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
          {loading ? (
            <p className="text-text-secondary text-sm text-center py-8">{t('common.loading')}</p>
          ) : (
            <>
              {activeTab === 'pending' && <PaymentTable data={pendingPayments} />}
              {activeTab === 'all' && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1 max-w-xs">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-base">
                        business
                      </span>
                      <select
                        value={filterBrokerId}
                        onChange={e => setFilterBrokerId(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main focus:ring-2 focus:ring-primary focus:border-primary appearance-none cursor-pointer transition-colors"
                      >
                        <option value="">{t('paymentManagement.allCompanies')}</option>
                        {uniqueBrokers.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-base">
                        expand_more
                      </span>
                    </div>
                    {filterBrokerId && (
                      <button
                        onClick={() => setFilterBrokerId('')}
                        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-main transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                        {t('paymentManagement.clearFilter')}
                      </button>
                    )}
                    <span className="text-sm text-text-secondary ml-auto">
                      {t('paymentManagement.paymentCount', { count: filteredAllPayments.length })}
                    </span>
                  </div>
                  <PaymentTable data={filteredAllPayments} />
                </>
              )}
              {activeTab === 'g-radar' && (
                <GRadarApprovalsPanel onChange={load} />
              )}
              {activeTab === 'methods' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-text-main">{t('paymentManagement.activeBankAccounts')}</h3>
                    <button
                      onClick={() => { setShowMethodForm(true); setEditingMethod(null); setMethodForm({ displayName: '', bankName: '', accountHolder: '', iban: '', description: '' }); }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      {t('paymentManagement.addAccount')}
                    </button>
                  </div>
                  {paymentMethods.map(method => (
                    <div key={method.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex items-start justify-between gap-4 transition-colors">
                      <div>
                        <p className="font-semibold text-text-main">{method.displayName}</p>
                        <p className="text-text-secondary text-sm">{method.bankName} — {method.accountHolder}</p>
                        <code className="text-xs font-mono text-text-secondary">{method.iban}</code>
                        {method.description && <p className="text-text-secondary text-xs mt-1">{method.description}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleEditMethod(method)} className="text-primary hover:opacity-70">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button onClick={() => handleDeleteMethod(method.id)} className="text-red-500 hover:opacity-70">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {paymentMethods.length === 0 && (
                    <p className="text-text-secondary text-sm text-center py-8">{t('paymentManagement.noBankAccounts')}</p>
                  )}
                  {showMethodForm && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 transition-colors">
                      <h4 className="font-medium text-text-main mb-3">{editingMethod ? t('paymentManagement.editAccount') : t('paymentManagement.newAccount')}</h4>
                      <form onSubmit={handleSaveMethod} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { key: 'displayName', label: t('paymentManagement.displayName'), required: true },
                          { key: 'bankName', label: t('payment.bankName') },
                          { key: 'accountHolder', label: t('payment.accountHolder') },
                          { key: 'iban', label: t('payment.iban') },
                          { key: 'description', label: t('adminCommon.description') },
                        ].map(({ key, label, required }) => (
                          <label key={key} className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-text-secondary">{label}</span>
                            <input
                              type="text"
                              value={methodForm[key]}
                              onChange={e => setMethodForm(prev => ({ ...prev, [key]: e.target.value }))}
                              required={required}
                              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                            />
                          </label>
                        ))}
                        <div className="sm:col-span-2 flex gap-3 justify-end mt-1">
                          <button type="button" onClick={() => setShowMethodForm(false)} className="px-4 py-2 text-text-secondary hover:text-text-main text-sm transition-colors">{t('common.cancel')}</button>
                          <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">{t('common.save')}</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

/**
 * SuperAdmin approval queue for broker-submitted G-Radar credit transfers.
 * Shows pending purchases with the broker, credit count, computed TL price,
 * the broker's bank-transfer reference and any note. Approve / reject buttons
 * trigger the Phase-5 endpoints which re-run the master-pool guard and
 * (on approval) write the new lot + ledger row in a single transaction.
 */
function GRadarApprovalsPanel({ onChange }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await gRadarCreditService.listPendingPurchases();
    setLoading(false);
    if (res.success) {
      setPurchases(res.data?.purchases || []);
    } else {
      showError(res.error);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    const res = await gRadarCreditService.approvePurchase(id);
    if (res.success) {
      showSuccess(t('paymentManagement.gRadar.approved'));
      load();
      onChange?.();
    } else if (res.code === 'MASTER_POOL_UNAVAILABLE') {
      showError(t('paymentManagement.gRadar.poolUnavailable'));
    } else {
      showError(res.error);
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      showError(t('adminCommon.rejectionReasonRequired'));
      return;
    }
    const res = await gRadarCreditService.rejectPurchase(id, rejectReason.trim());
    if (res.success) {
      showSuccess(t('paymentManagement.gRadar.rejected'));
      setRejectingId(null);
      setRejectReason('');
      load();
      onChange?.();
    } else {
      showError(res.error);
    }
  };

  if (loading) {
    return <p className="text-text-secondary text-sm text-center py-8">{t('common.loading')}</p>;
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-2 block">
          inbox
        </span>
        <p className="text-text-secondary text-sm">{t('paymentManagement.gRadar.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-secondary mb-2">
        {t('paymentManagement.gRadar.hint')}
      </p>
      {purchases.map((p) => (
        <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-background-dark">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <p className="font-semibold text-text-main">{p.brokerCompanyName}</p>
              <p className="text-xs text-text-secondary mt-0.5">
                {p.requestedByEmail} • {new Date(p.requestedAt).toLocaleString(getCurrentLocale())}
              </p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <Info label={t('paymentManagement.gRadar.credits')} value={t('paymentManagement.gRadar.creditCount', { count: p.creditAmount })} />
                <Info label={t('paymentManagement.gRadar.unitUsd')} value={`$${Number(p.unitPriceUsd).toFixed(2)}`} />
                <Info label={t('paymentManagement.gRadar.rate')} value={`₺${Number(p.exchangeRateUsed).toFixed(4)}`} />
                <Info label={t('paymentPage.gRadar.total')} value={`₺${Number(p.totalAmountTry).toLocaleString(getCurrentLocale(), { minimumFractionDigits: 2 })}`} highlight />
                <Info label={t('paymentManagement.gRadar.transferRef')} value={p.transferReference || '—'} />
              </div>
              {p.notes && (
                <p className="text-xs text-text-secondary mt-2 italic">"{p.notes}"</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleApprove(p.id)}
                className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-base">check</span>
                {t('payment.confirm')}
              </button>
              <button
                onClick={() => { setRejectingId(p.id); setRejectReason(''); }}
                className="flex items-center gap-1 px-3 py-2 border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
                {t('payment.reject')}
              </button>
            </div>
          </div>
          {rejectingId === p.id && (
            <div className="mt-3 flex gap-2 items-stretch">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('adminCommon.rejectionReasonPlaceholder')}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => handleReject(p.id)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {t('paymentManagement.gRadar.confirmReject')}
              </button>
              <button
                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                className="px-3 py-2 text-text-secondary hover:text-text-main text-sm transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Info({ label, value, highlight }) {
  return (
    <div>
      <div className="text-text-secondary uppercase tracking-wide text-[10px]">{label}</div>
      <div className={`text-text-main font-medium ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}
