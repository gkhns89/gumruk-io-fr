import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation(); // Mevcut URL'i al

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

  // Aktif menü kontrolü
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside className="flex-col bg-white p-4 hidden lg:flex w-64 shadow-md flex-shrink-0">
      {/* User Profile */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center h-12 w-12 bg-primary rounded-full text-white font-bold text-lg">
          {user?.username?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex flex-col">
          <h1 className="text-text-main text-base font-medium leading-normal">
            {user?.username || "Kullanıcı"}
          </h1>
          <p className="text-text-secondary text-sm font-normal leading-normal">
            {user?.globalRole || "Role"}
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-2 flex-grow">
        {menuItems.map((item, index) => {
          const active = isActive(item.path);
          return (
            <Link
              key={index}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                active ? "bg-primary/20" : "hover:bg-gray-100"
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  active ? "text-primary" : "text-text-main"
                }`}
              >
                {item.icon}
              </span>
              <p
                className={`text-sm font-medium leading-normal ${
                  active ? "text-primary" : "text-text-main"
                }`}
              >
                {item.label}
              </p>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="mt-auto flex flex-col gap-2">
        {bottomMenuItems.map((item, index) => {
          const active = isActive(item.path);
          return (
            <Link
              key={index}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                active ? "bg-primary/20" : "hover:bg-gray-100"
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  active ? "text-primary" : "text-text-main"
                }`}
              >
                {item.icon}
              </span>
              <p
                className={`text-sm font-medium leading-normal ${
                  active ? "text-primary" : "text-text-main"
                }`}
              >
                {item.label}
              </p>
            </Link>
          );
        })}

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 w-full text-left"
        >
          <span className="material-symbols-outlined text-text-main">
            logout
          </span>
          <p className="text-text-main text-sm font-medium leading-normal">
            Çıkış
          </p>
        </button>
      </div>
    </aside>
  );
}