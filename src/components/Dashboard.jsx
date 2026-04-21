import { useEffect, useState, useRef } from "react";
import MainLayout from "./layout/MainLayout";
import Stats from "./dashboard/Stats";
import TransactionsTable from "./dashboard/TransactionsTable";
import CourierTrackingCard from "./dashboard/CourierTrackingCard";
import { useAuth } from "../hooks/useAuth";
import { transactionService } from "../api/transactionService";
import { cargoService } from "../api/cargoService";
import { handleError, handleApiResponse } from "../utils/errorUtils";

// Animated Section Component
const AnimatedSection = ({ children, delay = 0, shouldAnimate = false }) => {
  return (
    <div
      className={`${shouldAnimate ? "animate-fade-slide-up" : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [allTransactions, setAllTransactions] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentCargo, setRecentCargo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cargoLoading, setCargoLoading] = useState(true);
  const [error, setError] = useState("");

  const hasAnimatedHeadingRef = useRef(false);
  const hasAnimatedSectionsRef = useRef(false);
  const [shouldAnimateHeading, setShouldAnimateHeading] = useState(false);
  const [shouldAnimateSections, setShouldAnimateSections] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchCargo();
  }, []);

  // Heading animasyonu — veriler gelince
  useEffect(() => {
    if (!loading && allTransactions.length > 0 && !hasAnimatedHeadingRef.current) {
      hasAnimatedHeadingRef.current = true;
      setShouldAnimateHeading(true);
    }
  }, [loading, allTransactions]);

  // Diğer bölümler — stat kartları bittikten sonra
  useEffect(() => {
    if (!loading && allTransactions.length > 0 && !hasAnimatedSectionsRef.current) {
      hasAnimatedSectionsRef.current = true;
      setTimeout(() => {
        setShouldAnimateSections(true);
      }, 2200);
    }
  }, [loading, allTransactions]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await transactionService.getAllTransactions();

      if (result.success) {
        let dataArray = [];

        if (Array.isArray(result.data)) {
          dataArray = result.data;
        } else if (result.data && typeof result.data === "object") {
          const possibleArrayFields = ["transactions", "data", "items", "content", "results", "list"];
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

        setAllTransactions(dataArray);

        const sortedTransactions = [...dataArray].sort((a, b) => {
          const getPriority = (status) => {
            if (status === "WITHDRAWN") return 3;
            if (status === "CP_COMPLETED" || status === "CANCELLED") return 2;
            return 1;
          };

          const priorityA = getPriority(a.status);
          const priorityB = getPriority(b.status);
          if (priorityA !== priorityB) return priorityA - priorityB;

          const dateA = new Date(a.createdAt || a.warehouseArrivalDate || 0);
          const dateB = new Date(b.createdAt || b.warehouseArrivalDate || 0);
          return dateB - dateA;
        });

        setRecentTransactions(sortedTransactions.slice(0, 10));
      } else {
        handleApiResponse(result, null, setError, "Dashboard - İşlemler yüklenirken");
        setAllTransactions([]);
        setRecentTransactions([]);
      }
    } catch (err) {
      handleError(err, setError, "Dashboard - İşlemler yüklenirken", "İşlemler yüklenirken bir hata oluştu.");
      setAllTransactions([]);
      setRecentTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCargo = async () => {
    try {
      setCargoLoading(true);
      const result = await cargoService.getAllCargo();

      if (result.success) {
        const STATUS_PRIORITY = { ARRIVED: 1, TRACKING: 2, COMPLETED: 3 };

        const sorted = [...result.data].sort((a, b) => {
          const pA = STATUS_PRIORITY[a.status] || 999;
          const pB = STATUS_PRIORITY[b.status] || 999;
          if (pA !== pB) return pA - pB;

          const etaA = a.estimatedArrivalDate
            ? new Date(a.estimatedArrivalDate).getTime()
            : Infinity;
          const etaB = b.estimatedArrivalDate
            ? new Date(b.estimatedArrivalDate).getTime()
            : Infinity;
          return etaA - etaB;
        });

        setRecentCargo(sorted.slice(0, 10));
      } else {
        setRecentCargo([]);
      }
    } catch {
      setRecentCargo([]);
    } finally {
      setCargoLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Başlık */}
        <AnimatedSection delay={0} shouldAnimate={shouldAnimateHeading}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <p className="text-text-main text-2xl md:text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em]">
                Hoş Geldiniz, {user?.username || "Kullanıcı"}
              </p>
              <p className="text-text-secondary text-sm md:text-base mt-1 md:mt-2">
                {user?.company?.name || "Şirket bilgisi yok"}
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* İstatistik Kartları */}
        <Stats transactions={allTransactions} loading={loading} />

        {/* Kurye Takip Kartı */}
        <AnimatedSection delay={0} shouldAnimate={shouldAnimateSections}>
          <div className="mb-6">
            <CourierTrackingCard />
          </div>
        </AnimatedSection>

        {/* Son İşlemler + Son Yükler Tablosu — Tam Genişlik */}
        <AnimatedSection delay={200} shouldAnimate={shouldAnimateSections}>
          <TransactionsTable
            transactions={recentTransactions}
            loading={loading}
            error={error}
            onRetry={fetchTransactions}
            recentCargo={recentCargo}
            cargoLoading={cargoLoading}
          />
        </AnimatedSection>
      </div>
    </MainLayout>
  );
}
