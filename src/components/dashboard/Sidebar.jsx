import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";

export default function Sidebar() {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: "home", label: "Ana Sayfa", active: true, path: "/dashboard" },
    {
      icon: "search",
      label: "İşlem Takip",
      active: false,
      path: "/transactions",
    },
    {
      icon: "warehouse",
      label: "Antrepo Takip",
      active: false,
      path: "/warehouse",
    },
    {
      icon: "local_shipping",
      label: "Yük Takip",
      active: false,
      path: "/shipping",
    },
    { icon: "feed", label: "Haberler", active: false, path: "/news" },
    {
      icon: "campaign",
      label: "Duyurular",
      active: false,
      path: "/announcements",
    },
    { icon: "person", label: "Hesabım", active: false, path: "/profile" },
    { icon: "settings", label: "Ayarlar", active: false, path: "/settings" },
  ];

  const bottomMenuItems = [
    { icon: "contact_support", label: "İletişim", path: "/contact" },
    { icon: "help", label: "Yardım", path: "/help" },
  ];

  return (
    <aside className="flex-col bg-white p-4 hidden lg:flex w-64 shadow-md">
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
        {menuItems.map((item, index) => (
          <Link // ✅ <a> yerine <Link> kullan
            key={index}
            to={item.path} // ✅ href yerine to kullan
            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
              item.active ? "bg-primary/20" : "hover:bg-gray-100"
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                item.active ? "text-primary" : "text-text-main"
              }`}
            >
              {item.icon}
            </span>
            <p
              className={`text-sm font-medium leading-normal ${
                item.active ? "text-primary" : "text-text-main"
              }`}
            >
              {item.label}
            </p>
          </Link>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="mt-auto flex flex-col gap-2">
        {bottomMenuItems.map((item, index) => (
          <a
            key={index}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100"
            href={item.path}
          >
            <span className="material-symbols-outlined text-text-main">
              {item.icon}
            </span>
            <p className="text-text-main text-sm font-medium leading-normal">
              {item.label}
            </p>
          </a>
        ))}

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
