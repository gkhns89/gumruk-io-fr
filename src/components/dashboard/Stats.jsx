import React from "react";

export default function Stats({ transactions }) {
  // İstatistikleri hesapla
  const stats = {
    total: transactions?.length || 0,
    completed: transactions?.filter(t => t.status === 'COMPLETED')?.length || 0,
    pending: transactions?.filter(t => t.status === 'PENDING')?.length || 0,
    inProgress: transactions?.filter(t => t.status === 'IN_PROGRESS')?.length || 0,
  };

  const statsData = [
    { label: "Toplam İşlem", value: stats.total, highlight: false },
    { label: "Tamamlananlar", value: stats.completed, highlight: false },
    { label: "İşlemde", value: stats.inProgress, highlight: true },
    { label: "Bekleyenler", value: stats.pending, highlight: false },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-xl p-6 bg-white border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <p className="text-text-secondary text-base font-medium leading-normal">
            {stat.label}
          </p>
          <p
            className={`tracking-light text-4xl font-bold leading-tight ${
              stat.highlight ? "text-primary" : "text-text-main"
            }`}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}