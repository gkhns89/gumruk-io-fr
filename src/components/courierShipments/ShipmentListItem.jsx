import {
  ShipmentStatusBadge,
  ShipmentDirectionLabel,
  ShipmentItemTypeLabel,
  ShipmentCourierLabel,
} from './ShipmentBadges';
import { companyLabel, formatRelativeDateTime, formatShipmentDate, isOverdueShipment, toDate } from './shipmentUtils';
import { t } from '../../locales';

/**
 * Gönderi liste satırı. Satıra tıklamak detayı açar; `actions` (yalnızca gümrük firması) sağda durur.
 * audience 'broker' karşı taraf olarak müşteriyi, 'client' gümrük firmasını gösterir.
 */
export default function ShipmentListItem({ shipment, audience = 'broker', onOpen, actions = null }) {
  const isClient = audience === 'client';
  const planned = toDate(shipment.plannedAt);
  const overdue = !isClient && isOverdueShipment(shipment);
  const counterpart = isClient ? shipment.brokerCompany : shipment.clientCompany;

  return (
    <li className="bg-white dark:bg-background-dark rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => onOpen(shipment)}
          className="flex-1 min-w-0 text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="sm:w-40 flex-shrink-0">
            <p className="text-sm font-bold text-text-main">{formatRelativeDateTime(shipment.plannedAt)}</p>
            {planned && <p className="text-xs text-text-secondary">{formatShipmentDate(planned)}</p>}
            {overdue && (
              <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span>
                {t('courierShipments.overdue')}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-main truncate">{companyLabel(counterpart) || '—'}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-text-secondary">
              <ShipmentDirectionLabel direction={shipment.direction} audience={audience} />
              <ShipmentItemTypeLabel itemType={shipment.itemType} />
              <ShipmentCourierLabel courier={shipment.courier} vehicle={shipment.vehicle} />
            </div>
            {shipment.description && (
              <p className="text-xs text-text-secondary mt-1 truncate">{shipment.description}</p>
            )}
          </div>

          <ShipmentStatusBadge shipment={shipment} className="self-start sm:self-center" />
        </button>

        {actions && (
          <div className="flex flex-wrap gap-2 lg:justify-end lg:flex-shrink-0">{actions}</div>
        )}
      </div>
    </li>
  );
}
