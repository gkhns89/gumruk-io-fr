import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { featureFlagService } from '../../api/featureFlagService';
import { companyService } from '../../api/companyService';
import { showSuccess, showError } from '../../utils/toastUtils';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { t, getCurrentLocale } from '../../locales';

const STATES = ['OFF', 'PILOT', 'ON'];

const STATE_ACTIVE_CLASS = {
  OFF: 'bg-gray-600 text-white',
  PILOT: 'bg-emerald-600 text-white',
  ON: 'bg-primary text-white',
};

const toDraft = (flag) => ({
  state: flag.state,
  pilotCompanyIds: (flag.pilotCompanies || []).map((company) => company.id),
});

/**
 * Kademeli yayın bayrakları (SUPER_ADMIN). Bayraklar kodda tanımlı; burada durum ve pilot gümrük firmaları
 * seçilir. Pilot listesi ON/OFF'a geçince de korunur, tekrar PILOT'a dönülürse kaybolmasın.
 */
export default function FeatureFlagsPage() {
  const { refreshFeatures } = useFeatureFlags();
  const [flags, setFlags] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [flagResult, brokerResult] = await Promise.all([
      featureFlagService.list(),
      companyService.getAllBrokerCompanies(),
    ]);
    if (flagResult.success) {
      setFlags(flagResult.data);
      setDrafts(Object.fromEntries(flagResult.data.map((flag) => [flag.key, toDraft(flag)])));
    } else {
      showError(flagResult.error || t('featureFlags.loadError'));
    }
    if (brokerResult.success) {
      setBrokers(brokerResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateDraft = (key, patch) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const togglePilot = (key, companyId) => {
    const current = drafts[key]?.pilotCompanyIds || [];
    updateDraft(key, {
      pilotCompanyIds: current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId],
    });
  };

  const handleSave = async (key) => {
    const draft = drafts[key];
    if (draft.state === 'PILOT' && draft.pilotCompanyIds.length === 0) {
      showError(t('featureFlags.pilotNeedsCompany'));
      return;
    }
    setSavingKey(key);
    const result = await featureFlagService.update(key, draft);
    setSavingKey(null);
    if (result.success) {
      showSuccess(t('featureFlags.saved'));
      setFlags((prev) => prev.map((flag) => (flag.key === key ? result.data : flag)));
      setDrafts((prev) => ({ ...prev, [key]: toDraft(result.data) }));
      refreshFeatures();
    } else {
      showError(result.error || t('featureFlags.saveError'));
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary">flag</span>
            {t('featureFlags.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('featureFlags.subtitle')}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loading ? (
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-40" />
          ) : flags.length === 0 ? (
            <p className="text-center text-text-secondary py-12">{t('featureFlags.empty')}</p>
          ) : (
            flags.map((flag) => {
              const draft = drafts[flag.key] || toDraft(flag);
              const dirty = draft.state !== flag.state
                || [...draft.pilotCompanyIds].sort().join(',') !== (flag.pilotCompanies || []).map((c) => c.id).sort().join(',');

              return (
                <div
                  key={flag.key}
                  className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-text-main">{flag.description}</h2>
                      <p className="text-xs font-mono text-text-secondary mt-0.5">{flag.key}</p>
                      {flag.updatedAt && (
                        <p className="text-xs text-text-secondary mt-1">
                          {t('featureFlags.lastUpdated')}: {new Date(flag.updatedAt).toLocaleString(getCurrentLocale())}
                        </p>
                      )}
                    </div>

                    <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden self-start">
                      {STATES.map((state) => (
                        <button
                          key={state}
                          type="button"
                          aria-pressed={draft.state === state}
                          onClick={() => updateDraft(flag.key, { state })}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            draft.state === state
                              ? STATE_ACTIVE_CLASS[state]
                              : 'bg-white dark:bg-gray-800 text-text-main hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {t(`featureFlags.states.${state}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-sm text-text-secondary mb-4">{t(`featureFlags.stateHelp.${draft.state}`)}</p>

                  {draft.state === 'PILOT' && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-text-main mb-2">{t('featureFlags.pilotCompanies')}</p>
                      {brokers.length === 0 ? (
                        <p className="text-sm text-text-secondary">{t('featureFlags.noBrokers')}</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                          {brokers.map((broker) => (
                            <label
                              key={broker.id}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                draft.pilotCompanyIds.includes(broker.id)
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={draft.pilotCompanyIds.includes(broker.id)}
                                onChange={() => togglePilot(flag.key, broker.id)}
                                className="w-4 h-4 text-emerald-600 rounded"
                              />
                              <span className="text-sm text-text-main">
                                {broker.name}{broker.shortName ? ` (${broker.shortName})` : ''}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSave(flag.key)}
                      disabled={!dirty || savingKey === flag.key}
                      className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">save</span>
                      {savingKey === flag.key ? t('featureFlags.saving') : t('featureFlags.save')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}
