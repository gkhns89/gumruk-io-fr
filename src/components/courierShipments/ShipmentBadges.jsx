import {
  getShipmentStatus,
  getShipmentStatusLabel,
  getShipmentDirection,
  getShipmentItemType,
  getCourierVehicleType,
  isInHouseCourier,
} from '../../utils/constants';
import { courierIconOf } from './shipmentUtils';
import { t } from '../../locales';

const ICON_STYLE = { fontSize: '15px' };

// Durum rozeti — PICKUP gönderide DELIVERED "Teslim alındı" okunur
export function ShipmentStatusBadge({ shipment, className = '' }) {
  const option = getShipmentStatus(shipment?.status);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
        option?.badgeClass || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
      } ${className}`}
    >
      {option && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{option.icon}</span>}
      {getShipmentStatusLabel(shipment?.status, shipment?.direction)}
    </span>
  );
}

// Yön: gümrük firması "Müşteriye teslim / Müşteriden alım", müşteri "Size teslimat / Sizden alım" görür
export function ShipmentDirectionLabel({ direction, audience = 'broker' }) {
  const option = getShipmentDirection(direction);
  if (!option) return direction ? <span>{direction}</span> : null;
  const isClient = audience === 'client';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="material-symbols-outlined" style={ICON_STYLE}>{isClient ? option.clientIcon : option.icon}</span>
      {isClient ? t(`myShipments.direction.${option.value}`) : option.label}
    </span>
  );
}

export function ShipmentItemTypeLabel({ itemType }) {
  const option = getShipmentItemType(itemType);
  if (!option) return itemType ? <span>{itemType}</span> : null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="material-symbols-outlined" style={ICON_STYLE}>{option.icon}</span>
      {option.label}
    </span>
  );
}

// Kurye: firma içi kayıtta araç ikonu (mor) ve plaka
export function ShipmentCourierLabel({ courier, vehicle = null }) {
  if (!courier) {
    return <span className="italic">{t('courierShipments.noCourier')}</span>;
  }
  const inHouse = isInHouseCourier(courier);
  // Gönderi bir araç taşıyorsa doğru kaynak odur; kurye kaydının kendi alanları yalnızca eski/bayraksız kayıtlar için
  const plate = vehicle?.plate || (inHouse ? courier.vehiclePlate : null);
  const vehicleTypeValue = vehicle?.vehicleType || courier.vehicleType;
  const vehicleLabel = inHouse ? (getCourierVehicleType(vehicleTypeValue)?.label || vehicleTypeValue) : null;
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <span
        className={`material-symbols-outlined ${inHouse ? 'text-violet-600 dark:text-violet-300' : ''}`}
        style={ICON_STYLE}
        title={inHouse ? [t('couriers.types.inHouse'), vehicleLabel].filter(Boolean).join(' · ') : t('couriers.types.external')}
      >
        {courierIconOf(courier)}
      </span>
      <span className="truncate">{courier.name}</span>
      {inHouse && plate && (
        <span className="font-mono text-[11px] px-1 rounded bg-gray-100 dark:bg-gray-800 whitespace-nowrap">{plate}</span>
      )}
    </span>
  );
}
