import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import CargoVehicleMarker from './CargoVehicleMarker';

/**
 * Compact MapLibre map for the G-Radar drawer. Renders a cargo's route
 * GeoJSON (line + origin / destination / current markers) and auto-fits
 * the view to the route's bounding box.
 *
 * Style source:
 *  - VITE_MAPTILER_API_KEY set → MapTiler vector tiles (premium look)
 *  - otherwise               → OpenFreeMap liberty style (free, no key)
 *
 * Expected GeoJSON shape (see DataInitializer demo for examples):
 *   FeatureCollection of
 *     - one LineString feature  ({ properties.kind: "route" })
 *     - Point features          ({ properties.kind: "origin" | "destination" | "current", label })
 *
 * The component handles missing / invalid geojson by rendering a placeholder
 * instead of an empty map — important because the drawer always shows a map
 * slot at the top, even when nothing was synced yet.
 */
export default function CargoMap({
  geoJson,
  vehicleType,
  status,
  vesselLabel,
  height = 320,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // Araç işaretçisi React ile çiziliyor ama MapLibre marker'ı imperatif —
  // açtığımız root'ları harita yıkılırken kapatmak için tutuyoruz.
  const rootsRef = useRef([]);
  // Görünüm düğmesinin, efekt yeniden çalışmadan geometriye erişmesi için.
  const geometryRef = useRef(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState('vehicle');

  const parsed = parseGeoJson(geoJson);
  const vehiclePosition = parsed
    ? parsed.features.find((f) => f.properties?.kind === 'current')?.geometry?.coordinates
    : null;
  geometryRef.current = parsed;

  useEffect(() => {
    if (!containerRef.current || !parsed) return undefined;

    const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
    const styleUrl = apiKey
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`
      : 'https://tiles.openfreemap.org/styles/liberty';

    let map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: pickCenter(parsed),
        // Canlı konum varsa doğrudan araca yakınlaşıyoruz. Öncesinde rotanın
        // tamamı sığdırılıyordu; Uzakdoğu–Akdeniz gibi bir hatta sınırlar
        // devasa olduğu için zoom 2-3'e düşüyor ve araç nokta kadar kalıyordu.
        // Rotanın bütününe "Rotanın tamamı" düğmesiyle dönülüyor.
        zoom: vehiclePosition ? VEHICLE_ZOOM : 3,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    } catch (e) {
      setError(e.message || 'Harita yüklenemedi');
      return undefined;
    }

    mapRef.current = map;
    // Harita yeniden kurulduğunda (yeni veri, "Yenile") açılış görünümü yine
    // araç oluyor; düğme etiketi buna göre sıfırlanmalı.
    setView('vehicle');

    map.on('load', () => {
      map.addSource('cargo-route', { type: 'geojson', data: parsed });

      // Soft halo behind the route line so it stays readable over busy tiles.
      map.addLayer({
        id: 'cargo-route-halo',
        type: 'line',
        source: 'cargo-route',
        filter: ['==', ['get', 'kind'], 'route'],
        paint: {
          'line-color': '#ffffff',
          'line-width': 6,
          'line-opacity': 0.7,
        },
      });
      map.addLayer({
        id: 'cargo-route-line',
        type: 'line',
        source: 'cargo-route',
        filter: ['==', ['get', 'kind'], 'route'],
        paint: {
          'line-color': vehicleType === 'AIRPLANE' ? '#0ea5e9' : '#2563eb',
          'line-width': 3,
          'line-dasharray': vehicleType === 'AIRPLANE' ? [2, 2] : [1, 0],
        },
      });

      // Point markers — placed manually so we can use HTML/CSS pins instead
      // of MapLibre's symbol layer (no sprite sheet wrangling).
      // Şu anki konum için gemi/uçak çizimi kullanılıyor; yönü rotanın o
      // noktadaki parçasından hesaplanıyor.
      rootsRef.current = addPinMarkers(map, parsed, {
        vehicleType,
        status,
        vesselLabel,
        bearing: bearingAtCurrent(parsed),
      });

      // Canlı konum yoksa (araç işaretçisi de çizilmiyor) rotanın tamamını
      // sığdırmak hâlâ en anlamlı açılış — gösterilecek başka bir şey yok.
      if (!vehiclePosition) {
        fitRoute(map, parsed, 0);
      }
    });

    map.on('error', (e) => {
      // Tile-fetch failures (network, key expired, etc) show through here —
      // we leak just enough to the user so they know it's the map, not the
      // data.
      const msg = e?.error?.message || 'Harita kaynağı yüklenemedi';
      setError(msg);
    });

    return () => {
      // React root'unu senkron kapatmak "already rendering" uyarısı veriyor;
      // mikro göreve atıp bu render'ın dışına çıkarıyoruz.
      const roots = rootsRef.current;
      rootsRef.current = [];
      queueMicrotask(() => roots.forEach((root) => root.unmount()));
      map.remove();
      mapRef.current = null;
    };
    // We deliberately depend on the stringified geojson; parsed is rebuilt
    // every render which would otherwise trigger an infinite remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoJson, vehicleType, status, vesselLabel]);

  /** Araca yakın görünüm ile rotanın tamamı arasında gidip gelir. */
  const toggleView = () => {
    const map = mapRef.current;
    const fc = geometryRef.current;
    if (!map || !fc) return;

    if (view === 'vehicle') {
      fitRoute(map, fc, 600);
      setView('route');
    } else {
      const here = fc.features.find((f) => f.properties?.kind === 'current')?.geometry?.coordinates;
      if (here) map.flyTo({ center: here, zoom: VEHICLE_ZOOM, duration: 600 });
      setView('vehicle');
    }
  };

  if (!parsed) {
    return (
      <div
        className="flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700"
        style={{ height }}
      >
        <div className="text-center px-4">
          <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-500">
            map
          </span>
          <p className="text-xs text-text-secondary mt-1">
            Harita verisi henüz çekilmedi
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5 opacity-70">
            G-Radar'dan rota bilgisi geldiğinde burada görünecek.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-b border-gray-200 dark:border-gray-700" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Görünüm geçişi — açılış araca yakın olduğu için rotanın bütününe
          dönmenin tek tıklık bir yolu olmalı. Canlı konum yoksa zaten rota
          görünümündeyiz, düğme gösterilmiyor. */}
      {vehiclePosition && (
        <button
          type="button"
          onClick={toggleView}
          className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-gray-800/95 border border-gray-300 dark:border-gray-600 text-xs font-medium text-text-main shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">
            {view === 'vehicle' ? 'zoom_out_map' : 'my_location'}
          </span>
          {view === 'vehicle' ? 'Rotanın tamamı' : 'Araca dön'}
        </button>
      )}

      {error && (
        <div className="absolute inset-x-0 bottom-0 bg-red-50/95 dark:bg-red-900/40 border-t border-red-200 dark:border-red-800 px-3 py-1.5">
          <p className="text-[11px] text-red-700 dark:text-red-300 truncate">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Açılıştaki yakınlık. 6 bilinçli bir orta yol: daha yakını açık denizde
 * referanssız mavi bir alan bırakıyor (kıyı çizgisi kadraja girmiyor), daha
 * uzağı ise kullanıcının şikâyet ettiği "araç nokta kadar" görünümüne dönüyor.
 */
const VEHICLE_ZOOM = 6;

/**
 * Rota görünümünün nefes payı.
 *
 * padding: araç işaretçisi 120px genişliğinde ve merkezinden konumlanıyor,
 * yani her yöne 60px taşıyor. Daha dar bir pay işaretçiyi kadrajın kenarında
 * kırpıyor.
 *
 * slack: sığdırma matematiği rotayı kadraja "tam" oturtuyor; çıkış ve varış
 * pinleri kenara yapışık kalıyor ve görüntü sıkışık duruyor. Bir zoom seviyesi
 * geri alınca içerik rahat nefes alıyor.
 */
const ROUTE_PADDING = 64;
const ROUTE_ZOOM_SLACK = 1;
const ROUTE_MAX_ZOOM = 6;

/**
 * Rotanın tamamını, bir seviye esneklik payıyla kadraja oturtur.
 *
 * fitBounds tek başına payı veremiyor (maxZoom sadece üst sınır koyuyor), o
 * yüzden önce kamera hesaplanıp zoom'dan pay düşülüyor. cameraForBounds
 * bozuk/tekil geometride null dönebiliyor — o durumda düz fitBounds'a
 * düşüyoruz.
 */
function fitRoute(map, fc, duration) {
  const bounds = computeBounds(fc);
  if (!bounds) return;

  const camera = map.cameraForBounds(bounds, { padding: ROUTE_PADDING });
  if (camera && Number.isFinite(camera.zoom)) {
    map.easeTo({
      center: camera.center,
      zoom: Math.max(1, Math.min(ROUTE_MAX_ZOOM, camera.zoom - ROUTE_ZOOM_SLACK)),
      duration,
    });
    return;
  }
  map.fitBounds(bounds, { padding: ROUTE_PADDING, maxZoom: ROUTE_MAX_ZOOM, duration });
}

function parseGeoJson(raw) {
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
  const explicitCurrent = routePoints.find((p) => p.status === 'CURRENT');
  const lastReached = [...routePoints].reverse()
    .find((p) => p.status === 'CURRENT' || p.status === 'PAST');
  const here = currentFromLine || explicitCurrent?.coordinates || lastReached?.coordinates;

  const alreadyHasCurrent = features.some((f) => f.properties?.kind === 'current');
  if (here && !alreadyHasCurrent) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: here },
      properties: { kind: 'current', label: vesselName || 'Şu an' },
    });
  }

  return { type: 'FeatureCollection', features };
}

function pickCenter(fc) {
  const cur = fc.features.find(f => f.properties?.kind === 'current');
  if (cur?.geometry?.coordinates) return cur.geometry.coordinates;
  const orig = fc.features.find(f => f.properties?.kind === 'origin');
  if (orig?.geometry?.coordinates) return orig.geometry.coordinates;
  return [0, 30];
}

function computeBounds(fc) {
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
 * Rotanın, aracın bulunduğu noktadaki gidiş açısı (pusula derecesi).
 *
 * Rota çizgisinin araca en yakın parçası bulunup o parçanın yönü alınıyor —
 * "şu an nereye doğru gidiyor" sorusunun cevabı bu. Rota tek noktadan
 * ibaretse ya da canlı konum yoksa null döner; o durumda arayüz ok
 * göstermiyor, çünkü rastgele yöne bakan bir ok yön bilgisi olmamasından
 * daha kötü.
 */
function bearingAtCurrent(fc) {
  const route = fc.features.find((f) => f.geometry?.type === 'LineString');
  const current = fc.features.find((f) => f.properties?.kind === 'current');
  const coords = route?.geometry?.coordinates;
  const here = current?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2 || !Array.isArray(here)) return null;

  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const d = squaredDistanceToSegment(here, coords[i], coords[i + 1]);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }
  return bearingBetween(coords[bestIndex], coords[bestIndex + 1]);
}

const toRadians = (deg) => (deg * Math.PI) / 180;

/** İki nokta arasındaki başlangıç pusula açısı (0 = kuzey, saat yönünde). */
function bearingBetween([lon1, lat1], [lon2, lat2]) {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Noktanın parçaya uzaklığının karesi. Yalnızca "hangi parça daha yakın"
 * karşılaştırması için kullanıldığından karekök alınmıyor; boylam farkı
 * enleme göre daraldığı için cos(lat) ile ölçekleniyor.
 */
function squaredDistanceToSegment(point, a, b) {
  const scale = Math.cos(toRadians(point[1])) || 1;
  const px = (point[0] - a[0]) * scale;
  const py = point[1] - a[1];
  const bx = (b[0] - a[0]) * scale;
  const by = b[1] - a[1];
  const lengthSq = bx * bx + by * by;
  const t = lengthSq ? Math.max(0, Math.min(1, (px * bx + py * by) / lengthSq)) : 0;
  const dx = px - bx * t;
  const dy = py - by * t;
  return dx * dx + dy * dy;
}

/**
 * Noktaları haritaya yerleştirir. Çıkış / varış hâlâ basit HTML pin; canlı
 * konum ise React ile çizilen araç işaretçisi (gemi ya da uçak).
 *
 * Geri dönen dizi, açılan React root'larını içeriyor — harita yıkılırken
 * kapatılmaları gerekiyor.
 */
function addPinMarkers(map, fc, vehicle) {
  const roots = [];
  for (const f of fc.features) {
    if (f.geometry?.type !== 'Point') continue;
    const kind = f.properties?.kind;
    const label = f.properties?.label || '';

    if (kind === 'current') {
      const el = document.createElement('div');
      const root = createRoot(el);
      root.render(
        <CargoVehicleMarker
          vehicleType={vehicle.vehicleType}
          status={vehicle.status}
          bearing={vehicle.bearing}
          // Gemi adı ve sefer numarası hareket kayıtlarından geliyor; yoksa
          // geojson'un kendi etiketine düşüyoruz.
          label={vehicle.vesselLabel || label}
        />,
      );
      roots.push(root);
      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(f.geometry.coordinates)
        .addTo(map);
      continue;
    }

    const el = document.createElement('div');
    el.className = 'cargo-map-pin';
    el.innerHTML = pinHtml(kind, label);
    // Çıkış/varış pinleri aşağı sivriliyor, ucu noktaya oturmalı; ara durak
    // ise sade bir daire, ortasından hizalanıyor.
    new maplibregl.Marker({ element: el, anchor: kind === 'waypoint' ? 'center' : 'bottom' })
      .setLngLat(f.geometry.coordinates)
      .setPopup(label ? new maplibregl.Popup({ offset: 18, closeButton: false }).setText(label) : null)
      .addTo(map);
  }
  return roots;
}

function pinHtml(kind, label) {
  const safeLabel = (label || '').replace(/[<>&"']/g, c => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  if (kind === 'origin') {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="background:#10b981;color:#fff;font-size:10px;padding:2px 6px;border-radius:999px;font-weight:600;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.3);">
          ${safeLabel || 'Çıkış'}
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #10b981;"></div>
      </div>`;
  }
  if (kind === 'destination') {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="background:#ef4444;color:#fff;font-size:10px;padding:2px 6px;border-radius:999px;font-weight:600;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.3);">
          ${safeLabel || 'Varış'}
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #ef4444;"></div>
      </div>`;
  }
  // Ara duraklar (aktarma limanları) — küçük ve sessiz. Adları yalnızca
  // üstlerine gelince görünsün, yoksa uzun rotalarda harita etiketle doluyor.
  // Canlı konum buraya düşmez; o CargoVehicleMarker ile React tarafında
  // çiziliyor (bkz. addPinMarkers).
  return `
    <div title="${safeLabel}" style="position:relative;width:10px;height:10px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#94a3b8;box-shadow:0 0 0 2px #fff,0 1px 2px rgba(0,0,0,0.35);"></div>
    </div>`;
}
