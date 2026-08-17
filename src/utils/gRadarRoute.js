/**
 * G-Radar rota geometrisi — harita çizimi ile künye metinlerinin paylaştığı
 * saf yardımcılar.
 *
 * Burada MapLibre'ye ya da React'e bağımlılık yok: yalnızca sağlayıcının
 * geojson'unu okuyup anlamlı hâle getiren fonksiyonlar. CargoMap bunları
 * çizmek için, detay paneli ise "yük şu an tam olarak nerede" sorusunu
 * yanıtlamak için kullanıyor — ikisi aynı geometriden beslenmezse harita ile
 * yazı birbirini tutmuyor.
 */

export function parseGeoJson(raw) {
  if (!raw) return null;
  const fc = (() => {
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return null; }
  })();
  if (!fc || fc.type !== 'FeatureCollection' || !Array.isArray(fc.features) || fc.features.length === 0) {
    return null;
  }
  return normalizeToInternalShape(fc);
}

/**
 * The map renders against a fixed "kind"-based feature shape (route /
 * origin / destination / waypoint / current — see DataInitializer's seed
 * payload). G-Radar's live geojson uses a different vocabulary:
 * status=PAST | CURRENT | FUTURE, with the vessel's live position sometimes
 * buried inside the LineString's properties.current.coordinates. This walks
 * an arbitrary upstream payload and emits a FeatureCollection in our internal
 * shape so the rest of the component stays simple — and the demo seed
 * payloads keep rendering without touching anything.
 *
 * Rol ataması SIRAYA göre yapılıyor, duruma göre değil. Önceki hâli
 * status=PAST'ı çıkış, status=FUTURE'ı varış sayıyordu ve iki şey birden
 * bozuluyordu:
 *
 *   - status=CURRENT olan nokta hiçbir kovaya girmiyordu, yani haritadan
 *     tamamen düşüyordu. Gemi limana vardığında varış noktasının durumu
 *     CURRENT'a döndüğü için varış işareti kayboluyordu.
 *   - Yük tahliye edilip her nokta PAST olduğunda hepsi "çıkış" sayılıyor ve
 *     harita baştan sona yeşil pinle doluyordu.
 *
 * Sırayla bakınca ilk nokta çıkış, son nokta varış — yükün nerede olduğundan
 * bağımsız olarak doğru. Durum yalnızca aracın nerede olduğunu belirlemek
 * için kullanılıyor.
 */
function normalizeToInternalShape(fc) {
  const features = [];
  const routePoints = [];
  let currentFromLine = null;
  let vesselName = null;

  for (const f of fc.features) {
    if (!f?.geometry) continue;
    const props = f.properties || {};

    if (f.geometry.type === 'LineString') {
      features.push({
        type: 'Feature',
        geometry: f.geometry,
        properties: { kind: 'route' },
      });
      // G-Radar canlı konumu bazen LineString'in içine gömüyor.
      const cur = props.current?.coordinates;
      if (Array.isArray(cur) && cur.length >= 2) currentFromLine = cur;
      if (props.vessel?.name) vesselName = props.vessel.name;
      continue;
    }

    if (f.geometry.type !== 'Point') continue;

    // Already in our internal shape — passthrough (demo seed).
    if (props.kind === 'origin' || props.kind === 'destination' || props.kind === 'current') {
      features.push(f);
      continue;
    }

    routePoints.push({
      coordinates: f.geometry.coordinates,
      status: String(props.status || '').trim().toUpperCase(),
      label: props.location?.name || null,
    });
  }

  routePoints.forEach((point, index) => {
    const isFirst = index === 0;
    const isLast = index === routePoints.length - 1;
    // Tek noktalı rotada o nokta varış sayılıyor: elde tek bir liman varsa
    // orası yükün gittiği yerdir, çıktığı yer değil.
    const kind = isLast ? 'destination' : (isFirst ? 'origin' : 'waypoint');
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: point.coordinates },
      properties: {
        kind,
        label: point.label || (kind === 'destination' ? 'Varış' : kind === 'origin' ? 'Çıkış' : ''),
      },
    });
  });

  // Aracın konumu, en güvenilirden en zayıfa doğru:
  //   1) LineString'e gömülü canlı konum
  //   2) durumu CURRENT olan nokta
  //   3) ulaşılmış son nokta — sağlayıcı canlı konum vermediğinde (varmış ya
  //      da tahliye edilmiş yüklerde tipik olarak vermiyor) araç büsbütün
  //      kaybolmasın diye. Bu, limana varan geminin limanda görünmesini
  //      sağlayan yedek.
  const currentIndex = routePoints.findIndex((p) => p.status === 'CURRENT');
  let lastReachedIndex = -1;
  routePoints.forEach((p, i) => {
    if (p.status === 'CURRENT' || p.status === 'PAST') lastReachedIndex = i;
  });

  const here = currentFromLine
    || (currentIndex >= 0 ? routePoints[currentIndex].coordinates : null)
    || (lastReachedIndex >= 0 ? routePoints[lastReachedIndex].coordinates : null);

  const alreadyHasCurrent = features.some((f) => f.properties?.kind === 'current');
  if (here && !alreadyHasCurrent) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: here },
      properties: {
        kind: 'current',
        label: vesselName || '',
        // Hangi iki liman arasında olduğu — konum tarifi bunu kullanıyor.
        legFrom: lastReachedIndex >= 0 ? routePoints[lastReachedIndex].label : null,
        legTo: lastReachedIndex + 1 < routePoints.length
          ? routePoints[lastReachedIndex + 1].label
          : null,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

export function pickCenter(fc) {
  const cur = fc.features.find(f => f.properties?.kind === 'current');
  if (cur?.geometry?.coordinates) return cur.geometry.coordinates;
  const orig = fc.features.find(f => f.properties?.kind === 'origin');
  if (orig?.geometry?.coordinates) return orig.geometry.coordinates;
  return [0, 30];
}

export function computeBounds(fc) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Point') {
      const [lon, lat] = g.coordinates;
      minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    } else if (g.type === 'LineString') {
      for (const [lon, lat] of g.coordinates) {
        minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
      }
    }
  }
  if (!Number.isFinite(minLon)) return null;
  return [[minLon, minLat], [maxLon, maxLat]];
}

/**
 * Aracın bulunduğu noktadan VARIŞ noktasına olan pusula açısı.
 *
 * Rotanın teğeti bilerek kullanılmıyor. Yükün o anki seyir yönü aktarma
 * limanlarında bambaşka yerlere sapıyor (Uzakdoğu hattında gemi bir süre
 * güneye gider), ve haritaya bakan kişinin okumak istediği o değil: "yük
 * nereye gidiyor". Varışa bakan ok bu soruyu doğrudan yanıtlıyor ve rota
 * kıvrıldıkça oynamıyor.
 *
 * Varış yoksa ya da araç zaten varışın üstündeyse null döner; o durumda ok
 * hiç çizilmiyor — rastgele yöne bakan bir ok, yön bilgisi olmamasından daha
 * kötü.
 */
export function bearingToDestination(fc) {
  const here = fc.features.find((f) => f.properties?.kind === 'current')?.geometry?.coordinates;
  const target = fc.features.find((f) => f.properties?.kind === 'destination')?.geometry?.coordinates;
  if (!Array.isArray(here) || !Array.isArray(target)) return null;
  if (here[0] === target[0] && here[1] === target[1]) return null;
  return bearingBetween(here, target);
}

/** İki nokta arasındaki başlangıç pusula açısı (0 = kuzey, saat yönünde). */
const toRadians = (deg) => (deg * Math.PI) / 180;

function bearingBetween([lon1, lat1], [lon2, lat2]) {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}
/** İki nokta arasındaki büyük çember mesafesi (km). */
function distanceKm([lon1, lat1], [lon2, lat2]) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** 41.0082 → "41.01° K" (enlem) / 28.9784 → "28.98° D" (boylam) */
function formatCoordinate(value, positive, negative) {
  const hemisphere = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(2)}° ${hemisphere}`;
}

/**
 * Canlı koordinattan okunabilir bir konum tarifi üretir.
 *
 * Neden gerekiyor: sağlayıcının bildirdiği konum METNİ yalnızca yeni bir
 * hareket kaydedildiğinde değişiyor, oysa haritadaki koordinat sürekli
 * güncelleniyor. Aradaki fark büyüyünce panel "SINGAPORE" yazarken gemi
 * haritada Kızıldeniz'de görünüyor. Burada üretilen tarif doğrudan
 * koordinattan geldiği için haritayla her zaman tutarlı.
 *
 * Ters coğrafi kodlama (koordinat → yer adı) bilerek kullanılmıyor: dış
 * servise bağımlılık, ücret ve CSP yükü getirir. Bunun yerine elde zaten
 * bulunan rota limanlarının adları kullanılıyor — "hangi iki liman arasında"
 * ve "varışa ne kadar kaldı" bir gümrük müşaviri için zaten en kullanışlı iki
 * bilgi.
 *
 * @returns {{summary: string, legText: string|null, remainingText: string|null,
 *            coordinateText: string}|null}
 */
export function describeLivePosition(rawGeoJson) {
  const fc = parseGeoJson(rawGeoJson);
  if (!fc) return null;

  const current = fc.features.find((f) => f.properties?.kind === 'current');
  const here = current?.geometry?.coordinates;
  if (!Array.isArray(here) || here.length < 2) return null;

  const [lon, lat] = here;
  const coordinateText = `${formatCoordinate(lat, 'K', 'G')}, ${formatCoordinate(lon, 'D', 'B')}`;

  const { legFrom, legTo } = current.properties;
  const legText = legFrom && legTo ? `${legFrom} → ${legTo} arasında` : null;

  const destination = fc.features.find((f) => f.properties?.kind === 'destination');
  const target = destination?.geometry?.coordinates;
  let remainingText = null;
  if (Array.isArray(target)) {
    const km = distanceKm(here, target);
    // 25 km'nin altında "vardı sayılır" — daha küçük bir sayıyı kuş uçuşu
    // mesafeyle iddia etmek yanıltıcı olur.
    remainingText = km < 25
      ? 'Varış noktasında'
      : `Varışa ~${Math.round(km).toLocaleString('tr-TR')} km (kuş uçuşu)`;
  }

  return {
    summary: legText || coordinateText,
    legText,
    remainingText,
    coordinateText,
  };
}
