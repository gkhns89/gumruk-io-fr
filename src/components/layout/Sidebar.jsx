import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navRef = useRef(null);

  // Sidebar modes: 'auto' (hover to expand), 'pinned-expanded', 'pinned-collapsed'
  const [sidebarMode, setSidebarMode] = useState(() => {
    return localStorage.getItem('sidebarMode') || 'auto';
  });
  const [isHovered, setIsHovered] = useState(false);

  // Yönetim menüsünü varsayılan olarak kapalı tut (alan tasarrufu için)
  const [isManagementCollapsed, setIsManagementCollapsed] = useState(true);

  // Diğer menüsünü varsayılan olarak kapalı tut
  const [isOtherCollapsed, setIsOtherCollapsed] = useState(true);

  // Dinamik görünür öğe sayısı
  const [visibleOtherCount, setVisibleOtherCount] = useState(6); // Varsayılan: tümü görünür
  const [visibleManagementCount, setVisibleManagementCount] = useState(4); // Varsayılan: tümü görünür

  // Sidebar is expanded when pinned-expanded OR (auto mode AND hovered)
  const isExpanded = sidebarMode === 'pinned-expanded' || (sidebarMode === 'auto' && isHovered);
  const isPinnedExpanded = sidebarMode === 'pinned-expanded';
  const isPinnedCollapsed = sidebarMode === 'pinned-collapsed';

  // Save mode to localStorage and dispatch event
  useEffect(() => {
    localStorage.setItem('sidebarMode', sidebarMode);
    const isWide = sidebarMode === 'pinned-expanded';
    window.dispatchEvent(new CustomEvent('sidebarStateChanged', { detail: { isWide } }));
  }, [sidebarMode]);

  // Ana menü öğeleri - Her zaman görünür
  const mainMenuItems = [
    { icon: "home", label: "Ana Sayfa", path: "/dashboard" },
  ];

  // Diğer menü öğeleri - "Diğer..." altında toplanabilecekler
  const otherMenuItems = [
    { icon: "search", label: "İşlem Takip", path: "/transactions" },
    { icon: "warehouse", label: "Antrepo Takip", path: "/warehouse" },
    { icon: "local_shipping", label: "Yük Takip", path: "/shipping" },
    { icon: "feed", label: "Haberler", path: "/news" },
    { icon: "campaign", label: "Duyurular", path: "/announcements" },
    { icon: "person", label: "Hesabım", path: "/profile" },
    { icon: "settings", label: "Ayarlar", path: "/settings" },
  ];

  // Yönetim menüsü - BROKER_ADMIN için
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
      label: "Kullanıcı Yönetimi",
      path: "/management/users",
      active: false,
      roles: ['BROKER_ADMIN', 'SUPER_ADMIN'],
      comingSoon: true
    },
    {
      icon: "assessment",
      label: "Raporlar",
      path: "/management/reports",
      active: false,
      roles: ['BROKER_ADMIN', 'SUPER_ADMIN'],
      comingSoon: true
    },
  ];

  // Kullanıcının yönetim menüsüne erişimi var mı?
  const hasManagementAccess = user?.globalRole === 'BROKER_ADMIN' || user?.globalRole === 'SUPER_ADMIN';

  // Aktif yönetim menü öğelerini filtrele
  const visibleManagementItems = managementItems.filter(item =>
    item.roles.includes(user?.globalRole)
  );

  // Dinamik buton görünürlüğü hesaplama
  useEffect(() => {
    const calculateVisibleItems = () => {
      const windowHeight = window.innerHeight;

      // Sabit yükseklikler
      const userProfileHeight = 68; // User profile section
      const controlButtonsHeight = 60; // Control buttons
      const bottomMenuHeight = 180; // Contact, Help, Logout (3 items * 44px + gaps + divider)
      const padding = 20;
      const mainItemsHeight = 1 * 44; // Ana Sayfa (always visible)
      const itemHeight = 44; // Her buton yüksekliği
      const headerHeight = 28; // "Diğer" ve "Yönetim" başlık yükseklikleri (%25 azaltıldı)
      const dividerHeight = 20;
      const gap = 4; // gap-1 = 4px

      // Kullanılabilir yükseklik
      const availableHeight = windowHeight - userProfileHeight - controlButtonsHeight - bottomMenuHeight - padding - mainItemsHeight;

      let remainingHeight = availableHeight;
      let visibleOther = 7; // Varsayılan: tüm diğer menü öğeleri görünür (İşlem Takip dahil)
      let visibleMgmt = visibleManagementItems.length; // Varsayılan: tüm yönetim öğeleri görünür

      // Önce tüm üst menü ve yönetim öğeleri için gereken toplam yüksekliği hesapla
      const allOtherItemsHeight = 7 * (itemHeight + gap);

      let totalNeededHeight = allOtherItemsHeight;

      // Yönetim bölümü varsa ekle
      if (hasManagementAccess && visibleManagementItems.length > 0) {
        const mgmtHeaderHeight = headerHeight + dividerHeight;
        const allMgmtItemsHeight = visibleManagementItems.length * (itemHeight + gap);
        totalNeededHeight += mgmtHeaderHeight + allMgmtItemsHeight;
      }

      // Tümü sığıyor mu?
      if (remainingHeight >= totalNeededHeight) {
        // Tümü sığıyor, hiçbir çekmece yok
        visibleOther = 7;
        visibleMgmt = visibleManagementItems.length;
      } else {
        // Sığmıyor, önce yönetimi sondan başa doğru tek tek gizle
        if (hasManagementAccess && visibleManagementItems.length > 0) {
          const mgmtHeaderHeight = headerHeight + dividerHeight;

          // Yönetim öğelerini sondan başa doğru tek tek gizle (en az 1 öğe kalsın)
          let foundFit = false;
          for (let hiddenMgmtCount = 1; hiddenMgmtCount < visibleManagementItems.length; hiddenMgmtCount++) {
            const currentVisibleMgmt = visibleManagementItems.length - hiddenMgmtCount;
            const mgmtItemsHeight = currentVisibleMgmt * (itemHeight + gap);
            const totalWithMgmt = allOtherItemsHeight + mgmtHeaderHeight + mgmtItemsHeight;

            if (remainingHeight >= totalWithMgmt) {
              // Bu kadar yönetim öğesi sığıyor
              visibleMgmt = currentVisibleMgmt;
              visibleOther = 7;
              foundFit = true;
              break;
            }
          }

          // En az 1 yönetim öğesi kalsın, şimdi üst menüyü gizle
          if (!foundFit) {
            visibleMgmt = 1;

            // Üst menü için alan hesapla
            if (remainingHeight >= headerHeight) {
              const availableForOther = remainingHeight - headerHeight;
              visibleOther = Math.max(0, Math.floor(availableForOther / (itemHeight + gap)));
            } else {
              visibleOther = 0;
            }
          }
        }
      }

      setVisibleOtherCount(visibleOther);
      setVisibleManagementCount(visibleMgmt);
    };

    calculateVisibleItems();
    window.addEventListener('resize', calculateVisibleItems);
    return () => window.removeEventListener('resize', calculateVisibleItems);
  }, [hasManagementAccess, visibleManagementItems.length]);

  // Dinamik olarak görünür ve gizli öğeleri ayır
  const visibleOtherItems = otherMenuItems.slice(0, visibleOtherCount);
  const hiddenOtherItems = otherMenuItems.slice(visibleOtherCount);

  const visibleMgmtItems = visibleManagementItems.slice(0, visibleManagementCount);
  const hiddenMgmtItems = visibleManagementItems.slice(visibleManagementCount);

  // Yönetim çekmecesi gerekli mi?
  const needsMgmtDrawer = hiddenMgmtItems.length > 0;
  const allMgmtVisible = visibleMgmtItems.length === visibleManagementItems.length;

  // "Diğer" çekmecesi gerekli mi?
  const needsOtherDrawer = hiddenOtherItems.length > 0;

  const bottomMenuItems = [
    { icon: "phone", label: "İletişim", path: "/contact" },
    { icon: "info", label: "Yardım", path: "/help" },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handlePin = () => {
    if (sidebarMode === 'pinned-expanded') {
      setSidebarMode('auto');
    } else {
      setSidebarMode('pinned-expanded');
    }
  };

  const handleCollapse = () => {
    if (sidebarMode === 'pinned-collapsed') {
      setSidebarMode('auto');
    } else {
      setSidebarMode('pinned-collapsed');
      setIsHovered(false);
    }
  };

  // Menü öğesi render fonksiyonu
  const renderMenuItem = (item, index, keyPrefix = '') => {
    const active = isActive(item.path);
    return (
      <Link
        key={`${keyPrefix}${index}`}
        to={item.path}
        className={`
          flex items-center gap-3 px-3 h-11 rounded-xl transition-colors flex-shrink-0
          ${active
            ? "bg-primary text-white shadow-md"
            : "hover:bg-gray-100 text-text-main"
          }
          ${!isExpanded && 'justify-center'}
        `}
        title={!isExpanded ? item.label : ''}
      >
        <span className="material-symbols-outlined text-xl flex-shrink-0">
          {item.icon}
        </span>
        {isExpanded && (
          <p className="text-sm font-medium leading-normal whitespace-nowrap">
            {item.label}
          </p>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Backdrop when expanded in auto mode */}
      {isExpanded && sidebarMode === 'auto' && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:block hidden animate-fade-in"
          onClick={() => setIsHovered(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => sidebarMode === 'auto' && setIsHovered(true)}
        onMouseLeave={() => sidebarMode === 'auto' && setIsHovered(false)}
        className={`
          hidden lg:flex flex-col bg-white shadow-lg border-r border-gray-100
          transition-all duration-300 ease-in-out
          fixed left-0 top-0 bottom-0 z-40
          overflow-x-hidden overflow-y-auto sidebar-scroll
          ${isExpanded ? 'w-64' : 'w-20'}
          flex-shrink-0
        `}
      >
        {/* User Profile */}
        <div className="flex items-center justify-between p-4">
          {isExpanded && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center h-10 w-10 bg-primary rounded-full text-white font-bold text-sm shadow-md flex-shrink-0">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-text-main text-sm font-medium leading-tight truncate">
                  {user?.username || "Kullanıcı"}
                </h1>
                <p className="text-text-secondary text-xs font-normal leading-tight truncate">
                  {user?.globalRole || "Role"}
                </p>
              </div>
            </div>
          )}

          {!isExpanded && (
            <div className="flex items-center justify-center h-10 w-10 bg-primary rounded-full text-white font-bold text-sm shadow-md mx-auto">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="mx-4 mb-4 h-11 flex gap-2 items-center">
          {/* Otomatik mod - Sağ ok butonu */}
          {sidebarMode === 'auto' && !isHovered && (
            <button
              onClick={handlePin}
              className="h-9 w-9 mx-auto flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              title="Sabitle ve Genişlet"
            >
              <span className="material-symbols-outlined text-base">
                chevron_right
              </span>
            </button>
          )}

          {/* Daraltılmış mod - Genişlet butonu */}
          {isPinnedCollapsed && (
            <button
              onClick={handleCollapse}
              className="h-9 w-9 mx-auto flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              title="Genişlet"
            >
              <span className="material-symbols-outlined text-base">
                close_fullscreen
              </span>
            </button>
          )}

          {/* Genişletilmiş mod - Daralt ve Sabitle butonları */}
          {isExpanded && !isPinnedCollapsed && (
            <>
              <button
                onClick={handleCollapse}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-text-secondary hover:text-text-main transition-colors flex-1"
                title="Daralt"
              >
                <span className="material-symbols-outlined text-base">
                  close_fullscreen
                </span>
                <span className="text-xs font-medium whitespace-nowrap">
                  Daralt
                </span>
              </button>

              <button
                onClick={handlePin}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors flex-1 ${
                  isPinnedExpanded
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-gray-100 hover:bg-gray-200 text-text-secondary hover:text-text-main'
                }`}
                title={isPinnedExpanded ? "Sabitlemeyi Kaldır" : "Sabitle"}
              >
                <span className="material-symbols-outlined text-base">
                  keep
                </span>
                <span className="text-xs font-medium whitespace-nowrap">
                  Sabitle
                </span>
              </button>
            </>
          )}
        </div>

        {/* Main Navigation */}
        <nav
          ref={navRef}
          className="flex flex-col gap-1 flex-grow px-2"
        >
          {/* Ana menü öğeleri - Her zaman görünür */}
          {mainMenuItems.map((item, index) => renderMenuItem(item, index, 'main-'))}

          {/* Görünür diğer menü öğeleri */}
          {visibleOtherItems.map((item, index) => renderMenuItem(item, index, 'other-visible-'))}

          {/* DİĞER Çekmecesi - Gizli üst menü öğeleri için */}
          {needsOtherDrawer && (
            <>
              {/* Diğer Başlığı / Toggle Butonu */}
              {isExpanded ? (
                <button
                  onClick={() => setIsOtherCollapsed(!isOtherCollapsed)}
                  className="flex items-center gap-3 px-3 h-7 rounded-xl transition-colors w-full flex-shrink-0 bg-gray-300 hover:bg-gray-400 text-text-main"
                >
                  <span className="material-symbols-outlined text-base flex-shrink-0">
                    more_horiz
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wider flex-1 text-left">
                    Diğer
                  </p>
                  <span className={`material-symbols-outlined text-base transition-transform ${!isOtherCollapsed ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setIsOtherCollapsed(!isOtherCollapsed)}
                  className="flex items-center justify-center px-3 h-7 rounded-xl transition-colors w-full flex-shrink-0 bg-gray-300 hover:bg-gray-400"
                  title="Diğer"
                >
                  <span className="material-symbols-outlined text-lg text-text-secondary">
                    more_horiz
                  </span>
                </button>
              )}

              {/* Diğer Menü Öğeleri */}
              {!isOtherCollapsed && (
                <div className={`flex flex-col gap-1 ${isExpanded ? 'ml-4 border-l-2 border-gray-200 pl-2' : ''}`}>
                  {hiddenOtherItems.map((item, index) => renderMenuItem(item, index, 'hidden-other-'))}
                </div>
              )}
            </>
          )}

          {/* YÖNETİM Bölümü */}
          {hasManagementAccess && visibleManagementItems.length > 0 && (
            <>
              {/* Divider */}
              <div className="my-2 mx-2 border-t border-gray-200" />

              {/* Yönetim Başlığı - Her zaman göster */}
              {isExpanded ? (
                <div className="flex items-center gap-3 px-3 h-9 flex-shrink-0">
                  <span className="material-symbols-outlined text-lg flex-shrink-0 text-text-secondary">
                    admin_panel_settings
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Yönetim
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center px-3 h-9 flex-shrink-0">
                  <span className="material-symbols-outlined text-xl text-text-secondary">
                    admin_panel_settings
                  </span>
                </div>
              )}

              {/* Görünür yönetim öğeleri - Düz liste */}
              {visibleMgmtItems.length > 0 && (
                <div className="flex flex-col gap-1">
                    {visibleMgmtItems.map((item, index) => {
                      const active = isActive(item.path);
                      const isDisabled = !item.active;

                      if (isDisabled) {
                        return (
                          <div
                            key={`mgmt-${index}`}
                            className={`
                              flex items-center gap-3 px-3 h-11 rounded-xl flex-shrink-0
                              opacity-50 cursor-not-allowed
                              ${!isExpanded && 'justify-center'}
                            `}
                            title={!isExpanded ? `${item.label} (Yakında)` : ''}
                          >
                            <span className="material-symbols-outlined text-xl flex-shrink-0 text-text-secondary">
                              {item.icon}
                            </span>
                            {isExpanded && (
                              <div className="flex items-center justify-between flex-1">
                                <p className="text-sm font-medium leading-normal whitespace-nowrap text-text-secondary">
                                  {item.label}
                                </p>
                                {item.comingSoon && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-text-secondary rounded-full">
                                    Yakında
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={`mgmt-${index}`}
                          to={item.path}
                          className={`
                            flex items-center gap-3 px-3 h-11 rounded-xl transition-colors flex-shrink-0
                            ${active
                              ? "bg-primary text-white shadow-md"
                              : "hover:bg-gray-100 text-text-main"
                            }
                            ${!isExpanded && 'justify-center'}
                          `}
                          title={!isExpanded ? item.label : ''}
                        >
                          <span className="material-symbols-outlined text-xl flex-shrink-0">
                            {item.icon}
                          </span>
                          {isExpanded && (
                            <p className="text-sm font-medium leading-normal whitespace-nowrap">
                              {item.label}
                            </p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
              )}

              {/* Gizli yönetim öğeleri için çekmece */}
              {needsMgmtDrawer && (
                <>
                  {/* Toggle Butonu */}
                  {isExpanded ? (
                    <button
                      onClick={() => setIsManagementCollapsed(!isManagementCollapsed)}
                      className="flex items-center gap-3 px-3 h-7 rounded-xl transition-colors w-full flex-shrink-0 bg-gray-300 hover:bg-gray-400 text-text-main"
                    >
                      <span className="material-symbols-outlined text-base flex-shrink-0">
                        more_horiz
                      </span>
                      <p className="text-xs font-semibold uppercase tracking-wider flex-1 text-left">
                        Diğer
                      </p>
                      <span className={`material-symbols-outlined text-base transition-transform ${!isManagementCollapsed ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsManagementCollapsed(!isManagementCollapsed)}
                      className="flex items-center justify-center px-3 h-7 rounded-xl transition-colors w-full flex-shrink-0 bg-gray-300 hover:bg-gray-400"
                      title="Diğer"
                    >
                      <span className="material-symbols-outlined text-lg text-text-secondary">
                        more_horiz
                      </span>
                    </button>
                  )}

                  {/* Gizli yönetim öğeleri */}
                  {!isManagementCollapsed && (
                    <div className={`flex flex-col gap-1 ${isExpanded ? 'ml-4 border-l-2 border-gray-200 pl-2' : ''}`}>
                      {hiddenMgmtItems.map((item, index) => {
                        const active = isActive(item.path);
                        const isDisabled = !item.active;

                        if (isDisabled) {
                          return (
                            <div
                              key={`mgmt-hidden-${index}`}
                              className={`
                                flex items-center gap-3 px-3 h-11 rounded-xl flex-shrink-0
                                opacity-50 cursor-not-allowed
                                ${!isExpanded && 'justify-center'}
                              `}
                              title={!isExpanded ? `${item.label} (Yakında)` : ''}
                            >
                              <span className="material-symbols-outlined text-xl flex-shrink-0 text-text-secondary">
                                {item.icon}
                              </span>
                              {isExpanded && (
                                <div className="flex items-center justify-between flex-1">
                                  <p className="text-sm font-medium leading-normal whitespace-nowrap text-text-secondary">
                                    {item.label}
                                  </p>
                                  {item.comingSoon && (
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-text-secondary rounded-full">
                                      Yakında
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={`mgmt-hidden-${index}`}
                            to={item.path}
                            className={`
                              flex items-center gap-3 px-3 h-11 rounded-xl transition-colors flex-shrink-0
                              ${active
                                ? "bg-primary text-white shadow-md"
                                : "hover:bg-gray-100 text-text-main"
                              }
                              ${!isExpanded && 'justify-center'}
                            `}
                            title={!isExpanded ? item.label : ''}
                          >
                            <span className="material-symbols-outlined text-xl flex-shrink-0">
                              {item.icon}
                            </span>
                            {isExpanded && (
                              <p className="text-sm font-medium leading-normal whitespace-nowrap">
                                {item.label}
                              </p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </nav>

        {/* Divider */}
        <div className="my-2 mx-4 border-t border-gray-200" />

        {/* Bottom Navigation */}
        <div className="flex flex-col gap-1 px-2 pb-4">
          {bottomMenuItems.map((item, index) => {
            const active = isActive(item.path);
            return (
              <Link
                key={index}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 h-11 rounded-xl transition-colors flex-shrink-0
                  ${active
                    ? "bg-primary text-white shadow-md"
                    : "hover:bg-gray-100 text-text-main"
                  }
                  ${!isExpanded && 'justify-center'}
                `}
                title={!isExpanded ? item.label : ''}
              >
                <span className="material-symbols-outlined text-xl flex-shrink-0">
                  {item.icon}
                </span>
                {isExpanded && (
                  <p className="text-sm font-medium leading-normal whitespace-nowrap">
                    {item.label}
                  </p>
                )}
              </Link>
            );
          })}

          <button
            onClick={logout}
            className={`
              flex items-center gap-3 px-3 h-11 rounded-xl flex-shrink-0
              hover:bg-red-50 text-text-main hover:text-red-600
              w-full transition-colors mt-2
              ${!isExpanded && 'justify-center'}
            `}
            title={!isExpanded ? 'Çıkış' : ''}
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0">logout</span>
            {isExpanded && (
              <p className="text-sm font-medium leading-normal whitespace-nowrap">
                Çıkış
              </p>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
