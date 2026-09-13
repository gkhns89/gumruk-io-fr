import { t } from '../../locales';

// Durum sekmeleri (sayılarıyla) — gümrük firması ve müşteri gönderi sayfaları ortak kullanır
export default function ShipmentTabs({ tabs, active, counts = {}, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4" role="tablist">
      {tabs.map((tab) => {
        const selected = tab === active;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selected
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-text-main border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t(`courierShipments.tabs.${tab}`)}
            <span
              className={`min-w-[1.25rem] px-1.5 rounded-full text-xs text-center ${
                selected ? 'bg-white/25' : 'bg-gray-100 dark:bg-gray-700 text-text-secondary'
              }`}
            >
              {counts[tab] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
