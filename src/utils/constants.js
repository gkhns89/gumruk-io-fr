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
];

/**
 * İşlem Durumları
 * Renk sistemi Stats.jsx ile uyumlu
 */
export const TRANSACTION_STATUS = [
  {
    value: "PENDING",
    labelKey: "status.pending",
    color: "pending",
    bgClass: "bg-sky-50 dark:bg-sky-900/20",
    textClass: "text-sky-700 dark:text-sky-300",
    iconClass: "text-sky-600 dark:text-sky-400",
    borderClass: "border-l-sky-400",
    badgeClass: "bg-sky-50 text-sky-700 border border-sky-300"
  },
  {
    value: "REGISTERED",
    labelKey: "status.inProgress",
    color: "registered",
    bgClass: "bg-amber-50 dark:bg-amber-900/20",
    textClass: "text-amber-700 dark:text-amber-300",
    iconClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-l-amber-400",
    badgeClass: "bg-amber-50 text-amber-700 border border-amber-300"
  },
  {
    value: "INSPECTION",
    labelKey: "status.inspection",
    color: "inspection",
    bgClass: "bg-purple-50 dark:bg-purple-900/20",
    textClass: "text-purple-700 dark:text-purple-300",
    iconClass: "text-purple-600 dark:text-purple-400",
    borderClass: "border-l-purple-400",
    badgeClass: "bg-purple-50 text-purple-700 border border-purple-300"
  },
  {
    value: "CP_COMPLETED",
    labelKey: "status.completed",
    color: "completed",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/20",
    textClass: "text-emerald-700 dark:text-emerald-300",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-l-emerald-400",
    badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-300"
  },
  {
    value: "WITHDRAWN",
    labelKey: "status.withdrawn",
    color: "withdrawn",
    bgClass: "bg-green-50 dark:bg-green-900/20",
    textClass: "text-green-700 dark:text-green-300",
    iconClass: "text-green-600 dark:text-green-400",
    borderClass: "border-l-green-500",
    badgeClass: "bg-green-50 text-green-700 border border-green-300"
  },
  {
    value: "CANCELLED",
    labelKey: "status.cancelled",
    color: "cancelled",
    bgClass: "bg-rose-50 dark:bg-rose-900/20",
    textClass: "text-rose-700 dark:text-rose-300",
    iconClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-l-rose-500",
    badgeClass: "bg-rose-50 text-rose-700 border border-rose-300"
  },
];

/**
 * Özel Durum Renkleri (Stats için)
 * Delayed ve Total gibi TRANSACTION_STATUS'de olmayan özel durumlar
 */
export const SPECIAL_STATUS_COLORS = {
  delayed: {
    color: "delayed",
    bgClass: "bg-orange-50 dark:bg-orange-900/20",
    textClass: "text-orange-700 dark:text-orange-300",
    iconClass: "text-orange-600 dark:text-orange-400",
  },
  gray: {
    color: "gray",
    bgClass: "bg-gray-50 dark:bg-gray-800",
    textClass: "text-gray-700 dark:text-gray-300",
    iconClass: "text-gray-600 dark:text-gray-400",
  },
};

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
  return GATE_OPTIONS.find((option) => option.value === value) || null;
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
  SPECIAL_STATUS_COLORS,
  USER_ROLES,
  COMPANY_TYPES,
  getGateOption,
  getGateRowClasses,
  getGateBadgeClasses,
};
