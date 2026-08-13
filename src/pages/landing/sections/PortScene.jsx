import React from "react";

/**
 * Tanıtım sayfasının dekoratif liman sahnesi.
 *
 * Tamamı inline SVG — dış görsel, harita kütüphanesi ya da ağ isteği yok.
 * Hareketler `index.css` içindeki `landing-*` keyframe'leriyle veriliyor ve
 * `prefers-reduced-motion: reduce` altında kapanıyor.
 *
 * DİKKAT: CSS `transform` animasyonu, SVG'nin `transform` ATTRIBUTE'unu tamamen ezer.
 * Bu yüzden hareketli grupta asla `transform="..."` bulunmaz; konumlandırma her zaman
 * bir iç grupta yapılır:
 *     <g className="landing-ship">            ← yalnızca animasyon
 *       <g transform="translate(0 138)">      ← yalnızca konum
 * Aksi halde tüm taşıtlar y=0'a yığılır.
 *
 * NOT: Kamyon ve uçak burada tamamen dekoratiftir. Sistem konteyner/deniz seferini takip eder;
 * kara ve hava için canlı takip iddiası taşımaz, bu yüzden hiçbirine etiket/başlık verilmiyor.
 */

/* Sahnenin dikey düzeni (viewBox birimi) */
const QUAY = 124; // rıhtım hattı — vinçler ve istif burada duruyor
const SEA_TOP = 124;
const ROAD_TOP = 210;
const SCENE_H = 240;

/* Konteyner gemisi — yerel kutu: y 11..66, genişlik ~190 */
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

      {/* Gövde — su hattı y=44 */}
      <path d="M4 44 H186 L172 66 H16 Z" fill="#0a1f44" />
      <path d="M4 44 H186 L184 50 H6 Z" fill="#1e4fd8" opacity="0.65" />
    </g>
  );
}

/* Tır — yerel kutu: y 2..34, genişlik ~102.
   Yol şeridi lacivert olduğu için dorse açık renk: koyu dorse zeminde kayboluyordu. */
function Truck({ className = "" }) {
  return (
    <g className={className}>
      {/* Dorse */}
      <rect x="0" y="2" width="74" height="24" rx="2" fill="#f1f5f9" />
      <rect x="0" y="2" width="74" height="24" rx="2" fill="none" stroke="#0a1f44" strokeWidth="1.5" />
      <rect x="5" y="9" width="64" height="4" rx="1" fill="#1e4fd8" opacity="0.75" />
      {/* Çekici */}
      <path d="M78 26 V10 h14 l10 10 v6 Z" fill="#1e4fd8" />
      <rect x="82" y="12" width="9" height="7" rx="1" fill="#38bdf8" />
      {/* Tekerlekler — alt kenar y=34, göbek açık renk ki koyu zeminde okunsun */}
      {[16, 30, 90].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="28" r="5.5" fill="#0f172a" />
          <circle cx={cx} cy="28" r="2" fill="#cbd5e1" />
        </g>
      ))}
    </g>
  );
}

/* Kargo uçağı — yerel kutu: y 2..24.
   Gövde solda burunlu çizildi; uçuş yönü sağa olduğu için yatay aynalanıyor. */
function Plane({ className = "" }) {
  return (
    <g className={className}>
      <g transform="translate(87 0) scale(-1 1)">
        <path
          d="M2 13 L46 8 L62 2 h8 l-6 11 h10 l6 -4 h5 l-4 6 l4 6 h-5 l-6 -4 h-10 l6 11 h-8 l-16 -6 Z"
          fill="#1e4fd8"
        />
      </g>
    </g>
  );
}

/* Liman vinci — yerel ayak tabanı y=122, ölçeklenince rıhtıma oturtulur */
function GantryCrane({ x, scale = 1, opacity = 1, baseline = QUAY }) {
  return (
    <g transform={`translate(${x} ${baseline - 122 * scale}) scale(${scale})`} opacity={opacity}>
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

/* Rıhtımda istiflenmiş konteynerler — yerel taban y=108 */
function ContainerYard({ x, baseline = QUAY }) {
  const rows = [
    { y: 96, count: 6 },
    { y: 82, count: 4 },
    { y: 68, count: 2 },
  ];
  const colors = ["#1e4fd8", "#38bdf8", "#0a1f44", "#1e4fd8", "#0a1f44", "#38bdf8"];

  return (
    <g transform={`translate(${x} ${baseline - 108})`}>
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

/* Tekrarlayan dalga çizgisi — viewBox'tan geniş, kaydıkça sonsuz görünür */
function WaveLine({ y, opacity = 1 }) {
  const d = `M-180 ${y} ` + "q 45 -8 90 0 t 90 0 ".repeat(1) + "t 90 0 ".repeat(16);
  return <path d={d} opacity={opacity} />;
}

/* --- İletişim bandındaki sahnenin yerleşimi --- */

const QUAY_S = 100; // siluet sahnesindeki rıhtım hattı
const WATER_S = 110; // su hattı

/** Geminin güvertesindeki yük gözleri (gemi yerel koordinatı, aynalamadan önce) */
const CARGO_SLOTS = [
  { x: 90, y: 22 },
  { x: 66, y: 22 },
  { x: 42, y: 22 },
  { x: 18, y: 22 },
  { x: 42, y: 11 },
];

/** Rıhtım istifi — 3 alt + 2 üst */
const yardSlots = (originX) => [
  { x: originX, y: 90 },
  { x: originX + 22, y: 90 },
  { x: originX + 44, y: 90 },
  { x: originX + 11, y: 78 },
  { x: originX + 33, y: 78 },
];

/** Sıralı yükleme: negatif gecikme, sonsuz döngüde kalıcı faz kayması verir */
const stagger = (i) => ({ animationDelay: `${-(CARGO_SLOTS.length - 1 - i) * 0.4}s` });

/**
 * İnce siluet şeridi — koyu zeminli CTA bandının altında kullanılır.
 * Tek renk (currentColor).
 *
 * Döngü (36 sn, tamamı `index.css`'teki keyframe'lerde):
 *   boş gemi girer → sol rıhtımda yüklenir → sağ vince yanaşır → boşaltır → sahneden çıkar.
 * Azaltılmış hareket tercihinde animasyonlar kapanır ve sahne "gemi sol rıhtımda yüklü
 * bekliyor" halinde donar; bu yüzden geminin duruş noktası aynı zamanda temel konumdur.
 */
export function PortSilhouette({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 130"
      /* `meet`: sahnenin tamamı görünmeli — `slice` dar kartlarda sağdaki boşaltma
         vincini kırpıyor ve koreografinin yarısı ekran dışında kalıyordu. */
      preserveAspectRatio="xMidYMax meet"
      className={`pointer-events-none h-24 w-full select-none sm:h-32 ${className}`}
    >
      {/* Sol rıhtım: vinçler */}
      <g fill="currentColor">
        <GantryCrane x={40} scale={0.62} opacity={0.9} baseline={QUAY_S} />
        <GantryCrane x={140} scale={0.5} opacity={0.65} baseline={QUAY_S} />
        {/* Sağ rıhtımdaki boşaltma vinci */}
        <GantryCrane x={950} scale={0.6} opacity={0.8} baseline={QUAY_S} />
      </g>

      {/* Sol istif — gemiye yüklendikçe boşalır */}
      <g fill="currentColor" opacity="0.75">
        {yardSlots(200).map((slot, i) => (
          <rect
            key={`src${i}`}
            className="landing-cargo-yard"
            style={stagger(i)}
            x={slot.x}
            y={slot.y}
            width="20"
            height="10"
            rx="1"
          />
        ))}
      </g>

      {/* Sağ istif — gemi boşalttıkça dolar */}
      <g fill="currentColor" opacity="0.75">
        {yardSlots(1020).map((slot, i) => (
          <rect
            key={`dst${i}`}
            className="landing-cargo-dest"
            style={stagger(i)}
            x={slot.x}
            y={slot.y}
            width="20"
            height="10"
            rx="1"
            /* Animasyon kapalıyken (azaltılmış hareket) sağ istif boş görünsün;
               keyframe'deki CSS opacity bu sunum niteliğini zaten ezer. */
            opacity="0"
          />
        ))}
      </g>

      {/* Arka dalga — geminin gerisinde */}
      <g stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" opacity="0.35">
        <g className="landing-wave">
          <WaveLine y={WATER_S + 2} />
        </g>
      </g>

      {/* Gemi — hareket dışta, konum içte; sağa gittiği için aynalı.
          Su hattı (yerel y=31) sahnede WATER_S'e denk gelir. */}
      <g className="landing-berth">
        <g transform={`translate(368 ${WATER_S - 31 * 0.55}) scale(-0.55 0.55)`} fill="currentColor">
          <g className="landing-bob">
            {/* Güverte yükü — sırayla yüklenip boşalıyor */}
            {CARGO_SLOTS.map((slot, i) => (
              <rect
                key={`hold${i}`}
                className="landing-cargo-ship"
                style={stagger(i)}
                x={slot.x}
                y={slot.y}
                width="21"
                height="9"
                rx="1"
              />
            ))}
            {/* Köprüüstü ve gövde — her zaman görünür */}
            <rect x="146" y="4" width="26" height="27" rx="2" />
            <path d="M4 31 H186 L172 53 H16 Z" />
          </g>
        </g>
      </g>

      {/* Ön dalgalar — GEMİDEN SONRA çiziliyor ki gövdenin önünden geçsinler */}
      <g stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" opacity="0.55">
        <g className="landing-wave">
          <WaveLine y={WATER_S + 8} />
          <WaveLine y={WATER_S + 18} opacity={0.6} />
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
        viewBox={`0 0 1440 ${SCENE_H}`}
        className="h-[150px] w-full sm:h-[190px] lg:h-[240px]"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* --- Gökyüzü --- */}
        <g className="landing-plane">
          <Plane className="opacity-60" />
        </g>

        {/* --- Rıhtım: vinçler ve istif, hepsi QUAY hattına oturuyor --- */}
        <g className="text-brand-navy/25 dark:text-white/15">
          <GantryCrane x={40} scale={0.95} opacity={0.75} />
          <GantryCrane x={196} scale={1.1} />
          <GantryCrane x={1180} scale={0.85} opacity={0.6} />
        </g>
        <ContainerYard x={360} />
        <ContainerYard x={1010} />

        {/* --- Deniz --- */}
        <rect
          x="0"
          y={SEA_TOP}
          width="1440"
          height={ROAD_TOP - SEA_TOP}
          className="fill-brand-sky/20 dark:fill-brand-sky/10"
        />
        {/* Ufuk çizgisi — su hattının nerede başladığı okunsun */}
        <line
          x1="0"
          y1={SEA_TOP}
          x2="1440"
          y2={SEA_TOP}
          className="text-brand-blue/30 dark:text-brand-sky/25"
          stroke="currentColor"
          strokeWidth="2"
        />

        {/* Uzaktaki gemi — ters yönde, küçük ve soluk (derinlik) */}
        <g className="landing-ship-back">
          <g transform="translate(0 116) scale(0.55)" opacity="0.35">
            <ContainerShip className="landing-bob" />
          </g>
        </g>

        {/* Arka dalgalar — ufka yakın, gemilerin gerisinde */}
        <g
          className="text-brand-blue/25 dark:text-brand-sky/20"
          stroke="currentColor"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <g className="landing-wave">
            <WaveLine y={162} opacity={0.7} />
          </g>
        </g>

        {/* Ön plandaki gemi — su hattı (yerel y=44) sahnede y=186'ya denk gelir.
            Köprüüstü kıçta çizili, yani gemi sola bakıyor; sağa gittiği için aynalanıyor. */}
        <g className="landing-ship">
          <g transform="translate(190 142) scale(-1 1)">
            <ContainerShip className="landing-bob" />
          </g>
        </g>

        {/* Ön dalgalar — GEMİDEN SONRA çiziliyor ki gövdenin önünden geçsinler.
            Hepsi geminin arkasında kalırsa gemi suyun üstünde uçuyormuş gibi durur. */}
        <g
          className="text-brand-blue/35 dark:text-brand-sky/25"
          stroke="currentColor"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <g className="landing-wave">
            <WaveLine y={194} />
            <WaveLine y={204} opacity={0.7} />
          </g>
        </g>

        {/* --- Ön plandaki rıhtım yolu --- */}
        <rect
          x="0"
          y={ROAD_TOP}
          width="1440"
          height={SCENE_H - ROAD_TOP}
          className="fill-brand-navy/85 dark:fill-white/10"
        />
        <g className="text-white/30" stroke="currentColor" strokeWidth="3" strokeDasharray="26 22">
          <line x1="0" y1="227" x2="1440" y2="227" />
        </g>

        {/* Tır — tekerlekler (yerel y=34) yol şeridine oturuyor */}
        <g className="landing-truck">
          <g transform="translate(0 197)">
            <Truck />
          </g>
        </g>
      </svg>
    </div>
  );
}
