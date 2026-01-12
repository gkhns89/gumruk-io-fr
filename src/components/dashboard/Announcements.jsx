import React from "react";

export default function Announcements() {
  const announcements = [
    {
      title: "Yeni Gümrük Vergisi Oranları",
      description:
        "1 Mayıs 2024 itibarıyla geçerli olacak yeni vergi oranları yayınlanmıştır.",
      link: "Devamını Oku",
    },
    {
      title: "Bayram Tatili Çalışma Saatleri",
      description:
        "Ramazan Bayramı süresince çalışma saatlerimiz güncellenmiştir.",
      link: "Detaylar için...",
    },
    {
      title: "Sistem Bakım Çalışması",
      description:
        "10 Mayıs 22:00 - 23:00 saatleri arasında sistemlerimizde bakım yapılacaktır.",
      link: "Daha Fazla Bilgi",
    },
  ];

  return (
    <>
      <h2 className="text-text-main text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-2">
        Duyurular
      </h2>
      <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 flex flex-col gap-4 transition-colors duration-300">
        {announcements.map((announcement, index) => (
          <div
            key={index}
            className={`${
              index !== announcements.length - 1
                ? "border-b border-gray-200 dark:border-gray-700 pb-4"
                : ""
            }`}
          >
            <h3 className="font-semibold text-text-main">
              {announcement.title}
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              {announcement.description}
            </p>
            <a
              className="text-sm text-primary hover:underline mt-2 inline-block"
              href="#"
            >
              {announcement.link}
            </a>
          </div>
        ))}
      </div>
    </>
  );
}