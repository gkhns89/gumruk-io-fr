import { useCallback, useEffect, useState } from 'react';
import { companyLocationService } from '../../api/companyLocationService';
import { confirmDialog } from '../../utils/confirmDialog';
import { showError, showSuccess } from '../../utils/toastUtils';
import { t } from '../../locales';

const INPUT_CLASS = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-main focus:ring-2 focus:ring-primary';
const LABEL_CLASS = 'block text-xs font-medium text-text-main mb-1';

const emptyForm = () => ({ label: '', address: '', latitude: '', longitude: '', isDefault: false });

const formFromLocation = (location) => ({
  label: location.label || '',
  address: location.address || '',
  latitude: location.latitude != null ? String(location.latitude) : '',
  longitude: location.longitude != null ? String(location.longitude) : '',
  isDefault: Boolean(location.isDefault),
});

/**
 * Müşteri firmasının teslimat / alım noktaları (COURIER_LIVE_TRACKING bayrağı arkasında).
 *
 * Gönderi formunda varış noktası buradan seçilir. Koordinat isteğe bağlıdır ama girilmezse harita ve
 * yaklaşma bildirimi çalışmaz; ikisi birlikte girilmelidir. Nokta silinmez, pasife alınır.
 */
export default function ClientLocationsSection({ clientId, canManage = false }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    const result = await companyLocationService.listLocations(clientId);
    setLoading(false);
    if (!result.success) {
      showError(result.error);
      return;
    }
    setLocations(result.data);
  }, [clientId]);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const startEdit = (location) => {
    setEditingId(location.id);
    setForm(formFromLocation(location));
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) {
      showError(t('clients.locations.labelRequired'));
      return;
    }
    const hasLat = form.latitude.trim() !== '';
    const hasLng = form.longitude.trim() !== '';
    if (hasLat !== hasLng) {
      showError(t('clients.locations.coordinatesIncomplete'));
      return;
    }
    const payload = {
      label: form.label.trim(),
      address: form.address.trim() || null,
      latitude: hasLat ? Number(form.latitude) : null,
      longitude: hasLng ? Number(form.longitude) : null,
      isDefault: form.isDefault,
    };
    setSaving(true);
    const result = editingId
      ? await companyLocationService.updateLocation(clientId, editingId, payload)
      : await companyLocationService.createLocation(clientId, payload);
    setSaving(false);
    if (!result.success) {
      showError(result.error);
      return;
    }
    showSuccess(editingId ? t('clients.locations.updated') : t('clients.locations.created'));
    closeForm();
    loadLocations();
  };

  const handleDeactivate = async (location) => {
    const ok = await confirmDialog({
      title: t('clients.locations.deactivateTitle'),
      message: t('clients.locations.deactivateMessage', { label: location.label }),
      intent: 'warning',
    });
    if (!ok) return;
    const result = await companyLocationService.deactivateLocation(clientId, location.id);
    if (!result.success) {
      showError(result.error);
      return;
    }
    showSuccess(t('clients.locations.deactivated'));
    loadLocations();
  };

  const handleReactivate = async (location) => {
    const result = await companyLocationService.updateLocation(clientId, location.id, { active: true });
    if (!result.success) {
      showError(result.error);
      return;
    }
    showSuccess(t('clients.locations.reactivated'));
    loadLocations();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
        <h3 className="text-lg font-semibold text-text-main">{t('clients.locations.title')}</h3>
        {canManage && !showForm && (
          <button
            type="button"
            onClick={startAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_location_alt</span>
            {t('clients.locations.add')}
          </button>
        )}
      </div>

      <p className="text-xs text-text-secondary">{t('clients.locations.hint')}</p>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="location-label" className={LABEL_CLASS}>
                {t('clients.locations.label')} <span className="text-red-500">*</span>
              </label>
              <input
                id="location-label"
                type="text"
                value={form.label}
                onChange={(e) => setField('label', e.target.value)}
                maxLength={150}
                placeholder={t('clients.locations.labelPlaceholder')}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="location-address" className={LABEL_CLASS}>{t('clients.locations.address')}</label>
              <input
                id="location-address"
                type="text"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                maxLength={500}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="location-lat" className={LABEL_CLASS}>{t('clients.locations.latitude')}</label>
              <input
                id="location-lat"
                type="text"
                inputMode="decimal"
                value={form.latitude}
                onChange={(e) => setField('latitude', e.target.value)}
                placeholder="41.0082"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="location-lng" className={LABEL_CLASS}>{t('clients.locations.longitude')}</label>
              <input
                id="location-lng"
                type="text"
                inputMode="decimal"
                value={form.longitude}
                onChange={(e) => setField('longitude', e.target.value)}
                placeholder="28.9784"
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <p className="text-xs text-text-secondary">{t('clients.locations.coordinatesHint')}</p>

          <label className="flex items-center gap-2 text-sm text-text-main">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setField('isDefault', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
            />
            {t('clients.locations.isDefault')}
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? t('management.saving') : editingId ? t('common.save') : t('clients.locations.add')}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-text-main text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-text-secondary">{t('common.loading')}</p>
      ) : locations.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('clients.locations.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {locations.map((location) => (
            <li
              key={location.id}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 ${
                location.active ? '' : 'opacity-60'
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '18px' }}>
                    location_on
                  </span>
                  <span className="font-semibold text-text-main">{location.label}</span>
                  {location.isDefault && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                      {t('clients.locations.defaultBadge')}
                    </span>
                  )}
                  {location.latitude == null && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {t('clients.locations.noCoordinates')}
                    </span>
                  )}
                  {!location.active && (
                    <span className="text-xs text-text-secondary">{t('clients.locations.inactive')}</span>
                  )}
                </div>
                {location.address && (
                  <p className="text-xs text-text-secondary mt-0.5 break-words">{location.address}</p>
                )}
              </div>

              {canManage && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(location)}
                    aria-label={t('common.edit')}
                    className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '18px' }}>edit</span>
                  </button>
                  {location.active ? (
                    <button
                      type="button"
                      onClick={() => handleDeactivate(location)}
                      aria-label={t('clients.locations.deactivate')}
                      title={t('clients.locations.deactivate')}
                      className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-red-500" style={{ fontSize: '18px' }}>block</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReactivate(location)}
                      aria-label={t('clients.locations.reactivate')}
                      title={t('clients.locations.reactivate')}
                      className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-green-600" style={{ fontSize: '18px' }}>undo</span>
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
