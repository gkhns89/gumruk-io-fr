/**
 * G-Radar'dan gelen ham İngilizce kodları Türkçeye çeviren sözlükler ve
 * hareket geçmişini normalize eden yardımcılar.
 *
 * Sağlayıcı iki farklı şema döndürüyor ve ikisi de tek bir JSON alanında
 * (cargo.gRadarRouteJson) saklanıyor:
 *
 *   HAVA  → { route, movements: [ {...}, ... ] }
 *   DENİZ → { route, containers: [ { container_number, movements: [...] }, ... ] }
 *
 * Alan adları da tutarlı değil (location kimi yerde düz metin, kimi yerde
 * { name } nesnesi; tarih timestamp / date / event_date olabiliyor). Buradaki
 * normalize katmanı iki şemayı tek bir biçime indiriyor, böylece arayüz
 * tarafında tek bir satır bileşeni yetiyor. Tanımadığı bir kod gelirse
 * uydurmuyor — ham değeri okunur hâle getirip aynen gösteriyor.
 */

import { t, getTranslationGroup } from '../locales';

// ---------------------------------------------------------------- durumlar

/**
 * Yük durumu. Hava: NEW, INPROGRESS, BOOKED, EN_ROUTE, LANDED, DELIVERED,
 * UNTRACKED. Deniz: NEW, INPROGRESS, BOOKED, LOADED, SAILING, ARRIVED,
 * DISCHARGED, UNTRACKED.
 *
 * Metinler sözlükte (`gRadar.statuses.<KOD>.label` / `.short`): `short` liste
 * hücresindeki dar rozet için, `label` detay panelindeki başlık için. Burada
 * yalnızca görünüm kalıyor — `tone` renk ailesini, `icon` ikonu seçer.
 */
const STATUS_META = {
  NEW: { tone: 'neutral', icon: 'fiber_new' },
  INPROGRESS: { tone: 'info', icon: 'hourglass_top' },
  BOOKED: { tone: 'info', icon: 'event_available' },

  // Deniz
  LOADED: { tone: 'info', icon: 'inventory_2' },
  SAILING: { tone: 'active', icon: 'directions_boat' },
  ARRIVED: { tone: 'success', icon: 'anchor' },
  DISCHARGED: { tone: 'success', icon: 'move_down' },

  // Hava
  EN_ROUTE: { tone: 'active', icon: 'flight_takeoff' },
  LANDED: { tone: 'success', icon: 'flight_land' },
  DELIVERED: { tone: 'success', icon: 'task_alt' },

  UNTRACKED: { tone: 'warn', icon: 'error' },
};

/**
 * Hareket olayları sözlükte `gRadar.events.<KOD>` altında. Deniz tarafı serbest
 * metin ("Loaded on vessel"), hava tarafı IATA kısaltması (RCS, DEP, RCF...)
 * gönderiyor; ikisi de aynı gruptan karşılanıyor çünkü normalize anahtar ikisini
 * de tek biçime indiriyor.
 */
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/** Sözlük anahtarına indirger: "Loaded on vessel" → LOADED_ON_VESSEL. */
function normalizeKey(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

/** Sözlükte yoksa ham metni okunur bırakır: "GATE_IN" → "Gate in". */
function prettifyRaw(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/[a-zçğıöşü]/.test(text)) return text; // zaten cümle gibi, dokunma
  const spaced = text.replace(/[_-]+/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Yük durumunun arayüz dilindeki karşılığı. Tanınmayan kod gelirse label/short
 * olarak ham değerin okunur hâli döner — ekranda boşluk kalmasın, ama uydurma
 * çeviri de yapılmasın.
 */
export function gRadarStatusInfo(status) {
  const key = normalizeKey(status);
  if (!key) return null;
  const meta = STATUS_META[key];
  if (meta) {
    return {
      ...meta,
      label: t(`gRadar.statuses.${key}.label`),
      short: t(`gRadar.statuses.${key}.short`),
      raw: status,
      known: true,
    };
  }
  const fallback = prettifyRaw(status);
  return { label: fallback, short: fallback, tone: 'neutral', icon: 'help', raw: status, known: false };
}

/** Kısa yol — sadece uzun etiketi isteyen yerler için. */
export function gRadarStatusLabel(status) {
  return gRadarStatusInfo(status)?.label ?? null;
}

/** Hareket olayının arayüz dilindeki karşılığı. */
export function gRadarEventLabel(event) {
  const key = normalizeKey(event);
  if (!key) return null;
  // Sözlükte olup olmadığına önce bakıyoruz: t() eksik anahtarda uyarı basıp
  // anahtarın kendisini döndürür, oysa burada bilinmeyen kod olağan bir durum.
  const labels = getTranslationGroup('gRadar.events');
  return hasOwn(labels, key) ? labels[key] : prettifyRaw(event);
}

// ---------------------------------------------------------- hareket geçmişi

/** İlk dolu değeri döndürür — şemadaki isim tutarsızlığını tek yerde yutar. */
function pick(source, ...keys) {
  if (!source || typeof source !== 'object') return null;
  for (const key of keys) {
    const value = source[key];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
}

/**
 * Bir değeri gösterilebilir metne indirir.
 *
 * Sağlayıcı iç içe nesneler gönderiyor ve derinlik alandan alana değişiyor:
 * location bazen "NINGBO", bazen { name: "NINGBO", country: "China" }, bazen
 * de { name: "NINGBO", country: { name: "China", code: "CN" } }. Ham değeri
 * doğrudan şablona gömmek bu son durumda ekrana "[object Object]" basıyordu.
 *
 * Nesneden okunabilir bir ad çıkaramazsa null döner — ekranda çöp göstermek
 * yerine o parçayı hiç göstermemek daha iyi.
 */
function readText(value, depth = 0) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    // Dizi geldiyse ilk okunabilir öğeyi al (ör. birden çok isim varyantı).
    for (const item of value) {
      const text = readText(item, depth + 1);
      if (text) return text;
    }
    return null;
  }
  if (typeof value === 'object') {
    if (depth > 2) return null; // sonsuz iç içe geçmeye karşı emniyet
    const nested = pick(value, 'name', 'value', 'label', 'description', 'code', 'iso', 'iata');
    return nested === null ? null : readText(nested, depth + 1);
  }
  return null;
}

/** location: düz metin ya da { name, country } — country'nin kendisi de nesne olabilir. */
function readLocation(value) {
  const direct = typeof value === 'string' ? readText(value) : null;
  if (direct) return direct;
  if (!value || typeof value !== 'object') return null;

  const name = readText(pick(value, 'name', 'location', 'city', 'port', 'code'));
  const country = readText(pick(value, 'country', 'country_name', 'country_code'));
  if (!name) return country;
  // "ISTANBUL (AMBARLI), Türkiye" — ülke adı zaten yer adının içindeyse tekrarlama.
  if (country && !name.toLocaleUpperCase('tr').includes(country.toLocaleUpperCase('tr'))) {
    return `${name}, ${country}`;
  }
  return name;
}

/** vessel: { name, imo } / flight: "TK1979" — ikisi de tek alana iniyor. */
function readVehicle(movement) {
  const vessel = readText(movement?.vessel);
  if (vessel) return vessel;
  return readText(pick(movement, 'flight', 'flight_number', 'flight_no', 'vessel_name'));
}

/**
 * Sağlayıcı "YYYY-MM-DD HH:mm:ss" (arada T yok) gönderiyor. Chrome bunu
 * yutuyor ama Safari NaN döndürüyor, o yüzden ayracı elle düzeltiyoruz.
 */
export function parseGRadarDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  if (!text) return null;

  let iso = text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    // Yalnızca gün geldi. Böyle bir metni new Date() UTC gece yarısı sayar;
    // UTC'nin gerisindeki bir saat diliminde tarih bir gün geriye kayar.
    // Saati açıkça vererek yerel gece yarısına sabitliyoruz.
    iso = `${text}T00:00:00`;
  } else if (/^\d{4}-\d{2}-\d{2}[ ]\d{2}:\d{2}/.test(text)) {
    // Sağlayıcı "YYYY-MM-DD HH:mm:ss" gönderiyor (arada T yok). Chrome bunu
    // yutuyor ama Safari NaN döndürüyor, o yüzden ayracı elle düzeltiyoruz.
    iso = text.replace(' ', 'T');
  }
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Tek bir ham hareketi normalize eder.
 *
 * `actual`: olay gerçekleşti mi, yoksa hâlâ tahmin mi. Deniz tarafında
 * sağlayıcı bunu status=ACT/EST ile söylüyor. Hava tarafında böyle bir alan
 * yok — orada tarihin geçmişte olması gerçekleşmiş sayılıyor.
 */
function normalizeMovement(raw, index) {
  if (!raw || typeof raw !== 'object') return null;

  const event = pick(raw, 'event', 'event_name', 'description', 'movement', 'status_description');
  const rawStatus = pick(raw, 'status', 'event_status', 'type');

  // Ham tarih metnini saklıyoruz: sağlayıcı kimi alanlarda yalnızca gün
  // (2026-07-07), kimi alanlarda gün + saat gönderiyor. Ayrımı bilmeden
  // biçimlendirirsek olmayan bir saati varmış gibi gösteririz — gün bilgisi
  // saat 00:00 diye ekrana basılır ve kullanıcı bunu gerçek sanır.
  const rawTimestamp = pick(
    raw, 'timestamp', 'date', 'event_date', 'datetime', 'time', 'actual_date', 'estimated_date',
  );
  const rawTimestampText = rawTimestamp === null ? null : String(rawTimestamp).trim();
  const timestamp = parseGRadarDate(rawTimestamp);
  // Saat bileşeni gerçekten var mı? (00:00 da geçerli bir saattir — burada
  // aranan, metinde saat alanının bulunup bulunmadığı.)
  const hasTime = !!rawTimestampText && /\d{1,2}:\d{2}/.test(rawTimestampText);

  const statusKey = normalizeKey(rawStatus);
  let actual;
  if (statusKey === 'ACT' || statusKey === 'ACTUAL') {
    actual = true;
  } else if (statusKey === 'EST' || statusKey === 'ESTIMATED') {
    actual = false;
  } else {
    // Bilinmiyorsa tarihe bak; tarih de yoksa gerçekleşmiş varsay (hava
    // hareketleri geçmiş olayları listeliyor).
    actual = timestamp ? timestamp.getTime() <= Date.now() : true;
  }

  // event boşsa status'ü olay adı olarak kullan (bazı deniz satırlarında
  // olay adı yalnızca status alanında geliyor).
  const eventSource = event ?? (statusKey && statusKey !== 'ACT' && statusKey !== 'EST' ? rawStatus : null);

  return {
    key: `${index}-${timestamp ? timestamp.getTime() : 'x'}`,
    event: eventSource ?? null,
    eventLabel: gRadarEventLabel(eventSource) ?? t('gRadar.movementFallback'),
    location: readLocation(pick(raw, 'location', 'port', 'place', 'city')),
    vehicle: readVehicle(raw),
    voyage: readText(pick(raw, 'voyage', 'voyage_number', 'voyage_no')),
    timestamp,
    rawTimestamp: rawTimestampText,
    hasTime,
    actual,
    raw,
  };
}

/**
 * Hiçbir şeyi ayırt etmeyen saatleri gizler.
 *
 * Taşıyıcılar deniz hareketlerini çoğu zaman gün hassasiyetinde bildiriyor,
 * ama sağlayıcı yine de saat alanını dolduruyor. Sonuç canlı veride şöyle
 * görünüyordu: yükleme ve kalkış aynı dakikada, varış ve tahliye aynı
 * dakikada. Gemi yüklenip aynı dakikada kalkmaz — o saat gerçek bir olay
 * anı değil, dolgu değer.
 *
 * Kural: bir grupta aynı zaman damgası birden fazla harekette geçiyorsa, o
 * damga olayları birbirinden ayırmıyor demektir; saat gösterilmez, yalnızca
 * gün yazılır. Hava hareketlerinde damgalar gerçekten farklı olduğu için
 * (kalkış 23:50, iniş 08:40) saat olduğu gibi kalır.
 *
 * Ham değer her hâlükârda `rawTimestamp` içinde duruyor — arayüz onu
 * tooltip'te gösteriyor, yani hiçbir bilgi kaybolmuyor.
 */
function suppressAmbiguousTimes(movements) {
  const stamps = movements
    .filter((mv) => mv.timestamp && mv.hasTime)
    .map((mv) => mv.timestamp.getTime());
  const allDistinct = new Set(stamps).size === stamps.length;
  if (allDistinct) return movements;
  return movements.map((mv) => (mv.hasTime ? { ...mv, hasTime: false } : mv));
}

/** Zaman sırasına dizer; tarihsizler sırayı bozmasın diye sona düşer. */
function sortChronologically(movements) {
  return movements
    .map((mv, i) => ({ mv, i }))
    .sort((a, b) => {
      const ta = a.mv.timestamp ? a.mv.timestamp.getTime() : Number.POSITIVE_INFINITY;
      const tb = b.mv.timestamp ? b.mv.timestamp.getTime() : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      return a.i - b.i; // eşitlikte sağlayıcının verdiği sıra korunur
    })
    .map((entry) => entry.mv);
}

/**
 * gRadarRouteJson'u ekranda gösterilebilir hareket gruplarına çevirir.
 *
 * Dönen biçim: [{ containerNumber, movements: [...] }]
 * Havada tek grup olur (containerNumber null); denizde her konteyner ayrı
 * grup — çok konteynerli yüklerde hangi kutunun nerede olduğu karışmasın.
 */
export function extractMovementGroups(routeJson) {
  if (!routeJson) return [];

  let parsed;
  try {
    parsed = typeof routeJson === 'string' ? JSON.parse(routeJson) : routeJson;
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object') return [];

  const groups = [];

  // Hava: düz movements listesi
  if (Array.isArray(parsed.movements) && parsed.movements.length > 0) {
    const movements = suppressAmbiguousTimes(sortChronologically(
      parsed.movements.map(normalizeMovement).filter(Boolean),
    ));
    if (movements.length > 0) groups.push({ containerNumber: null, movements });
  }

  // Deniz: her konteynerin kendi movements listesi
  if (Array.isArray(parsed.containers)) {
    parsed.containers.forEach((container, containerIndex) => {
      if (!container || typeof container !== 'object') return;
      const list = Array.isArray(container.movements) ? container.movements : [];
      const movements = suppressAmbiguousTimes(
        sortChronologically(list.map(normalizeMovement).filter(Boolean)),
      );
      if (movements.length === 0) return;
      groups.push({
        containerNumber: pick(container, 'container_number', 'number', 'containerNumber', 'name')
          ?? t('gRadar.containerFallback', { index: containerIndex + 1 }),
        movements,
      });
    });
  }

  return groups;
}

/** Grupları tek listeye indirir — toplam sayı gibi özetler için. */
export function countMovements(groups) {
  return groups.reduce((total, group) => total + group.movements.length, 0);
}
