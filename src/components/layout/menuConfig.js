// Yönetim menüsü öğeleri — Sidebar (masaüstü) ve MobileMenu ortak kullanır.
// Tek kaynak: iki menünün zamanla birbirinden ayrışmasını (drift) önler.
export const MANAGEMENT_ITEMS = [
  {
    icon: "verified",
    label: "Vekalet Yönetimi",
    path: "/management/agreements",
    roles: ['BROKER_ADMIN', 'SUPER_ADMIN'],
  },
  {
    icon: "corporate_fare",
    label: "Müşteri Firmaları",
    path: "/management/clients",
    roles: ['BROKER_ADMIN', 'SUPER_ADMIN'],
  },
  {
    icon: "group",
    label: "Çalışan Yönetimi",
    path: "/management/employees",
    roles: ['BROKER_ADMIN', 'SUPER_ADMIN'],
  },
  {
    icon: "two_wheeler",
    label: "Kurye Yönetimi",
    path: "/management/couriers",
    roles: ['BROKER_ADMIN', 'SUPER_ADMIN'],
  },
  {
    icon: "domain",
    label: "Firma Ayarları",
    path: "/company-settings",
    roles: ['BROKER_ADMIN', 'SUPER_ADMIN'],
  },
  {
    icon: "account_balance",
    label: "Abonelik & Ödeme",
    path: "/payment/submit",
    roles: ['BROKER_ADMIN', 'BROKER_USER'],
    condition: (user) => user?.isPaymentResponsible === true,
  },
  {
    icon: "assessment",
    label: "Raporlar",
    path: "/management/reports",
    roles: ['BROKER_ADMIN', 'SUPER_ADMIN'],
  },
  {
    icon: "manage_accounts",
    label: "Session Yönetimi",
    path: "/session-management",
    roles: ['SUPER_ADMIN'],
  },
  {
    icon: "payments",
    label: "Ödeme Yönetimi",
    path: "/management/payments",
    roles: ['SUPER_ADMIN'],
  },
  {
    icon: "subscriptions",
    label: "Abonelik Yönetimi",
    path: "/management/broker-subscriptions",
    roles: ['SUPER_ADMIN'],
  },
  {
    icon: "library_add",
    label: "Hizmet Kataloğu",
    path: "/management/addon-catalog",
    roles: ['SUPER_ADMIN'],
  },
  {
    icon: "workspace_premium",
    label: "Plan Yönetimi",
    path: "/management/plans",
    roles: ['SUPER_ADMIN'],
  },
  {
    icon: "task_alt",
    label: "Feedback Taskları",
    path: "/management/feedback-tasks",
    roles: ['SUPER_ADMIN'],
  },
];

// Kullanıcının rol + koşullarına göre görünür yönetim öğeleri.
export const getVisibleManagementItems = (user) =>
  MANAGEMENT_ITEMS.filter((item) => {
    if (!item.roles.includes(user?.globalRole)) return false;
    if (item.condition && !item.condition(user)) return false;
    return true;
  });
