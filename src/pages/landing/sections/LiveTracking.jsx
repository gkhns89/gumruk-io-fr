import React from "react";

// Sahte sefer verisi — gerçek müşteri/sefer kaydı değil.
// Not: takip sağlayıcısının adı bilinçli olarak hiçbir yerde geçmiyor.
const TIMELINE = [
  { label: "Yükleme", place: "Shanghai", date: "22 Tem", state: "done" },
  { label: "Aktarma", place: "Singapur", date: "03 Ağu", state: "done" },
  { label: "Denizde", place: "Süveyş yaklaşımı", date: "Şu an", state: "active" },
  { label: "Tahmini varış", place: "Ambarlı", date: "26 Ağu", state: "pending" },
];

const BULLETS = [
  {
    icon: "my_location",
    title: "Son konum ve rota",
    text: "Konteynerin bulunduğu nokta, geçtiği limanlar ve kalan yol harita üzerinde.",
  },
  {
    icon: "schedule",
    title: "Güncellenen varış tahmini",
    text: "ETA değiştiğinde kayıt kendi kendine güncellenir; müşteriye verdiğiniz tarih hep güncel kalır.",
  },
  {
    icon: "link",
    title: "İşleme bağlı takip",
    text: "Sefer bilgisi ilgili gümrük dosyasının altında durur. Ayrı bir yerde arama yapmanız gerekmez.",
  },
];

/** Rota çizgisinin yolu — marker konumları da bu eğriye oturuyor */
const ROUTE = "M 88 250 Q 250 300 330 205 T 552 96";

export default function LiveTracking() {
  return (
    <section id="canli-takip" className="bg-white py-20 lg:py-28 dark:bg-brand-navy">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2">
        {/* Sol: anlatım */}
        <div>
          <span className="text-sm font-semibold tracking-wide text-brand-blue uppercase dark:text-brand-sky">
            Canlı Takip
          </span>
          <h2 className="font-brand mt-3 text-3xl font-extrabold text-brand-navy sm:text-4xl dark:text-white">
            "Yük nerede?" sorusuna telefon açmadan cevap
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-text-secondary">
            Konteyner numarasını girin, gerisini sistem takip etsin. Gemi hareket ettikçe konum ve
            varış tahmini kendini günceller — müşteriniz aradığında ekranı açıp okumanız yeterli.
          </p>

          <ul className="mt-9 space-y-6">
            {BULLETS.map((bullet) => (
              <li key={bullet.title} className="flex gap-4">
                <span className="mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue dark:bg-brand-sky/15 dark:text-brand-sky">
                  <span className="material-symbols-outlined text-[20px]">{bullet.icon}</span>
                </span>
                <div>
                  <p className="font-brand font-semibold text-brand-navy dark:text-white">
                    {bullet.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">{bullet.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Sağ: çizim harita + sefer kartı */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-brand-navy/10 dark:border-white/10 dark:bg-background-dark dark:shadow-black/40">
          <div className="relative bg-[#eaf2fb] dark:bg-[#0c1830]">
            <svg
              viewBox="0 0 640 360"
              className="h-auto w-full"
              role="img"
              aria-label="Konteyner rotasını gösteren temsili harita"
            >
              {/* Enlem/boylam ızgarası */}
              <g className="text-brand-navy/10 dark:text-white/10" stroke="currentColor" strokeWidth="1">
                {[60, 120, 180, 240, 300].map((y) => (
                  <line key={`h${y}`} x1="0" y1={y} x2="640" y2={y} />
                ))}
                {[80, 160, 240, 320, 400, 480, 560].map((x) => (
                  <line key={`v${x}`} x1={x} y1="0" x2={x} y2="360" />
                ))}
              </g>

              {/* Temsili kara parçaları — gerçek coğrafya iddiası yok */}
              <g className="text-brand-navy/15 dark:text-white/[0.08]" fill="currentColor">
                <path d="M0 0 H210 Q250 40 220 90 Q180 150 90 140 Q20 130 0 80 Z" />
                <path d="M640 0 H430 Q400 50 450 96 Q520 140 610 110 Q640 96 640 60 Z" />
                <path d="M0 300 Q90 260 190 300 Q260 330 240 360 H0 Z" />
                <path d="M470 250 Q560 220 640 260 V360 H430 Q420 300 470 250 Z" />
              </g>

              {/* Kat edilmiş rota */}
              <path
                d={ROUTE}
                fill="none"
                className="text-brand-blue/35 dark:text-brand-sky/30"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Akan rota çizgisi */}
              <path
                d={ROUTE}
                fill="none"
                className="landing-route-line text-brand-blue dark:text-brand-sky"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="10 14"
              />

              {/* Uğranan limanlar */}
              {[
                { x: 88, y: 250, name: "Shanghai", anchor: "start" },
                { x: 330, y: 205, name: "Singapur", anchor: "middle" },
                { x: 552, y: 96, name: "Ambarlı", anchor: "end" },
              ].map((port) => (
                <g key={port.name}>
                  <circle
                    cx={port.x}
                    cy={port.y}
                    r="6"
                    className="fill-white stroke-brand-blue dark:fill-background-dark dark:stroke-brand-sky"
                    strokeWidth="3"
                  />
                  <text
                    x={port.x}
                    y={port.y - 16}
                    textAnchor={port.anchor}
                    className="fill-brand-navy text-[13px] font-semibold dark:fill-white"
                  >
                    {port.name}
                  </text>
                </g>
              ))}

              {/* Şu anki konum — gemi, işaretçinin üzerinde hafifçe salınıyor */}
              <g>
                <circle
                  cx="452"
                  cy="146"
                  r="10"
                  className="fill-brand-sky/40"
                  style={{ transformOrigin: "452px 146px", animation: "cargo-pulse 2s ease-out infinite" }}
                />
                <circle cx="452" cy="146" r="4.5" className="fill-brand-blue dark:fill-brand-sky" />

                {/* Rota soldan sağa ilerliyor; gemi kıçı sağda çizili olduğu için aynalanıyor */}
                <g className="landing-bob" transform="translate(472 116) scale(-1 1)">
                  {/* Güverte yükü */}
                  <rect x="6" y="6" width="9" height="5" rx="0.8" className="fill-brand-blue dark:fill-brand-sky" />
                  <rect x="17" y="6" width="9" height="5" rx="0.8" className="fill-brand-sky" />
                  <rect x="6" y="1" width="9" height="4" rx="0.8" className="fill-brand-sky" />
                  {/* Köprüüstü */}
                  <rect x="29" y="3" width="8" height="8" rx="1" className="fill-brand-navy dark:fill-white" />
                  {/* Gövde */}
                  <path
                    d="M2 11 H40 L36 18 H6 Z"
                    className="fill-brand-navy dark:fill-white"
                  />
                </g>
              </g>
            </svg>

            {/* Harita üstü rozet */}
            <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-brand-navy shadow-sm backdrop-blur dark:bg-brand-navy/80 dark:text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Canlı
            </span>
          </div>

          {/* Sefer kartı */}
          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-semibold text-text-main">MSKU 481 5520</p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Anadolu Tekstil A.Ş. · IM-2026-0418
                </p>
              </div>
              <span className="rounded-md bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue dark:bg-brand-sky/15 dark:text-brand-sky">
                Yolda
              </span>
            </div>

            <ol className="mt-6 space-y-4">
              {TIMELINE.map((step, i) => (
                <li key={step.label} className="flex gap-4">
                  {/* Zaman çizgisi işaretçisi */}
                  <div className="flex flex-col items-center">
                    <span
                      className={`h-3 w-3 flex-shrink-0 rounded-full ${
                        step.state === "pending"
                          ? "border-2 border-gray-300 bg-transparent dark:border-white/25"
                          : step.state === "active"
                            ? "bg-brand-blue ring-4 ring-brand-blue/20 dark:bg-brand-sky dark:ring-brand-sky/20"
                            : "bg-emerald-500"
                      }`}
                    />
                    {i < TIMELINE.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-gray-200 dark:bg-white/10" />
                    )}
                  </div>

                  <div className="flex-1 pb-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p
                        className={`text-sm font-semibold ${
                          step.state === "pending" ? "text-text-secondary" : "text-text-main"
                        }`}
                      >
                        {step.label}
                      </p>
                      <span className="flex-shrink-0 text-xs text-text-secondary">{step.date}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-secondary">{step.place}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
