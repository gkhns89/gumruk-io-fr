// Ana ekran kurye şeridinin veri modeli (21.09.2026): üç ayrı kaynağı (kalkışlar, yoldaki takipli
// gönderiler, planlı gönderiler) tek bir "şerit öğesi" biçiminde toplar ve şeridin ne göstereceğine
// karar verir. Saf fonksiyonlar — React yok, bu yüzden davranışı okunarak takip edilebilir.
import { t, getCurrentLocale } from '../../../locales';
import { getCourierVehicleType, getShipmentItemType, isInHouseCourier } from '../../../utils/constants';

// ---------------------------------------------------------------------------
// Zamanlama kararları
// ---------------------------------------------------------------------------

/**
 * Canlı okuma geldiğinde şerit o gönderiye kaç ms boyunca geçsin?
 *
 * 25 sn seçildi:
 *  - Tarayıcının takip özetini okuma aralığı 20 sn. Pencere bundan uzun olmalı ki tek bir yoklama
 *    canlı görünümü ortasından kesmesin (yanıp sönme).
 *  - Sunucunun sağlayıcıya sorma turu ~90 sn. Pencere turdan belirgin biçimde kısa olmalı ki şerit
 *    zamanının çoğunu "varışı en yakın olan" görünümünde geçirsin; canlı geçiş bir *olay* gibi
 *    okunsun, yeni bir varsayılan gibi değil.
 * İkisinin arasında 25 sn rahat oturuyor.
 */
export const FRESH_READING_WINDOW_MS = 25_000;

/**
 * Planlı kalkışta şeridin dolma penceresi (sn). Kalkışa 2 saatten fazla varsa araç yolun en
 * başında durur; son iki saatte ilerler. Neden sabit bir pencere: sunucu "toplam süre" diye bir şey
 * vermiyor, her tazelemede kalan süreyi veriyor — oranı kalan süreden üretmek her tazelemede
 * paydayı değiştirir ve araç geri zıplardı.
 */
export const DEPARTURE_WINDOW_SECONDS = 2 * 60 * 60;

// ---------------------------------------------------------------------------
// Normalleştirme
// ---------------------------------------------------------------------------

const timeOf = (value) => {
  if (!value) return null;
  // Sunucu UTC gönderiyor; takip özetindeki alanlar `Z` taşımayabilir (LocalDateTime).
  const text = typeof value === 'string' && !value.endsWith('Z') && value.includes('T') ? `${value}Z` : value;
  const ms = new Date(text).getTime();
  return Number.isNaN(ms) ? null : ms;
};

const stopNameOf = (departure) => departure?.stopName || departure?.customsName;

/** Kalkışın aracı: firma içi sevkiyatta araç tipi ikonu, kurye firmasında motosiklet. */
const departureIcon = (departure) => (isInHouseCourier(departure)
  ? (getCourierVehicleType(departure.vehicleType)?.icon || 'local_shipping')
  : 'two_wheeler');

/**
 * Yoldaki takipli gönderi → şerit öğesi. Sunucu listeyi hedefe en yakın başta sıralıyor;
 * burada sıra bozulmaz.
 */
export const toLiveItem = (row) => ({
  key: `live:${row.shipmentId}`,
  kind: 'live',
  shipmentId: row.shipmentId,
  status: row.status,
  // Yaklaşma aşaması (faz 3). Müşteriye sunucu LEFT yerine ARRIVED gönderir; şerit ayrıca bir kitle
  // kontrolü yapmaz.
  stage: row.stage || null,
  direction: row.direction,
  itemType: row.itemType,
  icon: getCourierVehicleType(row.vehicle?.vehicleType)?.icon || 'local_shipping',
  title: liveTitle(row),
  subtitle: [row.vehicle?.plate, row.vehicle?.driverName, row.destination?.label].filter(Boolean).join(' · '),
  distanceMeters: typeof row.distanceMeters === 'number' ? row.distanceMeters : null,
  startDistanceMeters: typeof row.startDistanceMeters === 'number' ? row.startDistanceMeters : null,
  lastGpsAt: timeOf(row.lastGpsAt ?? row.position?.gpsAt),
  raw: row,
});

const liveTitle = (row) => {
  const who = row.clientCompanyName || row.vehicle?.plate || row.courierName;
  const action = row.direction === 'PICKUP'
    ? t('dashboard.courierStrip.live.pickup')
    : t('dashboard.courierStrip.live.delivery');
  return who ? `${action} · ${who}` : action;
};

/** Sıradaki kalkış → şerit öğesi. `secondsUntilDeparture` sunucunun `calculatedAt` anına göredir. */
export const toDepartureItem = (departure, calculatedAt, index = 0) => {
  const base = timeOf(calculatedAt) ?? Date.now();
  return {
    key: `departure:${departure.courierCompanyId ?? departure.courierCompanyName}:${index}`,
    kind: 'departure',
    icon: departureIcon(departure),
    title: departure.courierCompanyName || t('dashboard.courier.title'),
    subtitle: [stopNameOf(departure), isInHouseCourier(departure) ? departure.vehiclePlate : null]
      .filter(Boolean).join(' · '),
    // Kalkış anı: hesaplama anı + o anki kalan süre. Sayaç saniyede bir bunun üstünden yürür.
    departsAt: base + (departure.secondsUntilDeparture ?? 0) * 1000,
    raw: departure,
  };
};

/**
 * Yolda olan ama canlı takibi olmayan gönderi (araç eşleşmemiş ya da varış noktası koordinatsız)
 * → şerit öğesi. Konum yok, bu yüzden oran da yok; yolda olduğu için planlı gönderilerin önünde
 * sıralanır.
 */
export const toTransitItem = (shipment) => ({
  key: `transit:${shipment.id}`,
  kind: 'transit',
  shipmentId: shipment.id,
  icon: 'local_shipping',
  title: shipment.direction === 'PICKUP'
    ? t('myShipments.card.inTransitPickup')
    : t('myShipments.card.inTransitDelivery'),
  subtitle: [getShipmentItemType(shipment.itemType)?.label || shipment.itemType, shipment.courier?.name]
    .filter(Boolean).join(' · '),
  departsAt: null,
  raw: shipment,
});

/** Planlı (henüz yola çıkmamış) müşteri gönderisi → şerit öğesi. */
export const toPlannedItem = (shipment) => ({
  key: `planned:${shipment.id}`,
  kind: 'planned',
  shipmentId: shipment.id,
  icon: 'schedule',
  title: shipment.direction === 'PICKUP'
    ? t('myShipments.card.upcomingPickup')
    : t('myShipments.card.upcomingDelivery'),
  subtitle: [getShipmentItemType(shipment.itemType)?.label || shipment.itemType, shipment.courier?.name]
    .filter(Boolean).join(' · '),
  departsAt: timeOf(shipment.plannedAt),
  raw: shipment,
});

// ---------------------------------------------------------------------------
// Seçim
// ---------------------------------------------------------------------------

/**
 * Şeridin varsayılan görünümü: "varışı en önce olan".
 *
 * Yoldaki bir araç, saatler sonra kalkacak bir kuryeden önce varır — bu yüzden canlı satırlar
 * (sunucunun sıraladığı hâliyle, hedefe en yakın başta) her zaman önce gelir. Sonra konumu
 * olmayan ama yine de yolda olan gönderiler, sonra geri sayımı en kısa kalkış ve planlı gönderi.
 */
export const baselineItem = ({ live = [], transit = [], departures = [], planned = [] }) => {
  if (live.length > 0) return live[0];
  if (transit.length > 0) return transit[0];
  const timed = [...departures, ...planned]
    .filter((item) => typeof item.departsAt === 'number')
    .sort((a, b) => a.departsAt - b.departsAt);
  return timed[0] || departures[0] || planned[0] || null;
};

/**
 * Şeridin ilerleme oranı (0–1) ya da null (oran uydurulamıyorsa çubuk çizilmez).
 *  - canlı: alınan yol / toplam yol (toplam = izin en uzak noktası, sunucudan gelir)
 *  - kalkış: son {@link DEPARTURE_WINDOW_SECONDS} içinde geçen süre
 */
export const progressOf = (item, now = Date.now()) => {
  if (!item) return null;
  if (item.kind === 'live') {
    const { distanceMeters: left, startDistanceMeters: total } = item;
    if (left === null || total === null || total <= 0) return null;
    return clamp(1 - left / total);
  }
  if (item.departsAt === null || item.departsAt === undefined) return null;
  const remaining = (item.departsAt - now) / 1000;
  return clamp(1 - remaining / DEPARTURE_WINDOW_SECONDS);
};

const clamp = (value) => Math.min(1, Math.max(0, value));

/** "~2,4 km" / "~350 m" — sayı biçimi seçili dile göre (CourierTrackingSection ile aynı anahtarlar). */
export const formatDistance = (meters) => {
  if (typeof meters !== 'number') return '';
  if (meters >= 1000) {
    const km = (meters / 1000).toLocaleString(getCurrentLocale(), { maximumFractionDigits: 1 });
    return t('courierTracking.distanceKm', { value: km });
  }
  return t('courierTracking.distanceM', { value: Math.round(meters).toLocaleString(getCurrentLocale()) });
};

/**
 * "2 gün 4 saat" / "1 saat" / "9 dk 3 sn" / "45 sn" — kalkışa kalan süre; geçtiyse null.
 * En çok iki birim gösterilir ve sıfır olan birim yazılmaz ("1 saat 0 dk" gürültüdür).
 */
export const countdownText = (departsAt, now = Date.now()) => {
  if (!departsAt) return null;
  const total = Math.floor((departsAt - now) / 1000);
  if (total <= 0) return null;
  const units = [
    ['days', Math.floor(total / 86400)],
    ['hours', Math.floor((total % 86400) / 3600)],
    ['minutes', Math.floor((total % 3600) / 60)],
    // Saniye yalnızca son bir saatte anlamlı; üstünde zaten daha büyük iki birim var.
    ['seconds', total < 3600 ? total % 60 : 0],
  ];
  return units
    .filter(([, value]) => value > 0)
    .slice(0, 2)
    .map(([key, value]) => t(`dashboard.courier.${key}`, { count: value }))
    .join(' ');
};
