import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function MobileMenu({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isManagementOpen, setIsManagementOpen] = useState(false);

  // Menü açıkken body scroll'u engelle
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Sayfa değiştiğinde menüyü kapat
  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const menuItems = [
    { icon: "home", label: "Ana Sayfa", path: "/dashboard" },
    { icon: "search", label: "İşlem Takip", path: "/transactions" },
    { icon: "warehouse", label: "Antrepo Takip", path: "/warehouse" },
    { icon: "local_shipping", label: "Yük Takip", path: "/cargo" },
    { icon: "feed", label: "Haberler", path: "/news" },
    { icon: "campaign", label: "Duyurular", path: "/announcements" },
    { icon: "person", label: "Hesabım", path: "/profile" },
    { icon: "settings", label: "Ayarlar", path: "/settings" },
  ];

  const managementItems = [
    {
      icon: "verified",
      label: "Vekalet Yönetimi",
      path: "/management/agreements",
      active: true,
      roles: ['BROKER_ADMIN', 'SUPER_ADMIN']
    },
    {
      icon: "corporate_fare",
      label: "Müşteri Firmaları",
      path: "/management/clients",
      active: true,
      roles: ['BROKER_ADMIN', 'SUPER_ADMIN']
    },
    {
      icon: "group",
      label: "Çalışan Yönetimi",
      path: "/management/employees",
      active: true,
      roles: ['BROKER_ADMIN', 'SUPER_ADMIN']
    },
    {
      icon: "two_wheeler",
      label: "Kurye Yönetimi",
      path: "/management/couriers",
      active: true,
      roles: ['BROKER_ADMIN', 'SUPER_ADMIN']
    },
    {
      icon: "assessment",
      label: "Raporlar",
      path: "/management/reports",
      active: true,
      roles: ['BROKER_ADMIN', 'SUPER_ADMIN']
    },
  ];

  const bottomMenuItems = [
    { icon: "headset_mic", label: "İletişim", path: "/contact" },
    { icon: "help_center", label: "Yardım", path: "/help" },
  ];

  // Kullanıcının yönetim menüsüne erişimi var mı?
  const hasManagementAccess = user?.globalRole === 'BROKER_ADMIN' || user?.globalRole === 'SUPER_ADMIN';

  // Aktif yönetim menü öğelerini filtrele
  const visibleManagementItems = managementItems.filter(item =>
    item.roles.includes(user?.globalRole)
  );

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-background-dark shadow-2xl flex flex-col animate-slide-in-left transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-12 w-12 bg-primary rounded-full text-white font-bold text-lg shadow-lg">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex flex-col">
              <h1 className="text-text-main text-base font-semibold leading-normal">
                {user?.username || "Kullanıcı"}
              </h1>
              <p className="text-text-secondary text-sm font-normal leading-normal">
                {user?.globalRole || "Role"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Company Info */}
        {user?.company?.name && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Firma</p>
            <p className="text-sm text-text-main font-medium truncate">
              {user.company.name}
            </p>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          {/* Ana Menü Öğeleri */}
          <div className="space-y-1">
            {menuItems.map((item, index) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={index}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active
                      ? "bg-primary text-white shadow-md"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-text-main"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {item.icon}
                  </span>
                  <p className="text-sm font-medium leading-normal">
                    {item.label}
                  </p>
                  {active && (
                    <span className="material-symbols-outlined ml-auto text-lg">
                      chevron_right
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Yönetim Bölümü - Çekmeceli */}
          {hasManagementAccess && visibleManagementItems.length > 0 && (
            <>
              {/* Divider */}
              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

              {/* Yönetim Çekmece Butonu */}
              <button
                onClick={() => setIsManagementOpen(!isManagementOpen)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-text-secondary transition-all mb-1"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">
                    admin_panel_settings
                  </span>
                  <p className="text-sm font-semibold uppercase tracking-wider">
                    Yönetim
                  </p>
                </div>
                <span className={`material-symbols-outlined transition-transform ${isManagementOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {/* Yönetim Menü Öğeleri - Çekmece İçeriği */}
              {isManagementOpen && (
                <div className="space-y-1 ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                  {visibleManagementItems.map((item, index) => {
                    const active = isActive(item.path);

                    return (
                      <Link
                        key={index}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          active
                            ? "bg-primary text-white shadow-md"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-text-main"
                        }`}
                      >
                        <span className="material-symbols-outlined">
                          {item.icon}
                        </span>
                        <p className="text-sm font-medium leading-normal">
                          {item.label}
                        </p>
                        {active && (
                          <span className="material-symbols-outlined ml-auto text-lg">
                            chevron_right
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Divider */}
          <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

          {/* Alt Menü (İletişim & Yardım) */}
          <div className="space-y-1">
            {bottomMenuItems.map((item, index) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={index}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active
                      ? "bg-primary text-white shadow-md"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-text-main"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {item.icon}
                  </span>
                  <p className="text-sm font-medium leading-normal">
                    {item.label}
                  </p>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer - Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors font-medium"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Oturumu Kapat</span>
          </button>
        </div>
      </div>
    </div>
  );
}