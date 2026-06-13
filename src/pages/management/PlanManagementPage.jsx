import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { planService } from '../../api/planService';
import { brokerSubscriptionService } from '../../api/brokerSubscriptionService';
import { showSuccess, showError } from '../../utils/toastUtils';

const EMPTY_FORM = {
  name: '',
  description: '',
  maxBrokerUsers: '',
  maxClientCompanies: '',
  monthlyPrice: '',
  yearlyPrice: '',
  shipsGoPricePerCreditUsd: '',
};

const fmtPrice = (v) =>
  v != null && v !== '' && Number(v) > 0
    ? `₺${Number(v).toLocaleString('tr-TR')}`
    : '—';

// Plana göre renk tonu — id'nin moduna bakarak 5 farklı renk döndürür
const PLAN_ACCENTS = [
  { border: 'border-l-violet-500', icon: 'text-violet-500', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  { border: 'border-l-blue-500',   icon: 'text-blue-500',   badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { border: 'border-l-emerald-500',icon: 'text-emerald-500',badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { border: 'border-l-amber-500',  icon: 'text-amber-500',  badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { border: 'border-l-rose-500',   icon: 'text-rose-500',   badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
];

function accentFor(id) {
  return PLAN_ACCENTS[Number(id) % PLAN_ACCENTS.length];
}

function StatCard({ icon, label, value, color = 'text-primary' }) {
  return (
    <div className="bg-white dark:bg-background-dark rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex items-center gap-4 transition-colors">
      <span className={`material-symbols-outlined text-3xl ${color}`}>{icon}</span>
      <div>
        <p className="text-xs text-text-secondary font-medium">{label}</p>
        <p className="text-2xl font-bold text-text-main">{value}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Plan Form Modal ───────────────────────── */
function PlanFormModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState(
    plan
      ? {
          name: plan.name || '',
          description: plan.description || '',
          maxBrokerUsers: String(plan.maxBrokerUsers ?? ''),
          maxClientCompanies: String(plan.maxClientCompanies ?? ''),
          monthlyPrice: String(plan.monthlyPrice ?? ''),
          yearlyPrice: String(plan.yearlyPrice ?? ''),
          shipsGoPricePerCreditUsd: String(plan.shipsGoPricePerCreditUsd ?? ''),
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return showError('Plan adı zorunludur');
    if (!form.maxBrokerUsers || Number(form.maxBrokerUsers) < 1)
      return showError('Maksimum kullanıcı sayısı 1 veya daha fazla olmalıdır');
    if (!form.maxClientCompanies || Number(form.maxClientCompanies) < 1)
      return showError('Maksimum müşteri firma sayısı 1 veya daha fazla olmalıdır');

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        maxBrokerUsers: Number(form.maxBrokerUsers),
        maxClientCompanies: Number(form.maxClientCompanies),
        monthlyPrice: form.monthlyPrice ? Number(form.monthlyPrice) : null,
        yearlyPrice: form.yearlyPrice ? Number(form.yearlyPrice) : null,
        // ShipsGo kredi başı USD ücreti. Boş gönderirsek bu plan ShipsGo'yu
        // hiç desteklemiyor demek; brokerlar satın alma sayfasında "ShipsGo
        // bu plana dahil değil" mesajı görür.
        shipsGoPricePerCreditUsd: form.shipsGoPricePerCreditUsd
          ? Number(form.shipsGoPricePerCreditUsd)
          : null,
      };
      if (plan) {
        await planService.updatePlan(plan.id, payload);
        showSuccess('Plan güncellendi');
      } else {
        await planService.createPlan(payload);
        showSuccess('Plan oluşturuldu');
      }
      onSaved();
    } catch {
      showError('İşlem başarısız');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-text-main flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              {plan ? 'edit' : 'add_circle'}
            </span>
            {plan ? 'Planı Düzenle' : 'Yeni Plan Oluştur'}
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-main transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-secondary">Plan Adı *</span>
            <input
              type="text" value={form.name} onChange={set('name')}
              placeholder="örn. Başlangıç, Profesyonel, Kurumsal"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-secondary">Açıklama</span>
            <input
              type="text" value={form.description} onChange={set('description')}
              placeholder="isteğe bağlı"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">Maks. Kullanıcı *</span>
              <input
                type="number" min="1" value={form.maxBrokerUsers} onChange={set('maxBrokerUsers')}
                placeholder="5"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">Maks. Müşteri Firma *</span>
              <input
                type="number" min="1" value={form.maxClientCompanies} onChange={set('maxClientCompanies')}
                placeholder="20"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">Aylık Fiyat (₺)</span>
              <input
                type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={set('monthlyPrice')}
                placeholder="0.00"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">Yıllık Fiyat (₺)</span>
              <input
                type="number" min="0" step="0.01" value={form.yearlyPrice} onChange={set('yearlyPrice')}
                placeholder="0.00"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-secondary">
              ShipsGo — Kredi Başı USD Fiyatı
            </span>
            <input
              type="number" min="0" step="0.01" value={form.shipsGoPricePerCreditUsd}
              onChange={set('shipsGoPricePerCreditUsd')}
              placeholder="örn. 2.50"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
            <span className="text-[11px] text-text-secondary">
              Boş bırakırsanız bu plan ShipsGo'yu desteklemez. Satın alma anında güncel TCMB kuruyla ₺'ye çevrilir.
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">save</span>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Deactivate Modal ───────────────────────── */
function DeactivateModal({ plan, subscribers, allActivePlans, onClose, onConfirm }) {
  const otherPlans = allActivePlans.filter((p) => p.id !== plan.id);
  const [migrationMap, setMigrationMap] = useState({});
  const [confirming, setConfirming] = useState(false);

  const setTarget = (brokerId, planId) =>
    setMigrationMap((prev) => ({ ...prev, [brokerId]: planId }));

  const allAssigned =
    subscribers.length === 0 ||
    subscribers.every((s) => migrationMap[s.brokerId]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm(migrationMap);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <span className="material-symbols-outlined text-2xl text-red-500">warning</span>
          <h2 className="text-base font-bold text-text-main">Planı Pasife Al — "{plan.name}"</h2>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {subscribers.length === 0 ? (
            <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                Bu plana bağlı aktif gümrük firması yok. Güvenle pasife alabilirsiniz.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                <span className="material-symbols-outlined text-amber-500 mt-0.5">info</span>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>{subscribers.length} gümrük firması</strong> bu planı kullanıyor. Pasife almadan önce
                  her firmanın taşınacağı planı seçin.
                </p>
              </div>
              <div className="space-y-2">
                {subscribers.map((sub) => (
                  <div
                    key={sub.brokerId}
                    className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-base text-text-secondary flex-shrink-0">business</span>
                      <span className="text-sm font-medium text-text-main truncate">{sub.brokerName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="material-symbols-outlined text-base text-text-secondary">arrow_forward</span>
                      <select
                        value={migrationMap[sub.brokerId] || ''}
                        onChange={(e) => setTarget(sub.brokerId, e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors min-w-[160px]"
                      >
                        <option value="">— Plan seç —</option>
                        {otherPlans.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              {!allAssigned && (
                <p className="text-xs text-red-500 dark:text-red-400 text-center">
                  Tüm firmalar için hedef plan seçilmelidir.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm} disabled={!allAssigned || confirming}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">
              {confirming ? 'hourglass_empty' : 'visibility_off'}
            </span>
            {confirming ? 'İşleniyor...' : 'Pasife Al'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Plan Card ───────────────────────── */
function PlanCard({ plan, subscriberCount, subscriberList, onEdit, onDeactivate }) {
  const [expanded, setExpanded] = useState(false);
  const accent = accentFor(plan.id);

  return (
    <div
      className={`
        bg-white dark:bg-background-dark rounded-2xl shadow-sm border border-gray-100
        dark:border-gray-700 border-l-4 ${accent.border}
        transition-colors flex flex-col self-start
        ${!plan.isActive ? 'opacity-55' : ''}
      `}
    >
      {/* ── Başlık Satırı ── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-1">
              Abonelik Planı
            </p>
            <h3 className="text-lg font-bold text-text-main leading-tight truncate">{plan.name}</h3>
            {plan.description && (
              <p className="text-xs text-text-secondary mt-1 leading-relaxed line-clamp-2">
                {plan.description}
              </p>
            )}
          </div>
          <span
            className={`flex-shrink-0 mt-0.5 inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              plan.isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {plan.isActive ? 'Aktif' : 'Pasif'}
          </span>
        </div>
      </div>

      {/* ── Fiyat Bölümü ── */}
      <div className="mx-5 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-text-secondary mb-0.5">Aylık</p>
          <p className={`text-base font-bold ${accent.icon}`}>{fmtPrice(plan.monthlyPrice)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-text-secondary mb-0.5">Yıllık</p>
          <p className={`text-base font-bold ${accent.icon}`}>{fmtPrice(plan.yearlyPrice)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-text-secondary mb-0.5">ShipsGo/kr.</p>
          <p className={`text-base font-bold ${accent.icon}`}>
            {plan.shipsGoPricePerCreditUsd != null && Number(plan.shipsGoPricePerCreditUsd) > 0
              ? `$${Number(plan.shipsGoPricePerCreditUsd).toFixed(2)}`
              : '—'}
          </p>
        </div>
      </div>

      {/* ── Limit Satırı ── */}
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-text-secondary">
          <span className="material-symbols-outlined text-[18px]">group</span>
          <span className="text-xs"><span className="font-semibold text-text-main">{plan.maxBrokerUsers}</span> kullanıcı</span>
        </div>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
        <div className="flex items-center gap-1.5 text-text-secondary">
          <span className="material-symbols-outlined text-[18px]">corporate_fare</span>
          <span className="text-xs"><span className="font-semibold text-text-main">{plan.maxClientCompanies}</span> müşteri firma</span>
        </div>
      </div>

      {/* ── Gümrük Firmaları Bölümü ── */}
      <div className="border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => subscriberCount > 0 && setExpanded((v) => !v)}
          className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${
            subscriberCount > 0
              ? 'hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer'
              : 'cursor-default'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-text-secondary">domain</span>
            <span className="text-xs font-medium text-text-secondary">Gümrük Firmaları</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                subscriberCount > 0
                  ? `${accent.badge}`
                  : 'bg-gray-100 dark:bg-gray-700/60 text-text-secondary'
              }`}
            >
              {subscriberCount}
            </span>
            {subscriberCount > 0 && (
              <span
                className={`material-symbols-outlined text-[18px] text-text-secondary transition-transform duration-200 ${
                  expanded ? 'rotate-180' : ''
                }`}
              >
                keyboard_arrow_down
              </span>
            )}
          </div>
        </button>

        {/* Firma listesi — expanded olunca görünür */}
        {expanded && subscriberCount > 0 && (
          <div className="px-5 pb-3 space-y-1.5">
            {subscriberList.map((b) => (
              <div
                key={b.brokerId}
                className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[15px] text-text-secondary flex-shrink-0">
                    business
                  </span>
                  <span className="text-xs font-medium text-text-main truncate">{b.brokerName}</span>
                </div>
                <span className="text-[11px] text-text-secondary flex-shrink-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5">
                  {b.billingCycle === 'MONTHLY' ? 'Aylık' : 'Yıllık'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Aksiyon Butonları ── */}
      {plan.isActive && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(plan)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">edit</span>
            Düzenle
          </button>
          <button
            onClick={() => onDeactivate(plan)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">visibility_off</span>
            Pasife Al
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Ana Sayfa ───────────────────────── */
export default function PlanManagementPage() {
  const [plans, setPlans] = useState([]);
  const [allSubscriptions, setAllSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateSubscribers, setDeactivateSubscribers] = useState([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, subsData] = await Promise.all([
        planService.getAllPlans(),
        brokerSubscriptionService.getAllBrokerSubscriptions(),
      ]);
      setPlans(plansData);
      setAllSubscriptions(subsData);
    } catch {
      showError('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Plan bazında broker listesi
  const subscribersByPlan = useMemo(() => {
    const map = {};
    allSubscriptions.forEach((broker) => {
      const planId = broker.subscription?.plan?.id;
      if (!planId) return;
      if (!map[planId]) map[planId] = [];
      map[planId].push({
        brokerId: broker.brokerId,
        brokerName: broker.brokerName,
        billingCycle: broker.subscription?.billingCycle,
      });
    });
    return map;
  }, [allSubscriptions]);

  const activePlans  = plans.filter((p) => p.isActive);
  const inactivePlans = plans.filter((p) => !p.isActive);
  const totalBrokers = allSubscriptions.filter((b) => b.subscription).length;

  const handleEdit = (plan) => { setEditingPlan(plan); setShowForm(true); };
  const handleNewPlan = () => { setEditingPlan(null); setShowForm(true); };
  const handleFormClose = () => { setShowForm(false); setEditingPlan(null); };
  const handleFormSaved = () => { handleFormClose(); load(); };

  const handleDeactivateClick = async (plan) => {
    setLoadingSubscribers(true);
    setDeactivateTarget(plan);
    try {
      const result = await planService.getPlanSubscribers(plan.id);
      setDeactivateSubscribers(result.subscribers || []);
    } catch {
      showError('Abone bilgileri alınamadı');
      setDeactivateTarget(null);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const handleDeactivateConfirm = async (migrationMap) => {
    try {
      for (const [brokerId, newPlanId] of Object.entries(migrationMap)) {
        await brokerSubscriptionService.updateBrokerSubscription(brokerId, {
          newPlanId: Number(newPlanId),
        });
      }
      await planService.deactivatePlan(deactivateTarget.id);
      showSuccess(`"${deactivateTarget.name}" planı pasife alındı`);
      setDeactivateTarget(null);
      setDeactivateSubscribers([]);
      load();
    } catch (err) {
      showError(err?.response?.data?.error || 'İşlem başarısız');
    }
  };

  const handleDeactivateClose = () => {
    setDeactivateTarget(null);
    setDeactivateSubscribers([]);
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 flex items-center justify-between transition-colors">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-primary">workspace_premium</span>
              Plan Yönetimi
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Abonelik planlarını görüntüle, düzenle ve yönet
            </p>
          </div>
          <button
            onClick={handleNewPlan}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Yeni Plan
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* İstatistik Kartları */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon="layers"        label="Toplam Plan"          value={plans.length} />
            <StatCard icon="check_circle"  label="Aktif Plan"           value={activePlans.length}   color="text-green-500" />
            <StatCard icon="domain"        label="Aktif Gümrük Firması" value={totalBrokers}         color="text-blue-500" />
            <StatCard icon="visibility_off" label="Pasif Plan"          value={inactivePlans.length} color="text-gray-400" />
          </div>

          {/* İçerik */}
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-gray-500 dark:text-gray-400">Yükleniyor...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center transition-colors">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">
                workspace_premium
              </span>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Henüz plan yok. Yeni Plan butonundan ekleyebilirsiniz.
              </p>
              <button
                onClick={handleNewPlan}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-base">add</span>
                İlk Planı Oluştur
              </button>
            </div>
          ) : (
            <>
              {/* Aktif Planlar */}
              {activePlans.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-base text-green-500">check_circle</span>
                    <h2 className="text-sm font-semibold text-text-secondary">
                      Aktif Planlar ({activePlans.length})
                    </h2>
                  </div>
                  {/* items-start: her kart kendi yüksekliğinde kalır, diğerinden etkilenmez */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                    {activePlans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        subscriberCount={(subscribersByPlan[plan.id] || []).length}
                        subscriberList={subscribersByPlan[plan.id] || []}
                        onEdit={handleEdit}
                        onDeactivate={handleDeactivateClick}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Pasif Planlar */}
              {inactivePlans.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-base text-gray-400">visibility_off</span>
                    <h2 className="text-sm font-semibold text-text-secondary">
                      Pasif Planlar ({inactivePlans.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                    {inactivePlans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        subscriberCount={0}
                        subscriberList={[]}
                        onEdit={handleEdit}
                        onDeactivate={handleDeactivateClick}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Abone listesi yükleniyor overlay */}
      {loadingSubscribers && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-background-dark rounded-xl p-6 shadow-xl flex items-center gap-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <p className="text-text-main text-sm font-medium">Abone bilgileri alınıyor...</p>
          </div>
        </div>
      )}

      {/* Plan Oluştur / Düzenle Modal */}
      {showForm && (
        <PlanFormModal plan={editingPlan} onClose={handleFormClose} onSaved={handleFormSaved} />
      )}

      {/* Pasife Al Modal */}
      {deactivateTarget && !loadingSubscribers && (
        <DeactivateModal
          plan={deactivateTarget}
          subscribers={deactivateSubscribers}
          allActivePlans={activePlans}
          onClose={handleDeactivateClose}
          onConfirm={handleDeactivateConfirm}
        />
      )}
    </MainLayout>
  );
}
