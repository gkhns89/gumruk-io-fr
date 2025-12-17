import React, { useEffect, useState } from "react";
import MainLayout from "./layout/MainLayout";
import Stats from "./dashboard/Stats";
import TransactionsTable from "./dashboard/TransactionsTable";
import Announcements from "./dashboard/Announcements";
import { useAuth } from "../hooks/useAuth";
import { transactionService } from "../api/transactionService";

export default function Dashboard() {
  const { user } = useAuth();
  const [allTransactions, setAllTransactions] = useState([]); // Stats için tüm işlemler
  const [recentTransactions, setRecentTransactions] = useState([]); // Son işlemler tablosu için
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");

      // Tüm işlemleri getir (kullanıcının yetkisine göre filtrelenmiş)
      const result = await transactionService.getAllTransactions();

      if (result.success) {
        let dataArray = [];

        if (Array.isArray(result.data)) {
          dataArray = result.data;
        } else if (result.data && typeof result.data === 'object') {
          const possibleArrayFields = ['transactions', 'data', 'items', 'content', 'results', 'list'];

          for (const field of possibleArrayFields) {
            if (Array.isArray(result.data[field])) {
              dataArray = result.data[field];
              break;
            }
          }

          if (dataArray.length === 0 && result.data) {
            dataArray = [result.data];
          }
        }

        // Tüm işlemleri Stats için sakla
        setAllTransactions(dataArray);
        // Son 5 işlemi TransactionsTable için sakla
        setRecentTransactions(dataArray.slice(0, 5));
      } else {
        setError(result.error);
        setAllTransactions([]);
        setRecentTransactions([]);
      }
    } catch (err) {
      console.error("Beklenmeyen Hata:", err);
      setError("İşlemler yüklenirken bir hata oluştu.");
      setAllTransactions([]);
      setRecentTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <p className="text-text-main text-2xl md:text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em]">
              Hoş Geldiniz, {user?.username || 'Kullanıcı'}
            </p>
            <p className="text-text-secondary text-sm md:text-base mt-1 md:mt-2">
              {user?.company?.name || 'Şirket bilgisi yok'}
            </p>
          </div>
        </div>

        {/* Stats - Tüm işlemlerden istatistik */}
        <Stats transactions={allTransactions} loading={loading} />

        {/* Recent Transactions and Announcements */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          <div className="xl:col-span-2">
            <TransactionsTable
              transactions={recentTransactions}
              loading={loading}
              error={error}
              onRetry={fetchTransactions}
            />
          </div>
          <div>
            <Announcements />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}