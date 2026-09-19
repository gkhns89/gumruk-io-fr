import { useCallback, useEffect, useState } from 'react';
import { courierVehicleService } from '../../api/courierVehicleService';
import { vehicleTrackingService, isTrackingNotConfigured } from '../../api/vehicleTrackingService';
import { COURIER_VEHICLE_TYPES, getCourierVehicleType } from '../../utils/constants';
import { confirmDialog } from '../../utils/confirmDialog';
import { normalizePlate } from '../../utils/turkishPlate';
import { showError, showInfo, showSuccess } from '../../utils/toastUtils';
import { t } from '../../locales';

const INPUT_CLASS = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-main focus:ring-2 focus:ring-primary';
const LABEL_CLASS = 'block text-xs font-medium text-text-main mb-1';

const emptyForm = () => ({
  plate: '',
  vehicleType: 'CAR',
  driverName: '',
  driverPhone: '',
  providerVehicleKey: '',
});

const formFromVehicle = (vehicle) => ({
  plate: vehicle.plate || '',
  vehicleType: vehicle.vehicleType || 'CAR',
  driverName: vehicle.driverName || '',
  driverPhone: vehicle.driverPhone || '',
  // Eşleşmenin kendisi anahtarla gelmez; dokunulmadığı sürece boş gönderilir (sunucu eşleşmeyi korur)
  providerVehicleKey: '',
});

/**
 * Firma içi kurye kaydının araçları (COURIER_LIVE_TRACKING bayrağı arkasında).
 *
 * Araç silinmez, pasife alınır: gönderi geçmişi araca bağlıdır. Sağlayıcı eşleşmesi isteğe bağlıdır —
 * eşleşmemiş araçla gönderi oluşturulabilir, yalnızca canlı takip açılamaz.
 * Sağlayıcı listesi yalnızca bağlantı kuruluysa yüklenir; kurulu değilse alan gizlenir.
 */
export default function CourierVehiclesTab({ courierId, brokerCompanyId = null, canManage = true }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showInactive, setShowInactive] = useState(false);
  const [providerVehicles, setProviderVehicles] = useState([]);
  const [providerAvailable, setProviderAvailable] = useState(false);
  const [liveMode, setLiveMode] = useState(true);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    const result = await courierVehicleService.listVehicles(courierId);
    setLoading(false);
    if (!result.success) {
      showError(result.error);
      return;
    }
    setVehicles(result.data);
  }, [courierId]);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  // Eşleştirme listesi bağlantı kuruluysa anlamlı; kurulmamışsa sessizce gizlenir
  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    vehicleTrackingService.getIntegration(brokerCompanyId).then((integration) => {
      if (cancelled || !integration.success) return;
      setLiveMode(integration.data?.liveMode !== false);
      if (!integration.data?.active || !integration.data?.tokenSet) return;
      vehicleTrackingService.listProviderVehicles(brokerCompanyId).then((result) => {
        if (cancelled) return;
        if (result.success) {
          setProviderVehicles(result.data);
          setProviderAvailable(true);
          return;
        }
        if (!isTrackingNotConfigured(result)) setProviderAvailable(false);
      });
    });
    return () => { cancelled = true; };
  }, [brokerCompanyId, canManage]);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  // Pasif araçlar varsayılan olarak gizlenir; listede birikmelerinin bir anlamı yok (kullanıcı kararı)
  const inactiveCount = vehicles.filter((vehicle) => !vehicle.active).length;
  const visibleVehicles = showInactive ? vehicles : vehicles.filter((vehicle) => vehicle.active);
  const platePreview = normalizePlate(form.plate);

  const startEdit = (vehicle) => {
    setEditingId(vehicle.id);
    setForm(formFromVehicle(vehicle));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const plate = normalizePlate(form.plate);
    if (!plate.ok) {
      showError(t(`couriers.vehicles.plateError.${plate.reason}`));
      return;
    }
    const payload = {
      plate: plate.plate,
      vehicleType: form.vehicleType,
      driverName: form.driverName.trim() || null,
      driverPhone: form.driverPhone.trim() || null,
      // Boş metin "eşleşmeye dokunma" demek; eşleşmeyi kaldırmak için ayrı düğme var
      ...(form.providerVehicleKey ? { providerVehicleKey: form.providerVehicleKey } : {}),
    };
    setSaving(true);
    const result = editingId
      ? await courierVehicleService.updateVehicle(courierId, editingId, payload)
      : await courierVehicleService.createVehicle(courierId, payload);
    setSaving(false);
    if (!result.success) {
      showError(result.error);
      return;
    }
    showSuccess(editingId ? t('couriers.vehicles.updated') : t('couriers.vehicles.created'));
    cancelEdit();
    loadVehicles();
  };

  const handleDelete = async (vehicle) => {
    const ok = await confirmDialog({
      title: t('couriers.vehicles.deleteTitle'),
      message: t('couriers.vehicles.deleteMessage', { plate: vehicle.plate }),
      intent: 'danger',
    });
    if (!ok) return;
    const result = await courierVehicleService.deleteVehicle(courierId, vehicle.id);
    if (!result.success) {
      showError(result.error);
      return;
    }
    // Gönderide kullanılmış araç silinmez, pasife alınır. Kaç gönderi ve hangisi olduğu yazılır: yalnızca
    // "kullanılıyor" demek, kullanmadığını sanan kişide hata izlenimi bırakıyor.
    if (result.data?.deleted) {
      showSuccess(t('couriers.vehicles.deleted'));
    } else {
      showInfo(t('couriers.vehicles.deactivatedInstead', {
        count: result.data?.shipmentCount ?? 0,
        shipment: result.data?.latestShipmentId ?? '-',
      }));
    }
    if (editingId === vehicle.id) cancelEdit();
    loadVehicles();
  };

  const handleReactivate = async (vehicle) => {
    const result = await courierVehicleService.updateVehicle(courierId, vehicle.id, { active: true });
    if (!result.success) {
      showError(result.error);
      return;
    }
    showSuccess(t('couriers.vehicles.reactivated'));
    loadVehicles();
  };

  const handleUnmatch = async (vehicle) => {
    const result = await courierVehicleService.updateVehicle(courierId, vehicle.id, { providerVehicleKey: '' });
    if (!result.success) {
      showError(result.error);
      return;
    }
    showSuccess(t('couriers.vehicles.unmatched'));
    loadVehicles();
  };

  return (
    <div className="space-y-6">
      {!liveMode && (
        <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>science</span>
          {t('couriers.vehicles.stubModeHint')}
        </p>
      )}

      {canManage && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-text-main">
            {editingId ? t('couriers.vehicles.editTitle') : t('couriers.vehicles.addTitle')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label htmlFor="vehicle-plate" className={LABEL_CLASS}>
                {t('couriers.vehicles.plate')} <span className="text-red-500">*</span>
              </label>
              <input
                id="vehicle-plate"
                type="text"
                value={form.plate}
                // Türkçe yerel ayarla büyütmek "i" harfini "İ" yapar ve plakayı bozar; plaka İngiliz alfabesindendir
                onChange={(e) => setField('plate', e.target.value.toUpperCase())}
                maxLength={20}
                placeholder={t('couriers.vehicles.platePlaceholder')}
                className={INPUT_CLASS}
              />
              {/* Nasıl kaydedileceğini yazarken göster: kullanıcı biçimi tahmin etmek zorunda kalmasın */}
              {!form.plate.trim() && (
                <p className="mt-1 text-xs text-text-secondary">{t('couriers.vehicles.plateHint')}</p>
              )}
              {form.plate.trim() && (
                platePreview.ok ? (
                  <p className="mt-1 text-xs text-text-secondary">
                    {t('couriers.vehicles.plateWillBeSaved', { plate: platePreview.plate })}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    {t(`couriers.vehicles.plateError.${platePreview.reason}`)}
                  </p>
                )
              )}
            </div>
            <div>
              <label htmlFor="vehicle-type" className={LABEL_CLASS}>{t('couriers.vehicles.type')}</label>
              <select
                id="vehicle-type"
                value={form.vehicleType}
                onChange={(e) => setField('vehicleType', e.target.value)}
                className={INPUT_CLASS}
              >
                {COURIER_VEHICLE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vehicle-driver" className={LABEL_CLASS}>{t('couriers.vehicles.driver')}</label>
              <input
                id="vehicle-driver"
                type="text"
                value={form.driverName}
                onChange={(e) => setField('driverName', e.target.value)}
                maxLength={100}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="vehicle-phone" className={LABEL_CLASS}>{t('couriers.vehicles.driverPhone')}</label>
              <input
                id="vehicle-phone"
                type="tel"
                value={form.driverPhone}
                onChange={(e) => setField('driverPhone', e.target.value)}
                maxLength={100}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {providerAvailable && (
            <div>
              <label htmlFor="vehicle-provider" className={LABEL_CLASS}>{t('couriers.vehicles.providerMatch')}</label>
              <select
                id="vehicle-provider"
                value={form.providerVehicleKey}
                onChange={(e) => setField('providerVehicleKey', e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">
                  {editingId ? t('couriers.vehicles.keepMatch') : t('couriers.vehicles.noMatch')}
                </option>
                {providerVehicles.map((providerVehicle) => (
                  <option key={providerVehicle.key} value={providerVehicle.key}>
                    {providerVehicle.label
                      ? `${providerVehicle.plate} — ${providerVehicle.label}`
                      : providerVehicle.plate}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-secondary mt-1">{t('couriers.vehicles.providerMatchHint')}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? t('management.saving') : editingId ? t('common.save') : t('couriers.vehicles.add')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-text-main text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>
      )}

      {inactiveCount > 0 && (
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
          />
          {t('couriers.vehicles.showInactive', { count: inactiveCount })}
        </label>
      )}

      {loading ? (
        <p className="text-sm text-text-secondary">{t('common.loading')}</p>
      ) : visibleVehicles.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('couriers.vehicles.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {visibleVehicles.map((vehicle) => (
            <li
              key={vehicle.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 ${
                vehicle.active ? '' : 'opacity-60'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '18px' }}>
                    {getCourierVehicleType(vehicle.vehicleType)?.icon || 'directions_car'}
                  </span>
                  <span className="font-semibold text-text-main">{vehicle.plate}</span>
                  {vehicle.matched ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>link</span>
                      {vehicle.providerLabel || t('couriers.vehicles.matched')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {t('couriers.vehicles.notMatched')}
                    </span>
                  )}
                  {!vehicle.active && (
                    <span className="text-xs text-text-secondary">{t('couriers.vehicles.inactive')}</span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  {[getCourierVehicleType(vehicle.vehicleType)?.label, vehicle.driverName, vehicle.driverPhone]
                    .filter(Boolean)
                    .join(' · ') || t('couriers.vehicles.noDriver')}
                </p>
              </div>

              {canManage && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(vehicle)}
                    aria-label={t('common.edit')}
                    className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '18px' }}>edit</span>
                  </button>
                  {vehicle.matched && (
                    <button
                      type="button"
                      onClick={() => handleUnmatch(vehicle)}
                      aria-label={t('couriers.vehicles.unmatch')}
                      title={t('couriers.vehicles.unmatch')}
                      className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '18px' }}>link_off</span>
                    </button>
                  )}
                  {/* Pasif araçta da silme durur: kullanılmamış bir aracı pasife aldıktan sonra tamamen
                      kaldırabilmek gerekiyor (kullanıcı bildirimi). */}
                  {!vehicle.active && (
                    <button
                      type="button"
                      onClick={() => handleReactivate(vehicle)}
                      aria-label={t('couriers.vehicles.reactivate')}
                      title={t('couriers.vehicles.reactivate')}
                      className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-green-600" style={{ fontSize: '18px' }}>undo</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(vehicle)}
                    aria-label={t('couriers.vehicles.delete')}
                    title={t('couriers.vehicles.delete')}
                    className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: '18px' }}>delete</span>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
