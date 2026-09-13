import { t } from '../../locales';

/**
 * Liste altındaki tarih penceresi satırı: "30 günden eski ... gizli" + "Daha eski gönderileri göster".
 * Yalnızca pencerenin kestiği sekmelerde (WINDOWED_TABS) gösterilir.
 */
export default function ShipmentDateWindow({ windowDays, canShowOlder, disabled = false, onShowOlder }) {
  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-text-secondary text-center">
      <span>
        {windowDays == null
          ? t('courierShipments.dateWindow.all')
          : t('courierShipments.dateWindow.lastDays', { days: windowDays })}
      </span>
      {canShowOlder && (
        <button
          type="button"
          disabled={disabled}
          onClick={onShowOlder}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-base">history</span>
          {t('courierShipments.dateWindow.showOlder')}
        </button>
      )}
    </div>
  );
}
