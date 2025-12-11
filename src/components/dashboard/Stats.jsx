import React from "react";

export default function Stats({ transactions, loading }) {
  const stats = {
    total: transactions?.length || 0,
    withdrawn:
      transactions?.filter((t) => t.status === "WITHDRAWN")?.length || 0,
    pending: transactions?.filter((t) => t.status === "PENDING")?.length || 0,
    registered:
      transactions?.filter((t) => t.status === "REGISTERED")?.length || 0,
    inspected:
      transactions?.filter((t) => t.status === "INSPECTED")?.length || 0,
    completed:
      transactions?.filter((t) => t.status === "CP_COMPLETED")?.length || 0,
    cancelled:
      transactions?.filter((t) => t.status === "CANCELLED")?.length || 0,
    delayed:
      transactions?.filter((t) => t.delayReason && t.delayReason.trim() !== "")?.length || 0,
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
      label: "Muayene Tamamlandı",
      value: stats.inspected,
      color: "inspected",
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
    const colorMap = {
      pending: {
        bg: "bg-sky-50",
        text: "text-sky-700",
        icon: "text-sky-600",
      },
      registered: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        icon: "text-amber-600",
      },
      inspected: {
        bg: "bg-purple-50",
        text: "text-purple-700",
        icon: "text-purple-600",
      },
      completed: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        icon: "text-emerald-600",
      },
      withdrawn: {
        bg: "bg-green-50",
        text: "text-green-700",
        icon: "text-green-600",
      },
      delayed: {
        bg: "bg-orange-50",
        text: "text-orange-700",
        icon: "text-orange-600",
      },
      cancelled: {
        bg: "bg-rose-50",
        text: "text-rose-700",
        icon: "text-rose-600",
      },
      gray: {
        bg: "bg-gray-50",
        text: "text-gray-700",
        icon: "text-gray-600",
      },
    };

    return colorMap[color] || colorMap.gray;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 lg:mb-8">
      {statsData.map((stat, index) => {
        const colors = getColorClasses(stat.color);
        return (
          <div
            key={index}
            className={`flex flex-col gap-1 md:gap-2 rounded-xl p-4 md:p-6 ${colors.bg} border border-gray-200 hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm lg:text-base font-medium leading-normal truncate opacity-80">
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
                <div className="animate-pulse bg-gray-200 h-6 md:h-8 w-12 md:w-16 rounded"></div>
              </div>
            ) : (
              <p
                className={`tracking-light text-2xl md:text-3xl lg:text-4xl font-bold leading-tight ${colors.text}`}
              >
                {stat.value}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
