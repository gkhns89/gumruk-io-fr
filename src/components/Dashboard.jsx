import { useEffect, useState, useRef } from "react";
import MainLayout from "./layout/MainLayout";
import Stats from "./dashboard/Stats";
import TransactionsTable from "./dashboard/TransactionsTable";
import Announcements from "./dashboard/Announcements";
import CourierTrackingCard from "./dashboard/CourierTrackingCard";
import { useAuth } from "../hooks/useAuth";
import { transactionService } from "../api/transactionService";
import { handleError, handleApiResponse } from "../utils/errorUtils";

// Animated Section Component
const AnimatedSection = ({ children, delay = 0, shouldAnimate = false }) => {
  return (
    <div
      className={`${shouldAnimate ? 'animate-fade-slide-up' : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [allTransactions, setAllTransactions] = useState([]); // Stats için tüm işlemler
  const [recentTransactions, setRecentTransactions] = useState([]); // Son işlemler tablosu için
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasAnimatedRef = useRef(false);
  const [shouldAnimateSections, setShouldAnimateSections] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Trigger section animations after data loads
  useEffect(() => {
    if (!loading && allTransactions.length > 0 && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      // Small delay to let Stats animate first
      setTimeout(() => {
        setShouldAnimateSections(true);
      }, 300);
    }
  }, [loading, allTransactions]);

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

        // İşlemleri sırala: 3 seviye - Aktif, Kapanan, Çekilen
        const sortedTransactions = [...dataArray].sort((a, b) => {
          // Öncelik seviyelerini belirle
          const getPriority = (status) => {
            if (status === 'WITHDRAWN') return 3; // En son: Çekilenler
            if (status === 'CP_COMPLETED' || status === 'CANCELLED') return 2; // Ortada: Kapananlar
            return 1; // En üstte: Aktif işlemler (PENDING, REGISTERED, INSPECTION)
          };

          const priorityA = getPriority(a.status);
          const priorityB = getPriority(b.status);

          // Önce önceliğe göre sırala
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          // Aynı öncelik seviyesindeyse, tarihe göre sırala (yeni en üstte)
          const dateA = new Date(a.createdAt || a.warehouseArrivalDate || 0);
          const dateB = new Date(b.createdAt || b.warehouseArrivalDate || 0);
          return dateB - dateA; // Azalan sıralama (yeni önce)
        });

        // Son 10 işlemi TransactionsTable için sakla
        setRecentTransactions(sortedTransactions.slice(0, 10));
      } else {
        handleApiResponse(result, null, setError, 'Dashboard - İşlemler yüklenirken');
        setAllTransactions([]);
        setRecentTransactions([]);
      }
    } catch (err) {
      handleError(err, setError, 'Dashboard - İşlemler yüklenirken', 'İşlemler yüklenirken bir hata oluştu.');
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
        <AnimatedSection delay={0} shouldAnimate={shouldAnimateSections}>
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
        </AnimatedSection>

        {/* Stats - Tüm işlemlerden istatistik */}
        <Stats transactions={allTransactions} loading={loading} />

        {/* Kurye Takip Kartı - SADECE broker tarafı için (CLIENT_USER görmez) */}
        <AnimatedSection delay={200} shouldAnimate={shouldAnimateSections}>
          <div className="mb-6">
            <CourierTrackingCard />
          </div>
        </AnimatedSection>

        {/* Recent Transactions and Announcements */}
        <AnimatedSection delay={400} shouldAnimate={shouldAnimateSections}>
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
        </AnimatedSection>
      </div>
    </MainLayout>
  );
}