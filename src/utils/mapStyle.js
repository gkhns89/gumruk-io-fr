/**
 * MapLibre stil kaynağının tek seçim yeri (G-Radar haritası ve kurye canlı takip haritası).
 *
 * - `VITE_MAPTILER_API_KEY` varsa MapTiler vektör döşemeleri (daha iyi görünüm, anahtar gerekir)
 * - yoksa ya da MapTiler yanıt vermiyorsa OpenFreeMap "liberty" stili (ücretsiz, anahtarsız)
 *
 * **Neden çalışma zamanında sınanıyor:** MapTiler anahtarı alan adına kısıtlıdır ve kısıt bir gün
 * tutmazsa (21.09.2026: anahtar `gumruk.io` için izinliydi, ama site `www.gumruk.io`'ya yönlendiriyordu →
 * stil 403 → harita bomboş) harita tek bir servise bağlı kaldığı için komple ölüyordu. Artık stil bir kez
 * yoklanıyor; MapTiler cevap vermezse harita OpenFreeMap ile çiziliyor — görünüm değişir, harita çalışır.
 *
 * Yoklama oturumda bir kezdir (sonuç modülde tutulur) ve haritanın kendi isteği tarayıcı önbelleğinden
 * gelir, yani ek gecikme yok denecek kadar azdır.
 *
 * Bu modül kasıtlı olarak `maplibre-gl` import etmez: yalnızca bir URL üretir, böylece harita
 * kitaplığını yalnızca haritayı gerçekten çizen (lazy) bileşenler yükler.
 */

const OPEN_FREE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** Yoklama bu süre içinde bitmezse MapTiler'dan vazgeçilir; harita beklemekten iyidir. */
const PROBE_TIMEOUT_MS = 4000;

const maptilerStyleUrl = () => {
  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
  return apiKey ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}` : null;
};

/** Anahtar varsa MapTiler, yoksa OpenFreeMap. Yoklama yapmaz; `resolveMapStyleUrl` bunu doğrular. */
export function mapStyleUrl() {
  return maptilerStyleUrl() || OPEN_FREE_MAP_STYLE;
}

let probe = null;

/**
 * Kullanılacak stil adresi. MapTiler anahtarı yoksa doğrudan OpenFreeMap; varsa stil bir kez istenir ve
 * hata dönerse (403 alan adı kısıtı, kota, ağ) OpenFreeMap'e düşülür.
 *
 * @returns {Promise<string>} stil adresi
 */
export function resolveMapStyleUrl() {
  if (probe) return probe;

  const styleUrl = maptilerStyleUrl();
  if (!styleUrl) {
    probe = Promise.resolve(OPEN_FREE_MAP_STYLE);
    return probe;
  }

  probe = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const response = await fetch(styleUrl, { signal: controller.signal });
      if (response.ok) return styleUrl;
      // Anahtar adresin içinde: durum kodundan başka bir şey loglanmaz.
      console.warn(`[mapStyle] MapTiler stili ${response.status} döndü, OpenFreeMap'e düşülüyor`);
    } catch {
      console.warn('[mapStyle] MapTiler stiline ulaşılamadı, OpenFreeMap\'e düşülüyor');
    } finally {
      clearTimeout(timer);
    }
    return OPEN_FREE_MAP_STYLE;
  })();

  return probe;
}

export default mapStyleUrl;
