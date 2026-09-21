import { lazy, Suspense, useMemo } from 'react';
import { useShipmentTracking } from '../../../hooks/useShipmentTracking';
import {
  getCourierType,
  getCourierVehicleType,
  getShipmentItemType,
  getShipmentStatusLabel,
  getTrackingStatus,
  isInHouseCourier,
} from '../../../utils/constants';
import { formatRelativeDateTime } from '../../courierShipments/shipmentUtils';
import { t } from '../../../locales';
import { formatDistance } from './stripModel';

/**
 * Harita `maplibre-gl` çekiyor (~200 KB gzip). Lazy: yalnızca çekmece açılıp canlı bir gönderi
 * seçildiğinde indirilir. Statik import yazmak kitaplığı ana ekranın paketine sokar — ana ekran
 * oturum açan herkesin ilk gördüğü sayfa.
 */
const LiveCourierMap = lazy(() => import('../../courierTracking/LiveCourierMap'));

function SectionTitle({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5">{children}</p>
  );
}

const rowClass = 'w-full text-left rounded-lg px-2.5 py-2 border transition-colors';

/**
 * Şeridin aşağı açılan penceresi (mega menü): solda liste, sağda seçili gönderinin küçük haritası.
 *
 * Harita **tek** gönderi için açılır ve takip ucunu yalnızca o gönderi için okur; listenin tamamının
 * konumu şeridin tek çağrılık özetinden gelir (bkz. useCourierStrip). Bayrak kapalıyken harita
 * sütunu hiç çizilmez ve liste tam genişliği kullanır — pilot dışındaki firma hiçbir şey kaybetmez.
 */
export default function StripDrawer({
  id,
  panelRef,
  audience,
  liveEnabled,
  liveItems,
  departures,
  planned,
  untracked,
  completed,
  upcomingDeparture,
  totalActiveCouriers,
  selectedId,
  onSelect,
  onOpenShipment,
  brokerPicker,
}) {
  const isBroker = audience === 'broker';
  const selected = liveItems.find((item) => item.shipmentId === selectedId) || null;

  // Yalnızca seçili gönderi yoklanır: çekmece kapalıyken ya da seçim yokken hiç istek gitmez.
  const { tracking } = useShipmentTracking(selected?.shipmentId ?? null, audience, liveEnabled && Boolean(selected));

  const position = tracking?.position || null;
  const lat = position ? Number(position.lat) : null;
  const lng = position ? Number(position.lng) : null;
  const vehiclePoint = useMemo(
    () => (Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : null),
    [lat, lng],
  );
  const trail = useMemo(
    () => (Array.isArray(tracking?.trail) ? tracking.trail.filter((p) => Array.isArray(p) && p.length === 2) : []),
    [tracking?.trail],
  );

  const hasList = liveItems.length + departures.length + planned.length + untracked.length + completed.length > 0;

  return (
    <div
      id={id}
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label={t('dashboard.courierStrip.drawerLabel')}
      className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 shadow-xl overflow-hidden focus:outline-none"
    >
      <div className={`grid gap-4 p-4 max-h-[60vh] overflow-y-auto ${liveEnabled ? 'lg:grid-cols-2' : ''}`}>
        {/* ---------- Liste ---------- */}
        <div className="min-w-0 space-y-3">
          {brokerPicker}

          {!hasList && !brokerPicker && (
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="material-symbols-outlined text-base">inventory_2</span>
              <p className="text-xs">{t('dashboard.courierStrip.emptyDrawer')}</p>
            </div>
          )}

          {liveItems.length > 0 && (
            <div>
              <SectionTitle>{t('dashboard.courierStrip.sections.live')}</SectionTitle>
              <div className="space-y-1.5">
                {liveItems.map((item) => {
                  const status = getTrackingStatus(item.status);
                  const active = item.shipmentId === selectedId;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onSelect(item.shipmentId)}
                      aria-pressed={active}
                      className={`${rowClass} flex items-start gap-2 ${
                        active
                          ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 flex-shrink-0" style={{ fontSize: '18px' }}>
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-text-main truncate">{item.title}</span>
                        <span className="block text-[11px] text-text-secondary truncate">{item.subtitle}</span>
                      </span>
                      <span className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        {typeof item.distanceMeters === 'number' && (
                          <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 tabular-nums">
                            {formatDistance(item.distanceMeters)}
                          </span>
                        )}
                        {status && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${status.badgeClass}`}>
                            {status.label}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {untracked.length > 0 && (
            <div>
              <SectionTitle>{t('courierShipments.tabs.inTransit')}</SectionTitle>
              <div className="space-y-1.5">
                {untracked.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onOpenShipment(item.shipmentId)}
                    className={`${rowClass} border-amber-300 dark:border-amber-600/50 hover:bg-amber-50 dark:hover:bg-amber-900/20`}
                  >
                    <span className="block text-sm font-semibold text-text-main truncate">{item.title}</span>
                    <span className="block text-[11px] text-text-secondary truncate">{item.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isBroker && departures.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <SectionTitle>{t('dashboard.courierStrip.sections.departures')}</SectionTitle>
                {totalActiveCouriers > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[11px] font-semibold rounded-full">
                    {t('dashboard.courier.registered', { count: totalActiveCouriers })}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {departures.map((item) => (
                  <div
                    key={item.key}
                    className={`${rowClass} border-gray-200 dark:border-gray-700 flex items-start gap-2`}
                  >
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0" style={{ fontSize: '18px' }}>
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-text-main truncate">{item.title}</span>
                      <span className="block text-[11px] text-text-secondary truncate">{item.subtitle}</span>
                    </span>
                    {isInHouseCourier(item.raw) && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${getCourierType('IN_HOUSE').badgeClass}`}>
                        {t('couriers.types.inHouse')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isBroker && upcomingDeparture && (
            <div>
              <SectionTitle>{t('dashboard.courier.nextCourier')}</SectionTitle>
              <div className={`${rowClass} border-gray-200 dark:border-gray-700 flex items-start gap-2`}>
                <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 flex-shrink-0" style={{ fontSize: '18px' }}>
                  {getCourierVehicleType(upcomingDeparture.raw?.vehicleType)?.icon || 'schedule'}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-text-main truncate">{upcomingDeparture.title}</span>
                  <span className="block text-[11px] text-text-secondary truncate">{upcomingDeparture.subtitle}</span>
                </span>
              </div>
            </div>
          )}

          {planned.length > 0 && (
            <div>
              <SectionTitle>{t('courierShipments.tabs.upcoming')}</SectionTitle>
              <div className="space-y-1.5">
                {planned.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onOpenShipment(item.shipmentId)}
                    className={`${rowClass} border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60`}
                  >
                    <span className="block text-sm font-semibold text-text-main truncate">
                      {formatRelativeDateTime(item.raw.plannedAt)} · {item.title}
                    </span>
                    <span className="block text-[11px] text-text-secondary truncate">{item.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <SectionTitle>{t('myShipments.card.recentTitle')}</SectionTitle>
              <div className="space-y-1.5">
                {completed.map((shipment) => (
                  <button
                    key={shipment.id}
                    type="button"
                    onClick={() => onOpenShipment(shipment.id)}
                    className={`${rowClass} border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 flex items-center gap-2`}
                  >
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 flex-shrink-0" style={{ fontSize: '16px' }}>
                      task_alt
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-text-main truncate">
                        {getShipmentStatusLabel(shipment.status, shipment.direction)} · {formatRelativeDateTime(shipment.completedAt || shipment.plannedAt)}
                      </span>
                      <span className="block text-[11px] text-text-secondary truncate">
                        {[getShipmentItemType(shipment.itemType)?.label, shipment.courier?.name].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------- Harita ---------- */}
        {liveEnabled && (
          <div className="min-w-0">
            {selected && vehiclePoint ? (
              <>
                <Suspense fallback={<div className="h-[240px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />}>
                  <LiveCourierMap
                    vehicle={vehiclePoint}
                    heading={position.heading ?? null}
                    trail={trail}
                    destination={tracking?.destination}
                    vehicleType={tracking?.vehicle?.vehicleType || selected.raw?.vehicle?.vehicleType}
                    stale={tracking?.status === 'STALE'}
                    height={240}
                  />
                </Suspense>
                <button
                  type="button"
                  onClick={() => onOpenShipment(selected.shipmentId)}
                  className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                >
                  {t('dashboard.courierStrip.openShipment')}
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </>
            ) : (
              <div className="h-[240px] rounded-xl border border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1 px-4 text-center">
                <span className="material-symbols-outlined text-3xl text-gray-400 dark:text-gray-500">
                  {selected ? 'location_searching' : 'map'}
                </span>
                <p className="text-xs text-text-secondary">
                  {selected
                    ? t('courierTracking.waitingForPosition')
                    : t('dashboard.courierStrip.pickToTrack')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
