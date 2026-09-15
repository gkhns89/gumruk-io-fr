// Kademeli yayın bayrakları — backend `FeatureFlagKey` ile birebir aynı adlar.
// Kontrol için `useFeatureFlags().hasFeature(FEATURE_FLAGS.X)`; PILOT durumunda `isPilotFeature` "Yeni"
// etiketi göstermek içindir. Bayrak herkese açılıp temizlendiğinde sabit de buradan silinmeli.
export const FEATURE_FLAGS = {
  COURIER_CLIENT_STOPS: 'COURIER_CLIENT_STOPS',
  // Yeni kayıt formlarını taslak olarak saklama + firma çalışma saatleri ayarı (bkz. api/draftService.js)
  DRAFTS: 'DRAFTS',
};

// Bayrağa bağlı bir uç 400 `FEATURE_DISABLED` döndürünce (bayrak sayfa açıkken kapatıldı) yayılır.
// FeatureFlagProvider bayrakları sessizce yeniden yükler; bayraklı arayüz kendiliğinden kaybolur.
export const FEATURE_FLAGS_STALE_EVENT = 'featureFlagsStale';

/**
 * Servislerin catch bloğu için: hata `FEATURE_DISABLED` ise bayrakların tazelenmesini ister ve true döner.
 * Çağıran bu durumda hata toast'ı göstermemeli.
 */
export const reportIfFeatureDisabled = (error) => {
  const data = error?.response?.data;
  if (data?.code !== 'FEATURE_DISABLED' && data?.error !== 'FEATURE_DISABLED') return false;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(FEATURE_FLAGS_STALE_EVENT));
  return true;
};
