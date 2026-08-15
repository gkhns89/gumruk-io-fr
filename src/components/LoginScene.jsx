import React from "react";

/**
 * Giriş ekranındaki ince dekoratif şerit — bir tırın gümrük bariyerinden geçişi.
 *
 * Tamamı inline SVG; dış görsel ya da ağ isteği yok. Hareketler `index.css` içindeki
 * `login-*` keyframe'leriyle veriliyor ve `prefers-reduced-motion: reduce` altında kapanıyor.
 *
 * DİKKAT (PortScene ile aynı tuzak): CSS `transform` animasyonu, SVG'nin `transform`
 * ATTRIBUTE'unu tamamen ezer. Bu yüzden hareketli grupta asla `transform="..."` bulunmaz;
 * konumlandırma her zaman bir iç grupta yapılır.
 *
 * Tamamen dekoratiftir, ekran okuyuculardan gizlenir.
 */
export default function LoginScene() {
  return (
    <svg
      viewBox="0 0 320 44"
      className="w-full max-w-xs h-11 text-brand-navy/35 dark:text-white/25"
      aria-hidden="true"
      focusable="false"
    >
      {/* Yol çizgisi — kesikler akar */}
      <line
        className="login-road"
        x1="0"
        y1="35"
        x2="320"
        y2="35"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="7 9"
        strokeLinecap="round"
      />

      {/* Gümrük noktası: direk + kalkan bariyer kolu */}
      <g transform="translate(236 13)">
        <rect x="-3" y="0" width="6" height="22" rx="2" fill="currentColor" opacity="0.5" />
        {/* Uyarı lambası */}
        <circle className="login-lamp" cx="0" cy="-3" r="2.4" fill="#38bdf8" />
        {/* Kol: sol ucundan döner (transform-box: fill-box) */}
        <rect
          className="login-gate"
          x="0"
          y="7"
          width="44"
          height="3.5"
          rx="1.75"
          fill="#1e4fd8"
        />
      </g>

      {/* Tır — dış grup yalnızca animasyon, iç grup yalnızca konum */}
      <g className="login-truck">
        <g transform="translate(0 13)">
          {/* Dorse */}
          <rect x="0" y="2" width="34" height="16" rx="2" fill="#38bdf8" />
          <rect x="4" y="6" width="26" height="2" rx="1" fill="#0a1f44" opacity="0.25" />
          {/* Çekici */}
          <path d="M36 8h8l6 6v4h-14z" fill="#1e4fd8" />
          <rect x="38" y="9" width="6" height="4" rx="1" fill="#e0f2fe" opacity="0.9" />
          {/* Tekerlekler */}
          <circle cx="9" cy="20" r="3" fill="#0a1f44" />
          <circle cx="27" cy="20" r="3" fill="#0a1f44" />
          <circle cx="45" cy="20" r="3" fill="#0a1f44" />
        </g>
      </g>
    </svg>
  );
}
