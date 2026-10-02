import { getCourierVehicleType } from '../../utils/constants';

/**
 * Haritadaki "kurye şu an burada" işaretçisi (todo 19, faz 2).
 *
 * G-Radar'ın gemi/uçak çiziminden bilerek farklı: kurye aracı kuş bakışı küçük bir daire ve
 * yönü okla anlatılıyor. Gemi yandan çizildiği için döndürülemiyordu, burada öyle bir kısıt yok.
 *
 * Ölçüler ve katmanlar `index.css`'teki `.courier-marker*` notlarına bağlı — oradaki yorum
 * hangi üç ölçünün birlikte değişmesi gerektiğini anlatıyor.
 *
 * @param {string} vehicleType - MOTORCYCLE | CAR | VAN | TRUCK (bilinmiyorsa jenerik ikon)
 * @param {number|null} heading - 0-359, kuzeyden saat yönünde; yoksa ok çizilmez
 * @param {boolean} stale - son okuma eskiyse araç soluk ve nabızsız
 */
export default function CourierVehicleMarker({ vehicleType, heading, stale = false }) {
  const icon = getCourierVehicleType(vehicleType)?.icon || 'local_shipping';
  // Yön bilinmiyorsa ok çizilmez: rastgele bir yöne bakan ok, yön bilgisi olmamasından kötüdür.
  const hasHeading = typeof heading === 'number' && Number.isFinite(heading);

  return (
    <div className={`courier-marker${stale ? ' courier-marker--stale' : ''}`}>
      {/* Nabız yalnızca taze okumada: eskimiş konumun "canlı" görünmesi yanıltıcı olur. */}
      {!stale && <span className="courier-marker__pulse" aria-hidden="true" />}

      {hasHeading && (
        <div
          className="courier-marker__heading"
          style={{ transform: `rotate(${heading}deg)` }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 12 12" className="courier-marker__arrow">
            <path d="M6 0 L11 9 L6 6.6 L1 9 Z" fill="currentColor" />
          </svg>
        </div>
      )}

      <div className="courier-marker__dot">
        {/* Material Symbols ligatürü; index.html'deki notranslate bunu çeviri eklentilerinden korur. */}
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{icon}</span>
      </div>
    </div>
  );
}
