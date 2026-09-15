import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { gRadarService } from '../../api/gRadarService';
import { showSuccess, showError } from '../../utils/toastUtils';
import { confirmDialog } from '../../utils/confirmDialog';
import {
  extractMovementGroups,
  countMovements,
  gRadarStatusInfo,
} from '../../utils/gRadarLabels';
import { describeLivePosition } from '../../utils/gRadarRoute';
import CargoMap from './CargoMap';
import { t, getCurrentLocale } from '../../locales';

/**
 * Slide-in panel that shows the live G-Radar data for a single cargo.
 *
 * Reads everything from the cached GET /api/g-radar/cargo/{id}/details so
 * opening the drawer never costs a credit. The "Yenile" button hits POST
 * /refresh which is also free — it just asks the backend to re-pull from
 * G-Radar right now instead of waiting for the next sync cycle.
 *
 * Open / close is driven by the parent via the `cargo` prop: passing null
 * closes (with the slide-out animation falling through naturally).
 *
 * `canManage` (BROKER_ADMIN / SUPER_ADMIN, read-only değil) footer'da
 * "Takibi kapat" ve — Yenile, G-Radar'ın takip kaydını bulamadığını
 * bildirdiğinde — "Takibi yeniden başlat" düğmelerini açar. Tablo bu durumda
 * kurtarma yolu sunamıyor: fetch, takip kimliği dolu yükü atlıyor.
 * `onChanged` bu işlemlerden sonra sayfanın listesini yeniletir.
 */
export default function GRadarDetailsDrawer({
  cargo,
  onClose,
  onChanged,
  canRefresh = true,
  canManage = false,
}) {
  const isOpen = !!cargo;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Yenile, G-Radar'ın bu yükün takip kaydını bulamadığını söyledi mi.
  const [shipmentMissing, setShipmentMissing] = useState(false);
  // 'disable' | 'restart' | null — çalışan işlem. Ref, onay penceresi açılmadan
  // gelen ikinci tıklamayı da engelliyor (state güncellemesi bir render geç kalır).
  const [busyAction, setBusyAction] = useState(null);
  const busyRef = useRef(false);

  const load = useCallback(async (cargoId) => {
    if (!cargoId) return;
    setLoading(true);
    const res = await gRadarService.getCargoDetails(cargoId);
    setLoading(false);
    if (res.success) {
      setDetails(res.data);
    } else {
      setDetails(null);
      showError(res.error || t('cargoTracking.drawer.loadError'));
    }
  }, []);

  useEffect(() => {
    setShipmentMissing(false);
    if (cargo?.id) {
      load(cargo.id);
    } else {
      setDetails(null);
    }
  }, [cargo?.id, load]);

  // ESC closes the drawer (matches the surrounding modal pattern)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleRefresh = async () => {
    if (!cargo?.id) return;
    setRefreshing(true);
    const res = await gRadarService.refresh(cargo.id);
    setRefreshing(false);
    setShipmentMissing(!!res.notFound);
    if (res.success) {
      showSuccess(t('cargoTracking.drawer.refreshed'));
      load(cargo.id);
    } else {
      showError(res.error || t('cargoTracking.drawer.refreshError'));
    }
  };

  const handleDisable = async () => {
    const cargoId = cargo?.id;
    if (!cargoId || busyRef.current) return;
    busyRef.current = true;
    try {
      const ok = await confirmDialog({
        title: t('cargoTracking.drawer.disableTitle'),
        message: t('cargoTracking.drawer.disableMessage'),
        intent: 'danger',
        icon: 'toggle_off',
        confirmText: t('cargoTracking.drawer.disableConfirm'),
      });
      if (!ok) return;
      setBusyAction('disable');
      const res = await gRadarService.disable(cargoId);
      if (res.success) {
        showSuccess(t('cargoTracking.drawer.disabled'));
        onChanged?.();
        onClose?.();
      } else {
        showError(res.error || t('cargoTracking.drawer.disableError'));
      }
    } finally {
      busyRef.current = false;
      setBusyAction(null);
    }
  };

  // Kapat → aç → bilgileri getir. fetch yalnızca takip kimliği boş yükte yeni
  // kayıt açıyor; kimliği temizleyen disable olduğu için sıra önemli.
  const handleRestart = async () => {
    const cargoId = cargo?.id;
    if (!cargoId || busyRef.current) return;
    busyRef.current = true;
    try {
      const ok = await confirmDialog({
        title: t('cargoTracking.drawer.restartTitle'),
        message: t('cargoTracking.drawer.restartMessage'),
        details: [
          t('cargoTracking.drawer.restartStepClose'),
          t('cargoTracking.drawer.restartStepOpen'),
          t('cargoTracking.drawer.restartStepCredit'),
        ],
        intent: 'warning',
        icon: 'restart_alt',
        confirmText: t('cargoTracking.drawer.restartConfirm'),
      });
      if (!ok) return;
      setBusyAction('restart');
      const steps = [
        ['stepDisable', () => gRadarService.disable(cargoId)],
        ['stepEnable', () => gRadarService.enable(cargoId)],
        ['stepFetch', () => gRadarService.fetch(cargoId)],
      ];
      let changed = false;
      for (const [stepKey, runStep] of steps) {
        const res = await runStep();
        if (!res.success) {
          showError(t('cargoTracking.drawer.restartFailed', {
            step: t(`cargoTracking.drawer.${stepKey}`),
            error: res.error || t('api.errors.generic'),
          }));
          // Önceki adımlar yükü değiştirdiyse liste ve çekmece yeni hâli göstersin.
          if (changed) {
            setShipmentMissing(false);
            onChanged?.();
            load(cargoId);
          }
          return;
        }
        changed = true;
      }
      showSuccess(t('cargoTracking.drawer.restarted'));
      onChanged?.();
      onClose?.();
    } finally {
      busyRef.current = false;
      setBusyAction(null);
    }
  };

  // Tamamlanmış yükte fetch reddediliyor ve tablo yeniden açma sunmuyor —
  // orada takibi kapatmak geri dönüşsüz olurdu, düğmeler gösterilmiyor.
  const canManageTracking = canManage
    && !!details?.gRadarEnabled
    && details?.status !== 'COMPLETED';
  const busy = !!busyAction;

  // Hareket geçmişi iki ayrı şemadan geliyor (hava: düz movements, deniz:
  // containers[].movements) — normalize katmanı ikisini tek biçime indiriyor.
  const movementGroups = useMemo(
    () => extractMovementGroups(details?.routeJson),
    [details?.routeJson],
  );
  const movementCount = countMovements(movementGroups);
  const statusInfo = gRadarStatusInfo(details?.gRadarStatus);

  // Gemi/uçuş adı ve sefer numarası hareket kayıtlarının içinde geliyor —
  // cargo üzerinde ayrı bir alan yok. En son gerçekleşen hareketten okuyup
  // hem haritadaki etikete hem de künye kutusuna veriyoruz.
  const voyageInfo = useMemo(() => {
    let vehicle = null;
    let voyage = null;
    for (const group of movementGroups) {
      for (const mv of group.movements) {
        if (!mv.actual) continue;
        if (mv.vehicle) vehicle = mv.vehicle;
        if (mv.voyage) voyage = mv.voyage;
      }
    }
    return { vehicle, voyage };
  }, [movementGroups]);

  // Harita etiketi yalnızca sefer numarası. Gemi adı buradan çıkarıldı: zaten
  // hemen altındaki künye kutusunda ve hareket satırlarında yazıyor, haritada
  // tekrarlayınca etiket uzuyor ve yön okunun üstüne biniyordu.
  const mapLabel = voyageInfo.voyage ? t('cargoTracking.drawer.voyage', { voyage: voyageInfo.voyage }) : null;

  // Konum tarifi doğrudan haritadaki canlı koordinattan üretiliyor.
  // details.currentLocation ise sağlayıcının son HAREKET kaydından geliyor ve
  // yalnızca yeni hareket işlendiğinde değişiyor — gemi günlerce yol aldığı
  // hâlde metin aynı limanı göstermeye devam edebiliyor. İkisi ayrıldı:
  // koordinattan gelen bilgi asıl değer, sağlayıcının bildirdiği son konum
  // altında ikincil satır olarak duruyor.
  const livePosition = useMemo(
    () => describeLivePosition(details?.geoJson),
    [details?.geoJson],
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[560px] lg:w-[640px] bg-white dark:bg-background-dark shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-2xl">travel_explore</span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-main truncate">{t('cargoTracking.drawer.title')}</h3>
              <p className="text-xs text-text-secondary truncate">
                {details?.identifier || '—'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('common.close')}
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !details ? (
            <p className="text-center text-text-secondary text-sm py-10 px-5">
              {t('cargoTracking.drawer.notFound')}
            </p>
          ) : !details.gRadarEnabled ? (
            <p className="text-center text-text-secondary text-sm py-10 px-5">
              {t('cargoTracking.drawer.notEnabled')}
            </p>
          ) : !details.gRadarTrackingId ? (
            <div className="m-5 rounded-xl border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                {t('cargoTracking.drawer.noData')}
              </p>
            </div>
          ) : (
            <>
              {/* Map — full width, sits above the data so it dominates the
                  first impression (marketing screenshots, primary CTA). */}
              <CargoMap
                geoJson={details.geoJson}
                vehicleType={details.vehicleType}
                status={details.gRadarStatus}
                vesselLabel={mapLabel}
                height={320}
              />

              <div className="p-5 space-y-4">
              {/* Completed-archive banner — for COMPLETED cargo the sync is
                  frozen; we surface this once at the top so the user knows
                  the rest of the panel is a snapshot, not live data. */}
              {details.status === 'COMPLETED' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-lg flex-shrink-0">history</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {t('cargoTracking.drawer.archiveTitle')}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {t('cargoTracking.drawer.archiveHint')}
                    </p>
                  </div>
                </div>
              )}

              {/* Status header */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-text-secondary uppercase tracking-wide">{t('cargoTracking.drawer.status')}</p>
                    <p className="text-xl font-bold text-text-main flex items-center gap-2">
                      {statusInfo?.icon && (
                        <span className={`material-symbols-outlined text-2xl ${statusToneText(statusInfo.tone)}`}>
                          {statusInfo.icon}
                        </span>
                      )}
                      {statusInfo?.label || '—'}
                    </p>
                    {/* Ham kodu da bırakıyoruz: sağlayıcıyla konuşurken ya da
                        sözlükte olmayan yeni bir kod geldiğinde referans lazım. */}
                    {statusInfo && (
                      <p className="text-[11px] text-text-secondary mt-0.5 font-mono">
                        {statusInfo.raw}
                      </p>
                    )}
                  </div>
                  {details.lastSyncAt && (
                    <div className="text-right">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wide">{t('cargoTracking.drawer.lastSync')}</p>
                      <p className="text-xs text-text-secondary">
                        {new Date(details.lastSyncAt).toLocaleString(getCurrentLocale())}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Key facts grid */}
              <div className="grid grid-cols-2 gap-3">
                <Fact
                  label={t('cargoTracking.drawer.vesselFlight')}
                  value={voyageInfo.vehicle || details.vesselName}
                  icon="directions_boat"
                />
                <Fact label={t('dashboard.recent.columns.carrier')} value={details.gRadarCarrier} icon="local_shipping" />
                {/* Sefer numarası künyede değil, haritadaki araç etiketinde
                    duruyor — orada gemiyle birlikte okunuyor ve künyeyi
                    gereksiz uzatmıyor. */}
                <Fact
                  label={t('cargoTracking.drawer.currentLocation')}
                  value={livePosition?.summary || details.currentLocation}
                  hint={[
                    livePosition?.remainingText,
                    livePosition?.legText ? livePosition.coordinateText : null,
                    details.currentLocation
                      ? t('cargoTracking.drawer.lastReported', { location: details.currentLocation })
                      : null,
                  ].filter(Boolean).join(' · ')}
                  icon="my_location"
                  full
                />
                <Fact
                  label={t('dashboard.recent.columns.eta')}
                  value={details.estimatedArrivalDate
                    ? new Date(details.estimatedArrivalDate).toLocaleDateString(getCurrentLocale())
                    : null}
                  icon="event"
                  highlight
                />
                <Fact
                  label={t('cargoTracking.drawer.arrival')}
                  value={details.cargoArrivalDate
                    ? new Date(details.cargoArrivalDate).toLocaleDateString(getCurrentLocale())
                    : null}
                  icon="task_alt"
                />
              </div>

              {/* Override notice */}
              {details.manuallyOverriddenFields?.length > 0 && (
                <div className="rounded-xl border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">lock</span>
                    <span>
                      {t('cargoTracking.drawer.manualFields')}
                      {' '}
                      <strong>{details.manuallyOverriddenFields.map(humanFieldName).join(', ')}</strong>
                    </span>
                  </p>
                </div>
              )}

              {/* Yük geçmişi — sağlayıcı panelindeki gibi kronolojik sırada
                  (çıkıştan varışa), gerçekleşen ve tahmini olaylar ayrı
                  gösteriliyor. Deniz yüklerinde her konteyner kendi başlığı
                  altında; çok konteynerli yükte hangi kutunun nerede olduğu
                  karışmasın. */}
              {movementCount > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">timeline</span>
                    {t('cargoTracking.drawer.history')}
                    <span className="text-xs font-normal text-text-secondary">
                      {t('cargoTracking.drawer.movementCount', { count: movementCount })}
                    </span>
                  </h4>
                  {/* Gruplar artık kendi çerçevesi olan katlanır kutular —
                      aralarındaki boşluk buna göre daraltıldı. */}
                  <div className="space-y-2">
                    {movementGroups.map((group, groupIdx) => (
                      <MovementGroup
                        key={group.containerNumber || groupIdx}
                        group={group}
                        showHeader={movementGroups.length > 1 || !!group.containerNumber}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-center">
                  <span className="material-symbols-outlined text-2xl text-text-secondary">timeline</span>
                  <p className="text-sm text-text-secondary mt-1">{t('cargoTracking.drawer.noMovements')}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {t('cargoTracking.drawer.noMovementsHint')}
                  </p>
                </div>
              )}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40">
          {shipmentMissing && details?.gRadarTrackingId && (
            <div className="px-5 pt-3">
              <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-lg text-amber-600 dark:text-amber-400 flex-shrink-0">warning</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {t('cargoTracking.drawer.shipmentMissing')}
                  </p>
                  {canManageTracking && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      {t('cargoTracking.drawer.shipmentMissingHint')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-text-secondary">
              {details?.status === 'COMPLETED'
                ? t('cargoTracking.drawer.completedFooter')
                : t('cargoTracking.drawer.refreshFree')}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canManageTracking && (
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={busy || refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-base">toggle_off</span>
                  {busyAction === 'disable' ? t('cargoTracking.drawer.disabling') : t('cargoTracking.drawer.disable')}
                </button>
              )}
              {canManageTracking && shipmentMissing && details?.gRadarTrackingId && (
                <button
                  type="button"
                  onClick={handleRestart}
                  disabled={busy || refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className={`material-symbols-outlined text-base ${busyAction === 'restart' ? 'animate-spin' : ''}`}>restart_alt</span>
                  {busyAction === 'restart' ? t('cargoTracking.drawer.restarting') : t('cargoTracking.drawer.restart')}
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing || busy || !canRefresh || !details?.gRadarTrackingId || details?.status === 'COMPLETED'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main hover:bg-primary/10 hover:border-primary/40 hover:text-primary dark:hover:bg-primary/20 dark:hover:border-primary/60 dark:hover:text-primary transition-colors disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:text-text-main disabled:hover:border-gray-300 dark:disabled:hover:border-gray-600"
              >
                <span className={`material-symbols-outlined text-base ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
                {refreshing ? t('cargoTracking.drawer.refreshing') : t('cargoTracking.drawer.refresh')}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function Fact({ label, value, icon, highlight, full, hint }) {
  return (
    <div className={`${full ? 'col-span-2' : ''} rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && (
          <span className="material-symbols-outlined text-sm text-text-secondary">{icon}</span>
        )}
        <span className="text-[10px] text-text-secondary uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-sm font-medium break-words ${highlight ? 'text-primary' : 'text-text-main'}`}>
        {value || '—'}
      </p>
      {/* İkincil satır — ana değeri destekleyen ama onunla yarışmayan bilgi
          (kalan mesafe, koordinat, sağlayıcının bildirdiği son konum). */}
      {hint && (
        <p className="text-[11px] text-text-secondary mt-1 break-words">{hint}</p>
      )}
    </div>
  );
}

/** Durum tonunu metin rengine çevirir (rozet ve başlık ikonu paylaşıyor). */
function statusToneText(tone) {
  switch (tone) {
    case 'active': return 'text-primary';
    case 'success': return 'text-green-600 dark:text-green-400';
    case 'warn': return 'text-yellow-600 dark:text-yellow-400';
    case 'info': return 'text-blue-600 dark:text-blue-400';
    default: return 'text-text-secondary';
  }
}

/** Tarihi kaynakta saat varsa saatle, yoksa yalnızca gün olarak yazar. */
function formatMovementDate(movement) {
  if (!movement?.timestamp) return null;
  return movement.hasTime
    ? movement.timestamp.toLocaleString(getCurrentLocale(), { dateStyle: 'short', timeStyle: 'short' })
    : movement.timestamp.toLocaleDateString(getCurrentLocale());
}

/**
 * Tek konteynerin (ya da hava yükünün) hareket listesi.
 *
 * Varsayılan olarak kapalı ve yalnızca son durumu gösteriyor — kullanıcının
 * ilk aradığı bilgi bu, geri kalan geçmiş paneli gereksiz uzatıyordu. Başlığa
 * basınca tüm hareketler aşağı doğru açılıyor.
 *
 * Açılma animasyonu grid-rows 0fr → 1fr ile yapılıyor: max-height tahmin
 * etmeye gerek kalmadan gerçek yüksekliğe yumuşak geçiş sağlıyor, hareket
 * sayısı konteynerden konteynere değiştiği için bu önemli.
 */
function MovementGroup({ group, showHeader }) {
  const [expanded, setExpanded] = useState(false);

  const lastActualIndex = group.movements.reduce(
    (found, mv, idx) => (mv.actual ? idx : found),
    -1,
  );
  // "Son durum": son gerçekleşen hareket. Hiçbiri gerçekleşmemişse (yük daha
  // yola çıkmamış, hepsi tahmini) ilk hareketi gösteriyoruz — boş bırakmaktansa
  // "sırada ne var" bilgisi işe yarar.
  const currentIndex = lastActualIndex >= 0 ? lastActualIndex : 0;
  const current = group.movements[currentIndex];
  const total = group.movements.length;
  const currentDate = formatMovementDate(current);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span
          className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 border-2 ${
            current?.actual
              ? 'bg-primary border-primary ring-4 ring-primary/20'
              : 'bg-white dark:bg-background-dark border-gray-300 dark:border-gray-600'
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          {showHeader && group.containerNumber && (
            <p className="text-[11px] font-mono text-text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">inventory_2</span>
              {group.containerNumber}
            </p>
          )}
          <p className={`text-sm font-medium ${current?.actual ? 'text-text-main' : 'text-text-secondary'}`}>
            {current?.eventLabel ?? t('gRadar.movementFallback')}
            {current && !current.actual && (
              <span className="ml-1.5 align-middle text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-text-secondary">
                {t('cargoTracking.drawer.estimated')}
              </span>
            )}
          </p>
          {current?.location && (
            <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[13px]">place</span>
              <span className="truncate">{current.location}</span>
            </p>
          )}
          <p className="text-[11px] text-text-secondary mt-1">
            {expanded
              ? t('cargoTracking.drawer.hideHistory')
              : t('cargoTracking.drawer.showAllHistory', { count: total })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {currentDate && (
            <span
              className="text-xs text-text-secondary whitespace-nowrap"
              title={current?.rawTimestamp ? t('cargoTracking.drawer.rawValue', { value: current.rawTimestamp }) : undefined}
            >
              {currentDate}
            </span>
          )}
          <span
            className={`material-symbols-outlined text-base text-text-secondary transition-transform duration-300 ${
              expanded ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      <div
        // Kapalıyken içerik DOM'da duruyor (animasyon için gerekli) ama ekran
        // okuyucuya sunulmuyor — yoksa görünmeyen onlarca hareket okunurdu.
        aria-hidden={!expanded}
        className={`grid transition-all duration-300 ease-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-5 mr-3 mb-3 mt-1 space-y-3">
            {group.movements.map((mv, idx) => (
              <MovementRow
                key={mv.key}
                movement={mv}
                isCurrent={idx === currentIndex}
              />
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/**
 * Tek hareket satırı. Gerçekleşen olay dolu nokta ve normal metinle;
 * tahmini olay içi boş nokta, soluk metin ve "tahmini" etiketiyle çiziliyor —
 * kullanıcı henüz olmamış bir olayı olmuş sanmasın.
 */
function MovementRow({ movement, isCurrent }) {
  const { eventLabel, location, vehicle, voyage, timestamp, rawTimestamp, actual } = movement;
  const formattedDate = formatMovementDate(movement);

  return (
    <li className="ml-4">
      <span
        className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 ${
          isCurrent
            ? 'bg-primary border-primary ring-4 ring-primary/20'
            : actual
              ? 'bg-primary/70 border-primary/70'
              : 'bg-white dark:bg-background-dark border-gray-300 dark:border-gray-600'
        }`}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${actual ? 'text-text-main' : 'text-text-secondary'}`}>
            {eventLabel}
            {!actual && (
              <span className="ml-1.5 align-middle text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-text-secondary">
                {t('cargoTracking.drawer.estimated')}
              </span>
            )}
            {isCurrent && (
              <span className="ml-1.5 align-middle text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {t('cargoTracking.drawer.current')}
              </span>
            )}
          </p>
          {location && (
            <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[13px]">place</span>
              <span className="truncate">{location}</span>
            </p>
          )}
          {(vehicle || voyage) && (
            <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[13px]">navigation</span>
              <span className="truncate">
                {vehicle}
                {vehicle && voyage ? ' · ' : ''}
                {voyage ? t('cargoTracking.drawer.voyage', { voyage }) : ''}
              </span>
            </p>
          )}
        </div>
        {timestamp && (
          // Saat yalnızca kaynakta gerçekten varsa gösteriliyor (bkz.
          // formatMovementDate). title: sağlayıcının gönderdiği ham metin —
          // "bu saat doğru mu" sorusu çıktığında üzerine gelip bakılabilsin.
          <p
            className={`text-xs whitespace-nowrap ${actual ? 'text-text-secondary' : 'text-text-secondary/70'}`}
            title={rawTimestamp ? t('cargoTracking.drawer.rawValue', { value: rawTimestamp }) : undefined}
          >
            {formattedDate}
          </p>
        )}
      </div>
    </li>
  );
}

function humanFieldName(field) {
  const known = [
    'estimatedArrivalDate',
    'cargoArrivalDate',
    'vesselName',
    'currentLocation',
    'gRadarStatus',
    'gRadarCarrier',
    'gRadarRouteJson',
  ];
  return known.includes(field) ? t(`cargoTracking.drawer.fields.${field}`) : field;
}
