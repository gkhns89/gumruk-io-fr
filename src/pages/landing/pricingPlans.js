/**
 * Tanıtım sayfasındaki fiyat tablosunun tek kaynağı.
 *
 * Fiyatlar bilerek statik: yılda bir iki kez değişiyor, canlı veri değil. İleride API'den
 * çekilmek istenirse yalnızca bu dosyanın kaynağı değişir, bileşen aynı kalır — ve bu liste
 * API erişilemediğinde fallback olarak kullanılabilir.
 *
 * Kaynak: Yönetim > Plan Yönetimi (SUPER_ADMIN). Sistemdeki değerlerle senkron tutulmalı.
 * Son güncelleme: 14 Ağustos 2026.
 *
 * FİYAT KURALI — "yıllık = 10 aylık ödeme" (2 ay bedava, %16,7 indirim).
 * Üç planda da birebir tutuyor: 7.500×10=75.000 · 10.000×10=100.000 · 17.500×10=175.000.
 * Yeni plan eklerken veya fiyat değiştirirken bu oranı bozmayın; kartlardaki tasarruf
 * rozetleri hesaplanarak yazılıyor, tutarsızlık doğrudan sayfaya yansır.
 *
 * NOT: "Developer Partner" planı bu listede yok — partner anlaşmasına özel, kamuya açık paket
 * değil. Kredi birim fiyatı da bilerek gösterilmiyor (bkz. sağlayıcı adı gizleme kararı).
 */

// Abonelik bedeline dahil olan modüller — hepsi her planda açık.
export const INCLUDED_FEATURES = [
  "İthalat ve ihracat işlem takibi",
  "Antrepo giriş/çıkış takibi",
  "Kurye ve evrak teslim takibi",
  "Vekalet ve müşteri firma yönetimi",
  "Raporlama ve cari hesap takibi",
  "Anlık bildirim ve duyurular",
];

/**
 * Abonelik bedeline DAHİL OLMAYAN, kullanım başına ücretlendirilen özellikler.
 *
 * G-Radar kredi bazlıdır: kredi birim fiyatı plana göre değişir ve satın alma anındaki
 * TCMB kuruyla ₺'ye çevrilir (bkz. Yönetim > Plan Yönetimi). Bu yüzden "her planda dahil"
 * listesinde gösterilemez — birim fiyat bilinçli olarak yazılmıyor.
 *
 * "G-Radar" bizim özellik adımız; arkasındaki servis sağlayıcının adı hiçbir yerde geçmez.
 */
export const USAGE_BASED = {
  title: "G-Radar canlı yük takibi",
  note: "Deniz ve hava taşımaları için tüm planlarda kullanılabilir. Sorgu başına kredi ile ücretlendirilir; birim fiyat planınıza göre değişir ve teklifte belirtilir.",
};

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "Küçük gümrük müşavirlikleri için ideal başlangıç paketi",
    monthlyPrice: 7500,
    yearlyPrice: 75000,
    userLimit: 3,
    clientLimit: 10,
    highlighted: false,
    extras: [],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Orta ölçekli gümrük müşavirlikleri için gelişmiş özellikler",
    monthlyPrice: 10000,
    yearlyPrice: 100000,
    userLimit: 10,
    clientLimit: 50,
    highlighted: true,
    extras: [],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Büyük gümrük müşavirlikleri için kurumsal çözüm",
    // 15.000 → 17.500: yıllık fiyat 175.000'de kalırken indirim oranı diğer planlarla
    // eşitlendi (önceden %3'tü, yan yana duran rozetlerde göze batıyordu).
    monthlyPrice: 17500,
    yearlyPrice: 175000,
    userLimit: 50,
    clientLimit: 200,
    highlighted: false,
    extras: ["Öncelikli destek"],
  },
];

export const formatTRY = (value) => `₺${Number(value).toLocaleString("tr-TR")}`;

/** Yıllık ödemede cepte kalan tutar — kart üstündeki rozet için */
export const yearlySaving = (plan) => Math.max(0, plan.monthlyPrice * 12 - plan.yearlyPrice);

/** Aynı tasarrufun yüzde karşılığı */
export const yearlySavingRatio = (plan) => {
  const full = plan.monthlyPrice * 12;
  return full > 0 ? Math.round((yearlySaving(plan) / full) * 100) : 0;
};

/** Yıllık ödemenin kaç aylık bedele denk geldiği — "2 ay bedava" ifadesinin kaynağı */
export const freeMonths = (plan) =>
  plan.monthlyPrice > 0
    ? Math.round((plan.monthlyPrice * 12 - plan.yearlyPrice) / plan.monthlyPrice)
    : 0;
