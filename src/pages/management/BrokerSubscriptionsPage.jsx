import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { brokerSubscriptionService } from '../../api/brokerSubscriptionService';
import { addonService } from '../../api/addonService';
import { paymentService } from '../../api/paymentService';
import { showSuccess, showError } from '../../utils/toastUtils';

const RESTRICTION_CONFIG = {
  NONE:         { label: 'Aktif',        icon: 'check_circle', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  WARNING:      { label: 'Uyarı',        icon: 'warning',       cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  WRITE_BLOCKED:{ label: 'Yazma Kısıtlı', icon: 'lock',         cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  FULL_READONLY:{ label: 'Tam Kısıtlı', icon: 'block',          cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';
const fmtPrice = (v) => v ? `₺${Number(v).toLocaleString('tr-TR')}` : '—';

export default function BrokerSubscriptionsPage() {
  const [brokers, setBrokers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Per-broker state: users + edit form
  const [users, setUsers] = useState({}); // { brokerId: [] }
  const [usersLoading, setUsersLoading] = useState({});
  const [editForms, setEditForms] = useState({}); // { brokerId: formData }
  const [saving, setSaving] = useState({});
  const [creditForms, setCreditForms] = useState({}); // { brokerId: {amount, note} }
  const [addingCredit, setAddingCredit] = useState({});

  // Balance history state
  const [balanceHistory, setBalanceHistory] = useState({}); // { brokerId: [] }
  const [historyLoading, setHistoryLoading] = useState({});

  // Addon state
  const [templates, setTemplates] = useState([]);
  const [brokerAddons, setBrokerAddons] = useState({}); // { brokerId: [] }
  const [addonForms, setAddonForms] = useState({}); // { brokerId: formData }
  const [addonLoading, setAddonLoading] = useState({});
  const [savingAddon, setSavingAddon] = useState({});
  const [editingAddonId, setEditingAddonId] = useState(null); // null | addonId
  const [addonEditForm, setAddonEditForm] = useState({}); // { amount, dueDate }
  const [savingAddonEdit, setSavingAddonEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [brokerList, planList, templateList] = await Promise.all([
        brokerSubscriptionService.getAllBrokerSubscriptions(),
        brokerSubscriptionService.getActivePlans(),
        addonService.getAllTemplates(),
      ]);
      setBrokers(brokerList);
      setPlans(planList);
      setTemplates(templateList);
    } catch {
      showError('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadBrokerAddons = async (brokerId) => {
    setAddonLoading(prev => ({ ...prev, [brokerId]: true }));
    try {
      const list = await addonService.getBrokerAddons(brokerId);
      setBrokerAddons(prev => ({ ...prev, [brokerId]: list }));
    } catch {
      showError('Ek ücretler yüklenemedi');
    } finally {
      setAddonLoading(prev => ({ ...prev, [brokerId]: false }));
    }
  };

  const handleAddonFormChange = (brokerId, field, value) => {
    setAddonForms(prev => ({ ...prev, [brokerId]: { ...(prev[brokerId] ?? {}), [field]: value } }));
    // Şablon seçilince alanları otomatik doldur
    if (field === 'templateId' && value) {
      const tmpl = templates.find(t => String(t.id) === String(value));
      if (tmpl) {
        setAddonForms(prev => ({
          ...prev,
          [brokerId]: {
            ...(prev[brokerId] ?? {}),
            templateId: value,
            name: tmpl.name,
            addonType: tmpl.addonType,
            amount: String(tmpl.defaultAmount),
            description: tmpl.description || '',
          }
        }));
      }
    }
  };

  const handleAddAddon = async (brokerId) => {
    const form = addonForms[brokerId] ?? {};
    setSavingAddon(prev => ({ ...prev, [brokerId]: true }));
    try {
      await addonService.addBrokerAddon(brokerId, {
        templateId: form.templateId ? Number(form.templateId) : null,
        name: form.name,
        description: form.description || null,
        addonType: form.addonType,
        amount: form.amount ? parseFloat(form.amount) : null,
        notes: form.notes || null,
        dueDate: form.addonType === 'ONE_TIME' && form.dueDate ? form.dueDate : null,
      });
      showSuccess('Ek ücret eklendi');
      setAddonForms(prev => ({ ...prev, [brokerId]: {} }));
      await loadBrokerAddons(brokerId);
      await load();
    } catch {
      showError('Ek ücret eklenemedi');
    } finally {
      setSavingAddon(prev => ({ ...prev, [brokerId]: false }));
    }
  };

  const handleRemoveAddon = async (brokerId, addonId) => {
    try {
      await addonService.removeAddon(addonId);
      showSuccess('Ek ücret kaldırıldı');
      await loadBrokerAddons(brokerId);
      await load();
    } catch {
      showError('İşlem başarısız');
    }
  };

  const handleEditAddon = (addon) => {
    setEditingAddonId(addon.id);
    setAddonEditForm({
      amount: String(addon.amount),
      dueDate: addon.dueDate || '',
    });
  };

  const handleCancelAddonEdit = () => {
    setEditingAddonId(null);
    setAddonEditForm({});
  };

  const handleSaveAddonEdit = async (brokerId, addonId) => {
    if (!addonEditForm.amount) {
      showError('Tutar gereklidir');
      return;
    }
    setSavingAddonEdit(true);
    try {
      await addonService.updateAddon(addonId, {
        amount: parseFloat(addonEditForm.amount),
        dueDate: addonEditForm.dueDate || null,
      });
      showSuccess('Ek ücret güncellendi');
      handleCancelAddonEdit();
      await loadBrokerAddons(brokerId);
      await load();
    } catch {
      showError('Güncelleme başarısız');
    } finally {
      setSavingAddonEdit(false);
    }
  };

  const handleExpand = async (broker) => {
    const id = broker.brokerId;
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);

    // Edit form başlat
    const sub = broker.subscription;
    if (sub && !editForms[id]) {
      setEditForms(prev => ({
        ...prev,
        [id]: {
          newPlanId: sub.plan?.id ?? '',
          billingCycle: sub.billingCycle ?? 'MONTHLY',
          nextPaymentDue: sub.nextPaymentDue ?? '',
          newEndDate: sub.endDate ? sub.endDate.split('T')[0] : '',
          customMaxBrokerUsers: sub.customMaxBrokerUsers ?? '',
          customMaxClientCompanies: sub.customMaxClientCompanies ?? '',
          notes: sub.notes ?? '',
        }
      }));
    }

    // Ek ücretleri yükle
    if (!brokerAddons[id]) {
      loadBrokerAddons(id);
    }

    // Bakiye geçmişini yükle
    if (!balanceHistory[id]) {
      loadBalanceHistory(id);
    }

    // Kullanıcıları yükle
    if (!users[id]) {
      setUsersLoading(prev => ({ ...prev, [id]: true }));
      try {
        const u = await brokerSubscriptionService.getCompanyUsers(id);
        setUsers(prev => ({ ...prev, [id]: u }));
      } catch {
        showError('Kullanıcılar yüklenemedi');
      } finally {
        setUsersLoading(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleFormChange = (brokerId, field, value) => {
    setEditForms(prev => ({ ...prev, [brokerId]: { ...prev[brokerId], [field]: value } }));
  };

  const handleSave = async (brokerId) => {
    const form = editForms[brokerId];
    setSaving(prev => ({ ...prev, [brokerId]: true }));
    try {
      await brokerSubscriptionService.updateBrokerSubscription(brokerId, {
        newPlanId: form.newPlanId || null,
        billingCycle: form.billingCycle || null,
        nextPaymentDue: form.nextPaymentDue || null,
        newEndDate: form.newEndDate ? form.newEndDate + 'T00:00:00' : null,
        customMaxBrokerUsers: form.customMaxBrokerUsers ? Number(form.customMaxBrokerUsers) : null,
        customMaxClientCompanies: form.customMaxClientCompanies ? Number(form.customMaxClientCompanies) : null,
        notes: form.notes || null,
      });
      showSuccess('Abonelik güncellendi');
      await load();
    } catch {
      showError('Güncelleme başarısız');
    } finally {
      setSaving(prev => ({ ...prev, [brokerId]: false }));
    }
  };

  const handleCreditFormChange = (brokerId, field, value) => {
    setCreditForms(prev => ({ ...prev, [brokerId]: { ...(prev[brokerId] ?? {}), [field]: value } }));
  };

  const loadBalanceHistory = useCallback(async (brokerId) => {
    setHistoryLoading(prev => ({ ...prev, [brokerId]: true }));
    try {
      const history = await paymentService.getBalanceHistory(brokerId);
      setBalanceHistory(prev => ({ ...prev, [brokerId]: history }));
    } catch {
      setBalanceHistory(prev => ({ ...prev, [brokerId]: [] }));
    } finally {
      setHistoryLoading(prev => ({ ...prev, [brokerId]: false }));
    }
  }, []);

  const handleAddCredit = async (brokerId) => {
    const form = creditForms[brokerId] ?? {};
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      showError('Geçerli bir tutar girin');
      return;
    }
    setAddingCredit(prev => ({ ...prev, [brokerId]: true }));
    try {
      const result = await brokerSubscriptionService.addManualCredit(brokerId, {
        amount,
        note: form.note ?? '',
      });
      showSuccess(`₺${amount.toLocaleString('tr-TR')} eklendi. Yeni bakiye: ₺${Number(result.newBalance).toLocaleString('tr-TR')}`);
      setCreditForms(prev => ({ ...prev, [brokerId]: { amount: '', note: '' } }));
      await Promise.all([load(), loadBalanceHistory(brokerId)]);
    } catch {
      showError('Kredi eklenemedi');
    } finally {
      setAddingCredit(prev => ({ ...prev, [brokerId]: false }));
    }
  };

  const handleTogglePaymentResponsible = async (brokerId, userId, current) => {
    // Sorumluluğu kaldırırken: en az 1 sorumlu kalmalı
    if (current) {
      const brokerUsers = users[brokerId] ?? [];
      const eligibleUsers = brokerUsers.filter(u => u.globalRole === 'BROKER_ADMIN' || u.globalRole === 'BROKER_USER');
      const responsibleCount = eligibleUsers.filter(u => u.isPaymentResponsible).length;
      if (responsibleCount <= 1) {
        showError('En az 1 ödeme sorumlusu tanımlı olmalıdır. Önce başka bir kullanıcıyı sorumlu yapın.');
        return;
      }
    }

    try {
      await brokerSubscriptionService.setPaymentResponsible(userId, !current);
      setUsers(prev => ({
        ...prev,
        [brokerId]: prev[brokerId].map(u =>
          u.id === userId ? { ...u, isPaymentResponsible: !current } : u
        )
      }));
      showSuccess(!current ? 'Ödeme sorumlusu atandı' : 'Ödeme sorumluluğu kaldırıldı');
    } catch {
      showError('İşlem başarısız');
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary">subscriptions</span>
            Gümrük Firmaları — Abonelik Yönetimi
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Broker firmaların ödeme planlarını, fatura döngülerini ve ödeme sorumlularını yönetin
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-gray-500 dark:text-gray-400">Yükleniyor...</p>
              </div>
            ) : brokers.length === 0 ? (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center transition-colors">
                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">business</span>
                <p className="text-gray-500 dark:text-gray-400">Gümrük firması bulunamadı</p>
              </div>
            ) : brokers.map(broker => {
              const sub = broker.subscription;
              const isOpen = expandedId === broker.brokerId;
              const cfg = sub ? (RESTRICTION_CONFIG[sub.restrictionLevel] ?? RESTRICTION_CONFIG.NONE) : null;
              const form = editForms[broker.brokerId] ?? {};
              const brokerUsers = users[broker.brokerId] ?? [];

              return (
                <div key={broker.brokerId} className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                  {/* Broker Satırı */}
                  <button
                    onClick={() => handleExpand(broker)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-center h-10 w-10 bg-primary/10 dark:bg-primary/20 rounded-full flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-xl">business</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-main truncate">{broker.brokerName}</p>
                      <p className="text-xs text-text-secondary">
                        {sub ? `${sub.plan?.name ?? '—'} · ${sub.billingCycle === 'YEARLY' ? 'Yıllık' : 'Aylık'}` : 'Abonelik yok'}
                      </p>
                    </div>

                    {/* Kısıtlama badge */}
                    {cfg && (
                      <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
                        <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
                        {cfg.label}
                      </span>
                    )}

                    {/* Ödeme tarihi */}
                    {sub?.nextPaymentDue && (
                      <div className="hidden md:block text-right flex-shrink-0">
                        <p className="text-xs text-text-secondary">Sonraki Ödeme</p>
                        <p className={`text-sm font-semibold ${sub.daysOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-text-main'}`}>
                          {fmt(sub.nextPaymentDue)}
                        </p>
                        {sub.daysOverdue > 0 && (
                          <p className="text-xs text-red-500">{sub.daysOverdue} gün gecikmiş</p>
                        )}
                      </div>
                    )}

                    <span className={`material-symbols-outlined text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {/* Genişletilmiş Panel */}
                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-6">
                      {!sub ? (
                        <p className="text-sm text-text-secondary text-center py-4">Bu firma için aktif abonelik bulunamadı.</p>
                      ) : (
                        <>
                          {/* Mevcut Durum Özeti */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: 'Plan', value: sub.plan?.name ?? '—' },
                              { label: 'Fatura Dönemi', value: sub.billingCycle === 'YEARLY' ? 'Yıllık' : 'Aylık' },
                              { label: 'Sonraki Ödeme', value: fmt(sub.nextPaymentDue) },
                              { label: 'Abonelik Bitiş', value: fmt(sub.endDate) },
                              { label: 'Plan Ücreti', value: sub.billingCycle === 'YEARLY' ? fmtPrice(sub.plan?.yearlyPrice) : fmtPrice(sub.plan?.monthlyPrice) },
                              { label: 'Max Kullanıcı', value: sub.plan?.maxBrokerUsers ?? '—' },
                              { label: 'Max Müşteri', value: sub.plan?.maxClientCompanies ?? '—' },
                              { label: 'Kısıtlama', value: cfg?.label ?? '—' },
                            ].map(({ label, value }) => (
                              <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 transition-colors">
                                <p className="text-xs text-text-secondary mb-0.5">{label}</p>
                                <p className="text-sm font-semibold text-text-main">{value}</p>
                              </div>
                            ))}
                            {/* Bakiye — tam genişlik */}
                            <div className="col-span-2 sm:col-span-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center justify-between transition-colors">
                              <div>
                                <p className="text-xs text-text-secondary mb-0.5">Mevcut Bakiye</p>
                                <p className={`text-lg font-bold ${Number(sub.balance ?? 0) > 0 ? 'text-green-700 dark:text-green-400' : 'text-text-main'}`}>
                                  ₺{Number(sub.balance ?? 0).toLocaleString('tr-TR')}
                                </p>
                              </div>
                              <span className="material-symbols-outlined text-3xl text-green-400 dark:text-green-600">account_balance_wallet</span>
                            </div>
                          </div>

                          {/* Manuel Ödeme / Kredi Ekleme */}
                          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 transition-colors">
                            <h3 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
                              <span className="material-symbols-outlined text-base text-blue-600 dark:text-blue-400">add_card</span>
                              Manuel Ödeme Ekle
                              <span className="text-xs font-normal text-text-secondary">(Bakiye otomatik uygulanır)</span>
                            </h3>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex flex-col gap-1 w-full sm:w-44">
                                <span className="text-xs font-medium text-text-secondary">Tutar (₺) *</span>
                                <input
                                  type="number" min="1" step="0.01"
                                  value={creditForms[broker.brokerId]?.amount ?? ''}
                                  onChange={e => handleCreditFormChange(broker.brokerId, 'amount', e.target.value)}
                                  placeholder="örn. 14000"
                                  className="rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                />
                              </div>
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-xs font-medium text-text-secondary">Not</span>
                                <input
                                  type="text"
                                  value={creditForms[broker.brokerId]?.note ?? ''}
                                  onChange={e => handleCreditFormChange(broker.brokerId, 'note', e.target.value)}
                                  placeholder="örn. Elden ödeme, 19 Nisan"
                                  className="rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                />
                              </div>
                              <div className="flex items-end">
                                <button
                                  onClick={() => handleAddCredit(broker.brokerId)}
                                  disabled={addingCredit[broker.brokerId]}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                                >
                                  <span className="material-symbols-outlined text-base">add</span>
                                  {addingCredit[broker.brokerId] ? 'Ekleniyor...' : 'Kredi Ekle'}
                                </button>
                              </div>
                            </div>
                            {sub.plan && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                Dönem ücreti: {fmtPrice(sub.billingCycle === 'YEARLY' ? sub.plan.yearlyPrice : sub.plan.monthlyPrice)}
                              </p>
                            )}
                          </div>

                          {/* Bakiye Hareket Geçmişi */}
                          <div>
                            <h3 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
                              <span className="material-symbols-outlined text-base text-purple-500">history</span>
                              Bakiye Hareket Geçmişi
                            </h3>
                            {historyLoading[broker.brokerId] ? (
                              <p className="text-xs text-text-secondary py-2">Yükleniyor...</p>
                            ) : !balanceHistory[broker.brokerId]?.length ? (
                              <p className="text-xs text-text-secondary py-2">Henüz işlem yok.</p>
                            ) : (
                              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-xs">
                                  <thead className="bg-gray-50 dark:bg-gray-800 text-text-secondary">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium">Tarih</th>
                                      <th className="px-3 py-2 text-left font-medium">Tür</th>
                                      <th className="px-3 py-2 text-left font-medium">Açıklama</th>
                                      <th className="px-3 py-2 text-left font-medium">İşlemi Yapan</th>
                                      <th className="px-3 py-2 text-right font-medium">Tutar</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-background-dark">
                                    {balanceHistory[broker.brokerId].map(tx => {
                                      const isCredit = tx.transactionType === 'CREDIT';
                                      const typeLabel = tx.transactionType === 'CREDIT' ? 'Kredi' : tx.transactionType === 'ADDON_DEBIT' ? 'Ek Ödeme' : 'Dönem';
                                      const typeColor = isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                      return (
                                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                          <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{new Date(tx.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                          <td className="px-3 py-2"><span className={`font-medium ${typeColor}`}>{typeLabel}</span></td>
                                          <td className="px-3 py-2 text-text-secondary max-w-xs truncate">{tx.description ?? '—'}</td>
                                          <td className="px-3 py-2 text-text-secondary">{tx.createdBy}</td>
                                          <td className={`px-3 py-2 text-right font-semibold ${typeColor}`}>
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

                          {/* Düzenleme Formu */}
                          <div>
                            <h3 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
                              <span className="material-symbols-outlined text-base text-primary">edit</span>
                              Abonelik Düzenle
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                              <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-text-secondary">Plan</span>
                                <select
                                  value={form.newPlanId ?? ''}
                                  onChange={e => handleFormChange(broker.brokerId, 'newPlanId', e.target.value)}
                                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                                >
                                  <option value="">— Mevcut planı koru —</option>
                                  {plans.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </label>

                              <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-text-secondary">Fatura Döngüsü</span>
                                <select
                                  value={form.billingCycle ?? 'MONTHLY'}
                                  onChange={e => handleFormChange(broker.brokerId, 'billingCycle', e.target.value)}
                                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                                >
                                  <option value="MONTHLY">Aylık</option>
                                  <option value="YEARLY">Yıllık</option>
                                </select>
                              </label>

                              <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-text-secondary">Sonraki Ödeme Tarihi</span>
                                <input
                                  type="date"
                                  value={form.nextPaymentDue ?? ''}
                                  onChange={e => handleFormChange(broker.brokerId, 'nextPaymentDue', e.target.value)}
                                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                                />
                              </label>

                              <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-text-secondary">Abonelik Bitiş</span>
                                <input
                                  type="date"
                                  value={form.newEndDate ?? ''}
                                  onChange={e => handleFormChange(broker.brokerId, 'newEndDate', e.target.value)}
                                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                                />
                              </label>

                              <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-text-secondary">Özel Kullanıcı Limiti</span>
                                <input
                                  type="number" min="1"
                                  value={form.customMaxBrokerUsers ?? ''}
                                  onChange={e => handleFormChange(broker.brokerId, 'customMaxBrokerUsers', e.target.value)}
                                  placeholder={`Plan: ${sub.plan?.maxBrokerUsers ?? '—'}`}
                                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                                />
                              </label>

                              <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-text-secondary">Özel Müşteri Limiti</span>
                                <input
                                  type="number" min="1"
                                  value={form.customMaxClientCompanies ?? ''}
                                  onChange={e => handleFormChange(broker.brokerId, 'customMaxClientCompanies', e.target.value)}
                                  placeholder={`Plan: ${sub.plan?.maxClientCompanies ?? '—'}`}
                                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                                />
                              </label>

                              <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                                <span className="text-xs font-medium text-text-secondary">Notlar</span>
                                <input
                                  type="text"
                                  value={form.notes ?? ''}
                                  onChange={e => handleFormChange(broker.brokerId, 'notes', e.target.value)}
                                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                                  placeholder="İç not..."
                                />
                              </label>
                            </div>

                            <div className="flex justify-end mt-3">
                              <button
                                onClick={() => handleSave(broker.brokerId)}
                                disabled={saving[broker.brokerId]}
                                className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-base">save</span>
                                {saving[broker.brokerId] ? 'Kaydediliyor...' : 'Kaydet'}
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Ek Ücretler */}
                      <div>
                        <h3 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-base text-primary">receipt_long</span>
                          Ek Ücretler
                          {sub && (Number(sub.recurringAddonTotal ?? 0) > 0 || Number(sub.pendingOneTimeTotal ?? 0) > 0) && (
                            <span className="text-xs font-normal text-text-secondary">
                              {Number(sub.recurringAddonTotal ?? 0) > 0 && `+₺${Number(sub.recurringAddonTotal).toLocaleString('tr-TR')}/dönem`}
                              {Number(sub.pendingOneTimeTotal ?? 0) > 0 && ` · ₺${Number(sub.pendingOneTimeTotal).toLocaleString('tr-TR')} bekleyen`}
                            </span>
                          )}
                        </h3>

                        {addonLoading[broker.brokerId] ? (
                          <div className="text-sm text-text-secondary py-2 flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            Yükleniyor...
                          </div>
                        ) : (
                          <div className="space-y-2 mb-4">
                            {(brokerAddons[broker.brokerId] ?? []).filter(a => a.isActive).length === 0 ? (
                              <p className="text-xs text-text-secondary italic">Aktif ek ücret yok</p>
                            ) : (brokerAddons[broker.brokerId] ?? []).filter(a => a.isActive).map(addon => (
                              <div key={addon.id} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2.5 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
                                    addon.addonType === 'RECURRING'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : addon.isPaid
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                  }`}>
                                    {addon.addonType === 'RECURRING' ? 'Dönemsel' : addon.isPaid ? 'Ödendi' : 'Bekliyor'}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-text-main truncate">{addon.name}</p>
                                    {addon.description && <p className="text-xs text-text-secondary truncate">{addon.description}</p>}
                                    {addon.addonType === 'ONE_TIME' && addon.dueDate && (
                                      <p className={`text-xs font-medium mt-0.5 ${
                                        new Date(addon.dueDate) < new Date()
                                          ? 'text-red-600 dark:text-red-400'
                                          : 'text-orange-600 dark:text-orange-400'
                                      }`}>
                                        Son ödeme: {new Date(addon.dueDate).toLocaleDateString('tr-TR')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {editingAddonId === addon.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={addonEditForm.amount}
                                        onChange={e => setAddonEditForm(prev => ({ ...prev, amount: e.target.value }))}
                                        className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-main focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                                        placeholder="₺"
                                      />
                                      {addon.addonType === 'ONE_TIME' && (
                                        <input
                                          type="date"
                                          value={addonEditForm.dueDate}
                                          onChange={e => setAddonEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-main focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                                        />
                                      )}
                                      <button
                                        onClick={() => handleSaveAddonEdit(broker.brokerId, addon.id)}
                                        disabled={savingAddonEdit}
                                        className="text-green-600 hover:text-green-700 dark:hover:text-green-400 transition-colors disabled:opacity-50"
                                        title="Kaydet"
                                      >
                                        <span className="material-symbols-outlined text-base">check</span>
                                      </button>
                                      <button
                                        onClick={handleCancelAddonEdit}
                                        disabled={savingAddonEdit}
                                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 transition-colors disabled:opacity-50"
                                        title="İptal"
                                      >
                                        <span className="material-symbols-outlined text-base">close</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm font-semibold text-text-main">₺{Number(addon.amount).toLocaleString('tr-TR')}</p>
                                      <button
                                        onClick={() => handleEditAddon(addon)}
                                        className="text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                                        title="Düzenle"
                                      >
                                        <span className="material-symbols-outlined text-base">edit</span>
                                      </button>
                                      <button
                                        onClick={() => handleRemoveAddon(broker.brokerId, addon.id)}
                                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                                        title="Kaldır"
                                      >
                                        <span className="material-symbols-outlined text-base">delete</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Ek ücret ekleme formu */}
                        <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 space-y-3">
                          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Yeni Ek Ücret</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-text-secondary">Katalogdan Seç</span>
                              <select
                                value={addonForms[broker.brokerId]?.templateId ?? ''}
                                onChange={e => handleAddonFormChange(broker.brokerId, 'templateId', e.target.value)}
                                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                              >
                                <option value="">— Özel tanım —</option>
                                {templates.filter(t => t.isActive).map(t => (
                                  <option key={t.id} value={t.id}>{t.name} ({t.addonType === 'RECURRING' ? 'Dönemsel' : 'Tek Seferlik'}) — ₺{Number(t.defaultAmount).toLocaleString('tr-TR')}</option>
                                ))}
                              </select>
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-text-secondary">Ad *</span>
                              <input
                                type="text"
                                value={addonForms[broker.brokerId]?.name ?? ''}
                                onChange={e => handleAddonFormChange(broker.brokerId, 'name', e.target.value)}
                                placeholder="Ek ücret adı"
                                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-text-secondary">Tür *</span>
                              <select
                                value={addonForms[broker.brokerId]?.addonType ?? ''}
                                onChange={e => handleAddonFormChange(broker.brokerId, 'addonType', e.target.value)}
                                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                              >
                                <option value="">— Seçin —</option>
                                <option value="ONE_TIME">Tek Seferlik</option>
                                <option value="RECURRING">Dönemsel (her dönem)</option>
                              </select>
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-text-secondary">Tutar (₺) *</span>
                              <input
                                type="number" min="1" step="0.01"
                                value={addonForms[broker.brokerId]?.amount ?? ''}
                                onChange={e => handleAddonFormChange(broker.brokerId, 'amount', e.target.value)}
                                placeholder="0.00"
                                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                              />
                            </label>
                            <label className="flex flex-col gap-1 sm:col-span-2">
                              <span className="text-xs font-medium text-text-secondary">Not / Açıklama</span>
                              <input
                                type="text"
                                value={addonForms[broker.brokerId]?.notes ?? ''}
                                onChange={e => handleAddonFormChange(broker.brokerId, 'notes', e.target.value)}
                                placeholder="isteğe bağlı"
                                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                              />
                            </label>
                            {(addonForms[broker.brokerId]?.addonType === 'ONE_TIME') && (
                              <label className="flex flex-col gap-1 sm:col-span-2">
                                <span className="text-xs font-medium text-text-secondary">Son Ödeme Tarihi</span>
                                <input
                                  type="date"
                                  value={addonForms[broker.brokerId]?.dueDate ?? ''}
                                  onChange={e => handleAddonFormChange(broker.brokerId, 'dueDate', e.target.value)}
                                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                                />
                              </label>
                            )}
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleAddAddon(broker.brokerId)}
                              disabled={savingAddon[broker.brokerId]}
                              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-base">add</span>
                              {savingAddon[broker.brokerId] ? 'Ekleniyor...' : 'Ekle'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Ödeme Sorumluları */}
                      <div>
                        <h3 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-base text-primary">manage_accounts</span>
                          Ödeme Sorumluları
                        </h3>

                        {usersLoading[broker.brokerId] ? (
                          <div className="flex items-center gap-2 py-4 text-text-secondary text-sm">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            Kullanıcılar yükleniyor...
                          </div>
                        ) : brokerUsers.length === 0 ? (
                          <p className="text-sm text-text-secondary py-2">Kullanıcı bulunamadı</p>
                        ) : (
                          <div className="space-y-2">
                            {brokerUsers
                              .filter(u => u.globalRole === 'BROKER_ADMIN' || u.globalRole === 'BROKER_USER')
                              .map(u => (
                                <div key={u.id} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2.5 transition-colors">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex items-center justify-center h-8 w-8 bg-primary/10 dark:bg-primary/20 rounded-full flex-shrink-0">
                                      <span className="material-symbols-outlined text-primary text-base">person</span>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-text-main truncate">{u.username}</p>
                                      <p className="text-xs text-text-secondary truncate">{u.email}</p>
                                    </div>
                                    <span className="text-xs text-text-secondary bg-white dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 flex-shrink-0">
                                      {u.globalRole === 'BROKER_ADMIN' ? 'Admin' : 'Kullanıcı'}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => handleTogglePaymentResponsible(broker.brokerId, u.id, u.isPaymentResponsible)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                                      u.isPaymentResponsible
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                    title={u.isPaymentResponsible ? 'Ödeme sorumluluğunu kaldır' : 'Ödeme sorumlusu yap'}
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      {u.isPaymentResponsible ? 'account_balance_wallet' : 'add'}
                                    </span>
                                    {u.isPaymentResponsible ? 'Sorumlu' : 'Sorumlu Değil'}
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
