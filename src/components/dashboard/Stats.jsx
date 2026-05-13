import { useState, useEffect, useRef, useLayoutEffect, useCallback, memo } from "react";
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

const Stats = memo(function Stats({ transactions, loading, courierExpanded = false }) {
  const hasPlayedInitialAnimationsRef = useRef(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => {
    if (!loading && transactions?.length > 0 && !hasPlayedInitialAnimationsRef.current) {
      hasPlayedInitialAnimationsRef.current = true;
      setShouldAnimate(true);
    }
  }, [loading, transactions]);

  const equalizeCardHeights = useCallback(() => {
    const cards = gridRef.current?.querySelectorAll('.stat-card');
    if (!cards?.length) return;
    cards.forEach(c => { c.style.minHeight = ''; });
    const maxH = Math.max(...Array.from(cards).map(c => c.offsetHeight));
    if (maxH > 0) cards.forEach(c => { c.style.minHeight = `${maxH}px`; });
  }, []);

  useLayoutEffect(() => {
    equalizeCardHeights();
  }, [transactions, loading, equalizeCardHeights]);

  useEffect(() => {
    window.addEventListener('resize', equalizeCardHeights);
    return () => window.removeEventListener('resize', equalizeCardHeights);
  }, [equalizeCardHeights]);

  // Kurye paneli genişleyince/kapanınca geçiş bittikten sonra yükseklikleri yeniden eşitle
  useEffect(() => {
    const timer = setTimeout(equalizeCardHeights, 450);
    return () => clearTimeout(timer);
  }, [courierExpanded, equalizeCardHeights]);

  const stats = {
    total: transactions?.length || 0,
    withdrawn:
      transactions?.filter((t) => t.status === "WITHDRAWN")?.length || 0,
    pending: transactions?.filter((t) => t.status === "PENDING")?.length || 0,
    registered:
      transactions?.filter((t) => t.status === "REGISTERED")?.length || 0,
    inspection:
      transactions?.filter((t) => t.status === "INSPECTION")?.length || 0,
    completed:
      transactions?.filter((t) => t.status === "CP_COMPLETED")?.length || 0,
    cancelled:
      transactions?.filter((t) => t.status === "CANCELLED")?.length || 0,
    delayed:
      transactions?.filter((t) => t.delayReason && t.delayReason.trim() !== "")?.length || 0,
  };

  // Hat bazlı çekilen işlem sayıları
  const withdrawnTransactions = transactions?.filter((t) => t.status === "WITHDRAWN") || [];
  const withdrawnByGate = {
    SARI: withdrawnTransactions.filter((t) => t.gate === "SARI").length,
    KIRMIZI: withdrawnTransactions.filter((t) => t.gate === "KIRMIZI").length,
  };

  const statsData = [
    {
      label: "İşlemler",
      value: stats.total,
      color: "gray",
      icon: "description",
    },
    {
      label: "Bekleyenler",
      value: stats.pending,
      color: "pending",
      icon: "schedule",
    },
    {
      label: "Tescil Edilenler",
      value: stats.registered,
      color: "registered",
      icon: "assignment_turned_in",
    },
    {
      label: "Muayenedekiler",
      value: stats.inspection,
      color: "inspection",
      icon: "fact_check",
    },
    {
      label: "Tamamlananlar",
      value: stats.completed,
      color: "completed",
      icon: "verified",
    },
    {
      label: "Çekilenler",
      value: stats.withdrawn,
      color: "withdrawn",
      icon: "check_circle",
      showGateBreakdown: true,
      gateBreakdown: withdrawnByGate,
    },
    {
      label: "Gecikenler",
      value: stats.delayed,
      color: "delayed",
      icon: "warning",
    },
    {
      label: "İptal Edilenler",
      value: stats.cancelled,
      color: "cancelled",
      icon: "cancel",
    },
  ];

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
          transform transition-all duration-300 ease-out cursor-default group
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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

        {/* Label hover overlay — kurye genişleyince görünür */}
        <div
          className={`
            absolute top-0 inset-x-0 flex justify-center pt-2.5 z-30 pointer-events-none
            transition-all duration-200
            ${courierExpanded && isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}
          `}
        >
          <div className="bg-gray-900/85 dark:bg-gray-800/95 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm whitespace-nowrap">
            {stat.label}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-4 md:p-5 flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium leading-normal truncate text-text-main transition-opacity duration-300 ${courierExpanded ? 'opacity-0' : 'opacity-90'}`}>
              {stat.label}
            </p>
            <span
              className={`
                material-symbols-outlined text-lg md:text-xl ${colors.icon}
                transition-all duration-300 ease-out transform flex-shrink-0
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
        </div>

        {/* Gate breakdown — tam genişlik, kartın altında */}
        {stat.showGateBreakdown && stat.gateBreakdown && !loading && (
          <div className="relative z-10 flex border-t border-gray-300/60 dark:border-gray-600/60">
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
    <div ref={gridRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
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
  );
});

export default Stats;
