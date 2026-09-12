import { useState, useEffect } from "react";
import { t } from "../../locales";

/**
 * Header'a yerleştirilen duyurular bileşeni.
 * Buton header akışında durur; drawer + overlay fixed pozisyonla tüm sayfayı örter.
 *
 * Henüz bir duyuru kaynağı yok: liste `announcements` prop'u ile gelir, verilmezse boştur.
 * Öğe biçimi: { title, description, date, icon?, link?, href? }
 */
export default function AnnouncementsDrawer({ announcements = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const count = announcements.length;

  // ESC ile kapat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Drawer açıkken body scroll kilidi
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* ── Header Butonu ─────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label={t("announcements.show")}
        className="relative flex items-center justify-center h-10 w-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="material-symbols-outlined text-text-main">campaign</span>

        {/* Duyuru sayısı badge'i */}
        {count > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* ── Overlay ───────────────────────────────────────── */}
      <div
        onClick={() => setIsOpen(false)}
        className={`
          fixed inset-0 z-40
          bg-black/30 dark:bg-black/50 backdrop-blur-sm
          transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      />

      {/* ── Çekmece Paneli ────────────────────────────────── */}
      <div
        className={`
          fixed right-0 top-0 h-full w-80 md:w-96 z-50
          bg-white dark:bg-gray-800
          border-l border-gray-200 dark:border-gray-700
          shadow-2xl flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary dark:text-primary-light text-xl">
              campaign
            </span>
            <h2 className="text-lg font-bold text-text-main dark:text-gray-100 tracking-tight">
              {t("announcements.title")}
            </h2>
            {count > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light text-xs font-semibold">
                {count}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-text-secondary dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-text-main dark:hover:text-gray-100 transition-colors"
            aria-label={t("common.close")}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Duyuru Listesi */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {count === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-text-secondary dark:text-gray-400">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">
                campaign
              </span>
              <p className="text-sm">{t("announcements.empty")}</p>
            </div>
          ) : (
            announcements.map((announcement, index) => (
              <div
                key={announcement.id ?? index}
                className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 hover:border-primary/30 dark:hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                    <span className="material-symbols-outlined text-primary dark:text-primary-light text-base">
                      {announcement.icon || "campaign"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-text-main dark:text-gray-100 leading-tight mb-1">
                      {announcement.title}
                    </h3>
                    <p className="text-xs text-text-secondary dark:text-gray-400 leading-relaxed mb-2">
                      {announcement.description}
                    </p>
                    <div className="flex items-center justify-between">
                      {announcement.link && announcement.href ? (
                        <a
                          href={announcement.href}
                          className="text-xs text-primary dark:text-primary-light hover:underline font-medium"
                        >
                          {announcement.link} →
                        </a>
                      ) : (
                        <span />
                      )}
                      <span className="text-[10px] text-text-secondary dark:text-gray-500">
                        {announcement.date}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Alt link */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
          <a
            href="/announcements"
            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg text-sm font-medium text-primary dark:text-primary-light hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
          >
            <span>{t("announcements.viewAll")}</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </a>
        </div>
      </div>
    </>
  );
}
