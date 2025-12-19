import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function MobileMenu({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();

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
    { icon: "local_shipping", label: "Yük Takip", path: "/shipping" },
    { icon: "feed", label: "Haberler", path: "/news" },
    { icon: "campaign", label: "Duyurular", path: "/announcements" },
    { icon: "person", label: "Hesabım", path: "/profile" },
    { icon: "settings", label: "Ayarlar", path: "/settings" },
  ];

  const bottomMenuItems = [
    { icon: "contact_support", label: "İletişim", path: "/contact" },
    { icon: "help", label: "Yardım", path: "/help" },
  ];

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
      <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col animate-slide-in-left">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5">
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
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Company Info */}
        {user?.company?.name && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Firma</p>
            <p className="text-sm text-text-main font-medium truncate">
              {user.company.name}
            </p>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
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
                      : "hover:bg-gray-100 text-text-main"
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

          {/* Divider */}
          <div className="my-4 border-t border-gray-200" />

          {/* Bottom Navigation */}
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
                      : "hover:bg-gray-100 text-text-main"
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
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Oturumu Kapat</span>
          </button>
        </div>
      </div>
    </div>
  );
}