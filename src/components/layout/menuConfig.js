// Menü öğeleri — Sidebar (masaüstü) ve MobileMenu ortak kullanır.
// Tek kaynak: iki menünün zamanla birbirinden ayrışmasını (drift) önler.
// `label`, `labelKey`'i o anki dilde okuyan bir getter; dil değişince sayfa yeniden yüklenir.
import { t } from '../../locales';

const menuItem = (icon, labelKey, path, extra = {}) => ({
  icon,
  labelKey,
  path,
  ...extra,
  get label() { return t(labelKey); },
});

// Her zaman en üstte görünen öğe
export const HOME_ITEM = menuItem("home", "nav.home", "/dashboard");

// Genel menü öğeleri (Sidebar'da "Diğer" çekmecesine taşabilenler).
// Ayarlar sayfası tamamen SUPER_ADMIN'e ait (ClickUp + G-Radar master config);
// diğer rollerin orada yetkili oldukları hiçbir alan yok, bu yüzden öğe de gösterilmiyor.
export const getGeneralMenuItems = (user) => [
  menuItem("search", "nav.transactionTracking", "/transactions"),
  menuItem("warehouse", "nav.warehouseTracking", "/warehouse"),
  menuItem("local_shipping", "nav.cargoTracking", "/cargo"),
  menuItem("feed", "nav.news", "/news"),
  menuItem("campaign", "nav.announcements", "/announcements"),
  menuItem("person", "nav.profile", "/profile"),
  ...(user?.globalRole === 'SUPER_ADMIN' ? [menuItem("settings", "nav.settings", "/settings")] : []),
];

// Destek öğeleri (menünün altında)
export const SUPPORT_ITEMS = [
  menuItem("headset_mic", "nav.contact", "/contact"),
  menuItem("help_center", "nav.help", "/help"),
];

// Yönetim menüsü öğeleri
export const MANAGEMENT_ITEMS = [
  menuItem("verified", "nav.agreements", "/management/agreements", { roles: ['BROKER_ADMIN', 'SUPER_ADMIN'] }),
  menuItem("corporate_fare", "nav.clients", "/management/clients", { roles: ['BROKER_ADMIN', 'SUPER_ADMIN'] }),
  menuItem("group", "nav.employees", "/management/employees", { roles: ['BROKER_ADMIN', 'SUPER_ADMIN'] }),
  menuItem("two_wheeler", "nav.couriers", "/management/couriers", { roles: ['BROKER_ADMIN', 'SUPER_ADMIN'] }),
  menuItem("domain", "nav.companySettings", "/company-settings", { roles: ['BROKER_ADMIN', 'SUPER_ADMIN'] }),
  menuItem("account_balance", "nav.subscriptionAndPayment", "/payment/submit", {
    roles: ['BROKER_ADMIN', 'BROKER_USER'],
    condition: (user) => user?.isPaymentResponsible === true,
  }),
  menuItem("assessment", "nav.reports", "/management/reports", { roles: ['BROKER_ADMIN', 'SUPER_ADMIN'] }),
  menuItem("manage_accounts", "nav.sessions", "/session-management", { roles: ['SUPER_ADMIN'] }),
  menuItem("payments", "nav.payments", "/management/payments", { roles: ['SUPER_ADMIN'] }),
  menuItem("subscriptions", "nav.brokerSubscriptions", "/management/broker-subscriptions", { roles: ['SUPER_ADMIN'] }),
  menuItem("library_add", "nav.addonCatalog", "/management/addon-catalog", { roles: ['SUPER_ADMIN'] }),
  menuItem("workspace_premium", "nav.plans", "/management/plans", { roles: ['SUPER_ADMIN'] }),
  menuItem("task_alt", "nav.feedbackTasks", "/management/feedback-tasks", { roles: ['SUPER_ADMIN'] }),
  menuItem("flag", "nav.featureFlags", "/management/feature-flags", { roles: ['SUPER_ADMIN'] }),
];

// Kullanıcının rol + koşullarına göre görünür yönetim öğeleri.
export const getVisibleManagementItems = (user) =>
  MANAGEMENT_ITEMS.filter((item) => {
    if (!item.roles.includes(user?.globalRole)) return false;
    if (item.condition && !item.condition(user)) return false;
    return true;
  });
