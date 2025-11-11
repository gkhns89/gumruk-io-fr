import React from "react";

export default function Stats({ transactions, loading }) {
  // İstatistikleri hesapla
  const stats = {
    total: transactions?.length || 0,
    completed: transactions?.filter(t => t.status === 'COMPLETED')?.length || 0,
    pending: transactions?.filter(t => t.status === 'PENDING')?.length || 0,
    inProgress: transactions?.filter(t => t.status === 'IN_PROGRESS')?.length || 0,
  };

  const statsData = [
    { label: "Toplam İşlem", value: stats.total, highlight: false, icon: "description" },
    { label: "Tamamlananlar", value: stats.completed, highlight: false, icon: "check_circle" },
    { label: "İşlemde", value: stats.inProgress, highlight: true, icon: "pending" },
    { label: "Bekleyenler", value: stats.pending, highlight: false, icon: "schedule" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-xl p-6 bg-white border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <p className="text-text-secondary text-base font-medium leading-normal">
              {stat.label}
            </p>
            <span className={`material-symbols-outlined ${stat.highlight ? 'text-primary' : 'text-text-secondary'}`}>
              {stat.icon}
            </span>
          </div>
          {loading ? (
            <div className="h-12 flex items-center">
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
            </div>
          ) : (
            <p
              className={`tracking-light text-4xl font-bold leading-tight ${
                stat.highlight ? "text-primary" : "text-text-main"
              }`}
            >
              {stat.value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}