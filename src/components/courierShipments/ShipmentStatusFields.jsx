import { t } from '../../locales';

const INPUT_CLASS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors text-sm';

/**
 * confirmDialog içinde gösterilen isteğe bağlı alanlar (teslim eden/alan + not).
 * confirmDialog ayrı bir React kökünde çizildiği için değerler state'e değil `onChange(field, value)` ile çağırana gider.
 */
export default function ShipmentStatusFields({ receivedByLabel = null, onChange }) {
  return (
    <div className="space-y-3 text-left">
      {receivedByLabel && (
        <div>
          <label htmlFor="shipment-received-by" className="block text-sm font-medium text-text-main mb-1">
            {receivedByLabel} <span className="text-xs font-normal text-text-secondary">({t('common.optional')})</span>
          </label>
          <input
            id="shipment-received-by"
            type="text"
            maxLength={150}
            placeholder={t('courierShipments.fields.receivedByPlaceholder')}
            onChange={(e) => onChange('receivedBy', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      )}
      <div>
        <label htmlFor="shipment-status-note" className="block text-sm font-medium text-text-main mb-1">
          {t('courierShipments.fields.note')} <span className="text-xs font-normal text-text-secondary">({t('common.optional')})</span>
        </label>
        <textarea
          id="shipment-status-note"
          rows={3}
          maxLength={500}
          placeholder={t('courierShipments.fields.notePlaceholder')}
          onChange={(e) => onChange('note', e.target.value)}
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>
    </div>
  );
}
