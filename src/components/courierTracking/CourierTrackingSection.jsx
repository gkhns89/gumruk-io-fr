import { lazy, Suspense, useMemo } from 'react';
import { useShipmentTracking } from '../../hooks/useShipmentTracking';
import { getTrackingStatus } from '../../utils/constants';
import { t, getCurrentLocale } from '../../locales';

/**
 * Harita `maplibre-gl` çekiyor (yaklaşık 200 KB gzip). Lazy: yalnızca gerçekten takip edilen bir
 * gönderi açıldığında indirilir, gönderi listesini açan herkes değil. Statik import yazmak
 * kitaplığı gönderi sayfalarının paketine sokar.
 */
const LiveCourierMap = lazy(() => import('./LiveCourierMap'));

/**
 * Gönderi detayındaki canlı takip bölümü (todo 19, faz 2) — hem gümrük firması hem müşteri
 * görünümünde aynı bileşen; ayrımı sunucu yapar (müşteriye hız, kontak, sürücü telefonu ve
 * 15 dakikadan eski iz gönderilmez).
 *
 * Takip yoksa (`NONE`) hiçbir şey çizilmez: ne hata ne boş harita. Bir gönderinin canlı takibi
 * olmaması normaldir (araç eşleşmemiş, varış noktası koordinatsız, bayrak kapalı).
 *
 * @param {number} shipmentId
 * @param {'broker'|'client'} audience
 * @param {boolean} enabled - bayrak kapalıysa hiç yoklanmaz
 */
export default function CourierTrackingSection({ shipmentId, audience = 'broker', enabled = true }) {
  const { tracking } = useShipmentTracking(shipmentId, audience, enabled);

  const position = tracking?.position || null;
  // Harita bağımlılıkları: her render'da yeni dizi üretmek efekti boşuna çalıştırır.
  // Koordinatlar sayı olarak bağımlılık: `position` nesnesi her yoklamada yenilenir, konum aynı
  // kalsa bile harita efekti boşuna çalışırdı.
  const lat = position ? Number(position.lat) : null;
  const lng = position ? Number(position.lng) : null;
  const vehiclePoint = useMemo(
    () => (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : null),
    [lat, lng],
  );
  const trail = useMemo(
    () => (Array.isArray(tracking?.trail) ? tracking.trail.filter((p) => Array.isArray(p) && p.length === 2) : []),
    [tracking?.trail],
  );

  // İlk okuma gelene kadar hiçbir şey çizilmez. İskelet göstermek, takibi olmayan gönderilerde
  // (çoğu gönderi) 280px'lik bir kutunun yanıp sönüp kaybolması demek olurdu.
  if (!enabled || !shipmentId || !tracking || tracking.status === 'NONE') return null;

  const option = getTrackingStatus(tracking.status);
  const stale = tracking.status === 'STALE';
  const ended = tracking.status === 'ENDED';

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-text-main">{t('courierTracking.title')}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            option?.badgeClass || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}>
            {option?.icon && (
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{option.icon}</span>
            )}
            {/* Bilinmeyen durum ham değeriyle gösterilir: yanlış etiketlemektense ham değer. */}
            {option?.label || tracking.status}
          </span>
          {typeof tracking.distanceMeters === 'number' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>straighten</span>
              {formatDistance(tracking.distanceMeters)}
            </span>
          )}
        </div>
      </div>

      {position ? (
        <Suspense fallback={<div className="h-[280px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />}>
          <LiveCourierMap
            vehicle={vehiclePoint}
            heading={position.heading ?? null}
            trail={trail}
            destination={tracking.destination}
            vehicleType={tracking.vehicle?.vehicleType}
            stale={stale}
          />
        </Suspense>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-6 text-center">
          <span className="material-symbols-outlined text-3xl text-gray-400 dark:text-gray-500">
            {ended ? 'flag' : 'location_searching'}
          </span>
          <p className="text-xs text-text-secondary mt-1">
            {ended ? t('courierTracking.endedNoPosition') : t('courierTracking.waitingForPosition')}
          </p>
        </div>
      )}

      <p className="mt-1.5 text-[11px] text-text-secondary">
        {/* Son okumanın yaşı dürüstçe yazılır: cihaz dakikada bir veri gönderiyorsa "canlı" sözü
            tek başına yanıltıcı olur. */}
        {statusLine(tracking)}
      </p>
    </section>
  );
}

/** "~2,4 km" / "~350 m" — sayı biçimi seçili dile göre (getCurrentLocale). */
function formatDistance(meters) {
  if (meters >= 1000) {
    const km = (meters / 1000).toLocaleString(getCurrentLocale(), { maximumFractionDigits: 1 });
    return t('courierTracking.distanceKm', { value: km });
  }
  return t('courierTracking.distanceM', { value: Math.round(meters).toLocaleString(getCurrentLocale()) });
}

/** "Konum 2 dk önce alındı" / "Canlı konum şu an alınamıyor" / "Takip sona erdi" */
function statusLine(tracking) {
  if (tracking.status === 'ENDED') return t('courierTracking.line.ended');
  if (tracking.status === 'UNAVAILABLE') return t('courierTracking.line.unavailable');
  if (!tracking.position?.gpsAt) return t('courierTracking.line.waiting');

  const gpsAt = new Date(tracking.position.gpsAt);
  if (Number.isNaN(gpsAt.getTime())) return '';
  const seconds = Math.max(0, Math.round((Date.now() - gpsAt.getTime()) / 1000));
  if (seconds < 60) return t('courierTracking.line.secondsAgo', { value: seconds });
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t('courierTracking.line.minutesAgo', { value: minutes });
  return t('courierTracking.line.at', {
    time: gpsAt.toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit' }),
  });
}
