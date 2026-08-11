/**
 * Tanıtım sayfasındaki fiyat tablosunun tek kaynağı.
 *
 * Fiyatlar bilerek statik: yılda bir iki kez değişiyor, canlı veri değil. İleride API'den
 * çekilmek istenirse yalnızca bu dosyanın kaynağı değişir, bileşen aynı kalır — ve bu liste
 * API erişilemediğinde fallback olarak kullanılabilir.
 *
 * Kaynak: Yönetim > Plan Yönetimi (SUPER_ADMIN). Sistemdeki değerlerle senkron tutulmalı.
 * Son güncelleme: 12 Ağustos 2026.
 *
 * NOT: "Developer Partner" planı bu listede yok — partner anlaşmasına özel, kamuya açık paket
 * değil. Kredi birim fiyatı da bilerek gösterilmiyor (bkz. sağlayıcı adı gizleme kararı).
 */

// Her planda tüm modüller var; planlar yalnızca kullanıcı ve müşteri firma limitiyle ayrışıyor.
export const INCLUDED_FEATURES = [
  "İthalat ve ihracat işlem takibi",
  "Canlı konteyner ve yük takibi",
  "Depo giriş/çıkış takibi",
  "Kurye ve evrak teslim takibi",
  "Vekalet ve müşteri firma yönetimi",
  "Raporlama ve cari hesap takibi",
  "Anlık bildirim ve duyurular",
];

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
    monthlyPrice: 15000,
    yearlyPrice: 175000,
    userLimit: 50,
    clientLimit: 200,
    highlighted: false,
    extras: ["Öncelikli destek"],
  },
];

export const formatTRY = (value) => `₺${Number(value).toLocaleString("tr-TR")}`;

/** Yıllık ödemede kaç ay bedava geliyor — kart üstündeki rozet için */
export const yearlySavingRatio = (plan) => {
  const full = plan.monthlyPrice * 12;
  return full > 0 ? Math.round(((full - plan.yearlyPrice) / full) * 100) : 0;
};
