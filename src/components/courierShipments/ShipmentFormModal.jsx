import { useState } from 'react';
import { courierShipmentService } from '../../api/courierShipmentService';
import { showSuccess, showError } from '../../utils/toastUtils';
import {
  SHIPMENT_DIRECTIONS,
  SHIPMENT_ITEM_TYPES,
  getCourierVehicleType,
  isInHouseCourier,
} from '../../utils/constants';
import {
  companyLabel,
  defaultPlannedInputs,
  plannedInputsToIso,
  toDate,
  toDateInputValue,
  toTimeInputValue,
} from './shipmentUtils';
import { t } from '../../locales';

const INPUT_CLASS = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors';
const LABEL_CLASS = 'block text-sm font-medium text-text-main mb-2';

const initialForm = (shipment) => {
  const defaults = defaultPlannedInputs();
  if (!shipment) {
    return {
      direction: 'DELIVERY',
      itemType: 'DOCUMENT',
      description: '',
      clientCompanyId: '',
      courierCompanyId: '',
      date: defaults.date,
      time: defaults.time,
      internalNotes: '',
    };
  }
  const planned = toDate(shipment.plannedAt);
  return {
    direction: shipment.direction || 'DELIVERY',
    itemType: shipment.itemType || 'DOCUMENT',
    description: shipment.description || '',
    clientCompanyId: shipment.clientCompany?.id != null ? String(shipment.clientCompany.id) : '',
    courierCompanyId: shipment.courier?.id != null ? String(shipment.courier.id) : '',
    date: planned ? toDateInputValue(planned) : defaults.date,
    time: planned ? toTimeInputValue(planned) : defaults.time,
    internalNotes: shipment.internalNotes || '',
  };
};

const courierOptionLabel = (courier) => {
  if (!isInHouseCourier(courier)) {
    return courier.shortName ? `${courier.name} (${courier.shortName})` : courier.name;
  }
  const details = [getCourierVehicleType(courier.vehicleType)?.label, courier.vehiclePlate, courier.driverName]
    .filter(Boolean)
    .join(' · ');
  return details ? `${courier.name} — ${details}` : courier.name;
};

function ChoiceButtons({ options, value, onChange, columns }) {
  return (
    <div className={`grid gap-2 ${columns}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-300 dark:border-gray-600 text-text-main hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{option.icon}</span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Gönderi oluştur / düzenle. Düzenleme yalnızca PLANNED gönderide açılır; müşteri değiştirilemez.
 * brokerCompanyId yalnızca SUPER_ADMIN için gönderilir.
 */
export default function ShipmentFormModal({
  shipment = null,
  brokerCompanyId = null,
  clients = [],
  clientsLoading = false,
  couriers = [],
  couriersLoading = false,
  couriersError = '',
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(shipment);
  const [form, setForm] = useState(() => initialForm(shipment));
  const [saving, setSaving] = useState(false);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const handleInput = (e) => setField(e.target.name, e.target.value);

  // Aktif kayıtlar; düzenlemede mevcut kurye pasif ya da listede yoksa da seçenek olarak kalır
  const currentCourierId = shipment?.courier?.id;
  const courierOptions = couriers.filter((courier) => courier.active !== false || courier.id === currentCourierId);
  if (shipment?.courier && !courierOptions.some((courier) => courier.id === currentCourierId)) {
    courierOptions.push(shipment.courier);
  }
  const externalCouriers = courierOptions.filter((courier) => !isInHouseCourier(courier));
  const inHouseCouriers = courierOptions.filter(isInHouseCourier);

  const plannedAt = plannedInputsToIso(form.date, form.time);
  const isPast = plannedAt && new Date(plannedAt).getTime() < Date.now();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!isEdit && !form.clientCompanyId) {
      showError(t('courierShipments.form.clientRequired'));
      return;
    }
    if (!form.courierCompanyId) {
      showError(t('courierShipments.form.courierRequired'));
      return;
    }
    if (!plannedAt) {
      showError(t('courierShipments.form.dateTimeRequired'));
      return;
    }

    const payload = {
      ...(brokerCompanyId ? { brokerCompanyId } : {}),
      courierCompanyId: Number(form.courierCompanyId),
      direction: form.direction,
      itemType: form.itemType,
      description: form.description.trim() || null,
      plannedAt,
      internalNotes: form.internalNotes.trim() || null,
    };

    setSaving(true);
    const result = isEdit
      ? await courierShipmentService.updateShipment(shipment.id, payload)
      : await courierShipmentService.createShipment({ ...payload, clientCompanyId: Number(form.clientCompanyId) });
    setSaving(false);

    if (!result.success) {
      showError(result.error);
      return;
    }
    showSuccess(isEdit ? t('courierShipments.form.updatedSuccess') : t('courierShipments.form.createdSuccess'));
    onSaved(result.data);
  };

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
        aria-labelledby="shipment-form-title"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div>
            <h2 id="shipment-form-title" className="text-2xl font-bold text-text-main">
              {isEdit ? t('courierShipments.form.editTitle') : t('courierShipments.form.createTitle')}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {isEdit ? t('courierShipments.form.editSubtitle') : t('courierShipments.form.createSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="shipment-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <span className={LABEL_CLASS}>{t('courierShipments.form.direction')}</span>
              <ChoiceButtons
                options={SHIPMENT_DIRECTIONS}
                value={form.direction}
                onChange={(value) => setField('direction', value)}
                columns="grid-cols-1 sm:grid-cols-2"
              />
            </div>

            <div>
              <span className={LABEL_CLASS}>{t('courierShipments.form.itemType')}</span>
              <ChoiceButtons
                options={SHIPMENT_ITEM_TYPES}
                value={form.itemType}
                onChange={(value) => setField('itemType', value)}
                columns="grid-cols-3"
              />
            </div>

            {/* Müşteri */}
            <div>
              <label htmlFor="shipment-client" className={LABEL_CLASS}>
                {t('courierShipments.form.client')} {!isEdit && <span className="text-red-500">*</span>}
              </label>
              {isEdit ? (
                <>
                  <input
                    id="shipment-client"
                    type="text"
                    value={companyLabel(shipment.clientCompany)}
                    disabled
                    className={`${INPUT_CLASS} opacity-70 cursor-not-allowed`}
                  />
                  <p className="text-xs text-text-secondary mt-1">{t('courierShipments.form.clientLocked')}</p>
                </>
              ) : (
                <>
                  <select
                    id="shipment-client"
                    name="clientCompanyId"
                    value={form.clientCompanyId}
                    onChange={handleInput}
                    disabled={clientsLoading}
                    className={INPUT_CLASS}
                  >
                    <option value="">
                      {clientsLoading ? t('courierStops.clientsLoading') : t('courierStops.selectClient')}
                    </option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.label}</option>
                    ))}
                  </select>
                  {!clientsLoading && clients.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{t('courierStops.noClients')}</p>
                  )}
                </>
              )}
            </div>

            {/* Kurye */}
            <div>
              <label htmlFor="shipment-courier" className={LABEL_CLASS}>
                {t('courierShipments.form.courier')} <span className="text-red-500">*</span>
              </label>
              <select
                id="shipment-courier"
                name="courierCompanyId"
                value={form.courierCompanyId}
                onChange={handleInput}
                disabled={couriersLoading}
                className={INPUT_CLASS}
              >
                <option value="">
                  {couriersLoading ? t('common.loading') : t('courierShipments.form.selectCourier')}
                </option>
                {externalCouriers.length > 0 && (
                  <optgroup label={t('courierShipments.form.externalGroup')}>
                    {externalCouriers.map((courier) => (
                      <option key={courier.id} value={courier.id}>{courierOptionLabel(courier)}</option>
                    ))}
                  </optgroup>
                )}
                {inHouseCouriers.length > 0 && (
                  <optgroup label={t('courierShipments.form.inHouseGroup')}>
                    {inHouseCouriers.map((courier) => (
                      <option key={courier.id} value={courier.id}>{courierOptionLabel(courier)}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              {!couriersLoading && courierOptions.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {couriersError ? t('courierShipments.form.couriersLoadError') : t('courierShipments.form.noCouriers')}
                </p>
              )}
            </div>

            {/* Tarih + saat (tarayıcının saat diliminde) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="shipment-date" className={LABEL_CLASS}>
                  {t('courierShipments.form.date')} <span className="text-red-500">*</span>
                </label>
                <input id="shipment-date" type="date" name="date" value={form.date} onChange={handleInput} required className={INPUT_CLASS} />
              </div>
              <div>
                <label htmlFor="shipment-time" className={LABEL_CLASS}>
                  {t('courierShipments.form.time')} <span className="text-red-500">*</span>
                </label>
                <input id="shipment-time" type="time" name="time" value={form.time} onChange={handleInput} required className={INPUT_CLASS} />
              </div>
            </div>
            {isPast && (
              <p className="-mt-3 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
                {t('courierShipments.form.pastWarning')}
              </p>
            )}

            <div>
              <label htmlFor="shipment-description" className={LABEL_CLASS}>{t('courierShipments.form.description')}</label>
              <textarea
                id="shipment-description"
                name="description"
                value={form.description}
                onChange={handleInput}
                rows={2}
                maxLength={500}
                placeholder={t('courierShipments.form.descriptionPlaceholder')}
                className={`${INPUT_CLASS} resize-none`}
              />
            </div>

            <div>
              <label htmlFor="shipment-internal-notes" className={LABEL_CLASS}>{t('courierShipments.form.internalNotes')}</label>
              <textarea
                id="shipment-internal-notes"
                name="internalNotes"
                value={form.internalNotes}
                onChange={handleInput}
                rows={2}
                maxLength={1000}
                placeholder={t('courierShipments.form.internalNotesPlaceholder')}
                className={`${INPUT_CLASS} resize-none`}
              />
              <p className="text-xs text-text-secondary mt-1">{t('courierShipments.form.internalNotesHint')}</p>
            </div>

            <p className="flex items-start gap-1.5 text-xs text-text-secondary">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>notifications</span>
              {t('courierShipments.form.notifyHint')}
            </p>
          </form>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="shipment-form"
            disabled={saving}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? t('management.saving')
              : isEdit ? t('common.save') : t('courierShipments.form.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
