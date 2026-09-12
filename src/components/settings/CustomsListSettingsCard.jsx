import { useCallback, useEffect, useMemo, useState } from 'react';
import { customsService } from '../../api/customsService';
import { showSuccess, showWarning } from '../../utils/toastUtils';
import { handleApiResponse, sanitizeError } from '../../utils/errorUtils';
import { confirmDialog } from '../../utils/confirmDialog';
import { t, getCurrentLocale } from '../../locales';

const RECENT_RUN_LIMIT = 5;
const LIST_LIMIT = 50;

const OUTCOME_STYLES = {
  APPLIED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const NEUTRAL_BADGE = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
const TRIGGERS = ['SCHEDULED', 'MANUAL'];

// Önizlemedeki değişiklik listeleri: ad dizisi + gerçek toplam (dizi en fazla 50 ad taşır)
const PREVIEW_LISTS = [
  { key: 'added', countKey: 'addedCount', icon: 'add_circle', tone: 'text-green-600 dark:text-green-400' },
  { key: 'deactivated', countKey: 'deactivatedCount', icon: 'remove_circle', tone: 'text-red-600 dark:text-red-400' },
  { key: 'reactivated', countKey: 'reactivatedCount', icon: 'restart_alt', tone: 'text-blue-600 dark:text-blue-400' },
  { key: 'missing', countKey: 'missingCount', icon: 'help', tone: 'text-text-secondary' },
];

const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString(getCurrentLocale()) : null);
const formatTime = (iso) =>
  (iso ? new Date(iso).toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit' }) : null);

// Arama Türkçe kurallarla küçük harfe çevrilerek yapılır ("İZMİR" → "izmir")
const normalize = (value) => (value || '').toLocaleLowerCase('tr-TR');

// Liste öğeleri ad olarak gelir; nesne gelirse okunabilir alanı kullan
const itemLabel = (item) =>
  (typeof item === 'string' ? item : item?.customsName || item?.name || String(item ?? ''));

const Spinner = () => (
  <div className="flex items-center justify-center py-6">
    <span className="material-symbols-outlined animate-spin text-primary text-[28px]">progress_activity</span>
  </div>
);

const ErrorLine = ({ message, onRetry }) => (
  <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2.5 text-xs text-red-700 dark:text-red-400">
    <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
    <p className="flex-1">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="flex-shrink-0 px-2 py-1 rounded-lg border border-red-300 dark:border-red-700 font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition"
      >
        {t('adminCommon.refresh')}
      </button>
    )}
  </div>
);

const OutcomeBadge = ({ outcome }) => {
  const style = OUTCOME_STYLES[outcome];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${style || NEUTRAL_BADGE}`}>
      {style ? t(`customsAdmin.runs.outcome.${outcome}`) : (outcome || '—')}
    </span>
  );
};

/**
 * Gümrük idareleri listesi (SUPER_ADMIN).
 *
 * Liste Ticaret Bakanlığı'nın Word dosyasından gelir. Güncelleme iki adımlıdır: backend kaynağı
 * okuyup farkı ve doğrulama sonucunu önizler (veritabanına dokunmadan), yönetici isterse uygular.
 * Doğrulamadan geçemeyen önizleme yalnızca "kontrollere rağmen uygula" ile ve onaydan sonra uygulanır.
 */
export default function CustomsListSettingsCard() {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [openLists, setOpenLists] = useState({});
  const [forceApply, setForceApply] = useState(false);
  const [applying, setApplying] = useState(false);

  const [listOpen, setListOpen] = useState(false);
  const [customs, setCustoms] = useState(null);
  const [customsLoading, setCustomsLoading] = useState(false);
  const [customsError, setCustomsError] = useState('');
  const [search, setSearch] = useState('');

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    const res = await customsService.getRefreshStatus();
    if (res.success) {
      setStatus(res.data);
      setStatusError('');
    } else {
      setStatusError(sanitizeError(res.error));
    }
    setStatusLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Mevcut liste sayfa açılışında değil, bölüm ilk açıldığında yüklenir
  const loadCustoms = useCallback(async () => {
    setCustomsLoading(true);
    const res = await customsService.getAllCustoms();
    if (res.success) {
      setCustoms(Array.isArray(res.data) ? res.data : []);
      setCustomsError('');
    } else {
      setCustomsError(sanitizeError(res.error));
    }
    setCustomsLoading(false);
  }, []);

  const toggleList = () => {
    const next = !listOpen;
    setListOpen(next);
    if (next && customs === null && !customsLoading) loadCustoms();
  };

  const searchIndex = useMemo(
    () => (customs || []).map((c) => ({
      ...c,
      searchText: normalize(`${c.customsName || ''} ${c.customsShortName || ''}`),
    })),
    [customs],
  );

  const matches = useMemo(() => {
    const query = normalize(search.trim());
    return query ? searchIndex.filter((c) => c.searchText.includes(query)) : searchIndex;
  }, [searchIndex, search]);

  const closePreview = () => {
    setPreview(null);
    setForceApply(false);
    setOpenLists({});
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setPreviewError('');
    const res = await customsService.previewRefresh();
    setPreviewing(false);
    if (res.success) {
      setPreview(res.data);
      setForceApply(false);
      setOpenLists({});
      return;
    }
    setPreview(null);
    setPreviewError(sanitizeError(res.error));
    handleApiResponse(res, null, null, 'CustomsListSettingsCard - preview');
  };

  const handleApply = async () => {
    if (!preview) return;
    const force = !preview.valid;
    if (force) {
      if (!forceApply) return;
      const ok = await confirmDialog({
        title: t('customsAdmin.preview.invalid'),
        message: t('customsAdmin.apply.forceMessage'),
        details: preview.problems?.length ? preview.problems : undefined,
        intent: 'danger',
        confirmText: t('customsAdmin.apply.forceConfirm'),
      });
      if (!ok) return;
    }

    setApplying(true);
    const res = await customsService.applyRefresh(preview.previewId, force);
    setApplying(false);
    if (!handleApiResponse(res, null, null, 'CustomsListSettingsCard - apply')) return;

    const run = res.data || {};
    if (run.outcome && run.outcome !== 'APPLIED') {
      showWarning(t('customsAdmin.apply.notApplied'));
    } else {
      showSuccess(t('customsAdmin.apply.success', {
        added: run.addedCount ?? 0,
        deactivated: run.deactivatedCount ?? 0,
        reactivated: run.reactivatedCount ?? 0,
      }));
    }
    closePreview();
    loadStatus();
    if (listOpen) loadCustoms();
    else setCustoms(null);
  };

  const runs = (status?.recentRuns || []).slice(0, RECENT_RUN_LIMIT);
  const canApply = !!preview && !applying && (preview.valid || forceApply);
  const expiryTime = formatTime(preview?.expiresAt);

  return (
    <div className="bg-white dark:bg-background-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <span className="material-symbols-outlined text-[22px] text-primary">account_balance</span>
        <div className="flex-1">
          <h2 className="font-semibold text-text-main">{t('customsAdmin.title')}</h2>
          <p className="text-xs text-text-secondary mt-0.5">{t('customsAdmin.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={loadStatus}
          disabled={statusLoading}
          title={t('adminCommon.refresh')}
          aria-label={t('adminCommon.refresh')}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-40"
        >
          <span className={`material-symbols-outlined text-[18px] text-text-secondary ${statusLoading ? 'animate-spin' : ''}`}>
            refresh
          </span>
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Özet ve son denemeler */}
        {statusLoading && !status ? (
          <Spinner />
        ) : (
          <>
            {statusError && <ErrorLine message={statusError} onRetry={status ? null : loadStatus} />}

            {status && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t('customsAdmin.summary.total'), value: status.currentTotal, tone: 'text-text-main' },
                    { label: t('adminCommon.active'), value: status.currentActive, tone: 'text-green-600 dark:text-green-400' },
                    { label: t('management.inactive'), value: status.currentInactive, tone: 'text-text-secondary' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-xs text-text-secondary">{item.label}</p>
                      <p className={`text-xl font-bold mt-1 ${item.tone}`}>{item.value ?? '—'}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 text-xs text-text-secondary">
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] flex-shrink-0">update</span>
                    {status.lastSourceUpdate
                      ? t('customsAdmin.summary.lastSourceUpdate', { date: formatDateTime(status.lastSourceUpdate) })
                      : t('customsAdmin.summary.never')}
                  </p>
                  {status.schedule && (
                    <p className="flex items-center gap-1.5 flex-wrap">
                      <span className="material-symbols-outlined text-[16px] flex-shrink-0">schedule</span>
                      {t('customsAdmin.summary.schedule')}
                      <code className="font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-text-main">
                        {status.schedule}
                      </code>
                    </p>
                  )}
                  {status.sourceUrl && (
                    <a
                      href={status.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      {t('customsAdmin.summary.source')}
                    </a>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-text-main mb-2">{t('customsAdmin.runs.title')}</h3>
                  {runs.length === 0 ? (
                    <p className="text-xs text-text-secondary">{t('customsAdmin.runs.empty')}</p>
                  ) : (
                    <ul className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                      {runs.map((run, index) => (
                        <li key={run.id ?? index} className="px-3 py-2.5 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <OutcomeBadge outcome={run.outcome} />
                            <span className="text-text-main">{formatDateTime(run.startedAt) || '—'}</span>
                            <span className="text-text-secondary">
                              · {TRIGGERS.includes(run.trigger) ? t(`customsAdmin.runs.trigger.${run.trigger}`) : (run.trigger || '—')}
                            </span>
                            {run.outcome !== 'FAILED' && (
                              <span
                                className="ml-auto font-mono"
                                title={t('customsAdmin.runs.counts', {
                                  added: run.addedCount ?? 0,
                                  deactivated: run.deactivatedCount ?? 0,
                                  reactivated: run.reactivatedCount ?? 0,
                                })}
                              >
                                <span className="text-green-600 dark:text-green-400">+{run.addedCount ?? 0}</span>{' '}
                                <span className="text-red-600 dark:text-red-400">−{run.deactivatedCount ?? 0}</span>{' '}
                                <span className="text-blue-600 dark:text-blue-400">↺{run.reactivatedCount ?? 0}</span>
                              </span>
                            )}
                          </div>
                          {(run.message || run.triggeredBy) && (
                            <div className="flex items-center gap-2 text-[11px] text-text-secondary min-w-0">
                              {run.message && (
                                <span className="truncate flex-1 min-w-0" title={run.message}>{run.message}</span>
                              )}
                              {run.triggeredBy && (
                                <span className="flex-shrink-0 ml-auto flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[13px]">person</span>
                                  {run.triggeredBy}
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Kaynaktan önizle → uygula */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing || applying}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary text-primary text-sm font-medium
                         hover:bg-primary/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`material-symbols-outlined text-[16px] ${previewing ? 'animate-spin' : ''}`}>
                {previewing ? 'progress_activity' : 'cloud_download'}
              </span>
              {previewing ? t('customsAdmin.preview.loading') : t('customsAdmin.preview.button')}
            </button>
            <p className="text-xs text-text-secondary">{t('customsAdmin.preview.hint')}</p>
          </div>

          {previewError && !previewing && <ErrorLine message={previewError} />}

          {preview && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-text-main">{t('customsAdmin.preview.title')}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {t('customsAdmin.preview.fetched', {
                      total: preview.fetchedTotal ?? 0,
                      active: preview.fetchedActive ?? 0,
                      inactive: preview.fetchedInactive ?? 0,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePreview}
                  disabled={applying}
                  title={t('customsAdmin.preview.close')}
                  aria-label={t('customsAdmin.preview.close')}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px] text-text-secondary">close</span>
                </button>
              </div>

              {preview.valid ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2 text-xs font-medium text-green-700 dark:text-green-400">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  {t('customsAdmin.preview.valid')}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    {t('customsAdmin.preview.invalid')}
                  </p>
                  {preview.problems?.length > 0 && (
                    <ul className="mt-1.5 ml-6 list-disc space-y-0.5">
                      {preview.problems.map((problem, i) => <li key={i}>{problem}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                {PREVIEW_LISTS.map(({ key, countKey, icon, tone }) => {
                  const names = Array.isArray(preview[key]) ? preview[key] : [];
                  const count = preview[countKey] ?? names.length;
                  const expandable = count > 0;
                  const open = expandable && !!openLists[key];
                  return (
                    <div key={key} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
                      <button
                        type="button"
                        onClick={() => setOpenLists((prev) => ({ ...prev, [key]: !prev[key] }))}
                        disabled={!expandable}
                        aria-expanded={open}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left disabled:cursor-default"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${tone}`}>{icon}</span>
                        <span className="flex-1 text-text-main">{t(`customsAdmin.preview.lists.${key}`)}</span>
                        <span className="text-xs font-semibold text-text-secondary">{count}</span>
                        <span
                          className={`material-symbols-outlined text-[18px] text-text-secondary transition-transform
                                      ${open ? 'rotate-180' : ''} ${expandable ? '' : 'invisible'}`}
                        >
                          expand_more
                        </span>
                      </button>
                      {open && (
                        <div className="px-3 pb-2.5">
                          <ul className="max-h-48 overflow-y-auto space-y-0.5 text-xs text-text-main">
                            {names.map((item, i) => {
                              const label = itemLabel(item);
                              return <li key={`${label}-${i}`} className="truncate" title={label}>{label}</li>;
                            })}
                          </ul>
                          {count > names.length && (
                            <p className="text-[11px] text-text-secondary mt-1">
                              {t('customsAdmin.preview.more', { count: count - names.length })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-text-secondary">
                <span>{t('customsAdmin.preview.unchanged', { count: preview.unchangedCount ?? 0 })}</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  {expiryTime
                    ? t('customsAdmin.preview.expiryUntil', { time: expiryTime })
                    : t('customsAdmin.preview.expiry')}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-primary/20">
                {!preview.valid && (
                  <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={forceApply}
                      onChange={(e) => setForceApply(e.target.checked)}
                      disabled={applying}
                      className="w-4 h-4 accent-red-600 rounded"
                    />
                    {t('customsAdmin.apply.force')}
                  </label>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closePreview}
                    disabled={applying}
                    className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm text-text-secondary
                               hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={!canApply}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold transition
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${preview.valid ? 'bg-primary hover:bg-primary/90' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    <span className={`material-symbols-outlined text-[16px] ${applying ? 'animate-spin' : ''}`}>
                      {applying ? 'progress_activity' : 'published_with_changes'}
                    </span>
                    {applying ? t('customsAdmin.apply.applying') : t('customsAdmin.apply.button')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mevcut liste — salt okunur, ilk açılışta yüklenir */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={toggleList}
            aria-expanded={listOpen}
            className="w-full flex items-center gap-2 text-sm font-semibold text-text-main"
          >
            <span className="material-symbols-outlined text-[18px] text-text-secondary">list</span>
            <span className="flex-1 text-left">{t('customsAdmin.list.title')}</span>
            <span className={`material-symbols-outlined text-[20px] text-text-secondary transition-transform ${listOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {listOpen && (
            <div className="mt-3 space-y-2">
              {customsLoading ? (
                <Spinner />
              ) : customsError ? (
                <ErrorLine message={customsError} onRetry={loadCustoms} />
              ) : customs && customs.length === 0 ? (
                <p className="text-center py-6 text-sm text-text-secondary">{t('customsAdmin.list.empty')}</p>
              ) : customs ? (
                <>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-gray-400 pointer-events-none">
                      search
                    </span>
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('customsAdmin.list.searchPlaceholder')}
                      aria-label={t('common.search')}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                                 bg-white dark:bg-gray-800 text-text-main text-sm
                                 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <p className="text-xs text-text-secondary">
                    {t('customsAdmin.list.matches', { count: matches.length })}
                    {matches.length > LIST_LIMIT && ` · ${t('customsAdmin.list.showingFirst', { shown: LIST_LIMIT })}`}
                  </p>
                  {matches.length === 0 ? (
                    <p className="text-center py-6 text-sm text-text-secondary">{t('customsAdmin.list.noMatch')}</p>
                  ) : (
                    <ul className="space-y-1 max-h-96 overflow-y-auto pr-1">
                      {matches.slice(0, LIST_LIMIT).map((c) => (
                        <li
                          key={c.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border
                                      ${c.status
                                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                                        : 'border-dashed border-gray-200 dark:border-gray-700'}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-main truncate" title={c.customsName}>{c.customsName}</p>
                            {c.updatedDate && (
                              <p className="text-[11px] text-text-secondary">
                                {t('adminCommon.lastUpdated', { date: formatDateTime(c.updatedDate) })}
                              </p>
                            )}
                          </div>
                          <span
                            className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium
                                        ${c.status ? OUTCOME_STYLES.APPLIED : NEUTRAL_BADGE}`}
                          >
                            {c.status ? t('adminCommon.active') : t('management.inactive')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
