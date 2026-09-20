/**
 * MapLibre stil kaynağının tek seçim yeri (G-Radar haritası ve kurye canlı takip haritası).
 *
 * - `VITE_MAPTILER_API_KEY` varsa MapTiler vektör döşemeleri (daha iyi görünüm, anahtar gerekir)
 * - yoksa OpenFreeMap "liberty" stili (ücretsiz, anahtarsız)
 *
 * Anahtar build sırasında gömülür; ayrı bir istek ya da çalışma zamanı ayarı yoktur.
 * Bu modül kasıtlı olarak `maplibre-gl` import etmez: yalnızca bir URL üretir, böylece harita
 * kitaplığını yalnızca haritayı gerçekten çizen (lazy) bileşenler yükler.
 */
export function mapStyleUrl() {
  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
  return apiKey
    ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`
    : 'https://tiles.openfreemap.org/styles/liberty';
}

export default mapStyleUrl;
