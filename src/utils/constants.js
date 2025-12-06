/**
 * Uygulama Sabitleri
 * Çoklu dil desteği için labelKey kullanılır
 */

/**
 * Hat (Gate) Seçenekleri
 * - value: Veritabanına kaydedilecek değer
 * - labelKey: Çeviri anahtarı (locales dosyalarında kullanılır)
 * - color: Tailwind renk adı
 * - emoji: Görsel gösterim için emoji
 */
export const GATE_OPTIONS = [
  { 
    value: "SARI", 
    labelKey: "gates.yellow", 
    color: "yellow", 
    emoji: "🟡",
    bgClass: "bg-yellow-50",
    hoverClass: "hover:bg-yellow-100",
    borderClass: "border-l-yellow-400",
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-800",
  },
  { 
    value: "KIRMIZI", 
    labelKey: "gates.red", 
    color: "red", 
    emoji: "🔴",
    bgClass: "bg-red-50",
    hoverClass: "hover:bg-red-100",
    borderClass: "border-l-red-500",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
  },
  { 
    value: "YEŞİL", 
    labelKey: "gates.green", 
    color: "green", 
    emoji: "🟢",
    bgClass: "bg-green-50",
    hoverClass: "hover:bg-green-100",
    borderClass: "border-l-green-500",
    badgeBg: "bg-green-100",
    badgeText: "text-green-800",
  },
  { 
    value: "MAVİ", 
    labelKey: "gates.blue", 
    color: "blue", 
    emoji: "🔵",
    bgClass: "bg-blue-50",
    hoverClass: "hover:bg-blue-100",
    borderClass: "border-l-blue-500",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
  },
];

/**
 * İşlem Durumları
 */
export const TRANSACTION_STATUS = [
  { value: "PENDING", labelKey: "status.pending", color: "yellow" },
  { value: "IN_PROGRESS", labelKey: "status.inProgress", color: "blue" },
  { value: "COMPLETED", labelKey: "status.completed", color: "green" },
  { value: "CANCELLED", labelKey: "status.cancelled", color: "red" },
];

/**
 * Kullanıcı Rolleri
 */
export const USER_ROLES = [
  { value: "SUPER_ADMIN", labelKey: "roles.superAdmin" },
  { value: "BROKER_ADMIN", labelKey: "roles.brokerAdmin" },
  { value: "BROKER_USER", labelKey: "roles.brokerUser" },
  { value: "CLIENT_USER", labelKey: "roles.clientUser" },
];

/**
 * Firma Tipleri
 */
export const COMPANY_TYPES = [
  { value: "CUSTOMS_BROKER", labelKey: "companyTypes.customsBroker" },
  { value: "CLIENT", labelKey: "companyTypes.client" },
];

/**
 * Gate seçeneğini değere göre bul
 * @param {string} value - Gate değeri (Sarı, Kırmızı, vb.)
 * @returns {Object|null} Gate seçeneği objesi
 */
export const getGateOption = (value) => {
  return GATE_OPTIONS.find(option => option.value === value) || null;
};

/**
 * Gate için satır stil sınıflarını döndürür
 * @param {string} gateValue - Gate değeri
 * @returns {string} Tailwind CSS sınıfları
 */
export const getGateRowClasses = (gateValue) => {
  const option = getGateOption(gateValue);
  if (!option) return "";
  return `${option.bgClass} ${option.hoverClass} border-l-4 ${option.borderClass}`;
};

/**
 * Gate için badge stil sınıflarını döndürür
 * @param {string} gateValue - Gate değeri
 * @returns {Object} Badge için bg ve text sınıfları
 */
export const getGateBadgeClasses = (gateValue) => {
  const option = getGateOption(gateValue);
  if (!option) {
    return { bg: "bg-gray-100", text: "text-gray-800" };
  }
  return { bg: option.badgeBg, text: option.badgeText };
};

export default {
  GATE_OPTIONS,
  TRANSACTION_STATUS,
  USER_ROLES,
  COMPANY_TYPES,
  getGateOption,
  getGateRowClasses,
  getGateBadgeClasses,
};