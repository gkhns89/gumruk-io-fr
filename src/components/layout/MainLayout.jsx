import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function MainLayout({ children }) {
  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto bg-background">
          {children}
        </div>
      </main>
    </div>
  );
}