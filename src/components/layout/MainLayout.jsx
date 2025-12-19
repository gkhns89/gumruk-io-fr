import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function MainLayout({ children }) {
  const [sidebarWide, setSidebarWide] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem('sidebarMode') === 'pinned-expanded';
  });

  useEffect(() => {
    // Listen for custom event from Sidebar
    const handleStateChange = (event) => {
      setSidebarWide(event.detail.isWide);
    };

    window.addEventListener('sidebarStateChanged', handleStateChange);

    return () => {
      window.removeEventListener('sidebarStateChanged', handleStateChange);
    };
  }, []);

  // Memoize the main className to prevent unnecessary re-renders
  const mainClassName = useMemo(() =>
    `flex-1 flex flex-col min-w-0 overflow-hidden transition-[margin] duration-300 ease-in-out ${sidebarWide ? 'lg:ml-64' : 'lg:ml-20'}`,
    [sidebarWide]
  );

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      <Sidebar />
      <main className={mainClassName}>
        <Header />
        <div className="flex-1 overflow-y-auto bg-background pb-36">
          <div className="animate-slide-in-left-small h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}