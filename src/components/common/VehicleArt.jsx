/**
 * Konteyner gemisi ve kargo uçağı çizimleri — tanıtım sayfasındaki liman
 * sahnesi ile canlı takip haritasının paylaştığı tek kaynak.
 *
 * Buraya taşınmadan önce ikisi de PortScene içinde yerel bileşendi; harita da
 * aynı araçları kullanmaya başlayınca kopyalamak yerine ortaklaştırıldı, yoksa
 * biri güncellenince diğeri geride kalırdı.
 *
 * İkisi de yalnızca `<g>` döndürür, kendi `<svg>`'sini açmaz — çağıran taraf
 * viewBox'ı ve konumlandırmayı kendi sahnesine göre yapar.
 *
 * DİKKAT (PortScene'den taşınan kural): CSS `transform` animasyonu, SVG'nin
 * `transform` ATTRIBUTE'unu tamamen ezer. Bu yüzden animasyonlu grupta asla
 * `transform="..."` bulunmaz; konumlandırma her zaman bir iç grupta yapılır.
 *
 * Yön farkı önemli:
 *   ContainerShip → YANDAN profil. Haritada döndürülmez; yalnızca gidiş yönüne
 *                   göre yatay aynalanır.
 *   Plane         → KUŞ BAKIŞI, burun sağa bakar. Haritada rotaya göre
 *                   döndürülebilir.
 */

/* Konteyner gemisi — yerel kutu: y 11..66, genişlik ~190 */
export function ContainerShip({ className = "" }) {
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

/**
 * Kargo uçağı — yerel kutu: x 4..100, y 1..31. Burnu sağda, uçuş yönünde.
 *
 * KUŞ BAKIŞI çizim: kanatlar gövdenin iki yanına açılıyor. Bu yüzden dikey stabilize
 * yandan görünümdeki gibi yukarı DİKİLMEZ — yukarıdan bakınca eksen üzerinde ince bir
 * dilim olarak görünür. Önceki çizimde yana bakış mantığıyla dikilmişti ve üçüncü bir
 * kanat gibi duruyordu.
 */
export function Plane({ className = "" }) {
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
