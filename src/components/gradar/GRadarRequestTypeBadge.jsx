import { getGRadarRequestType } from '../../utils/constants';

/**
 * G-Radar talebinin tipini ("Açma" / "Kapatma") gösteren küçük rozet. Admin talep listesi ve
 * düzenleme modalındaki talep bandı paylaşıyor. Tipi eksik talep açma talebidir; bilinmeyen
 * tip yanlış etiketlenmesin diye ham değeriyle gösterilir.
 */
export default function GRadarRequestTypeBadge({ requestType, className = '' }) {
  const type = getGRadarRequestType(requestType);
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
        type?.badgeClass || 'bg-gray-100 dark:bg-gray-800 text-text-secondary'
      } ${className}`}
    >
      {type?.icon && <span className="material-symbols-outlined text-[12px]">{type.icon}</span>}
      {type?.label || requestType}
    </span>
  );
}
