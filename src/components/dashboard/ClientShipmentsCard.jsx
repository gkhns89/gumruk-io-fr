import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { courierShipmentService } from '../../api/courierShipmentService';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { FEATURE_FLAGS } from '../../utils/featureFlags';
import NewFeatureBadge from '../common/NewFeatureBadge';
import { getShipmentItemType, getShipmentStatusLabel } from '../../utils/constants';
import { formatRelativeDateTime } from '../courierShipments/shipmentUtils';
import { t } from '../../locales';

// Metinler ek almayan kalıplarla kurulur ("Bugün 14:00 · Kurye teslim edecek"): yer tutucuya ünlü uyumu uygulanamıyor.
const inTransitHeadline = (shipment) => {
  if (shipment.direction !== 'PICKUP') return t('myShipments.card.inTransitDelivery');
  return shipment.itemType === 'DOCUMENT'
    ? t('myShipments.card.inTransitPickupDocument')
    : t('myShipments.card.inTransitPickup');
};

const upcomingAction = (shipment) => (shipment.direction === 'PICKUP'
  ? t('myShipments.card.upcomingPickup')
  : t('myShipments.card.upcomingDelivery'));

const detailLine = (shipment) =>
  [getShipmentItemType(shipment.itemType)?.label || shipment.itemType, shipment.courier?.name].filter(Boolean).join(' · ');

function SectionTitle({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{children}</p>
  );
}

/**
 * Müşteri dashboard'unda kurye gönderileri özeti (CLIENT_USER, COURIER_CLIENT_STOPS bayrağı açıkken).
 * Önce yoldakiler, sonra yaklaşanlar, en son tamamlananlar.
 */
export default function ClientShipmentsCard() {
  const navigate = useNavigate();
  const { isPilotFeature, hasFeature } = useFeatureFlags();
  const isPilot = isPilotFeature(FEATURE_FLAGS.COURIER_CLIENT_STOPS);
  const liveTrackable = hasFeature(FEATURE_FLAGS.COURIER_LIVE_TRACKING);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    courierShipmentService.getMySummary().then((result) => {
      if (cancelled) return;
      if (result.success) setSummary(result.data);
      else setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = (shipment) => navigate('/my-shipments', { state: { shipmentId: shipment.id } });

  const inTransit = summary?.inTransit || [];
  const upcoming = (summary?.upcoming || []).slice(0, 3);
  const completed = (summary?.recentlyCompleted || []).slice(0, 2);
  const isEmpty = !loading && !error && inTransit.length + upcoming.length + completed.length === 0;

  const itemClass = 'w-full text-left rounded-lg px-2.5 py-2 bg-white/80 dark:bg-gray-800/50 border transition-colors hover:bg-white dark:hover:bg-gray-800';

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-md h-full flex flex-col p-4 lg:p-5 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">package_2</span>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{t('myShipments.card.title')}</h3>
        </div>
        {isPilot && <NewFeatureBadge />}
      </div>

      <div className="flex-1 min-h-0 space-y-3">
        {loading && (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-emerald-200/50 dark:bg-emerald-700/30 rounded-lg" />
            <div className="h-10 bg-emerald-200/40 dark:bg-emerald-700/20 rounded-lg" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <span className="material-symbols-outlined text-base">error</span>
            <p className="text-xs">{t('myShipments.card.loadError')}</p>
          </div>
        )}

        {isEmpty && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <span className="material-symbols-outlined text-base">inventory_2</span>
            <p className="text-xs">{t('myShipments.card.empty')}</p>
          </div>
        )}

        {inTransit.length > 0 && (
          <div>
            <SectionTitle>{t('courierShipments.tabs.inTransit')}</SectionTitle>
            <div className="space-y-1.5">
              {inTransit.map((shipment) => (
                <button
                  key={shipment.id}
                  type="button"
                  onClick={() => open(shipment)}
                  className={`${itemClass} border-amber-300 dark:border-amber-600/50 flex items-start gap-2`}
                >
                  <span className="relative flex h-2.5 w-2.5 mt-1.5 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{inTransitHeadline(shipment)}</span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400 truncate">{detailLine(shipment)}</span>
                    {/* Canlı takip bayrağı açık ve araç sağlayıcıyla eşleşmişse "Canlı izle": satır
                        zaten detayı açıyor, harita da orada. Kartta harita çizilmiyor — mobilde
                        dashboard'u ağırlaştırır ve `maplibre-gl` giriş yolundan indirilirdi. */}
                    {liveTrackable && shipment.vehicle?.matched && (
                      <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>my_location</span>
                        {t('courierTracking.watchLive')}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <SectionTitle>{t('courierShipments.tabs.upcoming')}</SectionTitle>
            <div className="space-y-1.5">
              {upcoming.map((shipment) => (
                <button
                  key={shipment.id}
                  type="button"
                  onClick={() => open(shipment)}
                  className={`${itemClass} border-emerald-200 dark:border-emerald-700/40`}
                >
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatRelativeDateTime(shipment.plannedAt)} · {upcomingAction(shipment)}
                  </span>
                  <span className="block text-xs text-gray-600 dark:text-gray-400 truncate">{detailLine(shipment)}</span>
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
                  onClick={() => open(shipment)}
                  className={`${itemClass} border-gray-200 dark:border-gray-700 flex items-center gap-2`}
                >
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 flex-shrink-0" style={{ fontSize: '16px' }}>task_alt</span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-gray-800 dark:text-gray-200">
                      {getShipmentStatusLabel(shipment.status, shipment.direction)} · {formatRelativeDateTime(shipment.completedAt || shipment.plannedAt)}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{detailLine(shipment)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Link
        to="/my-shipments"
        className="mt-3 self-start flex items-center gap-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors"
      >
        {t('myShipments.card.viewAll')}
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </Link>
    </div>
  );
}
