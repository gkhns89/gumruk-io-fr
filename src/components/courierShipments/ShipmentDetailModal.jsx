import {
  ShipmentStatusBadge,
  ShipmentDirectionLabel,
  ShipmentItemTypeLabel,
} from './ShipmentBadges';
import {
  getCourierType,
  getCourierVehicleType,
  getShipmentEventType,
  isInHouseCourier,
} from '../../utils/constants';
import { companyLabel, courierIconOf, formatFullDateTime, formatRelativeDateTime, toDate } from './shipmentUtils';
import CourierTrackingSection from '../courierTracking/CourierTrackingSection';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { FEATURE_FLAGS } from '../../utils/featureFlags';
import { t } from '../../locales';

// createdBy bir metin ya da kullanıcı nesnesi olabilir
const personLabel = (person) => {
  if (!person) return '';
  if (typeof person === 'string') return person;
  return person.username || person.fullName || person.name || person.email || '';
};

function Field({ label, children, wide = false }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs font-medium text-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-sm text-text-main break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}

function CourierBlock({ courier, vehicle = null }) {
  if (!courier) {
    return <p className="text-sm italic text-text-secondary">{t('courierShipments.noCourier')}</p>;
  }
  const inHouse = isInHouseCourier(courier);
  const typeOption = getCourierType(inHouse ? 'IN_HOUSE' : 'EXTERNAL');
  // Gönderinin kendi aracı varsa doğru kaynak odur (bkz. CLAUDE.md, kurye canlı takip)
  const plate = vehicle?.plate || (inHouse ? courier.vehiclePlate : null);
  const driverName = vehicle?.driverName || (inHouse ? courier.driverName : null);
  const vehicleTypeValue = vehicle?.vehicleType || courier.vehicleType;
  const vehicleLabel = inHouse ? (getCourierVehicleType(vehicleTypeValue)?.label || vehicleTypeValue) : null;

  return (
    <div className="flex items-start gap-3">
      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
        inHouse ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      }`}>
        <span className="material-symbols-outlined">{courierIconOf(courier)}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-text-main">{courier.name}</p>
          {typeOption && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${typeOption.badgeClass}`}>{typeOption.label}</span>
          )}
        </div>
        {vehicleLabel && <p className="text-xs text-text-secondary">{vehicleLabel}</p>}
        {inHouse && plate && (
          <p className="text-xs text-text-secondary">
            {t('couriers.inHouse.plate')}: <span className="font-mono text-text-main">{plate}</span>
          </p>
        )}
        {inHouse && driverName && (
          <p className="text-xs text-text-secondary">{t('couriers.inHouse.driverName')}: <span className="text-text-main">{driverName}</span></p>
        )}
        {courier.contactPhone && (
          <a href={`tel:${courier.contactPhone}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>phone</span>
            {courier.contactPhone}
          </a>
        )}
      </div>
    </div>
  );
}

function EventHistory({ events, direction, loading }) {
  if (!Array.isArray(events)) {
    return loading ? <p className="text-sm text-text-secondary">{t('common.loading')}</p> : null;
  }
  if (events.length === 0) {
    return <p className="text-sm text-text-secondary">{t('courierShipments.detail.noHistory')}</p>;
  }
  const sorted = [...events].sort((a, b) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0));

  return (
    <ol className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-2 space-y-4">
      {sorted.map((event, index) => {
        const option = getShipmentEventType(event.eventType);
        const label = option
          ? (direction === 'PICKUP' && option.pickupLabelKey ? option.pickupLabel : option.label)
          : event.eventType;
        return (
          <li key={`${event.eventType}-${event.createdAt}-${index}`} className="ml-4">
            <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-background-dark ring-2 ring-gray-200 dark:ring-gray-700">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <div className="flex flex-wrap items-center gap-x-2">
              {option && <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '16px' }}>{option.icon}</span>}
              <p className="text-sm font-medium text-text-main">{label}</p>
            </div>
            <p className="text-xs text-text-secondary">
              {[formatFullDateTime(event.createdAt), event.userName].filter(Boolean).join(' · ')}
            </p>
            {event.note && <p className="mt-1 text-sm text-text-main whitespace-pre-line">{event.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Gönderi detayı. audience 'client': iç notlar, oluşturan ve işlem düğmeleri yok.
 * `actions` gümrük firması sayfasının durum düğmeleridir.
 */
export default function ShipmentDetailModal({ shipment, loading = false, error = '', audience = 'broker', onClose, actions = null }) {
  const isClient = audience === 'client';
  const isPickup = shipment?.direction === 'PICKUP';
  const counterpart = isClient ? shipment?.brokerCompany : shipment?.clientCompany;
  const { hasFeature } = useFeatureFlags();
  // Canlı takip yalnızca bayrak açıkken sorulur. Oturum ancak araç seçilmiş ve gönderi yola çıkmış
  // bir kayıtta olabilir, o yüzden diğerlerinde uç hiç çağrılmaz — çoğu gönderi böyle. Kalanında
  // takip yoksa sunucu `status: NONE` döner ve bölüm yine hiç çizilmez (koordinatsız varış,
  // eşleşmemiş araç: ikisi de normal).
  const trackingEnabled = hasFeature(FEATURE_FLAGS.COURIER_LIVE_TRACKING)
    && !!shipment?.id && !!shipment?.vehicle && shipment.status !== 'PLANNED';

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shipment-detail-title"
      >
        {/* Başlık */}
        <div className="flex items-start justify-between gap-3 p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-secondary">{t('courierShipments.detail.title')}</p>
            <h2 id="shipment-detail-title" className="text-xl font-bold text-text-main truncate">
              {companyLabel(counterpart) || t('courierShipments.detail.title')}
            </h2>
            {shipment && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <ShipmentStatusBadge shipment={shipment} />
                <span className="text-sm font-semibold text-text-main">{formatRelativeDateTime(shipment.plannedAt)}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!shipment && loading && (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
          {!shipment && !loading && error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <span className="material-symbols-outlined">error</span>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {shipment && (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t('courierShipments.form.direction')}>
                  <ShipmentDirectionLabel direction={shipment.direction} audience={audience} />
                </Field>
                <Field label={t('courierShipments.form.itemType')}>
                  <ShipmentItemTypeLabel itemType={shipment.itemType} />
                </Field>
                <Field label={t('courierShipments.detail.plannedAt')}>{formatFullDateTime(shipment.plannedAt)}</Field>
                {isClient
                  ? <Field label={t('courierShipments.detail.broker')}>{shipment.brokerCompany?.name}</Field>
                  : <Field label={t('courierShipments.detail.client')}>{shipment.clientCompany?.name}</Field>}
                <Field label={t('courierShipments.form.description')} wide>{shipment.description}</Field>
                <Field label={t('courierShipments.detail.departedAt')}>{formatFullDateTime(shipment.departedAt)}</Field>
                <Field label={isPickup ? t('courierShipments.detail.completedAtPickup') : t('courierShipments.detail.completedAt')}>
                  {formatFullDateTime(shipment.completedAt)}
                </Field>
                <Field label={isPickup ? t('courierShipments.fields.handedOverBy') : t('courierShipments.fields.receivedBy')}>
                  {shipment.receivedBy}
                </Field>
                <Field label={t('courierShipments.detail.cancelledAt')}>{formatFullDateTime(shipment.cancelledAt)}</Field>
                {/* Canlı takip (faz 2) bu ikisine dayanıyor; görünür olmaları "neden harita yok"
                    sorusunu ekranda yanıtlıyor. Sağlayıcı kimliği burada da yok. */}
                <Field label={t('courierShipments.detail.vehicle')}>
                  {shipment.vehicle ? [shipment.vehicle.plate, shipment.vehicle.driverName].filter(Boolean).join(' · ') : null}
                </Field>
                <Field label={t('courierShipments.detail.destination')}>
                  {shipment.destination ? [shipment.destination.label, shipment.destination.address].filter(Boolean).join(' · ') : null}
                </Field>
              </dl>

              {/* Canlı takip — haritanın yeri burası; gönderi listesinden açılan aynı modal hem
                  gümrük firması hem müşteri için çalışıyor, ayrı bir sayfa gerekmiyor. */}
              <CourierTrackingSection
                shipmentId={shipment.id}
                audience={audience}
                enabled={trackingEnabled}
              />

              <section>
                <h3 className="text-sm font-semibold text-text-main mb-2">{t('courierShipments.detail.courier')}</h3>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <CourierBlock courier={shipment.courier} vehicle={shipment.vehicle} />
                </div>
              </section>

              {!isClient && shipment.internalNotes && (
                <section className="rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-amber-700 dark:text-amber-300" style={{ fontSize: '16px' }}>lock</span>
                    <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">{t('courierShipments.form.internalNotes')}</h3>
                  </div>
                  <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-line break-words">{shipment.internalNotes}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{t('courierShipments.form.internalNotesHint')}</p>
                </section>
              )}

              {!isClient && (personLabel(shipment.createdBy) || shipment.createdAt) && (
                <p className="text-xs text-text-secondary">
                  {t('courierShipments.detail.created', {
                    user: personLabel(shipment.createdBy) || '—',
                    date: formatFullDateTime(shipment.createdAt) || '—',
                  })}
                </p>
              )}

              <section>
                <h3 className="text-sm font-semibold text-text-main mb-3">{t('courierShipments.detail.history')}</h3>
                <EventHistory events={shipment.events} direction={shipment.direction} loading={loading} />
              </section>
            </>
          )}
        </div>

        {/* Alt çubuk */}
        <div className="flex flex-wrap items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
          {actions}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
