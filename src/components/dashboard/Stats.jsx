import { useState, useEffect, useRef, memo } from "react";
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

const Stats = memo(function Stats({ transactions, loading }) {
  // Track if initial animations have been played
  const hasPlayedInitialAnimationsRef = useRef(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Play animations only once when data is first loaded
  useEffect(() => {
    if (!loading && transactions?.length > 0 && !hasPlayedInitialAnimationsRef.current) {
      hasPlayedInitialAnimationsRef.current = true;
      setShouldAnimate(true);
    }
  }, [loading, transactions]);

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
      label: "Toplam İşlem",
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
      label: "Tescil Edildi",
      value: stats.registered,
      color: "registered",
      icon: "assignment_turned_in",
    },
    {
      label: "Muayene Sürecinde",
      value: stats.inspection,
      color: "inspection",
      icon: "fact_check",
    },
    {
      label: "Gümrük İşlemleri Tamam",
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
  const renderGateBreakdown = (breakdown) => {
    const gateConfig = {
      SARI: {
        label: "Sarı",
        emoji: "🟡",
        bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
        textClass: "text-yellow-800 dark:text-yellow-300",
        borderClass: "border-yellow-300 dark:border-yellow-700",
      },
      KIRMIZI: {
        label: "Kırmızı",
        emoji: "🔴",
        bgClass: "bg-red-100 dark:bg-red-900/30",
        textClass: "text-red-800 dark:text-red-300",
        borderClass: "border-red-300 dark:border-red-700",
      },
    };

    return (
      <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        {Object.entries(breakdown).map(([gate, count]) => {
          const config = gateConfig[gate];
          if (!config) return null;

          return (
            <div
              key={gate}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border ${config.bgClass} ${config.borderClass} transition-transform hover:scale-105 cursor-default`}
            >
              <span className="text-sm">{config.emoji}</span>
              <span className={`text-xs font-semibold ${config.textClass}`}>
                <span className="hidden sm:inline">{config.label}: </span>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Animated stat card component
  const StatCard = ({ stat, index, colors, shouldPlayAnimation }) => {
    // Calculate delay: wait for slide-up animation to complete (0.7s + index delay)
    const countDelay = (index * 100) + 700;
    const animatedValue = useCountUp(stat.value, 1200, countDelay, shouldPlayAnimation);
    const [isHovered, setIsHovered] = useState(false);
    const [showNumberPulse, setShowNumberPulse] = useState(false);

    // Trigger number pulse when counting completes
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
          relative overflow-hidden flex flex-col gap-1 md:gap-2 rounded-2xl p-4 md:p-6
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

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs md:text-sm lg:text-base font-medium leading-normal truncate opacity-90 text-text-main">
              {stat.label}
            </p>
            <span
              className={`
                material-symbols-outlined text-lg md:text-xl lg:text-2xl ${colors.icon}
                transition-all duration-300 ease-out transform
                ${isHovered ? 'rotate-12 scale-110' : 'rotate-0 scale-100'}
              `}
            >
              {stat.icon}
            </span>
          </div>

          {loading ? (
            <div className="h-8 md:h-12 flex items-center">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-6 md:h-8 w-12 md:w-16 rounded"></div>
            </div>
          ) : (
            <>
              <p
                className={`
                  tracking-light text-2xl md:text-3xl lg:text-4xl font-bold leading-tight ${colors.text}
                  transition-all duration-300 transform origin-left
                  ${isHovered ? 'scale-110' : 'scale-100'}
                  ${showNumberPulse ? 'animate-number-pulse' : ''}
                `}
              >
                {animatedValue}
              </p>
              {stat.showGateBreakdown && stat.gateBreakdown && (
                renderGateBreakdown(stat.gateBreakdown)
              )}
            </>
          )}
        </div>

        {/* Corner accent */}
        <div
          className={`
            absolute top-0 right-0 w-20 h-20
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 lg:mb-8">
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
