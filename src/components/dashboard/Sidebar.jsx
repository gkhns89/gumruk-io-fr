import React from "react";

export default function Sidebar() {
  const menuItems = [
    { icon: "home", label: "Ana Sayfa", active: true },
    { icon: "search", label: "İşlem Takip", active: false },
    { icon: "warehouse", label: "Antrepo Takip", active: false },
    { icon: "local_shipping", label: "Yük Takip", active: false },
    { icon: "feed", label: "Haberler", active: false },
    { icon: "campaign", label: "Duyurular", active: false },
    { icon: "person", label: "Hesabım", active: false },
    { icon: "settings", label: "Ayarlar", active: false },
  ];

  const bottomMenuItems = [
    { icon: "contact_support", label: "İletişim" },
    { icon: "help", label: "Yardım" },
    { icon: "logout", label: "Çıkış" },
  ];

  return (
    <aside className="flex-col bg-white p-4 hidden lg:flex w-64 shadow-md">
      {/* User Profile */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB8gAkvnJYhrXj5IYcwx3o3FRoAK4rvctdFFhoGxP5vTNIAzhYMzkQb7wWy7kdHlRd7meFHxRXlPouBzNdgkvvQq1eKcwgfo1c_lUi7h3dbjuMF3cr2PaO-s4C3OMcQEVj3U0IZzT3lzQE6E3JjeALf9104_2O87m98G_7O8AMyT5kaxx_5awRBbbbPmBm61fH9tDf1FJM4LEJyoqo0FL4O-PtLZJBkias6J77afQONCrDTneMY4IFKmoQf4FvEfqvDJnOk6ZmJAdc")',
          }}
        ></div>
        <div className="flex flex-col">
          <h1 className="text-text-main text-base font-medium leading-normal">
            Hoş Geldiniz
          </h1>
          <p className="text-text-secondary text-sm font-normal leading-normal">
            Kullanıcı Adı
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-2 flex-grow">
        {menuItems.map((item, index) => (
          <a
            key={index}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
              item.active
                ? "bg-primary/20"
                : "hover:bg-gray-100"
            }`}
            href="#"
          >
            <span className={`material-symbols-outlined ${item.active ? "text-primary" : "text-text-main"}`}>
              {item.icon}
            </span>
            <p className={`text-sm font-medium leading-normal ${item.active ? "text-primary" : "text-text-main"}`}>
              {item.label}
            </p>
          </a>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="mt-auto flex flex-col gap-2">
        {bottomMenuItems.map((item, index) => (
          <a
            key={index}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100"
            href="#"
          >
            <span className="material-symbols-outlined text-text-main">
              {item.icon}
            </span>
            <p className="text-text-main text-sm font-medium leading-normal">
              {item.label}
            </p>
          </a>
        ))}
      </div>
    </aside>
  );
}