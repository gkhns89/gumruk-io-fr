import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Compact MapLibre map for the ShipsGo drawer. Renders a cargo's route
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
export default function CargoMap({ geoJson, vehicleType, height = 320 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [error, setError] = useState(null);

  const parsed = parseGeoJson(geoJson);

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
        zoom: 3,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    } catch (e) {
      setError(e.message || 'Harita yüklenemedi');
      return undefined;
    }

    mapRef.current = map;

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
      addPinMarkers(map, parsed);

      // Auto-fit to the whole route with a generous pad so the markers don't
      // sit on the very edge of the canvas.
      const bounds = computeBounds(parsed);
      if (bounds) {
        map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 6 });
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
      map.remove();
      mapRef.current = null;
    };
    // We deliberately depend on the stringified geojson; parsed is rebuilt
    // every render which would otherwise trigger an infinite remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoJson, vehicleType]);

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
            ShipsGo'dan rota bilgisi geldiğinde burada görünecek.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-b border-gray-200 dark:border-gray-700" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
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

function parseGeoJson(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const obj = JSON.parse(raw);
    if (obj?.type !== 'FeatureCollection' || !Array.isArray(obj.features) || obj.features.length === 0) {
      return null;
    }
    return obj;
  } catch {
    return null;
  }
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

function addPinMarkers(map, fc) {
  for (const f of fc.features) {
    if (f.geometry?.type !== 'Point') continue;
    const kind = f.properties?.kind;
    const label = f.properties?.label || '';
    const el = document.createElement('div');
    el.className = 'cargo-map-pin';
    el.innerHTML = pinHtml(kind, label);
    new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat(f.geometry.coordinates)
      .setPopup(label ? new maplibregl.Popup({ offset: 18, closeButton: false }).setText(label) : null)
      .addTo(map);
  }
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
  // current — animated pulse
  return `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="background:#2563eb;color:#fff;font-size:10px;padding:2px 6px;border-radius:999px;font-weight:600;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.3);margin-bottom:2px;">
        ${safeLabel || 'Şu an'}
      </div>
      <div style="position:relative;width:14px;height:14px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:#2563eb;box-shadow:0 0 0 3px #fff,0 1px 3px rgba(0,0,0,0.4);"></div>
        <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(37,99,235,0.35);animation:cargo-pulse 1.6s ease-out infinite;"></div>
      </div>
    </div>`;
}
