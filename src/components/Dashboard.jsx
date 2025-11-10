import React from "react";
import Sidebar from "./dashboard/Sidebar";
import Header from "./dashboard/Header";
import Stats from "./dashboard/Stats";
import TransactionsTable from "./dashboard/TransactionsTable";
import Announcements from "./dashboard/Announcements";

export default function Dashboard() {
  return (
    <div className="relative flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
          {/* Page Heading */}
          <div className="flex flex-wrap justify-between gap-3 mb-6">
            <p className="text-text-main text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">
              Genel Bakış
            </p>
          </div>

          {/* Stats */}
          <Stats />

          {/* Recent Transactions and Announcements */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <TransactionsTable />
            </div>
            <div>
              <Announcements />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}