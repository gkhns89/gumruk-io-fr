import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import CargoVehicleMarker from './CargoVehicleMarker';
import {
  parseGeoJson,
  pickCenter,
  computeBounds,
  bearingToDestination,
} from '../../utils/gRadarRoute';

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

    // Araç işaretçisi React ile çiziliyor ama MapLibre marker'ı imperatif, o
    // yüzden açtığımız root'ları kapatmak bize kalıyor. Liste bilerek EFEKTE
    // ÖZEL bir yerel değişken; ref olamaz.
    //
    // Ref olduğunda şu kırılıyordu: atama asenkron `load` olayının içinde
    // yapılıyor, ref ise bütün efekt çalıştırmaları arasında paylaşılıyor.
    // StrictMode her efekti iki kez çalıştırdığı için iki tur iç içe giriyor,
    // birinin handler'ı diğerinin listesini eziyor ve temizlik EKRANDAKİ
    // root'u kapatıp yenisini kaçırıyor — araç kayboluyor, pinler kalıyor
    // (onlar React'siz). Production'da StrictMode olmadığı için yalnızca
    // localhost'ta görülüyordu.
    let markerRoots = [];

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
      // Şu anki konum için gemi/uçak çizimi kullanılıyor; yön oku varışa bakıyor.
      markerRoots = addPinMarkers(map, parsed, {
        vehicleType,
        status,
        bearing: bearingToDestination(parsed),
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
      // mikro göreve atıp bu render'ın dışına çıkarıyoruz. Kapatılan liste bu
      // efekt çalıştırmasının kendi listesi — başka bir turunkine dokunmuyor.
      const roots = markerRoots;
      markerRoots = [];
      queueMicrotask(() => roots.forEach((root) => root.unmount()));
      map.remove();
      mapRef.current = null;
    };
    // We deliberately depend on the stringified geojson; parsed is rebuilt
    // every render which would otherwise trigger an infinite remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoJson, vehicleType, status]);

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

      {/* Sefer bilgisi haritanın sol alt köşesinde sabit duruyor. Aracın
          altında yüzerken yön okuyla yer kavgası ediyor ve okun açısına göre
          her seferinde başka yere düşüyordu; köşede durağan ve her zaman
          okunur. Haritada tek araç olduğu için hangi seferi anlattığı da
          belirsiz kalmıyor. Sol alt boş: yakınlaştırma sağ üstte, görünüm
          düğmesi sol üstte, atıf sağ altta. */}
      {vesselLabel && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 text-[11px] font-medium text-text-main shadow-sm backdrop-blur-sm">
          <span className="material-symbols-outlined text-[13px] text-primary">tag</span>
          {vesselLabel}
        </div>
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
        // Sefer bilgisi artık işaretçide değil, haritanın sol alt köşesinde.
        <CargoVehicleMarker
          vehicleType={vehicle.vehicleType}
          status={vehicle.status}
          bearing={vehicle.bearing}
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
