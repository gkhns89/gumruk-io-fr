import { useEffect, useState, useRef } from "react";
import MainLayout from "./layout/MainLayout";
import Stats from "./dashboard/Stats";
import RecentActivityTable from "./dashboard/RecentActivityTable";
import CourierTrackingCard from "./dashboard/CourierTrackingCard";
import { useAuth } from "../hooks/useAuth";
import AuthedImage from "./common/AuthedImage";
import { transactionService } from "../api/transactionService";
import { cargoService } from "../api/cargoService";
import { warehouseService } from "../api/warehouseService";
import { handleError, handleApiResponse } from "../utils/errorUtils";

// Birleşik liste sıralama anahtarı: her satırın duruma göre referans tarihi.
// İşlem: PENDING→antrepo varış, REGISTERED/INSPECTION→tescil, CP_COMPLETED→kapanma,
// diğer (CANCELLED)→ilk dolu olan. Antrepo: beyan tarihi (declarationDate).
const getReferenceDate = (item) => {
  let raw = null;
  if (item.kind === "warehouse") {
    raw = item.declarationDate;
  } else {
    switch (item.status) {
      case "PENDING":
        raw = item.warehouseArrivalDate;
        break;
      case "REGISTERED":
      case "INSPECTION":
        raw = item.registrationDate;
        break;
      case "CP_COMPLETED":
        raw = item.lineClosureDate;
        break;
      default:
        raw = item.lineClosureDate || item.registrationDate || item.warehouseArrivalDate || item.createdAt;
    }
  }
  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
};

// Animated Section Component
const AnimatedSection = ({ children, delay = 0, shouldAnimate = false, className = "" }) => {
  return (
    <div
      className={`${shouldAnimate ? "animate-fade-slide-up" : "opacity-0"} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [warehouseStats, setWarehouseStats] = useState(null);
  const [cargoStats, setCargoStats] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [recentCargo, setRecentCargo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cargoLoading, setCargoLoading] = useState(true);
  const [error, setError] = useState("");

  const hasAnimatedHeadingRef = useRef(false);
  const hasAnimatedSectionsRef = useRef(false);
  const [shouldAnimateHeading, setShouldAnimateHeading] = useState(false);
  const [shouldAnimateSections, setShouldAnimateSections] = useState(false);

  // Kurye kartı compact ↔ expanded geçişi (sadece desktop'ta)
  const [courierExpanded, setCourierExpanded] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLargeScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchCargo();
  }, []);

  // Heading animasyonu — veriler gelince
  useEffect(() => {
    if (!loading && stats && !hasAnimatedHeadingRef.current) {
      hasAnimatedHeadingRef.current = true;
      setShouldAnimateHeading(true);
    }
  }, [loading, stats]);

  // Kurye + tablo — antrepo/yoldakiler kartlarından sonra (kademeli kaskad)
  useEffect(() => {
    if (!loading && stats && !hasAnimatedSectionsRef.current) {
      hasAnimatedSectionsRef.current = true;
      setTimeout(() => {
        setShouldAnimateSections(true);
      }, 1300);
    }
  }, [loading, stats]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");

      // Kartlar için sayım özetleri + tablo için sınırlı (LIMIT 10) listeler — paralel
      const [statsRes, whStatsRes, cargoStatsRes, txRecentRes, whRecentRes] = await Promise.all([
        transactionService.getDashboardStats(),
        warehouseService.getStatsSummary(),
        cargoService.getStatsSummary(),
        transactionService.getRecentTransactions(),
        warehouseService.getRecent(),
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      } else {
        handleApiResponse(statsRes, null, setError, "Dashboard - İşlem özeti yüklenirken");
        setStats(null);
      }

      setWarehouseStats(whStatsRes.success ? whStatsRes.data : null);
      setCargoStats(cargoStatsRes.success ? cargoStatsRes.data : null);

      // İşlem + antrepo birleşik liste: her satırın "son durum tarihi"ne göre en güncel
      // üstte; eşit tarihte en son girilen (createdAt) üstte. İlk 10 alınır, taşan atılır.
      const txItems = (txRecentRes.success ? txRecentRes.data : []).map((t) => ({ ...t, kind: "transaction" }));
      const whItems = (whRecentRes.success ? whRecentRes.data : []).map((w) => ({ ...w, kind: "warehouse" }));

      const entryTime = (item) => (item.createdAt ? new Date(item.createdAt).getTime() : 0);

      const merged = [...txItems, ...whItems].sort((a, b) => {
        const da = getReferenceDate(a);
        const db = getReferenceDate(b);
        // 1) Son durum tarihi — en güncel üstte; tarihi olmayan en sona
        if (da !== db) {
          if (da === null) return 1;
          if (db === null) return -1;
          return db - da;
        }
        // 2) Eşit tarihte: en son girilen kayıt üstte (tür ayrımı yapmadan, adil)
        return entryTime(b) - entryTime(a);
      });

      setRecentItems(merged.slice(0, 10));
    } catch (err) {
      handleError(err, setError, "Dashboard - İşlemler yüklenirken", "İşlemler yüklenirken bir hata oluştu.");
      setStats(null);
      setWarehouseStats(null);
      setCargoStats(null);
      setRecentItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCargo = async () => {
    try {
      setCargoLoading(true);
      const result = await cargoService.getRecentCargo();
      setRecentCargo(result.success ? result.data : []);
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

            {/* Firma logosu — yalnızca logo ekliyse görünür */}
            <AuthedImage
              url={user?.companyDetails?.logoUrl}
              alt={user?.company?.name || "Firma logosu"}
              className="flex-shrink-0 self-start sm:self-auto"
              imgClassName="h-16 md:h-20 w-auto max-w-[200px] object-contain rounded-lg"
            />
          </div>
        </AnimatedSection>

        {/* İstatistik Kartları + Kurye Takip Kartı */}
        <div
          className="grid grid-cols-1 gap-4 mb-6 items-stretch"
          style={isLargeScreen ? {
            gridTemplateColumns: courierExpanded ? '1fr 1fr' : '3fr 1fr',
            transition: 'grid-template-columns 400ms ease-in-out',
          } : {}}
        >
          <Stats stats={stats} warehouseStats={warehouseStats} cargoStats={cargoStats} loading={loading} courierExpanded={courierExpanded} />
          <AnimatedSection delay={0} shouldAnimate={shouldAnimateSections} className="h-full">
            <CourierTrackingCard
              expanded={courierExpanded}
              onToggleExpand={() => setCourierExpanded(v => !v)}
              isLargeScreen={isLargeScreen}
            />
          </AnimatedSection>
        </div>

        {/* Son İşlemler + Son Yükler Tablosu — Tam Genişlik (kurye bölümünden sonra) */}
        <AnimatedSection delay={600} shouldAnimate={shouldAnimateSections}>
          <RecentActivityTable
            transactions={recentItems}
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
