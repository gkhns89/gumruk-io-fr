import React from "react";
import { TRANSACTION_STATUS, SPECIAL_STATUS_COLORS } from "../../utils/constants";

export default function Stats({ transactions, loading }) {
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
                {config.label}: {count}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 lg:mb-8">
      {statsData.map((stat, index) => {
        const colors = getColorClasses(stat.color);
        return (
          <div
            key={index}
            className={`flex flex-col gap-1 md:gap-2 rounded-xl p-4 md:p-6 ${colors.bg} border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm lg:text-base font-medium leading-normal truncate opacity-90 text-text-main">
                {stat.label}
              </p>
              <span
                className={`material-symbols-outlined text-lg md:text-xl ${colors.icon}`}
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
                  className={`tracking-light text-2xl md:text-3xl lg:text-4xl font-bold leading-tight ${colors.text}`}
                >
                  {stat.value}
                </p>
                {stat.showGateBreakdown && stat.gateBreakdown && (
                  renderGateBreakdown(stat.gateBreakdown)
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
