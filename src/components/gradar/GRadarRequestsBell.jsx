import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { gRadarService } from '../../api/gRadarService';
import { showSuccess, showError, showWarning } from '../../utils/toastUtils';
import { confirmDialog } from '../../utils/confirmDialog';
import { isGRadarDisableRequest } from '../../utils/constants';
import { isGRadarCreditShortage, showGRadarCreditShortage } from '../../utils/gRadarCreditGuidance';
import GRadarRequestTypeBadge from './GRadarRequestTypeBadge';
import { t, getCurrentLocale } from '../../locales';

/**
 * Header bell + popover that lists PENDING G-Radar requests filed by
 * BROKER_USERs — both "turn tracking on" (ENABLE) and "turn tracking off"
 * (DISABLE) requests, each row labelled with a type badge.
 *  - BROKER_ADMIN: requests for their own broker, with approve / reject
 *    actions. They are the audience the original notification flow
 *    targets, so the badge is the active to-do indicator.
 *  - SUPER_ADMIN: read-only oversight pool — requests across EVERY broker,
 *    no action buttons. Notifications themselves still stay scoped to
 *    broker admins (the people who can actually act); this is purely
 *    visibility for dev.
 *
 * Kapatma talebinde "Onayla + Bilgileri Getir" yok (çekilecek bir şey yok) ve onay
 * takibi kapattığı için önce onay penceresi açılır. Yük talepten sonra zaten hedef
 * duruma geldiyse (yönetici doğrudan açtı / kapattı) backend onayı reddeder, talep
 * beklemede kalır; mesaj normal hata bildirimi olarak gösterilir.
 *
 * Polling: every 10 minutes while mounted. The upstream changes infrequently
 * (humans typing notes) so anything tighter just adds chatter.
 */
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Onay penceresi ayrı bir React kökünde, popover'ın dışında çiziliyor: içindeki
// tıklama ya da ESC popover'ı kapatmasın.
const CONFIRM_DIALOG_SELECTOR = '[data-confirm-dialog]';

export default function GRadarRequestsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEligible = user?.globalRole === 'BROKER_ADMIN' || user?.globalRole === 'SUPER_ADMIN';
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';

  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actingId, setActingId] = useState(null);
  const wrapperRef = useRef(null);

  const load = useCallback(async () => {
    if (!isEligible) return;
    setLoading(true);
    const res = await gRadarService.listPendingRequests();
    setLoading(false);
    if (res.success) {
      setRequests(res.data?.requests || []);
    }
  }, [isEligible]);

  // Initial load + periodic refresh (10 min — the underlying request stream
  // changes slowly, no need for a hot poll loop).
  useEffect(() => {
    if (!isEligible) return;
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isEligible, load]);

  // Outside click + ESC close
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (e.target.closest?.(CONFIRM_DIALOG_SELECTOR)) return;
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setRejectingId(null);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.querySelector(CONFIRM_DIALOG_SELECTOR)) {
        setOpen(false);
        setRejectingId(null);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!isEligible) return null;

  const approve = async (request, fetchImmediately) => {
    const { id } = request;
    const isDisable = isGRadarDisableRequest(request);
    setActingId(id);
    try {
      if (isDisable) {
        const ok = await confirmDialog({
          title: t('gRadarAdmin.requests.approveDisableTitle'),
          message: t('gRadarAdmin.requests.approveDisableMessage', {
            identifier: request.cargoIdentifier || t('gRadarAdmin.requests.cargoFallback', { id: request.cargoId }),
          }),
          details: [
            t('gRadarAdmin.requests.approveDisableKeepsData'),
            t('gRadarAdmin.requests.approveDisableCredit'),
          ],
          intent: 'danger',
          icon: 'toggle_off',
          confirmText: t('gRadarAdmin.requests.approveDisableConfirm'),
        });
        if (!ok) return;
      }
      // Kapatma talebinde bilgi çekilecek bir şey yok; backend de fetchImmediately'yi yok sayıyor.
      const res = await gRadarService.approveRequest(id, {
        fetchImmediately: isDisable ? false : fetchImmediately,
      });
      if (res.success) {
        const message = res.data?.message
          || t(isDisable ? 'gRadarAdmin.requests.approvedDisable' : 'gRadarAdmin.requests.approved');
        // Onay kaydedildi ama bilgiler çekilemedi: kredi yetmediyse nedeni ve (yöneticiye) satın alma yolu,
        // başka bir nedenle genel uyarı.
        const fetchFailed = !isDisable && fetchImmediately && res.data?.fetched === false;
        if (fetchFailed && isGRadarCreditShortage(res.data?.fetchFailureCode)) {
          showGRadarCreditShortage({ user, navigate, context: 'approved' });
        } else if (fetchFailed) {
          showWarning(message);
        } else {
          showSuccess(message);
        }
        load();
      } else {
        showError(res.error);
      }
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id) => {
    if (!rejectReason.trim()) {
      showError(t('adminCommon.rejectionReasonRequired'));
      return;
    }
    setActingId(id);
    const res = await gRadarService.rejectRequest(id, rejectReason.trim());
    setActingId(null);
    if (res.success) {
      showSuccess(t('gRadarAdmin.requests.rejected'));
      setRejectingId(null);
      setRejectReason('');
      load();
    } else {
      showError(res.error);
    }
  };

  const count = requests.length;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center h-10 w-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={t('gRadarAdmin.requests.title')}
        aria-label={t('gRadarAdmin.requests.title')}
      >
        <span className="material-symbols-outlined text-text-secondary">travel_explore</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-[420px] max-h-[520px] overflow-y-auto bg-white dark:bg-background-dark rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-background-dark">
            <h3 className="font-semibold text-text-main text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">travel_explore</span>
              {t('gRadarAdmin.requests.title')}
            </h3>
            <button
              onClick={load}
              disabled={loading}
              className="text-xs text-text-secondary hover:text-text-main disabled:opacity-50"
            >
              {loading ? t('adminCommon.refreshing') : t('adminCommon.refresh')}
            </button>
          </div>

          {loading && requests.length === 0 ? (
            <p className="text-center text-text-secondary text-sm py-8">{t('common.loading')}</p>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 px-4">
              <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-1 block">
                inbox
              </span>
              <p className="text-sm text-text-secondary">{t('gRadarAdmin.requests.empty')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {requests.map((r) => {
                const isDisable = isGRadarDisableRequest(r);
                return (
                  <div key={r.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-main truncate">
                          {r.cargoVehicleType === 'AIRPLANE' ? '✈️' : '🚢'} {r.cargoIdentifier || t('gRadarAdmin.requests.cargoFallback', { id: r.cargoId })}
                        </p>
                        {/* SUPER_ADMIN sees requests across every broker — show
                            which one this belongs to so the pool view is
                            legible. BROKER_ADMIN always sees just their own
                            broker, so the line is hidden. */}
                        {isSuperAdmin && r.brokerCompanyName && (
                          <p className="text-[11px] text-primary font-medium">
                            {r.brokerCompanyName}
                          </p>
                        )}
                        <p className="text-[11px] text-text-secondary">
                          {r.requestedByUsername || r.requestedByEmail || t('gRadarAdmin.requests.unknownUser')}
                          {' · '}
                          {new Date(r.requestedAt).toLocaleString(getCurrentLocale())}
                        </p>
                      </div>
                      <GRadarRequestTypeBadge requestType={r.requestType} className="flex-shrink-0 mt-0.5" />
                    </div>
                    {r.notes && (
                      <p className="text-xs italic text-text-secondary border-l-2 border-primary/40 pl-2">
                        "{r.notes}"
                      </p>
                    )}
                    {isSuperAdmin ? (
                      // Read-only oversight pool — broker admins are the only
                      // ones who can act, SuperAdmin just watches.
                      <p className="text-[11px] text-text-secondary italic">
                        {t('gRadarAdmin.requests.viewOnly')}
                      </p>
                    ) : rejectingId === r.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder={t('adminCommon.rejectionReasonPlaceholder')}
                          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason(''); }}
                            className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-main"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            onClick={() => reject(r.id)}
                            disabled={actingId === r.id}
                            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50"
                          >
                            {actingId === r.id ? '...' : t('payment.reject')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => approve(r, false)}
                          disabled={actingId === r.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                          title={isDisable
                            ? t('gRadarAdmin.requests.approveDisableHint')
                            : t('gRadarAdmin.requests.approveHint')}
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                          {t('payment.confirm')}
                        </button>
                        {!isDisable && (
                          <button
                            onClick={() => approve(r, true)}
                            disabled={actingId === r.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-primary hover:opacity-90 text-white rounded-lg font-medium disabled:opacity-50"
                            title={t('gRadarAdmin.requests.approveAndFetchHint')}
                          >
                            <span className="material-symbols-outlined text-sm">download</span>
                            {t('gRadarAdmin.requests.approveAndFetch')}
                          </button>
                        )}
                        <button
                          onClick={() => setRejectingId(r.id)}
                          disabled={actingId === r.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                          {t('payment.reject')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
