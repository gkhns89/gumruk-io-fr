import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import CourierVehicleMarker from './CourierVehicleMarker';
import { mapStyleUrl } from '../../utils/mapStyle';
import { t } from '../../locales';

/**
 * İşaretçinin oku için yön. Cihaz yön bildirmediğinde (duran araç, eski cihaz) ok hiç çizilmezdi;
 * bunun yerine varış noktasına bakan açı kullanılır — müşteri en azından "nereye gidiyor" görür.
 * Cihazın bildirdiği yön varsa o esastır: gerçek rota her zaman hedefe doğru düz gitmez.
 */
const headingFor = (heading, vehiclePoint, destinationPoint) => {
  if (typeof heading === 'number' && Number.isFinite(heading)) return heading;
  if (!vehiclePoint || !destinationPoint) return null;
  const [fromLng, fromLat] = vehiclePoint;
  const [toLng, toLat] = destinationPoint;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const deltaLng = toRad(toLng - fromLng);
  const y = Math.sin(deltaLng) * Math.cos(toRad(toLat));
  const x = Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat))
    - Math.sin(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.cos(deltaLng);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
};

/**
 * Kurye canlı takip haritası (todo 19, faz 2) — MapLibre GL, G-Radar'daki `CargoMap` ile aynı
 * stil kaynağı (MapTiler anahtarı varsa MapTiler, yoksa OpenFreeMap; bkz. `utils/mapStyle.js`).
 *
 * BU DOSYA YALNIZCA LAZY OLARAK IMPORT EDİLİR (bkz. CourierTrackingSection): `maplibre-gl`
 * statik bir import zincirine girerse giriş paketine düşer ve tanıtım sayfasını ziyaret eden
 * herkes indirir.
 *
 * Çizilenler:
 *  - iz (LineString), en eskiden en yeniye
 *  - araç işaretçisi (React ile, `CourierVehicleMarker`)
 *  - varış pini (düz HTML, React gerekmiyor)
 *
 * Kadraj: açılışta araç + varış birlikte sığar. Sonraki okumalarda harita yeniden
 * kadrajlanmaz — kullanıcı haritayı kaydırmışken altından çekilmesi en can sıkıcı harita
 * davranışıdır; "Araca dön" düğmesi tek tıkla geri getirir.
 *
 * @param {[number, number]|null} vehicle - [lng, lat]
 * @param {number|null} heading - 0-359
 * @param {Array<[number, number]>} trail - [[lng, lat], ...]
 * @param {{ label?: string, lat: number, lng: number }|null} destination
 * @param {string} vehicleType
 * @param {boolean} stale - son okuma eskiyse işaretçi soluk
 */
export default function LiveCourierMap({
  vehicle,
  heading = null,
  trail = [],
  destination = null,
  vehicleType,
  stale = false,
  height = 280,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const markerRootRef = useRef(null);
  const [error, setError] = useState(null);

  // Varış noktası gönderi boyunca değişmez. Efekt bağımlılıkları dizi değil SAYI olmalı: her
  // render'da yeni bir dizi üretilir ve efekt boşuna yeniden çalışırdı.
  const destLng = destination && Number.isFinite(Number(destination.lng)) ? Number(destination.lng) : null;
  const destLat = destination && Number.isFinite(Number(destination.lat)) ? Number(destination.lat) : null;
  const destinationPoint = destLng !== null && destLat !== null ? [destLng, destLat] : null;
  // Konum güncelleme efekti kadrajı hesaplarken buna bakar; bağımlılığa girmez.
  const destinationRef = useRef(destinationPoint);
  destinationRef.current = destinationPoint;

  // --- Haritanın kurulumu: yalnızca bir kez (ve varış noktası değişirse) ---
  useEffect(() => {
    if (!containerRef.current) return undefined;

    let map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyleUrl(),
        center: vehicle || destinationPoint || DEFAULT_CENTER,
        zoom: VEHICLE_ZOOM,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    } catch (e) {
      // MapLibre'nin hatası İngilizce ve teknik (WebGL vb.); kullanıcıya çevrili metin gider.
      console.warn('[LiveCourierMap] map init failed:', e?.message);
      setError(t('courierTracking.map.loadError'));
      return undefined;
    }
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('courier-trail', { type: 'geojson', data: trailGeoJson([]) });
      // Beyaz halo: iz hem açık hem koyu döşemelerde okunur kalsın.
      map.addLayer({
        id: 'courier-trail-halo',
        type: 'line',
        source: 'courier-trail',
        paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.7 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
      map.addLayer({
        id: 'courier-trail-line',
        type: 'line',
        source: 'courier-trail',
        paint: { 'line-color': '#2563eb', 'line-width': 3 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });

      if (destinationPoint) {
        const el = document.createElement('div');
        el.className = 'courier-destination-pin';
        el.innerHTML = destinationPinHtml(destination?.label);
        new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(destinationPoint)
          .addTo(map);
      }
      // Kaynaklar hazır: ilk veriyi hemen bas, `load` sonrası efekt beklemesin.
      map.fire('courier-ready');
    });

    map.on('error', (e) => {
      console.warn('[LiveCourierMap] map error:', e?.error?.message);
      setError(t('courierTracking.map.sourceError'));
    });

    return () => {
      // React root'u senkron kapatmak "already rendering" uyarısı veriyor; mikro göreve atıyoruz
      // (CargoMap'te öğrenilen ders).
      const root = markerRootRef.current;
      markerRootRef.current = null;
      vehicleMarkerRef.current = null;
      if (root) queueMicrotask(() => root.unmount());
      map.remove();
      mapRef.current = null;
    };
    // Varış noktası gönderi boyunca değişmez; araç ve iz aşağıdaki efektte güncellenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destLng, destLat]);

  // --- Her yeni okumada: iz, araç işaretçisi ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const apply = () => {
      const source = map.getSource('courier-trail');
      if (source) source.setData(trailGeoJson(trail));

      if (!vehicle) return;
      if (!vehicleMarkerRef.current) {
        const el = document.createElement('div');
        markerRootRef.current = createRoot(el);
        vehicleMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(vehicle)
          .addTo(map);
        // İlk konum geldiğinde araç + varış birlikte kadraja alınır; sonra kadraj zorlanmaz.
        fitAll(map, vehicle, destinationRef.current, 0);
      } else {
        vehicleMarkerRef.current.setLngLat(vehicle);
      }
      markerRootRef.current?.render(
        <CourierVehicleMarker
          vehicleType={vehicleType}
          heading={headingFor(heading, vehicle, destinationRef.current)}
          stale={stale}
        />,
      );
    };

    if (map.isStyleLoaded() && map.getSource('courier-trail')) {
      apply();
      return undefined;
    }
    map.once('courier-ready', apply);
    return () => map.off('courier-ready', apply);
  }, [vehicle, heading, trail, vehicleType, stale]);

  const backToVehicle = () => {
    const map = mapRef.current;
    if (map && vehicle) map.flyTo({ center: vehicle, zoom: VEHICLE_ZOOM, duration: 600 });
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />

      {vehicle && (
        <button
          type="button"
          onClick={backToVehicle}
          className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-gray-800/95 border border-gray-300 dark:border-gray-600 text-xs font-medium text-text-main shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">my_location</span>
          {t('courierTracking.map.backToVehicle')}
        </button>
      )}

      {error && (
        <div className="absolute inset-x-0 bottom-0 bg-red-50/95 dark:bg-red-900/40 border-t border-red-200 dark:border-red-800 px-3 py-1.5">
          <p className="text-[11px] text-red-700 dark:text-red-300 truncate">{error}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/** Araca yakın görünüm: şehir içi bir kurye rotasında sokaklar okunur kalsın. */
const VEHICLE_ZOOM = 13;

/** Hiç konum yokken harita boş mavi bir alana bakmasın: İstanbul. */
const DEFAULT_CENTER = [29.0, 41.0];

/** Kadrajın nefes payı; araç işaretçisi 72px genişliğinde, yarısı 36px taşıyor. */
const FIT_PADDING = 56;
const FIT_MAX_ZOOM = 14;

function trailGeoJson(points) {
  return {
    type: 'FeatureCollection',
    features: points.length >= 2
      ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: points }, properties: {} }]
      : [],
  };
}

/** Araç ve varış birlikte kadraja; yalnız biri varsa ona yakınlaşır. */
function fitAll(map, vehicle, destination, duration) {
  if (!destination) {
    map.easeTo({ center: vehicle, zoom: VEHICLE_ZOOM, duration });
    return;
  }
  const bounds = new maplibregl.LngLatBounds(vehicle, vehicle).extend(destination);
  map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, duration });
}

function destinationPinHtml(label) {
  const safeLabel = String(label || t('courierTracking.map.destination')).replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]),
  );
  return `
    <div class="courier-destination-pin__label">${safeLabel}</div>
    <div class="courier-destination-pin__tip"></div>`;
}
