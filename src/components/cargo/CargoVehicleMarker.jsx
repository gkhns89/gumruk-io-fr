import { ContainerShip, Plane } from '../common/VehicleArt';

/**
 * Haritadaki "yük şu an burada" işaretçisi — jenerik nokta yerine tanıtım
 * sayfasındaki gemi/uçak çizimlerinin aynısı.
 *
 * İşaretçi yükün hikâyesini anlatıyor; her aşama farklı görünüyor, çünkü
 * yüklenmekte olan gemiyle denizdeki gemi aynı şey değil:
 *
 *   waiting     → güverte boş, araç soluk. Henüz yükleme yapılmadı.
 *   loading     → konteynerler tek tek beliriyor. Yükleme sürüyor.
 *   moving      → güverte dolu, araç sallanıyor, varışa bakan ok atıyor.
 *   arrived     → güverte dolu, hareket yok, gemiden aşağı çapa sarkıyor.
 *   discharged  → güverte BOŞ, çapa duruyor. Yük indirildi.
 *
 * Çapa ve konteynerler yalnızca denizde anlamlı; uçakta karşılığı park etmiş
 * uçağın altındaki iniş takımı işareti.
 *
 * Yön farkını unutma: gemi YANDAN çizilmiş, o yüzden döndürülmez — batıya
 * gidiyorsa yatay aynalanır, hepsi bu. Uçak KUŞ BAKIŞI çizilmiş, dolayısıyla
 * gerçek rotaya döndürülebilir.
 */

/** Durum kodundan görünüm aşaması. Bilinmeyen kod "yolda" sayılır. */
function motionFor(status, vehicleType) {
  const key = String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  switch (key) {
    case 'SAILING':
    case 'EN_ROUTE':
      return 'moving';
    // Yükleme bitti ama gemi henüz kalkmadı — konteynerlerin belirdiği aşama.
    case 'LOADED':
      return 'loading';
    case 'ARRIVED':
    case 'LANDED':
      return 'arrived';
    // Yük indirildi: güverte boşalıyor.
    case 'DISCHARGED':
    case 'DELIVERED':
      return 'discharged';
    case 'NEW':
    case 'INPROGRESS':
    case 'BOOKED':
    case 'UNTRACKED':
      return 'waiting';
    default:
      // Sözlükte olmayan bir kod geldiğinde aracı hareketli göstermek,
      // olduğu yerde dondurmaktan daha doğru: kayıt canlı takipte.
      return vehicleType === 'AIRPLANE' || vehicleType === 'SHIP' ? 'moving' : 'waiting';
  }
}

/**
 * Gemiden aşağı sarkan çapa. Sıfırdan çizildi: zincir, halka, gövde, çıpa
 * kolu ve tırnaklar. Üst ucu geminin gövdesinin arkasında kalıyor, yani
 * gerçekten güverteden suya salınmış gibi duruyor.
 */
function AnchorMark() {
  return (
    <svg viewBox="0 0 24 46" className="gradar-marker__anchor" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* Zincir — kesikli çizgi baklaları andırıyor */}
        <path d="M12 0 V15" strokeWidth="2.2" strokeDasharray="3 2.4" />
        {/* Halka */}
        <circle cx="12" cy="18.4" r="3.1" strokeWidth="2" />
        {/* Gövde */}
        <path d="M12 21.5 V38.5" strokeWidth="2.4" />
        {/* Çıpa kolu (stok) */}
        <path d="M5 25.5 H19" strokeWidth="2.2" />
        {/* Kollar */}
        <path d="M4.2 31.5 Q4.2 40.5 12 40.5 Q19.8 40.5 19.8 31.5" strokeWidth="2.4" />
      </g>
      {/* Tırnaklar */}
      <g fill="currentColor">
        <path d="M4.4 33.2 L0.4 30.2 L6 28.4 Z" />
        <path d="M19.6 33.2 L23.6 30.2 L18 28.4 Z" />
      </g>
    </svg>
  );
}

/** Park etmiş uçağın altındaki yer işareti — çapanın hava karşılığı. */
function ParkedMark() {
  return (
    <svg viewBox="0 0 24 30" className="gradar-marker__anchor" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M12 0 V16" strokeWidth="2.2" strokeDasharray="3 2.4" />
        <path d="M4 21 H20" strokeWidth="3" />
        <path d="M7 26 H17" strokeWidth="2" opacity="0.55" />
      </g>
    </svg>
  );
}

export default function CargoVehicleMarker({
  vehicleType,
  status,
  bearing,     // 0-360, kuzeyden saat yönünde; yön bilinmiyorsa null
  label,
}) {
  const motion = motionFor(status, vehicleType);
  const isAir = vehicleType === 'AIRPLANE';
  const moving = motion === 'moving';
  // Varmış ya da boşaltılmış: ikisinde de araç limanda duruyor, çapa iner.
  const atRest = motion === 'arrived' || motion === 'discharged';

  // Varış yönü bilinmiyorsa (araç zaten hedefte, tek noktalı rota, bozuk
  // geometri) ok gösterilmez — rastgele bir yöne bakan ok, yön bilgisi
  // olmamasından daha kötü.
  const hasBearing = typeof bearing === 'number' && Number.isFinite(bearing);
  const showArrow = moving && hasBearing;

  // Gemi yandan çizili: doğuya giderken burnu sağa, batıya giderken sola baksın.
  // 0-180° doğu yarısı, 180-360° batı yarısı.
  const headingWest = hasBearing && bearing > 180;
  const shipFlip = headingWest ? -1 : 1;

  // Uçak kuş bakışı ve burnu sağa (doğuya, yani 90°) bakıyor; pusula açısını
  // SVG dönüşüne çevirmek için 90° geri alıyoruz.
  const planeRotation = hasBearing ? bearing - 90 : 0;

  // Etiket akışta değil, mutlak konumlu: aksi hâlde işaretçi kutusunu
  // uzatıyor ve MapLibre'nin 'center' çapası aracı koordinatın biraz
  // yukarısına kaydırıyordu. Bu hâliyle araç tam koordinatın üstünde duruyor.
  return (
    <div className={`gradar-marker gradar-marker--${motion}`}>

      {/* Gidiş yönü oku — VARIŞ NOKTASINA bakıyor, rotanın o andaki kıvrımına
          değil: aktarma limanına doğru sapan bir ok, "yük nereye gidiyor"
          sorusunu yanıtlamak yerine karıştırıyor. Açı serbest (yuvalara
          kilitlenmiyor), aracın çevresinde tam hedefin bulunduğu yöne dönüyor.
          Konumlandırma dönmüş bir kapsayıcı üzerinden yapılıyor: kapsayıcı
          pusula açısına dönüyor, ok da onun içinde sabit yukarı bakıyor. */}
      {showArrow && (
        <div
          className="gradar-marker__heading"
          style={{ transform: `rotate(${bearing}deg)` }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 12 12" className="gradar-marker__arrow">
            <path d="M6 0 L11 9 L6 6.6 L1 9 Z" fill="currentColor" />
          </svg>
        </div>
      )}

      {/* Yönelme ayrı bir katmanda: CSS animasyonundaki `transform`, elemanın
          inline `transform`'unu tamamen ezer. Dönüş/aynalama dışta durunca
          animasyon içeride serbest kalıyor — ve bonus olarak hareket aracın
          KENDİ eksenine göre oluyor, yani uçağın "ileri"si gerçekten burnunun
          baktığı yön. */}
      <div
        className="gradar-marker__orient"
        style={{ transform: isAir ? `rotate(${planeRotation}deg)` : `scaleX(${shipFlip})` }}
      >
        {isAir ? (
          // Uçakta güverte yok, yani konteyner gösterilemiyor. Yükün varlığı
          // gövdenin DOLULUĞU ile anlatılıyor: yüklenirken iç dolgu yavaşça
          // beliriyor, boşaltıldığında yalnızca dış hat kalıyor. İki kopya
          // gerekiyor çünkü biri dolgu diğeri kontur.
          <svg
            viewBox="0 0 104 32"
            className="gradar-marker__art gradar-marker__art--air"
            aria-hidden="true"
          >
            {(motion === 'loading' || motion === 'discharged') && (
              <g className="gradar-marker__hull"><Plane /></g>
            )}
            {motion !== 'discharged' && (
              <g className="gradar-marker__fill"><Plane /></g>
            )}
          </svg>
        ) : (
          <svg
            viewBox="0 0 190 70"
            className="gradar-marker__art gradar-marker__art--sea"
            aria-hidden="true"
          >
            <ContainerShip />
          </svg>
        )}
      </div>

      {/* Demirleme işareti — araç DURDUĞUNDA görünüyor. Önceki hâli anlamsız
          bir yeşil elipsti; şimdi gemiden aşağı sarkan gerçek bir çapa var ve
          suda hafifçe salınıyor. Uçakta karşılığı park işareti. */}
      {atRest && (isAir ? <ParkedMark /> : <AnchorMark />)}

      {/* Etiket en sonda: DOM sırası boyama sırası, yani güneye bakan bir okla
          çakışırsa etiket üstte kalıyor ve okunur oluyor. */}
      {label && <span className="gradar-marker__label">{label}</span>}
    </div>
  );
}
