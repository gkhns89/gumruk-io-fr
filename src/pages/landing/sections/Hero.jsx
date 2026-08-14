import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import PortScene from "./PortScene";

// Önizleme kartındaki sahte veri — gerçek müşteri verisi kullanılmaz.
// Firma adları Screens ve LiveTracking bölümleriyle aynı kadrodan; üç bölümde tutarlı olmalı.
const PREVIEW_ROWS = [
  { ref: "IM-2026-0418", client: "Tataroğlu Tekstil A.Ş.", stage: "Beyanname tescil edildi", tone: "blue" },
  { ref: "IM-2026-0417", client: "Karacadağ Kimya Ltd.", stage: "Gümrük muayenesi", tone: "amber" },
  { ref: "EX-2026-0231", client: "Sayman Makine San.", stage: "Yüklendi — yolda", tone: "sky" },
  { ref: "IM-2026-0415", client: "Toros Gıda A.Ş.", stage: "Teslim edildi", tone: "green" },
];

const TONES = {
  blue: "bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20 dark:text-brand-sky",
  amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-300",
  sky: "bg-brand-sky/15 text-sky-600 dark:bg-brand-sky/20 dark:text-brand-sky",
  green: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300",
};

const STATS = [
  { value: "Tek ekran", label: "İthalat, ihracat, depo ve kurye" },
  { value: "Canlı", label: "Konteyner konumu ve ETA" },
  { value: "Anlık", label: "Müşteriye durum bildirimi" },
];

export default function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section id="hero" className="relative overflow-hidden bg-white dark:bg-brand-navy">
      {/* Zemin efekti */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_0%,rgba(56,189,248,0.16),transparent_70%),radial-gradient(50%_50%_at_10%_20%,rgba(30,79,216,0.12),transparent_70%)]"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pt-20 pb-12 lg:grid-cols-2 lg:pt-28 lg:pb-16">
        {/* Sol: metin */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-4 py-1.5 text-xs font-semibold text-brand-blue dark:border-brand-sky/25 dark:bg-brand-sky/10 dark:text-brand-sky">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-sky" />
            Gümrük müşavirlikleri için uçtan uca takip
          </span>

          <h1 className="font-brand mt-6 text-4xl leading-tight font-extrabold text-brand-navy sm:text-5xl lg:text-6xl dark:text-white">
            Gümrük süreçlerinizin
            <span className="text-brand-blue dark:text-brand-sky"> tamamı tek ekranda</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
            Beyannameden teslimata kadar her işlemi tek yerden yönetin. Konteynerlerinizi canlı
            haritada izleyin, depo ve kurye hareketlerini kayıt altına alın, müşterilerinize
            süreçlerini anlık gösterin.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:bg-brand-navy hover:shadow-xl dark:hover:bg-brand-sky dark:hover:text-brand-navy"
            >
              {isAuthenticated ? "Panele Git" : "Sisteme Giriş"}
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
            <a
              href="#iletisim"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-7 py-3.5 text-base font-semibold text-text-main transition-colors hover:border-brand-blue hover:text-brand-blue dark:border-white/20 dark:hover:border-brand-sky dark:hover:text-brand-sky"
            >
              Demo Talep Et
            </a>
          </div>

          <dl className="mt-12 grid grid-cols-1 gap-6 border-t border-gray-200 pt-8 sm:grid-cols-3 dark:border-white/10">
            {STATS.map((stat) => (
              <div key={stat.value}>
                <dt className="font-brand text-xl font-bold text-brand-navy dark:text-white">
                  {stat.value}
                </dt>
                <dd className="mt-1 text-sm text-text-secondary">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Sağ: sahte arayüz önizlemesi */}
        <div className="relative">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-brand-navy/10 dark:border-white/10 dark:bg-background-dark dark:shadow-black/40">
            {/* Pencere çubuğu */}
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-white/10">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs font-medium text-text-secondary">
                Gümrük.io — İşlem Takip
              </span>
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-brand text-sm font-semibold text-text-main">Açık işlemler</p>
                <span className="rounded-md bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue dark:bg-brand-sky/15 dark:text-brand-sky">
                  Bugün · 4
                </span>
              </div>

              <div className="space-y-2.5">
                {PREVIEW_ROWS.map((row) => (
                  <div
                    key={row.ref}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-background-light px-4 py-3 dark:border-white/5 dark:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-main">{row.client}</p>
                      <p className="mt-0.5 font-mono text-xs text-text-secondary">{row.ref}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${TONES[row.tone]}`}
                    >
                      {row.stage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dekoratif liman sahnesi — hero'yu bir sonraki bölüme bağlar */}
      <div className="relative">
        <PortScene />
      </div>
    </section>
  );
}
