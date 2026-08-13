import React from "react";

/**
 * Tanıtım sayfasının dekoratif liman sahnesi.
 *
 * Tamamı inline SVG — dış görsel, harita kütüphanesi ya da ağ isteği yok.
 * Hareketler `index.css` içindeki `landing-*` keyframe'leriyle veriliyor ve
 * `prefers-reduced-motion: reduce` altında kapanıyor.
 *
 * NOT: Kamyon ve uçak burada tamamen dekoratiftir. Sistem konteyner/deniz seferini takip eder;
 * kara ve hava için canlı takip iddiası taşımaz, bu yüzden hiçbirine etiket/başlık verilmiyor.
 */

/* Konteyner gemisi — yaklaşık 210x74 birim */
function ContainerShip({ className = "" }) {
  const stacks = [
    { x: 18, colors: ["#1e4fd8", "#38bdf8", "#0a1f44"] },
    { x: 42, colors: ["#38bdf8", "#0a1f44"] },
    { x: 66, colors: ["#0a1f44", "#1e4fd8", "#38bdf8"] },
    { x: 90, colors: ["#1e4fd8", "#0a1f44"] },
    { x: 114, colors: ["#38bdf8", "#1e4fd8", "#0a1f44"] },
  ];

  return (
    <g className={className}>
      {/* Güverte yükü */}
      {stacks.map((stack) =>
        stack.colors.map((color, i) => (
          <rect
            key={`${stack.x}-${i}`}
            x={stack.x}
            y={44 - (i + 1) * 11}
            width="21"
            height="9"
            rx="1"
            fill={color}
            opacity="0.9"
          />
        ))
      )}

      {/* Köprüüstü ve baca */}
      <rect x="146" y="24" width="26" height="20" rx="2" fill="#0a1f44" />
      <rect x="150" y="28" width="5" height="5" fill="#38bdf8" opacity="0.8" />
      <rect x="159" y="28" width="5" height="5" fill="#38bdf8" opacity="0.8" />
      <rect x="155" y="12" width="9" height="13" rx="1.5" fill="#1e4fd8" />

      {/* Gövde */}
      <path d="M4 44 H186 L172 66 H16 Z" fill="#0a1f44" />
      <path d="M4 44 H186 L184 50 H6 Z" fill="#1e4fd8" opacity="0.65" />
    </g>
  );
}

/* Tır — yaklaşık 118x36 birim */
function Truck({ className = "" }) {
  return (
    <g className={className}>
      {/* Dorse */}
      <rect x="0" y="2" width="74" height="24" rx="2" fill="#0a1f44" />
      <rect x="5" y="7" width="64" height="3" fill="#1e4fd8" opacity="0.5" />
      {/* Çekici */}
      <path d="M78 26 V10 h14 l10 10 v6 Z" fill="#1e4fd8" />
      <rect x="82" y="12" width="9" height="7" rx="1" fill="#38bdf8" opacity="0.85" />
      {/* Tekerlekler */}
      <circle cx="16" cy="28" r="5.5" fill="#0a1f44" />
      <circle cx="30" cy="28" r="5.5" fill="#0a1f44" />
      <circle cx="90" cy="28" r="5.5" fill="#0a1f44" />
    </g>
  );
}

/* Kargo uçağı — yaklaşık 78x26 birim */
function Plane({ className = "" }) {
  return (
    <g className={className}>
      <path d="M2 13 L46 8 L62 2 h8 l-6 11 h10 l6 -4 h5 l-4 6 l4 6 h-5 l-6 -4 h-10 l6 11 h-8 l-16 -6 Z" fill="#1e4fd8" />
    </g>
  );
}

/* Liman vinci — yaklaşık 120x120 birim */
function GantryCrane({ x, scale = 1, opacity = 1 }) {
  return (
    <g transform={`translate(${x} 0) scale(${scale})`} opacity={opacity}>
      {/* Ayaklar */}
      <path d="M10 122 L22 42 h6 L20 122 Z" fill="currentColor" />
      <path d="M86 122 L74 42 h6 L96 122 Z" fill="currentColor" />
      {/* Kiriş */}
      <rect x="12" y="34" width="76" height="8" rx="2" fill="currentColor" />
      {/* Bom */}
      <path d="M88 34 h34 v7 h-34 Z" fill="currentColor" />
      <path d="M12 34 L2 22 h6 l8 12 Z" fill="currentColor" />
      {/* Makara */}
      <rect x="98" y="41" width="4" height="18" fill="currentColor" />
      <rect x="92" y="59" width="16" height="7" rx="1" fill="currentColor" />
    </g>
  );
}

/* Rıhtımda istiflenmiş konteynerler */
function ContainerYard({ x }) {
  const rows = [
    { y: 96, count: 6 },
    { y: 82, count: 4 },
    { y: 68, count: 2 },
  ];
  const colors = ["#1e4fd8", "#38bdf8", "#0a1f44", "#1e4fd8", "#0a1f44", "#38bdf8"];

  return (
    <g transform={`translate(${x} 0)`}>
      {rows.map((row) =>
        Array.from({ length: row.count }).map((_, i) => (
          <rect
            key={`${row.y}-${i}`}
            x={i * 26}
            y={row.y}
            width="24"
            height="12"
            rx="1"
            fill={colors[(i + row.y) % colors.length]}
            opacity="0.55"
          />
        ))
      )}
    </g>
  );
}

/**
 * İnce siluet şeridi — koyu zeminli CTA bandının altında kullanılır.
 * Tek renk (currentColor), sahnenin sade hali.
 */
export function PortSilhouette({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 130"
      preserveAspectRatio="xMidYMax slice"
      className={`pointer-events-none h-24 w-full select-none sm:h-32 ${className}`}
    >
      <g fill="currentColor">
        <GantryCrane x={60} scale={0.62} opacity={0.9} />
        <GantryCrane x={150} scale={0.5} opacity={0.65} />
        <GantryCrane x={980} scale={0.55} opacity={0.7} />
      </g>

      {/* İstif */}
      <g fill="currentColor" opacity="0.75">
        {[0, 1, 2, 3].map((i) => (
          <rect key={`a${i}`} x={250 + i * 22} y="98" width="20" height="10" rx="1" />
        ))}
        {[0, 1].map((i) => (
          <rect key={`b${i}`} x={272 + i * 22} y="86" width="20" height="10" rx="1" />
        ))}
      </g>

      {/* Sefer halindeki gemi */}
      <g className="landing-ship" transform="translate(0 34) scale(0.62)">
        <g className="landing-bob" fill="currentColor">
          <rect x="18" y="22" width="21" height="9" rx="1" />
          <rect x="42" y="22" width="21" height="9" rx="1" />
          <rect x="66" y="22" width="21" height="9" rx="1" />
          <rect x="30" y="11" width="21" height="9" rx="1" />
          <rect x="146" y="4" width="26" height="27" rx="2" />
          <path d="M4 31 H186 L172 53 H16 Z" />
        </g>
      </g>

      {/* Su hattı */}
      <g stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" opacity="0.5">
        <g className="landing-wave">
          <path d="M-180 118 q 45 -8 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0" />
        </g>
      </g>
    </svg>
  );
}

export default function PortScene() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative w-full select-none">
      {/* Dar ekranda oran korunursa sahne 60 piksellik şeride iner; yükseklik sabit,
          `slice` ile yanlar kırpılıyor — gemi ve tır görünür boyutta kalıyor. */}
      <svg
        viewBox="0 0 1440 240"
        className="h-[150px] w-full sm:h-[190px] lg:h-[240px]"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* Gökyüzü — uçak buradan geçiyor */}
        <g className="landing-plane">
          <Plane className="opacity-60" />
        </g>

        {/* Rıhtım: vinçler ve konteyner sahası */}
        <g className="text-brand-navy/25 dark:text-white/15">
          <GantryCrane x={40} scale={0.95} opacity={0.75} />
          <GantryCrane x={196} scale={1.1} />
          <GantryCrane x={1180} scale={0.85} opacity={0.6} />
        </g>
        <ContainerYard x={360} />
        <ContainerYard x={1010} />

        {/* Deniz */}
        <rect x="0" y="150" width="1440" height="90" className="fill-brand-sky/15 dark:fill-brand-sky/10" />

        {/* Uzaktaki gemi — ters yönde, daha küçük ve soluk */}
        <g className="landing-ship-back" transform="translate(0 -4)">
          <g transform="scale(0.55)" opacity="0.35">
            <ContainerShip className="landing-bob" />
          </g>
        </g>

        {/* Ön plandaki gemi */}
        <g className="landing-ship" transform="translate(0 96)">
          <ContainerShip className="landing-bob" />
        </g>

        {/* Dalga çizgileri — desen viewBox'tan geniş, kaydıkça sonsuz görünür */}
        <g className="text-brand-blue/25 dark:text-brand-sky/20" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round">
          <g className="landing-wave">
            <path d="M-180 196 q 45 -9 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0" />
            <path d="M-180 216 q 45 -9 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0 t 90 0" opacity="0.6" />
          </g>
        </g>

        {/* Ön plandaki rıhtım yolu — tır burada ilerliyor */}
        <rect x="0" y="212" width="1440" height="28" className="fill-brand-navy/85 dark:fill-white/10" />
        <g className="text-white/30" stroke="currentColor" strokeWidth="3" strokeDasharray="26 22">
          <line x1="0" y1="226" x2="1440" y2="226" />
        </g>
        <g className="landing-truck" transform="translate(0 184)">
          <Truck />
        </g>
      </svg>
    </div>
  );
}
