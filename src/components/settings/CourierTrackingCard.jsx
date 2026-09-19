import { useCallback, useEffect, useState } from 'react';
import { companyService } from '../../api/companyService';
import { vehicleTrackingService, isTrackingBusy } from '../../api/vehicleTrackingService';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getCurrentLocale, t } from '../../locales';
import NewFeatureBadge from '../common/NewFeatureBadge';

const INPUT_CLASS = 'h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-text-main transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-gray-600 dark:bg-gray-800';

const formatMoment = (value) => {
  if (!value) return null;
  const date = new Date(value.endsWith?.('Z') ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(getCurrentLocale(), { dateStyle: 'short', timeStyle: 'short' });
};

/**
 * Firma ayarlarında "Kurye canlı takibi" kartı (COURIER_LIVE_TRACKING bayrağı, yalnızca BROKER_ADMIN).
 *
 * İki bölüm: sağlayıcı bağlantısı (token yalnızca yazılır, yanıtta `tokenSet` döner) ve yaklaşma eşikleri.
 * Eşikler firmanın çalışma ayarlarında saklanır, bu yüzden kaydederken mevcut çalışma ayarları da geri gönderilir.
 * Sunucu taklit modundaysa bu ayrıca yazılır: liste ve konumlar gerçek cihazlardan gelmiyor demektir.
 */
export default function CourierTrackingCard({ isPilot = false }) {
  const [integration, setIntegration] = useState(null);
  const [workSettings, setWorkSettings] = useState(null);
  const [token, setToken] = useState('');
  const [approaching, setApproaching] = useState('');
  const [nearby, setNearby] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingConnection, setSavingConnection] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const [integrationResult, settingsResult] = await Promise.all([
      vehicleTrackingService.getIntegration(),
      companyService.getWorkSettings(),
    ]);
    setLoading(false);
    if (!integrationResult.success) {
      setLoadError(integrationResult.error);
      return;
    }
    setIntegration(integrationResult.data);
    if (settingsResult.success) {
      setWorkSettings(settingsResult.data);
      setApproaching(String(settingsResult.data?.approachingMeters ?? 3000));
      setNearby(String(settingsResult.data?.nearbyMeters ?? 500));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveConnection = async (nextActive) => {
    setSavingConnection(true);
    const result = await vehicleTrackingService.updateIntegration({
      provider: integration?.provider || 'MOBILIZ',
      active: nextActive,
      ...(token.trim() ? { apiToken: token.trim() } : {}),
    });
    setSavingConnection(false);
    if (!result.success) {
      showError(result.error);
      return;
    }
    setIntegration(result.data);
    setToken('');
    showSuccess(t('companySettings.courierTracking.connectionSaved'));
  };

  const clearToken = async () => {
    setSavingConnection(true);
    const result = await vehicleTrackingService.updateIntegration({
      provider: integration?.provider || 'MOBILIZ',
      active: false,
      clearToken: true,
    });
    setSavingConnection(false);
    if (!result.success) {
      showError(result.error);
      return;
    }
    setIntegration(result.data);
    showSuccess(t('companySettings.courierTracking.tokenCleared'));
  };

  const testConnection = async () => {
    setTesting(true);
    const result = await vehicleTrackingService.testIntegration();
    setTesting(false);
    if (!result.success) {
      // Meşguliyet kalıcı bir arıza değil, "birazdan tekrar dene" demektir
      showError(result.error, isTrackingBusy(result) ? { autoClose: 4000 } : undefined);
      return;
    }
    setIntegration(result.data);
    showSuccess(t('companySettings.courierTracking.testOk'));
  };

  const saveThresholds = async () => {
    const approachingMeters = Number(approaching);
    const nearbyMeters = Number(nearby);
    if (!Number.isFinite(approachingMeters) || !Number.isFinite(nearbyMeters)) {
      showError(t('companySettings.courierTracking.thresholdInvalid'));
      return;
    }
    if (nearbyMeters >= approachingMeters) {
      showError(t('companySettings.courierTracking.thresholdOrder'));
      return;
    }
    if (!workSettings) {
      showError(t('companySettings.courierTracking.thresholdNeedsWorkSettings'));
      return;
    }
    setSavingThresholds(true);
    // Uç çalışma ayarlarının tamamını bekliyor; saatler olduğu gibi geri gönderilir
    const result = await companyService.updateWorkSettings({
      workDays: workSettings.workDays,
      workStart: workSettings.workStart,
      workEnd: workSettings.workEnd,
      draftPurgeTime: workSettings.draftPurgeTime,
      approachingMeters,
      nearbyMeters,
    });
    setSavingThresholds(false);
    if (!result.success) {
      showError(result.error);
      return;
    }
    setWorkSettings(result.data);
    showSuccess(t('companySettings.courierTracking.thresholdsSaved'));
  };

  const lastSuccess = formatMoment(integration?.lastSuccessAt);
  const lastError = formatMoment(integration?.lastErrorAt);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-background-dark">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <span className="material-symbols-outlined text-[22px] text-primary">share_location</span>
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 font-semibold text-text-main">
            {t('companySettings.courierTracking.title')}
            {isPilot && <NewFeatureBadge />}
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">{t('companySettings.courierTracking.hint')}</p>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary" />
            {t('common.loading')}
          </div>
        ) : loadError ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
            <button
              type="button"
              onClick={load}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {t('companySettings.workSettings.retry')}
            </button>
          </div>
        ) : (
          <>
            {integration?.liveMode === false && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>science</span>
                {t('companySettings.courierTracking.stubMode')}
              </p>
            )}

            {/* Bağlantı */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-text-main">
                  {t('companySettings.courierTracking.status')}
                </span>
                {integration?.active && integration?.tokenSet ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                    {t('companySettings.courierTracking.statusActive')}
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {integration?.tokenSet
                      ? t('companySettings.courierTracking.statusPaused')
                      : t('companySettings.courierTracking.statusMissing')}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="tracking-token" className="mb-1.5 block text-sm font-medium text-text-main">
                  {t('companySettings.courierTracking.token')}
                </label>
                <input
                  id="tracking-token"
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={integration?.tokenSet
                    ? t('companySettings.courierTracking.tokenSetPlaceholder')
                    : t('companySettings.courierTracking.tokenPlaceholder')}
                  className={INPUT_CLASS}
                />
                <p className="mt-1 text-xs text-text-secondary">{t('companySettings.courierTracking.tokenHint')}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => saveConnection(true)}
                  disabled={savingConnection || (!token.trim() && !integration?.tokenSet)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                >
                  {savingConnection ? t('management.saving') : t('companySettings.courierTracking.saveAndEnable')}
                </button>
                {integration?.active && (
                  <button
                    type="button"
                    onClick={() => saveConnection(false)}
                    disabled={savingConnection}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    {t('companySettings.courierTracking.pause')}
                  </button>
                )}
                {integration?.tokenSet && (
                  <>
                    <button
                      type="button"
                      onClick={testConnection}
                      disabled={testing}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      {testing ? t('companySettings.courierTracking.testing') : t('companySettings.courierTracking.test')}
                    </button>
                    <button
                      type="button"
                      onClick={clearToken}
                      disabled={savingConnection}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {t('companySettings.courierTracking.clearToken')}
                    </button>
                  </>
                )}
              </div>

              {(lastSuccess || lastError) && (
                <div className="text-xs text-text-secondary">
                  {lastSuccess && <p>{t('companySettings.courierTracking.lastSuccess', { moment: lastSuccess })}</p>}
                  {lastError && (
                    <p className="text-red-600 dark:text-red-400">
                      {t('companySettings.courierTracking.lastError', {
                        moment: lastError,
                        code: integration?.lastErrorCode || '-',
                      })}
                      {integration?.consecutiveFailures > 1
                        && ` (${t('companySettings.courierTracking.failures', { count: integration.consecutiveFailures })})`}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Yaklaşma eşikleri */}
            <div className="space-y-3 border-t border-gray-100 pt-5 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-medium text-text-main">{t('companySettings.courierTracking.thresholds')}</h3>
                <p className="mt-0.5 text-xs text-text-secondary">{t('companySettings.courierTracking.thresholdsHint')}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="threshold-approaching" className="mb-1.5 block text-sm font-medium text-text-main">
                    {t('companySettings.courierTracking.approaching')}
                  </label>
                  <input
                    id="threshold-approaching"
                    type="number"
                    min={100}
                    max={50000}
                    step={100}
                    value={approaching}
                    onChange={(e) => setApproaching(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="threshold-nearby" className="mb-1.5 block text-sm font-medium text-text-main">
                    {t('companySettings.courierTracking.nearby')}
                  </label>
                  <input
                    id="threshold-nearby"
                    type="number"
                    min={100}
                    max={50000}
                    step={50}
                    value={nearby}
                    onChange={(e) => setNearby(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={saveThresholds}
                disabled={savingThresholds}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
              >
                {savingThresholds ? t('management.saving') : t('common.save')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
