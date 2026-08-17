import { ContainerShip, Plane } from '../common/VehicleArt';

/**
 * Haritadaki "yük şu an burada" işaretçisi — jenerik nokta yerine tanıtım
 * sayfasındaki gemi/uçak çizimlerinin aynısı.
 *
 * Davranış yükün durumuna bağlı, çünkü hareket eden bir gemi ile limanda
 * bağlı duran gemi aynı görünmemeli:
 *
 *   yolda    → araç sallanıyor, önünde gidiş yönünü gösteren ok atıyor
 *   varmış   → hareket yok, ok yok; altında sabit bir "demirli" halkası
 *   yolculuk
 *   öncesi   → hareket yok, soluk; henüz yola çıkmamış
 *
 * Yön farkını unutma: gemi YANDAN çizilmiş, o yüzden döndürülmez — batıya
 * gidiyorsa yatay aynalanır, hepsi bu. Uçak KUŞ BAKIŞI çizilmiş, dolayısıyla
 * gerçek rotaya döndürülebilir.
 */

/** Durum kodundan hareket davranışı. Bilinmeyen kod "yolda" sayılır. */
function motionFor(status, vehicleType) {
  const key = String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  switch (key) {
    case 'SAILING':
    case 'EN_ROUTE':
      return 'moving';
    case 'ARRIVED':
    case 'DISCHARGED':
    case 'LANDED':
    case 'DELIVERED':
      return 'arrived';
    case 'NEW':
    case 'INPROGRESS':
    case 'BOOKED':
    case 'LOADED':
      return 'waiting';
    case 'UNTRACKED':
      return 'waiting';
    default:
      // Sözlükte olmayan bir kod geldiğinde aracı hareketli göstermek,
      // olduğu yerde dondurmaktan daha doğru: kayıt canlı takipte.
      return vehicleType === 'AIRPLANE' || vehicleType === 'SHIP' ? 'moving' : 'waiting';
  }
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

  // Rota yönü bilinmiyorsa (tek noktalı rota, bozuk geometri) ok gösterilmez —
  // rastgele bir yöne bakan ok, yön bilgisi olmamasından daha kötü.
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
    <div className={`gradar-marker ${moving ? 'is-moving' : ''}`}>
      {/* Gidiş yönü oku — aracın önünde, rotanın açısında duruyor.
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

      {isAir ? (
        <svg
          viewBox="0 0 104 32"
          className="gradar-marker__art gradar-marker__art--air"
          style={{ transform: `rotate(${planeRotation}deg)` }}
          aria-hidden="true"
        >
          <Plane />
        </svg>
      ) : (
        <svg
          viewBox="0 0 190 70"
          className="gradar-marker__art gradar-marker__art--sea"
          style={{ transform: `scaleX(${shipFlip})` }}
          aria-hidden="true"
        >
          <ContainerShip />
        </svg>
      )}

      {/* Limanda / inişte: hareket yerine sabit bir halka — "buraya vardı". */}
      {motion === 'arrived' && <span className="gradar-marker__berth" aria-hidden="true" />}

      {/* Etiket en sonda: DOM sırası boyama sırası, yani güneye bakan bir okla
          çakışırsa etiket üstte kalıyor ve okunur oluyor. */}
      {label && <span className="gradar-marker__label">{label}</span>}
    </div>
  );
}
