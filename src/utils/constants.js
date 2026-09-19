/**
 * Uygulama Sabitleri
 *
 * Görünen metinler sözlükten gelir: her öğe bir `labelKey` taşır, `label` / `displayName` gibi
 * alanlar o anahtarı o anki dilde okuyan getter'lardır. Dil değiştirilince sayfa yeniden
 * yüklendiği için okunan değer her zaman seçili dildedir; çağıranların bir şey yapması gerekmez.
 * Yeni bir sabit eklerken metni buraya değil `src/locales/tr.js` + `en.js`'e yazın.
 */

import { t, getCurrentLocale } from '../locales';

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
    get displayName() { return t(this.labelKey); },
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
    get displayName() { return t(this.labelKey); },
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
    get displayName() { return t(this.labelKey); },
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
    labelKey: 'paymentStatus.none',
    get label() { return t(this.labelKey); },
    color: 'gray',
    badgeClass: 'px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
  },
  {
    value: 'PAID',
    labelKey: 'paymentStatus.paid',
    get label() { return t(this.labelKey); },
    color: 'green',
    badgeClass: 'px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
  },
  {
    value: 'COMPANY_PAID',
    labelKey: 'paymentStatus.paidByCompany',
    get label() { return t(this.labelKey); },
    color: 'blue',
    badgeClass: 'px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
  }
];

/**
 * Araç Tipleri
 * Vehicle types with specific field requirements
 * displayName büyük harf gösterim içindir (Türkçede "Uçak" → "UÇAK", locale'e duyarlı).
 */
export const VEHICLE_TYPES = [
  {
    value: "AIRPLANE",
    labelKey: "cargo.vehicleType.airplane",
    get displayName() { return t(this.labelKey).toLocaleUpperCase(getCurrentLocale()); },
    icon: "flight",
    color: "sky",
    fields: ["consignmentNumber"], // Sadece Konşimento
  },
  {
    value: "SHIP",
    labelKey: "cargo.vehicleType.ship",
    get displayName() { return t(this.labelKey).toLocaleUpperCase(getCurrentLocale()); },
    icon: "directions_boat",
    color: "blue",
    fields: ["billOfLading", "containerNumbers"], // B/L + Konteyner Numaraları
  },
  {
    value: "TRUCK",
    labelKey: "cargo.vehicleType.truck",
    get displayName() { return t(this.labelKey).toLocaleUpperCase(getCurrentLocale()); },
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
    labelKey: 'documentDelivery.person',
    get label() { return t(`${this.labelKey}.label`); },
    get description() { return t(`${this.labelKey}.description`); },
    icon: 'person',
    requiresPersonName: true,
    badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    cardClass: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    value: 'E_ORDINO',
    labelKey: 'documentDelivery.eOrdino',
    get label() { return t(`${this.labelKey}.label`); },
    get description() { return t(`${this.labelKey}.description`); },
    icon: 'computer',
    requiresPersonName: false,
    badgeClass: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    cardClass: 'border-violet-400 bg-violet-50 dark:bg-violet-900/20',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  {
    value: 'E_ORDINO_PERSON',
    labelKey: 'documentDelivery.eOrdinoPerson',
    get label() { return t(`${this.labelKey}.label`); },
    get description() { return t(`${this.labelKey}.description`); },
    icon: 'computer',
    requiresPersonName: true,
    badgeClass: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    cardClass: 'border-violet-400 bg-violet-50 dark:bg-violet-900/20',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  {
    value: 'SENT_TO_CUSTOMS',
    labelKey: 'documentDelivery.sentToCustoms',
    get label() { return t(`${this.labelKey}.label`); },
    get description() { return t(`${this.labelKey}.description`); },
    icon: 'send',
    requiresPersonName: false,
    badgeClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    cardClass: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    value: 'RECEIVED_BY_US',
    labelKey: 'documentDelivery.receivedByUs',
    get label() { return t(`${this.labelKey}.label`); },
    get description() { return t(`${this.labelKey}.description`); },
    icon: 'download',
    requiresPersonName: false,
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    cardClass: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    value: 'NO_ORIGINAL',
    labelKey: 'documentDelivery.noOriginal',
    get label() { return t(`${this.labelKey}.label`); },
    get description() { return t(`${this.labelKey}.description`); },
    icon: 'cancel',
    requiresPersonName: false,
    badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    cardClass: 'border-red-400 bg-red-50 dark:bg-red-900/20',
    iconClass: 'text-red-600 dark:text-red-400',
  },
];

export const getDocumentDeliveryType = (value) => {
  return DOCUMENT_DELIVERY_TYPES.find((type) => type.value === value) || null;
};

/**
 * Bakiye hareketi türleri (backend: BalanceTransactionType).
 *
 * `isCredit` bakiyeye giriş mi çıkış mı olduğunu söyler — tutarın rengini ve
 * başındaki + işaretini bu belirliyor.
 *
 * Not: G-Radar kredisi satın alma, backend'de enum sabiti olarak hâlâ
 * SHIPSGO_CREDIT_PURCHASE; dışarıya BalanceTransactionType.externalName() ile
 * GRADAR_CREDIT_PURCHASE adıyla çıkıyor. Buradaki `value` dış addır.
 */
const balanceType = (value, labelKey, isCredit) => ({
  value,
  labelKey,
  isCredit,
  get label() { return t(`${labelKey}.label`); },
  get shortLabel() { return t(`${labelKey}.short`); },
});

export const BALANCE_TRANSACTION_TYPES = [
  balanceType('CREDIT', 'balanceTransaction.credit', true),
  balanceType('ADDON_DEBIT', 'balanceTransaction.addonDebit', false),
  balanceType('PERIOD_DEBIT', 'balanceTransaction.periodDebit', false),
  balanceType('GRADAR_CREDIT_PURCHASE', 'balanceTransaction.gRadarCreditPurchase', false),
];

/**
 * Bakiye hareketi türünü değere göre bul.
 *
 * Tanınmayan bir tür gelirse null döner — çağıran tarafın etiketi
 * `getBalanceTransactionLabel()` ile üretmesi beklenir; onu var olan bir
 * türmüş gibi etiketlemek yanlış bilgi olur.
 * (Eskiden burada iç içe ternary'nin son dalı catch-all'du ve listede olmayan
 * her tür "Dönem Ödemesi" diye etiketleniyordu.)
 *
 * @param {string} value - Transaction type değeri
 * @returns {Object|null} Tür objesi
 */
export const getBalanceTransactionType = (value) => {
  return BALANCE_TRANSACTION_TYPES.find((type) => type.value === value) || null;
};

/**
 * Bakiye hareketi türünün ekranda gösterilecek etiketi.
 *
 * Ham sabit (ADDON_DEBIT, GRADAR_CREDIT_PURCHASE...) asla ekrana yazılmaz:
 * tanınmayan tür genel bir etiketle ("Diğer hareket") gösterilir, açıklama
 * sütunu zaten ne olduğunu anlatır. Ham değer yalnızca title'da kalır.
 *
 * @param {string} value - Transaction type değeri
 * @param {{ short?: boolean }} [options] - Dar sütunlar için kısa etiket
 * @returns {string} Gösterilecek etiket
 */
export const getBalanceTransactionLabel = (value, { short = false } = {}) => {
  const type = getBalanceTransactionType(value);
  if (!type) return t(short ? 'balanceTransaction.unknown.short' : 'balanceTransaction.unknown.label');
  return short ? type.shortLabel : type.label;
};

/**
 * Para Birimleri
 * Currency options for costs
 */
export const CURRENCY_OPTIONS = [
  { value: "TRY", symbol: "₺", labelKey: "currency.try", get label() { return t(this.labelKey); } },
  { value: "USD", symbol: "$", labelKey: "currency.usd", get label() { return t(this.labelKey); } },
  { value: "EUR", symbol: "€", labelKey: "currency.eur", get label() { return t(this.labelKey); } },
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

  const formatted = amount.toLocaleString(getCurrentLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${symbol}${formatted}`;
};

/**
 * Gün Seçenekleri (Kurye Takip için)
 * dayOfWeek: 1=Pazartesi, 7=Pazar
 */
const dayOption = (value) => ({
  value,
  get label() { return t(`days.long.${value}`); },
  get shortLabel() { return t(`days.short.${value}`); },
});

export const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map(dayOption);

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

/**
 * Kurye Kayıt Tipleri (Kurye Takip)
 * - EXTERNAL: dışarıdan çalışılan kurye firması (eski kayıtların hepsi)
 * - IN_HOUSE: gümrük firmasının kendi aracı/kuryesi — araç başına bir kayıt
 * Tip oluşturulduktan sonra değişmez; backend güncellemede farklı tipi reddeder.
 */
export const COURIER_TYPES = [
  {
    value: 'EXTERNAL',
    labelKey: 'couriers.types.external',
    get label() { return t(this.labelKey); },
    icon: 'business',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  },
  {
    value: 'IN_HOUSE',
    labelKey: 'couriers.types.inHouse',
    get label() { return t(this.labelKey); },
    icon: 'home_work',
    badgeClass: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300',
  },
];

/**
 * Firma içi sevkiyat araç tipleri
 * (yük takibindeki VEHICLE_TYPES'tan ayrı: orası uçak/gemi/tır)
 */
export const COURIER_VEHICLE_TYPES = [
  { value: 'MOTORCYCLE', labelKey: 'couriers.vehicleTypes.motorcycle', get label() { return t(this.labelKey); }, icon: 'two_wheeler' },
  { value: 'CAR', labelKey: 'couriers.vehicleTypes.car', get label() { return t(this.labelKey); }, icon: 'directions_car' },
  { value: 'VAN', labelKey: 'couriers.vehicleTypes.van', get label() { return t(this.labelKey); }, icon: 'airport_shuttle' },
  { value: 'TRUCK', labelKey: 'couriers.vehicleTypes.truck', get label() { return t(this.labelKey); }, icon: 'local_shipping' },
];

/**
 * Kurye kayıt tipini değere göre bul
 * @param {string} value - EXTERNAL | IN_HOUSE
 * @returns {Object|null}
 */
export const getCourierType = (value) => {
  return COURIER_TYPES.find((type) => type.value === value) || null;
};

/**
 * Firma içi sevkiyat araç tipini değere göre bul
 * @param {string} value - MOTORCYCLE | CAR | VAN | TRUCK
 * @returns {Object|null}
 */
export const getCourierVehicleType = (value) => {
  return COURIER_VEHICLE_TYPES.find((type) => type.value === value) || null;
};

/**
 * Kayıt (veya next-departures öğesi) firma içi sevkiyat mı?
 * courierType taşımayan eski yanıtlar kurye firması sayılır.
 */
export const isInHouseCourier = (courier) => courier?.courierType === 'IN_HOUSE';

/**
 * Tek seferlik kurye gönderisi durumları (backend: CourierShipmentStatus)
 * DELIVERED, müşteriden alım (PICKUP) gönderilerinde "Teslim alındı" diye okunur — `getShipmentStatusLabel`.
 */
export const SHIPMENT_STATUSES = [
  {
    value: 'PLANNED',
    labelKey: 'courierShipments.status.PLANNED',
    get label() { return t(this.labelKey); },
    icon: 'event',
    badgeClass: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300',
  },
  {
    value: 'IN_TRANSIT',
    labelKey: 'courierShipments.status.IN_TRANSIT',
    get label() { return t(this.labelKey); },
    icon: 'local_shipping',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
  },
  {
    value: 'DELIVERED',
    labelKey: 'courierShipments.status.DELIVERED',
    pickupLabelKey: 'courierShipments.status.PICKED_UP',
    get label() { return t(this.labelKey); },
    get pickupLabel() { return t(this.pickupLabelKey); },
    icon: 'task_alt',
    badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  },
  {
    value: 'CANCELLED',
    labelKey: 'courierShipments.status.CANCELLED',
    get label() { return t(this.labelKey); },
    icon: 'cancel',
    badgeClass: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  },
];

/**
 * Gönderi yönü — `icon` gümrük firmasının, `clientIcon` müşterinin bakışından
 */
export const SHIPMENT_DIRECTIONS = [
  {
    value: 'DELIVERY',
    labelKey: 'courierShipments.direction.DELIVERY',
    get label() { return t(this.labelKey); },
    icon: 'outbox',
    clientIcon: 'move_to_inbox',
  },
  {
    value: 'PICKUP',
    labelKey: 'courierShipments.direction.PICKUP',
    get label() { return t(this.labelKey); },
    icon: 'move_to_inbox',
    clientIcon: 'outbox',
  },
];

/**
 * Gönderilen şeyin türü
 */
export const SHIPMENT_ITEM_TYPES = [
  { value: 'DOCUMENT', labelKey: 'courierShipments.itemType.DOCUMENT', get label() { return t(this.labelKey); }, icon: 'description' },
  { value: 'PACKAGE', labelKey: 'courierShipments.itemType.PACKAGE', get label() { return t(this.labelKey); }, icon: 'package_2' },
  { value: 'OTHER', labelKey: 'courierShipments.itemType.OTHER', get label() { return t(this.labelKey); }, icon: 'category' },
];

/**
 * Gönderi olay geçmişi türleri (backend: CourierShipmentEventType)
 */
export const SHIPMENT_EVENT_TYPES = [
  { value: 'CREATED', labelKey: 'courierShipments.events.CREATED', get label() { return t(this.labelKey); }, icon: 'add_circle' },
  { value: 'RESCHEDULED', labelKey: 'courierShipments.events.RESCHEDULED', get label() { return t(this.labelKey); }, icon: 'event_repeat' },
  { value: 'UPDATED', labelKey: 'courierShipments.events.UPDATED', get label() { return t(this.labelKey); }, icon: 'edit' },
  { value: 'IN_TRANSIT', labelKey: 'courierShipments.events.IN_TRANSIT', get label() { return t(this.labelKey); }, icon: 'local_shipping' },
  {
    value: 'COMPLETED',
    labelKey: 'courierShipments.events.COMPLETED',
    pickupLabelKey: 'courierShipments.events.COMPLETED_PICKUP',
    get label() { return t(this.labelKey); },
    get pickupLabel() { return t(this.pickupLabelKey); },
    icon: 'task_alt',
  },
  { value: 'CANCELLED', labelKey: 'courierShipments.events.CANCELLED', get label() { return t(this.labelKey); }, icon: 'cancel' },
];

/**
 * Gönderi durumunu değere göre bul
 * @param {string} value - PLANNED | IN_TRANSIT | DELIVERED | CANCELLED
 * @returns {Object|null}
 */
export const getShipmentStatus = (value) => {
  return SHIPMENT_STATUSES.find((status) => status.value === value) || null;
};

/**
 * Durum etiketi, yöne göre: PICKUP + DELIVERED → "Teslim alındı". Bilinmeyen durum ham değeriyle döner.
 * @param {string} status
 * @param {string} direction - DELIVERY | PICKUP
 * @returns {string}
 */
export const getShipmentStatusLabel = (status, direction) => {
  const option = getShipmentStatus(status);
  if (!option) return status || '';
  return direction === 'PICKUP' && option.pickupLabelKey ? option.pickupLabel : option.label;
};

/**
 * Gönderi yönünü değere göre bul
 * @param {string} value - DELIVERY | PICKUP
 * @returns {Object|null}
 */
export const getShipmentDirection = (value) => {
  return SHIPMENT_DIRECTIONS.find((direction) => direction.value === value) || null;
};

/**
 * Gönderi türünü değere göre bul
 * @param {string} value - DOCUMENT | PACKAGE | OTHER
 * @returns {Object|null}
 */
export const getShipmentItemType = (value) => {
  return SHIPMENT_ITEM_TYPES.find((type) => type.value === value) || null;
};

/**
 * Olay türünü değere göre bul
 * @param {string} value - CREATED | RESCHEDULED | UPDATED | IN_TRANSIT | COMPLETED | CANCELLED
 * @returns {Object|null}
 */
export const getShipmentEventType = (value) => {
  return SHIPMENT_EVENT_TYPES.find((type) => type.value === value) || null;
};

/**
 * G-Radar talep tipleri (BROKER_USER → BROKER_ADMIN): yükte takibi açma ya da kapatma talebi.
 * Eski backend talep satırında requestType göndermeyebilir; eksik tip ENABLE sayılır.
 */
export const GRADAR_REQUEST_TYPES = [
  {
    value: 'ENABLE',
    labelKey: 'gRadarAdmin.requests.types.ENABLE',
    get label() { return t(this.labelKey); },
    icon: 'toggle_on',
    badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  },
  {
    value: 'DISABLE',
    labelKey: 'gRadarAdmin.requests.types.DISABLE',
    get label() { return t(this.labelKey); },
    icon: 'toggle_off',
    badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  },
];

/**
 * Talep tipini değere göre bul. Eksik değer ENABLE sayılır; bilinmeyen değer null döner.
 * @param {string|null|undefined} value - ENABLE | DISABLE
 * @returns {Object|null}
 */
export const getGRadarRequestType = (value) => {
  const normalized = value ?? 'ENABLE';
  return GRADAR_REQUEST_TYPES.find((type) => type.value === normalized) || null;
};

/** Talep takibi kapatmak için mi? Tipi eksik talep açma talebidir. */
export const isGRadarDisableRequest = (request) => request?.requestType === 'DISABLE';

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
  COURIER_TYPES,
  COURIER_VEHICLE_TYPES,
  SHIPMENT_STATUSES,
  SHIPMENT_DIRECTIONS,
  SHIPMENT_ITEM_TYPES,
  SHIPMENT_EVENT_TYPES,
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
  getCourierType,
  getCourierVehicleType,
  isInHouseCourier,
  getShipmentStatus,
  getShipmentStatusLabel,
  getShipmentDirection,
  getShipmentItemType,
  getShipmentEventType,
};
