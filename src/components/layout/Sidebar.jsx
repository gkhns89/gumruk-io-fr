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
  const [visibleOtherCount, setVisibleOtherCount] = useState(8); // Varsayılan: tümü görünür
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

  // Diğer menü öğeleri - "Diğer..." altında toplanabilecekler.
  // Ayarlar sayfası tamamen SUPER_ADMIN'e ait (ClickUp + ShipsGo master config);
  // diğer rollerin orada zaten yetkili oldukları hiçbir alan yok, bu yüzden
  // menü öğesini de hiç göstermiyoruz.
  const otherMenuItems = [
    { icon: "search", label: "İşlem Takip", path: "/transactions" },
    { icon: "warehouse", label: "Antrepo Takip", path: "/warehouse" },
    { icon: "local_shipping", label: "Yük Takip", path: "/cargo" },
    { icon: "feed", label: "Haberler", path: "/news" },
    { icon: "campaign", label: "Duyurular", path: "/announcements" },
    { icon: "person", label: "Hesabım", path: "/profile" },
    ...(user?.globalRole === 'SUPER_ADMIN'
      ? [{ icon: "settings", label: "Ayarlar", path: "/settings" }]
      : []),
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
      icon: "account_balance",
      label: "Abonelik & Ödeme",
      path: "/payment/submit",
      active: true,
      roles: ['BROKER_ADMIN', 'BROKER_USER'],
      condition: (user) => user?.isPaymentResponsible === true
    },
    {
      icon: "assessment",
      label: "Raporlar",
      path: "/management/reports",
      active: true,
      roles: ['BROKER_ADMIN', 'SUPER_ADMIN']
    },
    {
      icon: "manage_accounts",
      label: "Session Yönetimi",
      path: "/session-management",
      active: true,
      roles: ['SUPER_ADMIN']
    },
    {
      icon: "payments",
      label: "Ödeme Yönetimi",
      path: "/management/payments",
      active: true,
      roles: ['SUPER_ADMIN']
    },
    {
      icon: "subscriptions",
      label: "Abonelik Yönetimi",
      path: "/management/broker-subscriptions",
      active: true,
      roles: ['SUPER_ADMIN']
    },
    {
      icon: "library_add",
      label: "Hizmet Kataloğu",
      path: "/management/addon-catalog",
      active: true,
      roles: ['SUPER_ADMIN']
    },
    {
      icon: "workspace_premium",
      label: "Plan Yönetimi",
      path: "/management/plans",
      active: true,
      roles: ['SUPER_ADMIN']
    },
    {
      icon: "task_alt",
      label: "Feedback Taskları",
      path: "/management/feedback-tasks",
      active: true,
      roles: ['SUPER_ADMIN']
    },
  ];

  // Kullanıcının yönetim menüsüne erişimi var mı?
  // Not: isPaymentResponsible BROKER_USER da yönetim altındaki "Abonelik & Ödeme"ye erişebilir
  const hasManagementAccess = user?.globalRole === 'BROKER_ADMIN'
    || user?.globalRole === 'SUPER_ADMIN'
    || (user?.globalRole === 'BROKER_USER' && user?.isPaymentResponsible === true);

  // Aktif yönetim menü öğelerini filtrele
  const visibleManagementItems = managementItems.filter(item => {
    // Rol kontrolü
    if (!item.roles.includes(user?.globalRole)) {
      return false;
    }
    // Ek koşul kontrolü (varsa)
    if (item.condition && !item.condition(user)) {
      return false;
    }
    return true;
  });

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
      const totalOtherCount = otherMenuItems.length;
      let visibleOther = totalOtherCount; // Varsayılan: tüm diğer menü öğeleri görünür
      let visibleMgmt = visibleManagementItems.length; // Varsayılan: tüm yönetim öğeleri görünür

      // Önce tüm üst menü ve yönetim öğeleri için gereken toplam yüksekliği hesapla
      const allOtherItemsHeight = totalOtherCount * (itemHeight + gap);

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
        visibleOther = totalOtherCount;
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
              visibleOther = totalOtherCount;
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
  }, [hasManagementAccess, visibleManagementItems.length, otherMenuItems.length]);

  // Dinamik olarak görünür ve gizli öğeleri ayır
  const visibleOtherItems = otherMenuItems.slice(0, visibleOtherCount);
  const hiddenOtherItems = otherMenuItems.slice(visibleOtherCount);

  const visibleMgmtItems = visibleManagementItems.slice(0, visibleManagementCount);
  const hiddenMgmtItems = visibleManagementItems.slice(visibleManagementCount);

  // Yönetim çekmecesi gerekli mi?
  const needsMgmtDrawer = hiddenMgmtItems.length > 0;

  // "Diğer" çekmecesi gerekli mi?
  const needsOtherDrawer = hiddenOtherItems.length > 0;

  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';

  const bottomMenuItems = isSuperAdmin ? [] : [
    { icon: "headset_mic", label: "İletişim", path: "/contact" },
    { icon: "help_center", label: "Yardım", path: "/help" },
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
            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-text-main"
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
          hidden lg:flex flex-col bg-white dark:bg-background-dark shadow-lg border-r border-gray-100 dark:border-gray-700
          transition-all duration-300 ease-in-out
          fixed left-0 top-0 bottom-0 z-40
          overflow-x-hidden overflow-y-auto sidebar-scroll
          ${isExpanded ? 'w-64' : 'w-20'}
          flex-shrink-0
        `}
      >
        {/* User Profile - Profil sayfasına gider */}
        <Link
          to="/profile"
          title={!isExpanded ? "Hesabım" : ""}
          className={`
            group flex items-center p-4 transition-colors
            hover:bg-gray-100 dark:hover:bg-gray-700/60
            ${isActive("/profile") ? "bg-primary/5 dark:bg-primary/10" : ""}
          `}
        >
          {isExpanded ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center h-10 w-10 bg-primary rounded-full text-white font-bold text-sm shadow-md flex-shrink-0 group-hover:ring-2 group-hover:ring-primary/40 transition-all">
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
              <span className="material-symbols-outlined text-base text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0">
                chevron_right
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center h-10 w-10 bg-primary rounded-full text-white font-bold text-sm shadow-md mx-auto group-hover:ring-2 group-hover:ring-primary/40 transition-all">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </Link>

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
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-text-secondary hover:text-text-main transition-colors flex-1"
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
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-text-secondary hover:text-text-main'
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
              {/* Diğer Toggle Butonu */}
              {isExpanded ? (
                <button
                  onClick={() => setIsOtherCollapsed(!isOtherCollapsed)}
                  className="grid grid-cols-3 items-center px-3 h-7 rounded-xl transition-colors w-full flex-shrink-0 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  title="Diğer Menü Öğeleri"
                >
                  <span></span>
                  <span className="material-symbols-outlined text-base justify-self-center">
                    more_horiz
                  </span>
                  <span className={`material-symbols-outlined text-base justify-self-end transition-transform ${!isOtherCollapsed ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setIsOtherCollapsed(!isOtherCollapsed)}
                  className="flex items-center justify-center px-3 h-7 rounded-xl transition-colors w-full flex-shrink-0 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  title="Diğer"
                >
                  <span className="material-symbols-outlined text-lg">
                    more_horiz
                  </span>
                </button>
              )}

              {/* Diğer Menü Öğeleri */}
              {!isOtherCollapsed && (
                <div className={`flex flex-col gap-1 ${isExpanded ? 'ml-4 border-l-2 border-gray-200 dark:border-gray-600 pl-2' : ''}`}>
                  {hiddenOtherItems.map((item, index) => renderMenuItem(item, index, 'hidden-other-'))}
                </div>
              )}
            </>
          )}

          {/* YÖNETİM Bölümü */}
          {hasManagementAccess && visibleManagementItems.length > 0 && (
            <>
              {/* Divider */}
              <div className="my-2 mx-2 border-t border-gray-200 dark:border-gray-700" />

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

                      return (
                        <Link
                          key={`mgmt-${index}`}
                          to={item.path}
                          className={`
                            flex items-center gap-3 px-3 h-11 rounded-xl transition-colors flex-shrink-0
                            ${active
                              ? "bg-primary text-white shadow-md"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-text-main"
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
                      className="grid grid-cols-3 items-center px-3 h-7 rounded-xl transition-colors w-full flex-shrink-0 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                      title="Diğer Yönetim Öğeleri"
                    >
                      <span></span>
                      <span className="material-symbols-outlined text-base justify-self-center">
                        more_horiz
                      </span>
                      <span className={`material-symbols-outlined text-base justify-self-end transition-transform ${!isManagementCollapsed ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsManagementCollapsed(!isManagementCollapsed)}
                      className="flex items-center justify-center px-3 h-7 rounded-xl transition-colors w-full flex-shrink-0 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                      title="Diğer"
                    >
                      <span className="material-symbols-outlined text-lg">
                        more_horiz
                      </span>
                    </button>
                  )}

                  {/* Gizli yönetim öğeleri */}
                  {!isManagementCollapsed && (
                    <div className={`flex flex-col gap-1 ${isExpanded ? 'ml-4 border-l-2 border-gray-200 dark:border-gray-600 pl-2' : ''}`}>
                      {hiddenMgmtItems.map((item, index) => {
                        const active = isActive(item.path);

                        return (
                          <Link
                            key={`mgmt-hidden-${index}`}
                            to={item.path}
                            className={`
                              flex items-center gap-3 px-3 h-11 rounded-xl transition-colors flex-shrink-0
                              ${active
                                ? "bg-primary text-white shadow-md"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-text-main"
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
        <div className="my-2 mx-4 border-t border-gray-200 dark:border-gray-700" />

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
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-text-main"
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
              hover:bg-red-50 dark:hover:bg-red-900/20 text-text-main hover:text-red-600 dark:hover:text-red-400
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
