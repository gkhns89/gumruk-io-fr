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
 * Yük Takip Durumları
 * Cargo tracking statuses with color coding
 */
export const CARGO_STATUS = [
  {
    value: "TRACKING",
    labelKey: "cargo.status.tracking",
    displayName: "Takip",
    color: "blue",
    sortOrder: 2,
    bgClass: "bg-blue-50 dark:bg-blue-900/20",
    textClass: "text-blue-700 dark:text-blue-300",
    iconClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-l-blue-400",
    badgeClass: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700",
  },
  {
    value: "ARRIVED",
    labelKey: "cargo.status.arrived",
    displayName: "Varış Yaptı",
    color: "green",
    sortOrder: 1,
    bgClass: "bg-green-50 dark:bg-green-900/20",
    textClass: "text-green-700 dark:text-green-300",
    iconClass: "text-green-600 dark:text-green-400",
    borderClass: "border-l-green-400",
    badgeClass: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700",
  },
  {
    value: "COMPLETED",
    labelKey: "cargo.status.completed",
    displayName: "Tamamlandı",
    color: "red",
    sortOrder: 3,
    bgClass: "bg-red-50 dark:bg-red-900/20",
    textClass: "text-red-700 dark:text-red-300",
    iconClass: "text-red-600 dark:text-red-400",
    borderClass: "border-l-red-400",
    badgeClass: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700",
  },
];

/**
 * Payment Status Options
 * For cargo tracking payment tracking
 */
export const PAYMENT_STATUS_OPTIONS = [
  {
    value: 'NO_PAYMENT',
    label: 'Ödeme Yok',
    color: 'gray',
    badgeClass: 'px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
  },
  {
    value: 'PAID',
    label: 'Ödendi',
    color: 'green',
    badgeClass: 'px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
  },
  {
    value: 'COMPANY_PAID',
    label: 'Firma Tarafından Ödendi',
    color: 'blue',
    badgeClass: 'px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
  }
];

/**
 * Araç Tipleri
 * Vehicle types with specific field requirements
 */
export const VEHICLE_TYPES = [
  {
    value: "AIRPLANE",
    labelKey: "cargo.vehicleType.airplane",
    displayName: "UÇAK",
    icon: "flight",
    color: "sky",
    fields: ["consignmentNumber"], // Sadece Konşimento
  },
  {
    value: "SHIP",
    labelKey: "cargo.vehicleType.ship",
    displayName: "GEMİ",
    icon: "directions_boat",
    color: "blue",
    fields: ["billOfLading", "containerNumbers"], // B/L + Konteyner Numaraları
  },
  {
    value: "TRUCK",
    labelKey: "cargo.vehicleType.truck",
    displayName: "KAMYON",
    icon: "local_shipping",
    color: "orange",
    fields: ["licensePlate"], // Sadece Plaka
  },
];

/**
 * Evrak Teslim Tipleri
 * Document delivery types with display info
 */
export const DOCUMENT_DELIVERY_TYPES = [
  {
    value: 'PERSON',
    label: 'Şahıs',
    labelEn: 'Person',
    description: 'Evraklar kişi adına teslim',
    icon: 'person',
    requiresPersonName: true,
    badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    cardClass: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    value: 'E_ORDINO',
    label: 'E-Ordino',
    labelEn: 'E-Release',
    description: 'Sanal teslim, şahıs adı gerekmez',
    icon: 'computer',
    requiresPersonName: false,
    badgeClass: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    cardClass: 'border-violet-400 bg-violet-50 dark:bg-violet-900/20',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  {
    value: 'E_ORDINO_PERSON',
    label: 'E-Ordino + Şahıs',
    labelEn: 'E-Release + Person',
    description: 'Sanal teslim ve şahıs bilgisi',
    icon: 'computer',
    requiresPersonName: true,
    badgeClass: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    cardClass: 'border-violet-400 bg-violet-50 dark:bg-violet-900/20',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  {
    value: 'SENT_TO_CUSTOMS',
    label: 'Gümrüğe Gönderildi',
    labelEn: 'Sent to Customs',
    description: 'Evraklar gümrüğe iletildi',
    icon: 'send',
    requiresPersonName: false,
    badgeClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    cardClass: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    value: 'RECEIVED_BY_US',
    label: 'Tarafımıza Geldi',
    labelEn: 'Received by Us',
    description: 'Evraklar firmamıza ulaştı',
    icon: 'download',
    requiresPersonName: false,
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    cardClass: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    value: 'NO_ORIGINAL',
    label: 'Orijinal Evrak Yok',
    labelEn: 'No Original Doc',
    description: 'Sadece tarih yeterli',
    icon: 'cancel',
    requiresPersonName: false,
    badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    cardClass: 'border-red-400 bg-red-50 dark:bg-red-900/20',
    iconClass: 'text-red-600 dark:text-red-400',
  },
];

export const getDocumentDeliveryType = (value) => {
  return DOCUMENT_DELIVERY_TYPES.find((t) => t.value === value) || null;
};

/**
 * Bakiye hareketi türleri (backend: BalanceTransactionType).
 *
 * `isCredit` bakiyeye giriş mi çıkış mı olduğunu söyler — tutarın rengini ve
 * başındaki + işaretini bu belirliyor.
 *
 * Not: G-Radar kredisi satın alma, backend'de enum sabiti olarak hâlâ
 * SHIPSGO_CREDIT_PURCHASE; dışarıya @JsonProperty ile GRADAR_CREDIT_PURCHASE
 * adıyla çıkıyor. Buradaki `value` dış addır.
 */
export const BALANCE_TRANSACTION_TYPES = [
  { value: 'CREDIT', label: 'Kredi', shortLabel: 'Kredi', isCredit: true },
  { value: 'ADDON_DEBIT', label: 'Ek Ödeme', shortLabel: 'Ek Ödeme', isCredit: false },
  { value: 'PERIOD_DEBIT', label: 'Dönem Ödemesi', shortLabel: 'Dönem', isCredit: false },
  { value: 'GRADAR_CREDIT_PURCHASE', label: 'G-Radar Kredisi', shortLabel: 'G-Radar', isCredit: false },
];

/**
 * Bakiye hareketi türünü değere göre bul.
 *
 * Tanınmayan bir tür gelirse null döner — çağıran tarafın ham değeri
 * göstermesi, onu var olan bir türmüş gibi etiketlemesinden iyidir.
 * (Eskiden burada iç içe ternary'nin son dalı catch-all'du ve listede olmayan
 * her tür "Dönem Ödemesi" diye etiketleniyordu.)
 *
 * @param {string} value - Transaction type değeri
 * @returns {Object|null} Tür objesi
 */
export const getBalanceTransactionType = (value) => {
  return BALANCE_TRANSACTION_TYPES.find((t) => t.value === value) || null;
};

/**
 * Para Birimleri
 * Currency options for costs
 */
export const CURRENCY_OPTIONS = [
  { value: "TRY", symbol: "₺", label: "Türk Lirası", labelKey: "currency.try" },
  { value: "USD", symbol: "$", label: "Amerikan Doları", labelKey: "currency.usd" },
  { value: "EUR", symbol: "€", label: "Euro", labelKey: "currency.eur" },
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

/**
 * Cargo status'ü değere göre bul
 * @param {string} value - Status değeri
 * @returns {Object|null} Status objesi
 */
export const getCargoStatus = (value) => {
  return CARGO_STATUS.find((status) => status.value === value) || null;
};

/**
 * Vehicle type'ı değere göre bul
 * @param {string} value - Vehicle type değeri
 * @returns {Object|null} Vehicle type objesi
 */
export const getVehicleType = (value) => {
  return VEHICLE_TYPES.find((type) => type.value === value) || null;
};

/**
 * Para birimini değere göre bul
 * @param {string} value - Currency kodu (TRY, USD, EUR)
 * @returns {Object|null} Currency objesi
 */
export const getCurrency = (value) => {
  return CURRENCY_OPTIONS.find((currency) => currency.value === value) || null;
};

/**
 * Cargo status için satır stil sınıflarını döndürür
 * @param {string} statusValue - Status değeri
 * @returns {string} Tailwind CSS sınıfları
 */
export const getCargoStatusRowClasses = (statusValue) => {
  const status = getCargoStatus(statusValue);
  if (!status) return "border-l-4 border-l-gray-300";
  return `border-l-4 ${status.borderClass} ${status.bgClass} hover:opacity-90`;
};

/**
 * Para birimi ile formatlanmış tutar döndürür
 * @param {number} amount - Tutar
 * @param {string} currencyCode - Para birimi kodu
 * @returns {string} Formatlanmış tutar
 */
export const formatCurrency = (amount, currencyCode = "TRY") => {
  if (amount == null) return "-";

  const currency = getCurrency(currencyCode);
  const symbol = currency?.symbol || "";

  const formatted = amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${symbol}${formatted}`;
};

/**
 * Gün Seçenekleri (Kurye Takip için)
 * dayOfWeek: 1=Pazartesi, 7=Pazar
 */
export const DAY_OPTIONS = [
  { value: 1, label: 'Pazartesi', shortLabel: 'Pzt' },
  { value: 2, label: 'Salı', shortLabel: 'Sal' },
  { value: 3, label: 'Çarşamba', shortLabel: 'Çar' },
  { value: 4, label: 'Perşembe', shortLabel: 'Per' },
  { value: 5, label: 'Cuma', shortLabel: 'Cum' },
  { value: 6, label: 'Cumartesi', shortLabel: 'Cmt' },
  { value: 7, label: 'Pazar', shortLabel: 'Paz' }
];

/**
 * Gün adını döndürür
 * @param {number} dayOfWeek - Gün değeri (1-7)
 * @returns {string} Gün adı
 */
export const getDayName = (dayOfWeek) => {
  return DAY_OPTIONS.find(d => d.value === dayOfWeek)?.label || '';
};

/**
 * Kısa gün adını döndürür
 * @param {number} dayOfWeek - Gün değeri (1-7)
 * @returns {string} Kısa gün adı
 */
export const getShortDayName = (dayOfWeek) => {
  return DAY_OPTIONS.find(d => d.value === dayOfWeek)?.shortLabel || '';
};

export default {
  GATE_OPTIONS,
  TRANSACTION_STATUS,
  SPECIAL_STATUS_COLORS,
  USER_ROLES,
  COMPANY_TYPES,
  CARGO_STATUS,
  PAYMENT_STATUS_OPTIONS,
  VEHICLE_TYPES,
  DOCUMENT_DELIVERY_TYPES,
  CURRENCY_OPTIONS,
  DAY_OPTIONS,
  getGateOption,
  getGateRowClasses,
  getGateBadgeClasses,
  getCargoStatus,
  getVehicleType,
  getDocumentDeliveryType,
  getCurrency,
  getCargoStatusRowClasses,
  formatCurrency,
  getDayName,
  getShortDayName,
};
