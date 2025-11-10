import React from "react";

export default function Stats() {
  const stats = [
    { label: "Aktif İşlem Sayısı", value: "12", highlight: false },
    { label: "Bu Ay Tamamlananlar", value: "8", highlight: false },
    { label: "Onay Bekleyenler", value: "3", highlight: true },
    { label: "Gelen Mesajlar", value: "5", highlight: false },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
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