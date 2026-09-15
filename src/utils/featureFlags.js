// Kademeli yayın bayrakları — backend `FeatureFlagKey` ile birebir aynı adlar.
// Kontrol için `useFeatureFlags().hasFeature(FEATURE_FLAGS.X)`; PILOT durumunda `isPilotFeature` "Yeni"
// etiketi göstermek içindir. Bayrak herkese açılıp temizlendiğinde sabit de buradan silinmeli.
export const FEATURE_FLAGS = {
  COURIER_CLIENT_STOPS: 'COURIER_CLIENT_STOPS',
  // Yeni kayıt formlarını taslak olarak saklama + firma çalışma saatleri ayarı (bkz. api/draftService.js)
  DRAFTS: 'DRAFTS',
};
