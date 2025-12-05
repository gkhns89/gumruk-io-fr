import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

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

  return (
    <aside className="hidden lg:flex flex-col bg-white p-4 w-64 shadow-md flex-shrink-0 border-r border-gray-100">
      {/* User Profile */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center h-12 w-12 bg-primary rounded-full text-white font-bold text-lg shadow-md">
          {user?.username?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="text-text-main text-base font-medium leading-normal truncate">
            {user?.username || "Kullanıcı"}
          </h1>
          <p className="text-text-secondary text-sm font-normal leading-normal truncate">
            {user?.globalRole || "Role"}
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-1 flex-grow">
        {menuItems.map((item, index) => {
          const active = isActive(item.path);
          return (
            <Link
              key={index}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
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
      </nav>

      {/* Divider */}
      <div className="my-4 border-t border-gray-200" />

      {/* Bottom Navigation */}
      <div className="flex flex-col gap-1">
        {bottomMenuItems.map((item, index) => {
          const active = isActive(item.path);
          return (
            <Link
              key={index}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
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

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-text-main hover:text-red-600 w-full text-left transition-colors mt-2"
        >
          <span className="material-symbols-outlined">logout</span>
          <p className="text-sm font-medium leading-normal">Çıkış</p>
        </button>
      </div>
    </aside>
  );
}