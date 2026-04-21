import React, { useState, useEffect, useCallback } from 'react';
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
      showError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async (id) => {
    try {
      await paymentService.confirmPayment(id);
      showSuccess('Ödeme onaylandı');
      load();
    } catch {
      showError('Ödeme onaylanamadı');
    }
  };

  const handleReject = async (id) => {
    const reason = rejectReasons[id];
    if (!reason?.trim()) {
      showError('Red gerekçesi zorunludur');
      return;
    }
    try {
      await paymentService.rejectPayment(id, reason);
      showSuccess('Ödeme reddedildi');
      load();
    } catch {
      showError('Ödeme reddedilemedi');
    }
  };

  const handleSaveMethod = async (e) => {
    e.preventDefault();
    try {
      if (editingMethod) {
        await paymentService.updatePaymentMethod(editingMethod.id, { ...methodForm, methodType: 'HAVALE_EFT' });
        showSuccess('Banka hesabı güncellendi');
      } else {
        await paymentService.createPaymentMethod({ ...methodForm, methodType: 'HAVALE_EFT' });
        showSuccess('Banka hesabı eklendi');
      }
      setShowMethodForm(false);
      setEditingMethod(null);
      setMethodForm({ displayName: '', bankName: '', accountHolder: '', iban: '', description: '' });
      load();
    } catch {
      showError('İşlem başarısız');
    }
  };

  const handleEditMethod = (method) => {
    setEditingMethod(method);
    setMethodForm({ displayName: method.displayName, bankName: method.bankName ?? '', accountHolder: method.accountHolder ?? '', iban: method.iban ?? '', description: method.description ?? '' });
    setShowMethodForm(true);
  };

  const handleDeleteMethod = async (id) => {
    try {
      await paymentService.deletePaymentMethod(id);
      showSuccess('Banka hesabı devre dışı bırakıldı');
      load();
    } catch {
      showError('İşlem başarısız');
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
    { key: 'pending', label: 'Bekleyen Ödemeler', icon: 'pending' },
    { key: 'all', label: 'Tüm Ödemeler', icon: 'receipt_long' },
    { key: 'methods', label: 'Banka Hesapları', icon: 'account_balance' },
  ];

  const PaymentTable = ({ data }) => (
    data.length === 0 ? (
      <p className="text-text-secondary text-sm text-center py-8">Ödeme bulunamadı</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-100 dark:border-gray-700">
              <th className="pb-3 text-text-secondary font-medium">Firma</th>
              <th className="pb-3 text-text-secondary font-medium">Tarih</th>
              <th className="pb-3 text-text-secondary font-medium">Tutar</th>
              <th className="pb-3 text-text-secondary font-medium">Referans</th>
              <th className="pb-3 text-text-secondary font-medium">Yöntem</th>
              <th className="pb-3 text-text-secondary font-medium">Durum</th>
              <th className="pb-3 text-text-secondary font-medium">Dekont</th>
              {activeTab === 'pending' && <th className="pb-3 text-text-secondary font-medium">İşlem</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {data.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="py-3 text-text-main font-medium">
                  {p.brokerCompanyName ?? '-'}
                </td>
                <td className="py-3 text-text-secondary">
                  {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('tr-TR') : '-'}
                </td>
                <td className="py-3 text-text-main">
                  {p.amount ? `₺${Number(p.amount).toLocaleString('tr-TR')}` : '-'}
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
                    <a
                      href={paymentService.downloadReceipt(p.id)}
                      target="_blank" rel="noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                    </a>
                  ) : '-'}
                </td>
                {activeTab === 'pending' && (
                  <td className="py-3">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleConfirm(p.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">check</span> Onayla
                      </button>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={rejectReasons[p.id] ?? ''}
                          onChange={e => setRejectReasons(prev => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="Red gerekçesi..."
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
        <h1 className="text-2xl font-bold text-text-main">Ödeme Yönetimi</h1>

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
            <p className="text-text-secondary text-sm text-center py-8">Yükleniyor...</p>
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
                        <option value="">Tüm Firmalar</option>
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
                        Filtreyi Kaldır
                      </button>
                    )}
                    <span className="text-sm text-text-secondary ml-auto">
                      {filteredAllPayments.length} ödeme
                    </span>
                  </div>
                  <PaymentTable data={filteredAllPayments} />
                </>
              )}
              {activeTab === 'methods' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-text-main">Aktif Banka Hesapları</h3>
                    <button
                      onClick={() => { setShowMethodForm(true); setEditingMethod(null); setMethodForm({ displayName: '', bankName: '', accountHolder: '', iban: '', description: '' }); }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      Hesap Ekle
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
                    <p className="text-text-secondary text-sm text-center py-8">Henüz banka hesabı tanımlanmamış</p>
                  )}
                  {showMethodForm && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 transition-colors">
                      <h4 className="font-medium text-text-main mb-3">{editingMethod ? 'Hesap Düzenle' : 'Yeni Hesap Ekle'}</h4>
                      <form onSubmit={handleSaveMethod} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { key: 'displayName', label: 'Görünen Ad *', required: true },
                          { key: 'bankName', label: 'Banka Adı' },
                          { key: 'accountHolder', label: 'Hesap Sahibi' },
                          { key: 'iban', label: 'IBAN' },
                          { key: 'description', label: 'Açıklama' },
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
                          <button type="button" onClick={() => setShowMethodForm(false)} className="px-4 py-2 text-text-secondary hover:text-text-main text-sm transition-colors">İptal</button>
                          <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Kaydet</button>
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
