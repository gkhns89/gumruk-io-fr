import { useCallback, useEffect, useMemo, useState } from 'react';
import { companyService } from '../../api/companyService';
import { showSuccess, showError } from '../../utils/toastUtils';
import NewFeatureBadge from '../common/NewFeatureBadge';
import { t } from '../../locales';

// ISO gün sırası; sözlükte `days.short.1` Pazartesi
const WEEK_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const toClock = (value) => (typeof value === 'string' && /^\d{2}:\d{2}/.test(value) ? value.substring(0, 5) : '');

const normalize = (data) => ({
  workDays: WEEK_DAYS.filter((day) => Array.isArray(data?.workDays) && data.workDays.includes(day)),
  workStart: toClock(data?.workStart),
  workEnd: toClock(data?.workEnd),
  draftPurgeTime: toClock(data?.draftPurgeTime),
});

const validate = (form) => {
  const errors = {};
  const required = t('companySettings.workSettings.validation.timeRequired');
  if (form.workDays.length === 0) errors.workDays = t('companySettings.workSettings.validation.daysRequired');
  if (!form.workStart) errors.workStart = required;
  if (!form.workEnd) errors.workEnd = required;
  // "HH:mm" metinleri sözlük sırasıyla saat sırasıdır
  if (form.workStart && form.workEnd && form.workStart >= form.workEnd) {
    errors.workEnd = t('companySettings.workSettings.validation.startBeforeEnd');
  }
  if (!form.draftPurgeTime) errors.draftPurgeTime = required;
  return errors;
};

function TimeField({ id, label, hint, value, onChange, error }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text-main">{label}</label>
      <input
        id={id}
        type="time"
        step={60}
        value={value}
        onChange={onChange}
        className={`h-11 w-full rounded-xl border bg-white px-3 text-sm text-text-main transition-colors focus:outline-none focus:ring-2 dark:bg-gray-800 dark:[color-scheme:dark] ${
          error
            ? 'border-red-400 focus:ring-red-400 dark:border-red-500'
            : 'border-gray-300 focus:border-primary focus:ring-primary/50 dark:border-gray-600'
        }`}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>
      )}
    </div>
  );
}

/**
 * Firma ayarlarında "Çalışma saatleri ve taslaklar" kartı (DRAFTS bayrağı, yalnızca BROKER_ADMIN).
 * Çalışılan günler ve mesai saatleri taslak hatırlatmalarının ne zaman gideceğini, silme saati taslakların her gün
 * ne zaman temizleneceğini belirler. Saatler Europe/Istanbul.
 */
export default function WorkSettingsCard({ isPilot = false }) {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const result = await companyService.getWorkSettings();
    if (result.success) {
      const next = normalize(result.data);
      setSaved(next);
      setForm(next);
    } else {
      setLoadError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const errors = useMemo(() => (form ? validate(form) : {}), [form]);
  const isDirty = !!form && !!saved && JSON.stringify(form) !== JSON.stringify(saved);
  const hasErrors = Object.keys(errors).length > 0;
  // Hatalar yalnızca kullanıcı bir şey değiştirdikten sonra gösterilir
  const visibleErrors = isDirty ? errors : {};

  const toggleDay = (day) => setForm((prev) => ({
    ...prev,
    workDays: prev.workDays.includes(day)
      ? prev.workDays.filter((d) => d !== day)
      : WEEK_DAYS.filter((d) => d === day || prev.workDays.includes(d)),
  }));

  const setField = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!isDirty || hasErrors || saving) return;
    setSaving(true);
    const result = await companyService.updateWorkSettings(form);
    setSaving(false);
    if (!result.success) {
      showError(result.error);
      return;
    }
    const next = Array.isArray(result.data?.workDays) ? normalize(result.data) : form;
    setSaved(next);
    setForm(next);
    showSuccess(t('companySettings.workSettings.saved'));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-background-dark">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <span className="material-symbols-outlined text-[22px] text-primary">schedule</span>
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 font-semibold text-text-main">
            {t('companySettings.workSettings.title')}
            {isPilot && <NewFeatureBadge />}
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">{t('companySettings.workSettings.hint')}</p>
        </div>
      </div>

      <div className="space-y-5 p-6">
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
        ) : form && (
          <>
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-text-main">
                {t('companySettings.workSettings.workDays')}
              </legend>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEK_DAYS.map((day, index) => {
                  const active = form.workDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-pressed={active}
                      title={t(`days.long.${index + 1}`)}
                      className={`h-10 rounded-lg border text-xs font-semibold transition-colors sm:text-sm ${
                        active
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 bg-white text-text-secondary hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t(`days.short.${index + 1}`)}
                    </button>
                  );
                })}
              </div>
              {visibleErrors.workDays && <p className="mt-1.5 text-xs text-red-500">{visibleErrors.workDays}</p>}
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TimeField
                id="work-start"
                label={t('companySettings.workSettings.workStart')}
                value={form.workStart}
                onChange={setField('workStart')}
                error={visibleErrors.workStart}
              />
              <TimeField
                id="work-end"
                label={t('companySettings.workSettings.workEnd')}
                value={form.workEnd}
                onChange={setField('workEnd')}
                error={visibleErrors.workEnd}
              />
              <TimeField
                id="draft-purge-time"
                label={t('companySettings.workSettings.draftPurgeTime')}
                hint={t('companySettings.workSettings.draftPurgeHint')}
                value={form.draftPurgeTime}
                onChange={setField('draftPurgeTime')}
                error={visibleErrors.draftPurgeTime}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || hasErrors || saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                    {t('companySettings.workSettings.saving')}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">save</span>
                    {t('common.save')}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
