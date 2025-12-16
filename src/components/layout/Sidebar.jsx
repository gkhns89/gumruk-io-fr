import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Sidebar modes: 'auto' (hover to expand), 'pinned-expanded', 'pinned-collapsed'
  const [sidebarMode, setSidebarMode] = useState(() => {
    return localStorage.getItem('sidebarMode') || 'auto';
  });
  const [isHovered, setIsHovered] = useState(false);

  // Sidebar is expanded when pinned-expanded OR (auto mode AND hovered)
  const isExpanded = sidebarMode === 'pinned-expanded' || (sidebarMode === 'auto' && isHovered);
  const isPinnedExpanded = sidebarMode === 'pinned-expanded';
  const isPinnedCollapsed = sidebarMode === 'pinned-collapsed';

  // Save mode to localStorage and dispatch event
  useEffect(() => {
    localStorage.setItem('sidebarMode', sidebarMode);
    // Dispatch custom event to notify MainLayout
    const isPinned = sidebarMode === 'pinned-expanded';
    window.dispatchEvent(new CustomEvent('sidebarPinChanged', { detail: { isPinned } }));
  }, [sidebarMode]);

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

  const handlePin = () => {
    // Sabitle butonu: Toggle between pinned-expanded and auto
    if (sidebarMode === 'pinned-expanded') {
      setSidebarMode('auto');
    } else {
      setSidebarMode('pinned-expanded');
    }
  };

  const handleCollapse = () => {
    // Daralt butonu:
    if (sidebarMode === 'pinned-collapsed') {
      // pinned-collapsed -> auto
      setSidebarMode('auto');
    } else {
      // auto or pinned-expanded -> pinned-collapsed
      setSidebarMode('pinned-collapsed');
      setIsHovered(false);
    }
  };

  return (
    <>
      {/* Backdrop when expanded in auto mode */}
      {isExpanded && sidebarMode === 'auto' && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:block hidden animate-fadeIn"
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
          overflow-x-hidden
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

        {/* Control Buttons - Fixed height to prevent menu shifting */}
        <div className="mx-4 mb-4 h-11 flex gap-2 items-center">
          {/* Pinned-Collapsed mode: Only Daralt button (icon only, active) */}
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

          {/* Auto hover or Pinned-Expanded: Show both buttons */}
          {isExpanded && !isPinnedCollapsed && (
            <>
              {/* Daralt Button (always passive) */}
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

              {/* Sabitle Button (active when pinned-expanded, passive otherwise) */}
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
        <nav className="flex flex-col gap-1 flex-grow px-2 overflow-y-auto">
          {menuItems.map((item, index) => {
            const active = isActive(item.path);
            return (
              <Link
                key={index}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 h-11 rounded-xl transition-colors
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
                  flex items-center gap-3 px-3 h-11 rounded-xl transition-colors
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
              flex items-center gap-3 px-3 h-11 rounded-xl
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

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-in-out;
        }

        /* Hide scrollbar for nav */
        nav::-webkit-scrollbar {
          display: none;
        }

        nav {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
