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
    try {
      setLoading(true);
      setError("");
      
      console.log("📡 İşlemler getiriliyor...");
      const result = await transactionService.getRecentTransactions();
      
      console.log("✅ API Yanıtı (RAW):", result);
      console.log("📦 result.data tipi:", typeof result.data);
      console.log("📦 result.data içeriği:", result.data);
      
      if (result.success) {
        // GÜVENLİ ARRAY DÖNÜŞÜMÜ
        let dataArray = [];
        
        // 1. Durum: result.data zaten array
        if (Array.isArray(result.data)) {
          console.log("✅ Data zaten array");
          dataArray = result.data;
        }
        // 2. Durum: result.data obje içinde array var (örn: { transactions: [...] })
        else if (result.data && typeof result.data === 'object') {
          console.log("📦 Data bir obje, içeriği kontrol ediliyor...");
          
          // Olası array field'larını kontrol et
          const possibleArrayFields = [
            'transactions',
            'data',
            'items',
            'content',
            'results',
            'list'
          ];
          
          for (const field of possibleArrayFields) {
            if (Array.isArray(result.data[field])) {
              console.log(`✅ Array bulundu: result.data.${field}`);
              dataArray = result.data[field];
              break;
            }
          }
          
          // Hiçbir field array değilse, objeyi array'e çevir
          if (dataArray.length === 0) {
            console.log("⚠️ Hiçbir array field bulunamadı, obje array'e dönüştürülüyor");
            dataArray = [result.data];
          }
        }
        // 3. Durum: null veya undefined
        else if (result.data === null || result.data === undefined) {
          console.log("⚠️ Data null veya undefined, boş array kullanılıyor");
          dataArray = [];
        }
        // 4. Durum: primitive value (string, number, etc.)
        else {
          console.log("⚠️ Data beklenmeyen bir tip:", typeof result.data);
          dataArray = [];
        }
        
        console.log(`📊 ${dataArray.length} işlem bulundu`);
        
        // İlk 5 işlemi al (güvenli slice)
        const limitedData = dataArray.slice(0, 5);
        console.log(`📊 ${limitedData.length} işlem gösteriliyor`);
        
        setTransactions(limitedData);
      } else {
        console.error("❌ API Hatası:", result.error);
        setError(result.error);
        setTransactions([]);
      }
    } catch (err) {
      console.error("💥 Beklenmeyen Hata:", err);
      console.error("💥 Hata Detayı:", {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError("İşlemler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.");
      setTransactions([]);
    } finally {
      setLoading(false);
      console.log("✓ Loading tamamlandı");
    }
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
          <Stats transactions={transactions} loading={loading} />

          {/* Recent Transactions and Announcements */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <TransactionsTable 
                transactions={transactions} 
                loading={loading}
                error={error}
                onRetry={fetchRecentTransactions}
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