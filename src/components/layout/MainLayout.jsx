import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function MainLayout({ children, hasFooter = false }) {
  const [sidebarWide, setSidebarWide] = useState(() => {
    return localStorage.getItem('sidebarMode') === 'pinned-expanded';
  });

  useEffect(() => {
    const handleStateChange = (event) => {
      setSidebarWide(event.detail.isWide);
    };
    window.addEventListener('sidebarStateChanged', handleStateChange);
    return () => window.removeEventListener('sidebarStateChanged', handleStateChange);
  }, []);

  const mainClassName = useMemo(() =>
    `flex-1 flex flex-col min-w-0 overflow-hidden transition-[margin] duration-300 ease-in-out ${sidebarWide ? 'lg:ml-64' : 'lg:ml-20'}`,
    [sidebarWide]
  );

  return (
    <div className="flex w-full overflow-hidden" style={{ height: '100vh' }}>
      <Sidebar />
      <main className={mainClassName}>
        <Header />
        <div
          id="main-scroll-area"
          className={`flex-1 overflow-y-auto bg-background ${hasFooter ? 'pb-4' : 'pb-2'}`}
          style={hasFooter ? { Height: 'calc(100vh - 130px)' } : {}}
        >
          <div className="animate-slide-in-left-small">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
