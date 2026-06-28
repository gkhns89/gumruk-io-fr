import { useState, useEffect, useRef, useLayoutEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { TRANSACTION_STATUS, SPECIAL_STATUS_COLORS } from "../../utils/constants";

// Custom hook for counting animation with delay
const useCountUp = (end, duration = 1000, delay = 0, shouldStart = true) => {
  const [count, setCount] = useState(0);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!shouldStart) {
      setCount(0);
      hasStartedRef.current = false;
      return;
    }

    // Prevent double triggering in strict mode
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    let timeoutId;
    let animationFrame;

    // Wait for delay before starting animation
    timeoutId = setTimeout(() => {
      let startTime;

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const percentage = Math.min(progress / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - percentage, 4);
        const currentCount = Math.floor(easeOutQuart * end);

        setCount(currentCount);

        if (percentage < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
    }, delay);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      hasStartedRef.current = false;
    };
  }, [end, duration, delay, shouldStart]);

  return count;
};

const Stats = memo(function Stats({ stats, warehouseStats, cargoStats, loading, courierExpanded = false }) {
  const navigate = useNavigate();
  const hasPlayedInitialAnimationsRef = useRef(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => {
    if (!loading && stats && !hasPlayedInitialAnimationsRef.current) {
      hasPlayedInitialAnimationsRef.current = true;
      setShouldAnimate(true);
    }
  }, [loading, stats]);

  const equalizeCardHeights = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;
    const cards = el.querySelectorAll('.stat-card');
    if (!cards?.length) return;
    cards.forEach(c => { c.style.minHeight = ''; });
    // En yüksek kartı ölç, tümüne uygula
    const maxH = Math.max(...Array.from(cards).map(c => c.offsetHeight));
    if (maxH > 0) {
      cards.forEach(c => { c.style.minHeight = `${maxH}px`; });
    }
  }, []);

  useLayoutEffect(() => {
    equalizeCardHeights();
  }, [stats, warehouseStats, loading, equalizeCardHeights]);

  useEffect(() => {
    window.addEventListener('resize', equalizeCardHeights);
    return () => window.removeEventListener('resize', equalizeCardHeights);
  }, [equalizeCardHeights]);

  // Backend'den gelen sayım özeti (tüm kayıt indirmeden)
  const byStatus = stats?.byStatus || {};
  const counts = {
    total: stats?.total || 0,
    withdrawn: byStatus.WITHDRAWN || 0,
    pending: byStatus.PENDING || 0,
    registered: byStatus.REGISTERED || 0,
    inspection: byStatus.INSPECTION || 0,
    completed: byStatus.CP_COMPLETED || 0,
    cancelled: byStatus.CANCELLED || 0,
    delayed: stats?.delayed || 0,
  };

  // Hat bazlı çekilen işlem sayıları (backend'den)
  const withdrawnByGate = {
    SARI: stats?.withdrawnByGate?.SARI || 0,
    KIRMIZI: stats?.withdrawnByGate?.KIRMIZI || 0,
  };

  // Antrepo (WarehouseDeclaration) sayımları
  const warehouseCounts = {
    tescil: warehouseStats?.TESCIL_EDILDI || 0,
    kapandi: warehouseStats?.KAPANDI || 0,
  };

  const statsData = [
    {
      label: "İşlemler",
      value: counts.total,
      color: "gray",
      icon: "description",
      to: "/transactions",
    },
    {
      label: "Bekleyenler",
      value: counts.pending,
      color: "pending",
      icon: "schedule",
      to: "/transactions?status=PENDING",
    },
    {
      label: "Tescil Edilenler",
      value: counts.registered,
      color: "registered",
      icon: "assignment_turned_in",
      to: "/transactions?status=REGISTERED",
    },
    {
      label: "Muayenedekiler",
      value: counts.inspection,
      color: "inspection",
      icon: "fact_check",
      to: "/transactions?status=INSPECTION",
    },
    {
      label: "Tamamlananlar",
      value: counts.completed,
      color: "completed",
      icon: "verified",
      to: "/transactions?status=CP_COMPLETED",
    },
    {
      label: "Çekilenler",
      value: counts.withdrawn,
      color: "withdrawn",
      icon: "check_circle",
      showGateBreakdown: true,
      gateBreakdown: withdrawnByGate,
      to: "/transactions?status=WITHDRAWN",
    },
    {
      label: "Gecikenler",
      value: counts.delayed,
      color: "delayed",
      icon: "warning",
      to: "/transactions?delay=TG",
    },
    {
      label: "İptal Edilenler",
      value: counts.cancelled,
      color: "cancelled",
      icon: "cancel",
      to: "/transactions?status=CANCELLED",
    },
  ];

  // Antrepo (WarehouseDeclaration) kartları — işlem kartlarından ayrı grup
  const warehouseData = [
    {
      label: "Tescil Edilenler",
      value: warehouseCounts.tescil,
      icon: "inventory_2",
      to: "/warehouse?status=TESCIL_EDILDI",
      colors: {
        bg: "bg-amber-50 dark:bg-amber-900/20",
        text: "text-amber-700 dark:text-amber-300",
        icon: "text-amber-600 dark:text-amber-400",
      },
    },
    {
      label: "Kapananlar",
      value: warehouseCounts.kapandi,
      icon: "inventory",
      to: "/warehouse?status=KAPANDI",
      colors: {
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        text: "text-emerald-700 dark:text-emerald-300",
        icon: "text-emerald-600 dark:text-emerald-400",
      },
    },
  ];

  // Yoldaki Yükler (cargo TRACKING) — araç tipi kırılımı; yalnızca sayısı > 0 olanlar gösterilir
  const trackingByVehicle = cargoStats?.byStatusAndVehicle?.TRACKING || {};
  const cargoVehicleOrder = [
    { key: "AIRPLANE", icon: "flight", label: "Uçak" },
    { key: "SHIP", icon: "directions_boat", label: "Gemi" },
    { key: "TRUCK", icon: "local_shipping", label: "Kamyon" },
  ];
  const trackingVehicles = cargoVehicleOrder
    .map((v) => ({ ...v, value: trackingByVehicle[v.key] || 0 }))
    .filter((v) => v.value > 0);
  const trackingTotal = cargoVehicleOrder.reduce((sum, v) => sum + (trackingByVehicle[v.key] || 0), 0);

  const getColorClasses = (color) => {
    // Constants'dan status rengini bul
    const statusConfig = TRANSACTION_STATUS.find(s => s.color === color);

    if (statusConfig) {
      return {
        bg: statusConfig.bgClass,
        text: statusConfig.textClass,
        icon: statusConfig.iconClass,
      };
    }

    // Özel durumlar için (delayed, gray)
    const specialConfig = SPECIAL_STATUS_COLORS[color];
    if (specialConfig) {
      return {
        bg: specialConfig.bgClass,
        text: specialConfig.textClass,
        icon: specialConfig.iconClass,
      };
    }

    // Fallback
    return {
      bg: SPECIAL_STATUS_COLORS.gray.bgClass,
      text: SPECIAL_STATUS_COLORS.gray.textClass,
      icon: SPECIAL_STATUS_COLORS.gray.iconClass,
    };
  };

  // Hat breakdown gösterim fonksiyonu
  // Animated stat card component
  const StatCard = ({ stat, index, colors, shouldPlayAnimation }) => {
    const countDelay = (index * 100) + 700;
    const animatedValue = useCountUp(stat.value, 1200, countDelay, shouldPlayAnimation);
    const [isHovered, setIsHovered] = useState(false);
    const [showNumberPulse, setShowNumberPulse] = useState(false);

    useEffect(() => {
      if (shouldPlayAnimation && animatedValue === stat.value && stat.value > 0) {
        setShowNumberPulse(true);
        const timer = setTimeout(() => setShowNumberPulse(false), 600);
        return () => clearTimeout(timer);
      }
    }, [animatedValue, stat.value, shouldPlayAnimation]);

    return (
      <div
        data-index={index}
        className={`
          stat-card
          relative overflow-hidden flex flex-col rounded-2xl
          ${colors.bg} border-2
          ${isHovered
            ? 'border-gray-400 dark:border-gray-500 scale-105 -translate-y-1 shadow-2xl shadow-black/10 dark:shadow-black/30'
            : 'border-gray-300/50 dark:border-gray-600/50 scale-100 translate-y-0 shadow-md'
          }
          ${shouldPlayAnimation ? 'animate-slide-up-bounce' : 'opacity-0'}
          ${stat.to ? 'cursor-pointer' : 'cursor-default'}
          transform transition-all duration-300 ease-out group
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => stat.to && navigate(stat.to)}
        role={stat.to ? 'button' : undefined}
        title={stat.to ? `${stat.label} — listede gör` : undefined}
      >
        {/* Animated background gradient overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/20 to-transparent dark:from-white/10" />

        {/* Glow effect on hover */}
        <div
          className={`
            absolute -inset-1 rounded-2xl transition-all duration-500 blur-xl pointer-events-none -z-10
            ${isHovered ? 'opacity-40 animate-pulse' : 'opacity-0'}
            ${colors.bg}
          `}
        />

        {/* Shimmer effect on initial load */}
        {shouldPlayAnimation && (
          <div
            data-index={index}
            className="stat-shimmer absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-70 animate-shimmer"
          />
        )}

        {/* Content */}
        <div className={`relative z-10 p-4 md:p-5 flex-1 flex flex-col ${courierExpanded ? 'items-center justify-center' : ''}`}>
          {courierExpanded ? (
            <>
              {/* İkon — absolute sağ üst, akıştan çıkar */}
              <span
                className={`
                  absolute top-4 right-4 md:top-5 md:right-5
                  material-symbols-outlined text-lg md:text-xl ${colors.icon}
                  transition-all duration-300 ease-out transform
                  ${isHovered ? 'rotate-12 scale-110' : 'rotate-0 scale-100'}
                `}
              >
                {stat.icon}
              </span>

              {/* Label + Sayı — kartın tam ortasında grup */}
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-xs font-medium opacity-90 text-text-main leading-normal">
                  {stat.label}
                </p>
                {loading ? (
                  <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-8 w-12 rounded"></div>
                ) : (
                  <p
                    className={`
                      tracking-light text-3xl md:text-4xl font-bold leading-none ${colors.text}
                      transition-all duration-300 transform origin-center
                      ${isHovered ? 'scale-110' : 'scale-100'}
                      ${showNumberPulse ? 'animate-number-pulse' : ''}
                    `}
                  >
                    {animatedValue}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Normal düzen: yazı sol, simge sağ üst */}
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium leading-normal truncate opacity-90 text-text-main">
                  {stat.label}
                </p>
                <span
                  className={`
                    material-symbols-outlined text-lg md:text-xl ${colors.icon} flex-shrink-0
                    transition-all duration-300 ease-out transform
                    ${isHovered ? 'rotate-12 scale-110' : 'rotate-0 scale-100'}
                  `}
                >
                  {stat.icon}
                </span>
              </div>
              {loading ? (
                <div className="h-8 md:h-10 flex items-center">
                  <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-6 md:h-8 w-12 md:w-16 rounded"></div>
                </div>
              ) : (
                <p
                  className={`
                    tracking-light text-2xl md:text-3xl font-bold leading-tight ${colors.text}
                    transition-all duration-300 transform origin-left
                    ${isHovered ? 'scale-110' : 'scale-100'}
                    ${showNumberPulse ? 'animate-number-pulse' : ''}
                  `}
                >
                  {animatedValue}
                </p>
              )}
            </>
          )}
        </div>

        {/* Gate breakdown — tam genişlik, kartın altında */}
        {stat.showGateBreakdown && stat.gateBreakdown && (
          <div className={`relative z-10 flex border-t border-gray-300/60 dark:border-gray-600/60 ${loading ? 'invisible' : ''}`}>
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-yellow-100/80 dark:bg-yellow-900/30">
              <span className="text-sm leading-none">🟡</span>
              <span className="text-xs font-bold text-yellow-800 dark:text-yellow-300">{stat.gateBreakdown.SARI}</span>
            </div>
            <div className="w-px bg-gray-300/60 dark:bg-gray-600/60" />
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-100/80 dark:bg-red-900/30">
              <span className="text-sm leading-none">🔴</span>
              <span className="text-xs font-bold text-red-800 dark:text-red-300">{stat.gateBreakdown.KIRMIZI}</span>
            </div>
          </div>
        )}

        {/* Corner accent */}
        <div
          className={`
            absolute top-0 right-0 w-16 h-16
            ${colors.bg}
            rounded-bl-full transition-all duration-500 transform
            ${isHovered ? 'scale-150 opacity-30' : 'scale-100 opacity-20'}
          `}
        />

        {/* Sparkle effects on hover */}
        {isHovered && (
          <>
            <div className="sparkle-1 absolute top-4 right-4 w-1 h-1 bg-white rounded-full animate-ping opacity-75" />
            <div className="sparkle-2 absolute top-6 right-8 w-1 h-1 bg-white rounded-full animate-ping opacity-50" />
            <div className="sparkle-3 absolute top-8 right-6 w-1 h-1 bg-white rounded-full animate-ping opacity-60" />
          </>
        )}
      </div>
    );
  };

  return (
    <div ref={gridRef} className="flex flex-col gap-5">
      {/* İşlem durumları grubu */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-primary text-xl">description</span>
          <h3 className="text-sm font-bold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            İşlem Durumları
          </h3>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {statsData.map((stat, index) => {
            const colors = getColorClasses(stat.color);
            return (
              <StatCard
                key={stat.label}
                stat={stat}
                index={index}
                colors={colors}
                shouldPlayAnimation={shouldAnimate}
              />
            );
          })}
        </div>
      </div>

      {/* Antrepo (sol %50) + Yoldaki Yükler (sağ %50) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Antrepo grubu — üst kartlardan sonra belirir */}
        <div
          style={{ animationDelay: '700ms' }}
          className={`rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-900/10 p-3 md:p-4 ${shouldAnimate ? 'animate-fade-slide-up' : 'opacity-0'}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-indigo-500 dark:text-indigo-400 text-xl">warehouse</span>
            <h3 className="text-sm font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
              Antrepo
            </h3>
            <div className="flex-1 h-px bg-indigo-200 dark:bg-indigo-800/50" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6">
            {warehouseData.map((stat, i) => (
              <StatCard
                key={`wh-${stat.label}`}
                stat={stat}
                index={statsData.length + i}
                colors={stat.colors}
                shouldPlayAnimation={shouldAnimate}
              />
            ))}
          </div>
        </div>

        {/* Yoldaki Yükler grubu — antrepodan sonra belirir */}
        <div
          style={{ animationDelay: '1000ms' }}
          className={`rounded-2xl border-2 border-dashed border-teal-200 dark:border-teal-800/50 bg-teal-50/40 dark:bg-teal-900/10 p-3 md:p-4 flex flex-col ${shouldAnimate ? 'animate-fade-slide-up' : 'opacity-0'}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-teal-500 dark:text-teal-400 text-xl">local_shipping</span>
            <h3 className="text-sm font-bold uppercase tracking-wide text-teal-600 dark:text-teal-300">
              Yoldaki Yükler
            </h3>
            <div className="flex-1 h-px bg-teal-200 dark:bg-teal-800/50" />
          </div>

          <div
            onClick={() => navigate("/cargo?status=TRACKING")}
            role="button"
            title="Yoldaki yükleri listede gör"
            className="relative overflow-hidden flex flex-col flex-1 rounded-2xl bg-teal-50 dark:bg-teal-900/20 border-2 border-gray-300/50 dark:border-gray-600/50 shadow-md cursor-pointer transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-xl"
          >
            <div className="p-4 md:p-5 flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium opacity-90 text-text-main">Yolda</p>
                <span className="material-symbols-outlined text-lg md:text-xl text-teal-600 dark:text-teal-400">route</span>
              </div>
              {loading ? (
                <div className="h-8 md:h-10 flex items-center">
                  <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-6 md:h-8 w-12 md:w-16 rounded"></div>
                </div>
              ) : (
                <p className="tracking-light text-2xl md:text-3xl font-bold leading-tight text-teal-700 dark:text-teal-300">
                  {trackingTotal}
                </p>
              )}
            </div>

            {/* Araç tipi kırılımı — yalnızca sayısı > 0 olanlar */}
            {!loading && trackingVehicles.length > 0 && (
              <div className="relative z-10 flex border-t border-gray-300/60 dark:border-gray-600/60">
                {trackingVehicles.map((v, i) => (
                  <button
                    key={v.key}
                    onClick={(e) => { e.stopPropagation(); navigate(`/cargo?status=TRACKING&vehicleType=${v.key}`); }}
                    title={`${v.label} (yolda) — listede gör`}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 bg-teal-100/70 dark:bg-teal-900/30 hover:bg-teal-200/70 dark:hover:bg-teal-800/40 transition-colors ${i > 0 ? "border-l border-gray-300/60 dark:border-gray-600/60" : ""}`}
                  >
                    <span className="material-symbols-outlined text-base text-teal-700 dark:text-teal-300">{v.icon}</span>
                    <span className="text-xs font-bold text-teal-800 dark:text-teal-300">{v.value}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Stats;
