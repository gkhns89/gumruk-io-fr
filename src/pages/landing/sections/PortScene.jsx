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
const RAIL_Y = 120; // demiryolu hattı; tren tekerlekleri bu çizgiye oturuyor
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

/* Kamyonet — yerel kutu: y 4..31, genişlik ~66. Tırla aynı açık gövde mantığı:
   koyu yol şeridinde okunabilmesi için kasa açık renk. */
function Van({ className = "" }) {
  return (
    <g className={className}>
      <rect x="0" y="4" width="44" height="22" rx="2" fill="#f1f5f9" />
      <rect x="0" y="4" width="44" height="22" rx="2" fill="none" stroke="#0a1f44" strokeWidth="1.5" />
      <path d="M44 26 V10 h12 l10 9 v7 Z" fill="#1e4fd8" />
      <rect x="47" y="12" width="8" height="6" rx="1" fill="#38bdf8" />
      {[13, 55].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="26" r="5" fill="#0f172a" />
          <circle cx={cx} cy="26" r="1.8" fill="#cbd5e1" />
        </g>
      ))}
    </g>
  );
}

/* Yük treni — yerel kutu: y 6..32, genişlik ~308. Sağdan sola gittiği için lokomotif solda.
   Limanlarda rıhtım boyunca demiryolu hattı bulunur; sahnedeki durgun rıhtım bandını doldurur. */
function FreightTrain({ className = "", wagonCount = 3, compact = false }) {
  const wagons = [78, 158, 238].slice(0, wagonCount);
  const cargo = ["#1e4fd8", "#38bdf8", "#0a1f44"];
  const total = transferCount(rowsFor(compact));

  return (
    <g className={className}>
      {/* Lokomotif */}
      <path d="M2 14 l10 -8 h52 v20 H2 Z" fill="#0a1f44" />
      <rect x="6" y="10" width="12" height="8" rx="1" fill="#38bdf8" opacity="0.85" />
      <rect x="2" y="21" width="62" height="3" fill="#1e4fd8" />
      {[12, 26, 52].map((cx) => (
        <circle key={cx} cx={cx} cy="28" r="4" fill="#0f172a" />
      ))}

      {/* Konteyner vagonları — platform sabit, üzerindeki yük koreografiyle gelip gidiyor */}
      {wagons.map((x, i) => (
        <g key={x}>
          <rect
            className="landing-rail-cargo"
            style={wagonStagger(i, wagons.length, total)}
            x={x + 3}
            y="8"
            width="64"
            height="14"
            rx="1"
            fill={cargo[i]}
            opacity="0"
          />
          <rect x={x} y="22" width="70" height="4" rx="1" fill="#0a1f44" />
          {[x + 12, x + 58].map((cx) => (
            <circle key={cx} cx={cx} cy="28" r="3.5" fill="#0f172a" />
          ))}
        </g>
      ))}
    </g>
  );
}

/**
 * Kargo uçağı — yerel kutu: x 4..100, y 1..31. Burnu sağda, uçuş yönünde.
 *
 * KUŞ BAKIŞI çizim: kanatlar gövdenin iki yanına açılıyor. Bu yüzden dikey stabilize
 * yandan görünümdeki gibi yukarı DİKİLMEZ — yukarıdan bakınca eksen üzerinde ince bir
 * dilim olarak görünür. Önceki çizimde yana bakış mantığıyla dikilmişti ve üçüncü bir
 * kanat gibi duruyordu.
 */
function Plane({ className = "" }) {
  return (
    <g className={className} fill="#1e4fd8">
      {/* Gövde — künt burun sağda, kuyruğa doğru incelir */}
      <path d="M16 12.5 H82 q18 0 18 3.5 t-18 3.5 H16 q-6 0 -6 -3.5 t6 -3.5 Z" />

      {/* Ana kanatlar — geriye ok açılı */}
      <path d="M68 13 L50 1 H40 L58 13 Z" />
      <path d="M68 19 L50 31 H40 L58 19 Z" />

      {/* Kuyruk yüzeyleri — aynı ok açısı, daha küçük */}
      <path d="M28 13 L18 5 H12 L22 13 Z" />
      <path d="M28 19 L18 27 H12 L22 19 Z" />

      {/* Dikey stabilize — kuş bakışında eksen üzerinde dar bir dilim */}
      <path d="M8 16 L26 13.6 v4.8 Z" />

      {/* Kanat motorları */}
      <rect x="50" y="5" width="14" height="4.5" rx="2.25" />
      <rect x="50" y="22.5" width="14" height="4.5" rx="2.25" />
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

/**
 * İstif sıraları. Alt sıra sabit kalır — rıhtım hiçbir anda tamamen boşalmasın diye;
 * üstteki iki sıra trenin koreografisine bağlı.
 */
const YARD_ROWS = {
  wide: [
    { y: 96, count: 6 },
    { y: 82, count: 4, animated: true },
    { y: 68, count: 3, animated: true },
  ],
  // Dar sahnede istif de küçülüyor; 560 birimlik viewBox'ta 6'lı sıra yerin yarısını yer.
  compact: [
    { y: 96, count: 4 },
    { y: 82, count: 3, animated: true },
    { y: 68, count: 2, animated: true },
  ],
};

const rowsFor = (compact) => YARD_ROWS[compact ? "compact" : "wide"];

/** Transfere katılan toplam kutu sayısı */
const transferCount = (rows) =>
  rows.filter((r) => r.animated).reduce((n, r) => n + r.count, 0);

/** Sıralı transfer: negatif gecikme, sonsuz döngüde kalıcı faz kayması verir */
const staggerOf = (i, total) => ({ animationDelay: `${-(total - 1 - i) * 0.6}s` });

/**
 * Vagon yükünün gecikmesi. Vagonlar istifin kutularına eşit aralıkla eşleniyor
 * (geniş: 0-3-6 / dar: 0-4) — yoksa tren, istif boşalmadan dolmuş görünür.
 */
const wagonStagger = (i, wagonCount, total) =>
  staggerOf(Math.round((i * (total - 1)) / Math.max(1, wagonCount - 1)), total);

/**
 * Rıhtımda istiflenmiş konteynerler — yerel taban y=108.
 *
 * `transfer` verilirse EN ÜST SIRA trenin koreografisine bağlanır: "source" trene
 * yüklendikçe boşalır, "dest" tren boşalttıkça dolar. Alt iki sıra her zaman sabit —
 * tren istifin tamamını değil birkaç kutuyu alır, gerçekçi olan da bu.
 *
 * Üst sıra bilerek trenin üst kenarının (y≈94) YUKARISINDA kalıyor; tren istifin önünden
 * geçtiği için alt sıralar duruş sırasında kapanıyor, transfer olan sıra görünür kalıyor.
 */
function ContainerYard({ x, baseline = QUAY, transfer = null, compact = false }) {
  const colors = ["#1e4fd8", "#38bdf8", "#0a1f44", "#1e4fd8", "#0a1f44", "#38bdf8"];
  const transferClass = transfer === "source" ? "landing-rail-src" : "landing-rail-dst";
  const rows = rowsFor(compact);
  const total = transferCount(rows);

  // Gecikme dizini sıralar boyunca sürüyor: alttan üste doğru tek bir sıra hâlinde taşınıyor
  let slot = -1;

  return (
    <g transform={`translate(${x} ${baseline - 108})`}>
      {rows.map((row) =>
        Array.from({ length: row.count }).map((_, i) => {
          const animated = row.animated && transfer;
          if (animated) slot += 1;
          return (
            <rect
              key={`${row.y}-${i}`}
              className={animated ? transferClass : undefined}
              style={animated ? staggerOf(slot, total) : undefined}
              x={i * 26}
              y={row.y}
              width="24"
              height="12"
              rx="1"
              fill={colors[(i + row.y) % colors.length]}
              // Animasyonlu kutuların opaklığını keyframe yönetiyor; "dest" boş başlamalı.
              opacity={animated ? (transfer === "dest" ? 0 : 0.55) : 0.55}
            />
          );
        })
      )}
    </g>
  );
}

/**
 * Tekrarlayan dalga çizgisi.
 *
 * Desenin tam periyodu 180 birim (bir tepe + bir çukur) ve `landing-wave` da tam 180 birim
 * kaydırıyor; bu yüzden döngü dikişsiz. Ancak yol, sahne genişliğine ek olarak SOLDA ve
 * SAĞDA birer periyot pay bırakacak kadar uzun olmalı: sola kayma ilerledikçe sağ uçtaki
 * dalga sahnenin içine giriyor ve deniz boş kalıyor.
 */
const WAVE_HALF = 90; // yarım periyot
const WAVE_LEAD = 180; // iki uçtaki pay

function WaveLine({ y, width = 1440, opacity = 1 }) {
  const segments = Math.ceil((width + WAVE_LEAD * 2) / WAVE_HALF);
  const d = `M${-WAVE_LEAD} ${y} q 45 -8 90 0 ` + `t 90 0 `.repeat(segments - 1);
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

/**
 * Sıralı yükleme: negatif gecikme, sonsuz döngüde kalıcı faz kayması verir.
 * 1,2 sn aralık, 5 konteyner → ~4,8 sn'lik yayılım; 10 sn'lik liman duruşuna oturuyor.
 * Değer değişirse `index.css`'teki landing-cargo-* yüzdeleri de kaydırılmalı.
 */
const stagger = (i) => ({ animationDelay: `${-(CARGO_SLOTS.length - 1 - i) * 1.2}s` });

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

      {/* Sol istif — gemiye yüklendikçe boşalır.
          x=215: ikinci vincin ayakları x≈201'de bitiyor, istif onun önünde kalmasın. */}
      <g fill="currentColor" opacity="0.75">
        {yardSlots(215).map((slot, i) => (
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
        {yardSlots(1058).map((slot, i) => (
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
          <WaveLine y={WATER_S + 2} width={1200} />
        </g>
      </g>

      {/* Gemi — hareket dışta, konum içte; sağa gittiği için aynalı.
          Su hattı (yerel y=31) sahnede WATER_S'e denk gelir.
          Temel konum = yükleme duruşu: gemi (x≈60..160) sol vinçlerin (x 40..201)
          tam hizasında duruyor; `landing-berth` bu noktaya göre öteliyor. */}
      <g className="landing-berth">
        {/* `landing-bob-amp` yalnızca --bob-amp özel özelliğini canlandırır (transform'a
            dokunmaz), alttaki salınım bu çarpanı miras alır: limanda sönümlenir,
            seferde artar. */}
        <g
          className="landing-bob-amp"
          transform={`translate(162 ${WATER_S - 31 * 0.55}) scale(-0.55 0.55)`}
          fill="currentColor"
        >
          <g className="landing-bob-deep">
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
          <WaveLine y={WATER_S + 8} width={1200} />
          <WaveLine y={WATER_S + 18} width={1200} opacity={0.6} />
        </g>
      </g>
    </svg>
  );
}

/**
 * Sahnenin iki yerleşimi.
 *
 * Geniş sürüm 1440 birim; dar ekranda `slice` ile kırpıldığında yalnızca ortadaki ~600
 * birim görünüyordu ve trenin yükleme durağı (x≈1010) tamamen ekran dışında kalıyordu.
 * Dar sürüm bu yüzden ayrı: 560 birimlik viewBox, kısaltılmış tren, birbirine yakın
 * istifler — koreografinin tamamı 375 piksellik ekranda da görünüyor.
 *
 * Hareket mesafeleri JSX'te değil, `index.css`'teki `.landing-scene-compact`
 * değişkenlerinde; iki sürüm aynı keyframe'leri paylaşıyor.
 */
const LAYOUTS = {
  wide: {
    width: 1440,
    cranes: [
      { x: 40, scale: 0.95, opacity: 0.75 },
      { x: 196, scale: 1.1 },
      { x: 1180, scale: 0.85, opacity: 0.6 },
    ],
    destYard: 360,
    sourceYard: 1010,
    wagonCount: 3,
  },
  compact: {
    width: 560,
    cranes: [
      { x: 8, scale: 0.7, opacity: 0.8 },
      { x: 205, scale: 0.85 },
      { x: 478, scale: 0.6, opacity: 0.6 },
    ],
    destYard: 105,
    sourceYard: 360,
    wagonCount: 2,
  },
};

function Scene({ compact = false }) {
  const L = LAYOUTS[compact ? "compact" : "wide"];
  const W = L.width;

  return (
    <svg
      viewBox={`0 0 ${W} ${SCENE_H}`}
      className={
        compact
          ? "landing-scene landing-scene-compact h-auto w-full sm:hidden"
          : "landing-scene hidden h-[190px] w-full sm:block lg:h-[240px]"
      }
      // Dar sürümde `meet`: sahnenin tamamı görünmeli, kırpma yok.
      preserveAspectRatio={compact ? "xMidYMax meet" : "xMidYMax slice"}
    >
      {/* --- Rıhtım zemini: vinçlerin ve trenin üzerinde durduğu şerit --- */}
      <rect
        x="0"
        y={RAIL_Y - 22}
        width={W}
        height={QUAY - (RAIL_Y - 22)}
        className="fill-brand-navy/[0.07] dark:fill-white/[0.05]"
      />

      {/* --- Rıhtım: vinçler ve istif, hepsi QUAY hattına oturuyor --- */}
      <g className="text-brand-navy/25 dark:text-white/15">
        {L.cranes.map((c) => (
          <GantryCrane key={c.x} x={c.x} scale={c.scale} opacity={c.opacity ?? 1} />
        ))}
      </g>

      {/* Demiryolu hattı — travers + iki ray */}
      <g className="text-brand-navy/30 dark:text-white/20" stroke="currentColor">
        <line
          x1="0"
          y1={RAIL_Y + 1.5}
          x2={W}
          y2={RAIL_Y + 1.5}
          strokeWidth="4"
          strokeDasharray="4 11"
          opacity="0.55"
        />
        <line x1="0" y1={RAIL_Y} x2={W} y2={RAIL_Y} strokeWidth="1.5" />
        <line x1="0" y1={RAIL_Y + 3} x2={W} y2={RAIL_Y + 3} strokeWidth="1.5" />
      </g>

      {/* Tren — istiflerin ARKASINDAN geçiyor.
          Yükleme sırasında öndeki istif eriyip arkasındaki dolu vagonları ortaya
          çıkarıyor; boşaltmada da kutular trenin önünde birikiyor. */}
      <g className="landing-train">
        <g transform={`translate(0 ${RAIL_Y - 32})`}>
          <FreightTrain wagonCount={L.wagonCount} compact={compact} />
        </g>
      </g>

      {/* İstifler trenin ÖNÜNDE. Sağdaki trene yükleniyor, soldaki tren boşalttıkça
          doluyor — tren sağdan geldiği için kaynak sağda, hedef solda. */}
      <ContainerYard x={L.destYard} transfer="dest" compact={compact} />
      <ContainerYard x={L.sourceYard} transfer="source" compact={compact} />

      {/* --- Gökyüzü ---
          Vinç bomları sahnenin en üstüne kadar uzanıyor; uçak daha önce çizilseydi
          (ve öyleydi) onların arkasında kalıp kırpılmış gibi görünüyordu. Rıhtım
          yapılarından SONRA çiziliyor ki önlerinden geçsin. */}
      <g className="landing-plane">
        {/* Tam opak: saydam bırakılırsa arkasındaki vinç içinden görünüyor. */}
        <Plane />
      </g>

      {/* --- Deniz --- */}
      <rect
        x="0"
        y={SEA_TOP}
        width={W}
        height={ROAD_TOP - SEA_TOP}
        className="fill-brand-sky/20 dark:fill-brand-sky/10"
      />
      {/* Ufuk çizgisi — su hattının nerede başladığı okunsun */}
      <line
        x1="0"
        y1={SEA_TOP}
        x2={W}
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
          <WaveLine y={162} width={W} opacity={0.7} />
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
          <WaveLine y={194} width={W} />
          <WaveLine y={204} width={W} opacity={0.7} />
        </g>
      </g>

      {/* --- Ön plandaki rıhtım yolu --- */}
      <rect
        x="0"
        y={ROAD_TOP}
        width={W}
        height={SCENE_H - ROAD_TOP}
        className="fill-brand-navy/85 dark:fill-white/10"
      />
      {/* Şerit çizgisi — açık modda lacivert asfaltın üzerinde net okunmalı */}
      <g className="text-white/70 dark:text-white/40" stroke="currentColor" strokeWidth="3" strokeDasharray="26 22">
        <line x1="0" y1="227" x2={W} y2="227" />
      </g>

      {/* Kamyonet — tırla aynı şeritte, tekerlekleri aynı hizada ama daha yavaş */}
      <g className="landing-van">
        <g transform="translate(0 200)">
          <Van />
        </g>
      </g>

      {/* Tır — tekerlekler (yerel y=34) yol şeridine oturuyor */}
      <g className="landing-truck">
        <g transform="translate(0 197)">
          <Truck />
        </g>
      </g>
    </svg>
  );
}

export default function PortScene() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative w-full select-none">
      <Scene compact />
      <Scene />
    </div>
  );
}
