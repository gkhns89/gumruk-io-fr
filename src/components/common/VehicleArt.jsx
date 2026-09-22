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

  // Güverte yükü düz bir listeye açılıyor: her konteynerin sıra numarası
  // `--container-index` olarak veriliyor. Tanıtım sahnesi bunu görmezden
  // geliyor; harita işaretçisi yükleme animasyonunda kutuları tek tek
  // belirtmek için kullanıyor (bkz. .gradar-marker--loading).
  const containers = stacks.flatMap((stack) =>
    stack.colors.map((color, i) => ({ x: stack.x, level: i, color })),
  );

  return (
    <g className={className}>
      {/* Güverte yükü */}
      {containers.map((container, index) => (
        <rect
          key={`${container.x}-${container.level}`}
          className="vehicle-art__container"
          style={{ '--container-index': index }}
          x={container.x}
          y={44 - (container.level + 1) * 11}
          width="21"
          height="9"
          rx="1"
          fill={container.color}
          opacity="0.9"
        />
      ))}

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
 * Kargo uçağı — yerel kutu: x 12..96, y 10..82. Burnu sağda, uçuş yönünde.
 *
 * KUŞ BAKIŞI çizim. Kutu bilerek **neredeyse kare**: gerçek bir yolcu/kargo jetinde kanat
 * açıklığı gövde uzunluğuna yakındır ve siluetin "uçak" okunmasını sağlayan şey büyük ölçüde
 * bu orandır. Önceki hâli 104×32'lik yassı bir kutuya sıkıştığı için önce roket, kutu
 * değişmeden oranlar zorlanınca da savaş uçağı gibi duruyordu (kullanıcı geri bildirimi
 * 22.09.2026, örnek görselle birlikte).
 *
 * Silueti sivil jet yapan dört ayrıntı:
 *  1. **Küt burun** — sivri burun avcı okumasının en güçlü tetikleyicisi.
 *  2. **Ölçülü kanat, ~33° hücum kenarı** — firar kenarı daha az (~11°) süpürülüyor, yani
 *     kanat köke doğru genişliyor. Delta değil, düz de değil.
 *  3. **Kanat başına iki, toplam dört motor; hepsi kanadın önüne taşıyor** — sivil jette motor
 *     kanadın altında ileri sarkar, avcıda gövdenin içindedir; kuş bakışında farkı gösteren tek
 *     ipucu bu taşma. Dört motor ayrıca ağır kargo jetinin (747F, A340) imzası: iki motorlu
 *     siluet dar gövdeli bir yolcu uçağı gibi okunuyordu (kullanıcı isteği 22.09.2026).
 *  4. **Kanatla kuyruk arasında görünür bir gövde bölümü** — kanat kökü gövdenin ortasının hemen
 *     önünde durur ve arkasında 19 birimlik düz bir bölüm kalır. Kanat kuyruğa yapışırsa siluet
 *     yine avcıya benzemeye başlıyor (kullanıcı geri bildirimi).
 *  5. **Kısa, daralan kuyruk konisi** — gövdenin arkası bıçak gibi kesilmiyor, incelerek bitiyor;
 *     ama uzun da değil: ilk denemede koni ve dikey stabilize geriye doğru sivri bir iğne gibi
 *     uzuyordu (kullanıcı geri bildirimi). Koni 8 birim ve ucu dar; stabilize
 *     kuyrukla aynı noktada bitiyor, yani siluete uzunluk eklemiyor. Koni 12 birim (kullanıcı ölçüsü).
 *
 * Kutu değiştiği için ölçek tüketicilerde ayarlanır: haritada `.gradar-marker__art--air`
 * genişliği, tanıtım sahnesinde ise `<Plane />` çevresindeki `scale()`.
 */
/**
 * Kargo uçağı, YANDAN — yerel kutu: x 2..96, y 3..38. Burnu sağda, uçuş yönünde.
 *
 * Tanıtım sayfasındaki liman sahnesi içindir: orada gemi, tren ve vinçlerin hepsi yandan çizili,
 * tepeden bir uçak yabancı duruyordu (kullanıcı kararı 22.09.2026). Haritada ise tepeden bakış
 * zorunlu, orası {@link Plane} kullanmaya devam eder — iki çizim birlikte güncellenmeli.
 *
 * Derinlik **saydamlıkla değil renkle** veriliyor: uzak kanat ve oradaki iki motor koyu lacivert.
 * Saydamlık kullanılamaz, çünkü uçak sahnede vinçlerin önünden geçiyor ve arkası görünürdü.
 */
export function PlaneSide({ className = "" }) {
  return (
    <g className={className}>
      {/* Uzak kanat ve motorları — koyu ton, gövdenin arkasında kalıyor */}
      <g fill="#0a1f44">
        <path d="M60 23 L44 33 H52 L65 23 Z" />
        <rect x="48" y="25.6" width="11" height="4.4" rx="2.2" />
        <rect x="42" y="28.6" width="10" height="4" rx="2" />
      </g>

      <g fill="#1e4fd8">
        {/* Gövde — küt burun sağda */}
        <path d="M30 16 H74 C85 16 93 18.5 96 22 C93 25.5 85 28 74 28 H30 C25 28 22 25.5 22 22 C22 18.5 25 16 30 16 Z" />
        {/* Kuyruk konisi — geriye doğru incelerek yükselir */}
        <path d="M26 17 L12 19.4 V22.6 L26 27 Z" />
        {/* Dikey stabilize — hücum kenarı geriye süpürülü */}
        <path d="M24 19 L11 3 H18.5 L26 19 Z" />
        {/* Yatay stabilize */}
        <path d="M20 20 L6 16 H2 L14 21.5 Z" />
        {/* Yakın kanat — geriye ve aşağıya süpürülü */}
        <path d="M64 26 L42 38 H54 L70 26 Z" />
        {/* Yakın kanadın iki motoru */}
        <rect x="50" y="29" width="12" height="5" rx="2.5" />
        <rect x="44" y="32" width="11" height="4.6" rx="2.3" />
      </g>
    </g>
  );
}

export function Plane({ className = "" }) {
  return (
    <g className={className} fill="#1e4fd8">
      {/* Gövde — küt burun sağda, kuyruk konisi sola doğru incelerek biter */}
      <path d="M22 40 H74 C85 40 95 42.6 96 46 C95 49.4 85 52 74 52 H22 L14 47.5 V44.5 Z" />

      {/* Ana kanatlar — kök 26 birim, uç 10 birim; hücum kenarı ~32°, firar kenarı ~11° */}
      <path d="M68 41 L48 10 H39 L46 41 Z" />
      <path d="M68 51 L48 82 H39 L46 51 Z" />

      {/* Motorlar — kanat başına iki tane, ikisi de hücum kenarını geçip öne taşıyor (sivil jetin
          kuş bakışı imzası). Dört motor ağır kargo jetinin silueti: iç motor gövdeye yakın ve daha
          iri, dış motor kanat ucuna doğru ve bir tık küçük. */}
      <rect x="58" y="28" width="10" height="6" rx="3" />
      <rect x="52" y="19" width="9" height="5.4" rx="2.7" />
      <rect x="58" y="58" width="10" height="6" rx="3" />
      <rect x="52" y="67.6" width="9" height="5.4" rx="2.7" />

      {/* Yatay kuyruk yüzeyleri — kanadın yaklaşık üçte biri */}
      <path d="M27 43 L18 29 H12 L16 43 Z" />
      <path d="M27 49 L18 63 H12 L16 49 Z" />

      {/* Dikey stabilize — kuş bakışında eksen üzerinde dar bir dilim, kuyruktan geriye taşar */}
      <path d="M14 46 L24 44.4 v3.2 Z" />
    </g>
  );
}
