import React, { useEffect, useState } from "react";
import Sidebar from "./dashboard/Sidebar";
import Header from "./dashboard/Header";
import Stats from "./dashboard/Stats";
import TransactionsTable from "./dashboard/TransactionsTable";
import Announcements from "./dashboard/Announcements";
import { useAuth } from "../hooks/useAuth";
import { transactionService } from "../api/transactionService";

export default function Dashboard() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRecentTransactions();
  }, []);

  const fetchRecentTransactions = async () => {
    setLoading(true);
    const result = await transactionService.getRecentTransactions();
    
    if (result.success) {
      // İlk 5 işlemi al
      setTransactions(result.data.slice(0, 5));
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen w-full">
      <Sidebar user={user} />
      <main className="flex-1 flex flex-col">
        <Header user={user} />
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
          {/* Page Heading */}
          <div className="flex flex-wrap justify-between gap-3 mb-6">
            <div>
              <p className="text-text-main text-4xl font-black leading-tight tracking-[-0.033em]">
                Hoş Geldiniz, {user?.username || 'Kullanıcı'}
              </p>
              <p className="text-text-secondary text-base mt-2">
                {user?.company?.name || 'Şirket bilgisi yok'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <Stats transactions={transactions} />

          {/* Recent Transactions and Announcements */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <TransactionsTable 
                transactions={transactions} 
                loading={loading}
                error={error}
              />
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