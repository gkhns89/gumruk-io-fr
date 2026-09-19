import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { scheduledJobService } from '../../api/scheduledJobService';
import { showError } from '../../utils/toastUtils';
import { t, getCurrentLocale } from '../../locales';

/**
 * Zamanlanmış işlerin son durumu (SUPER_ADMIN, salt okunur). Veri `GET /api/admin/scheduled-jobs`:
 * kaydı olan işler + zamanlayıcının bildiği ama hiç çalışmamış işler. "Şimdi çalıştır" yok.
 *
 * Sorunlu işler (gecikmiş / hatalı / açık uyarı) en üstte listelenir.
 */

// İşin teknik adı (Sınıf.metot) kullanıcıya gösterilmez; backend'deki ScheduledJobLabels'ın eşi.
// Sayfaya özel olduğu için constants.js'e değil buraya konuldu: her sayfanın paketine girmesin.
const JOB_LABEL_KEYS = {
  'AgreementLifecycleScheduler.autoSuspendExpiredAgreements': 'agreementSuspension',
  'AgreementLifecycleScheduler.notifyUpcomingExpirations': 'agreementExpiryReminders',
  'ClickUpSyncScheduler.syncClickUpStatuses': 'clickUpSync',
  'CustomsNewsService.fetchAndSaveNews': 'customsNews',
  'CustomsRefreshService.scheduledRefresh': 'customsOfficeRefresh',
  'DraftScheduler.purgeExpiredDrafts': 'draftPurge',
  'DraftScheduler.sendDraftReminders': 'draftReminders',
  'NotificationService.cleanupOldNotifications': 'notificationCleanup',
  'PaymentEscalationScheduler.escalateRestrictionsIfNeeded': 'fullReadOnlyWarnings',
  'PaymentNotificationScheduler.autoDeductOverdueAddonBalances': 'addonAutoDeduction',
  'PaymentNotificationScheduler.sendOverdueNotifications': 'overdueNotices',
  'PaymentNotificationScheduler.sendAddonDueDateNotifications': 'addonReminders',
  'ScheduledJobWatchdog.warnAboutStaleJobs': 'staleJobCheck',
  'ShipsGoCreditExpirationScheduler.runDailyExpiration': 'gradarCreditExpiry',
  'ShipsGoSyncScheduler.runScheduledSync': 'gradarSync',
  'ShipsGoWebhookService.cleanupOldEventLog': 'gradarWebhookLogCleanup',
  'TcmbExchangeRateService.scheduledRefresh': 'tcmbRates',
  'TransactionScheduler.autoPromoteRegisteredToInspection': 'transactionAutoInspection',
};

const OUTCOME_CLASS = {
  SUCCESS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const NEVER_RAN_CLASS = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

/**
 * Bilinmeyen bir iş adı yanlış etiketlenmesin: teknik adına düşer (yeni eklenmiş, sözlüğe yazılmamış iş).
 * Bu durumda bile sağlayıcı adı ekrana çıkmaz — sınıf adlarındaki ShipsGo dış adıyla değiştirilir.
 */
const jobLabel = (jobName) => {
  const key = JOB_LABEL_KEYS[jobName];
  return key ? t(`scheduledJobs.jobs.${key}`) : String(jobName || '').replace(/ShipsGo/g, 'GRadar');
};

// Sunucu UTC LocalDateTime gönderiyor ("2026-09-19T06:15:00"), yani dilim eki yok: eklemezsek tarayıcı bunu
// yerel saat sanar ve tüm zamanlar 3 saat kayar.
const formatDateTime = (value) => {
  if (!value) return '—';
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(getCurrentLocale());
};

/** Aralığı okunur hâle getirir: 180 sn → "3 dk", 86400 → "1 gün". */
const formatInterval = (seconds) => {
  if (!seconds) return null;
  if (seconds % 86400 === 0) return t('scheduledJobs.intervalDays', { count: seconds / 86400 });
  if (seconds % 3600 === 0) return t('scheduledJobs.intervalHours', { count: seconds / 3600 });
  if (seconds % 60 === 0) return t('scheduledJobs.intervalMinutes', { count: seconds / 60 });
  return t('scheduledJobs.intervalSeconds', { count: seconds });
};

const isTroubled = (job) => job.stale || job.alertOpen || job.lastOutcome === 'FAILED' || job.lastOutcome === 'PARTIAL';

/** Sorunlular üstte: gecikmiş > hatalı > kısmi > açık uyarı > sorunsuz; sonra ada göre. */
const severity = (job) => {
  if (job.stale) return 0;
  if (job.lastOutcome === 'FAILED') return 1;
  if (job.lastOutcome === 'PARTIAL') return 2;
  if (job.alertOpen) return 3;
  return 4;
};

function StatusBadges({ job }) {
  const outcome = job.lastOutcome;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${outcome ? OUTCOME_CLASS[outcome] || NEVER_RAN_CLASS : NEVER_RAN_CLASS}`}>
        {outcome ? t(`scheduledJobs.outcome.${outcome}`) : t('scheduledJobs.outcome.NEVER')}
      </span>
      {job.stale && (
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
          title={t('scheduledJobs.staleHelp')}
        >
          {t('scheduledJobs.stale')}
        </span>
      )}
      {job.alertOpen && (
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
          title={t('scheduledJobs.alertOpenHelp')}
        >
          {t('scheduledJobs.alertOpen')}
        </span>
      )}
    </div>
  );
}

function JobName({ job }) {
  const interval = formatInterval(job.expectedIntervalSeconds);
  return (
    <div className="min-w-0">
      <p className="font-medium text-text-main">{jobLabel(job.jobName)}</p>
      {/* Teknik ad ekrana yazılmaz: sağlayıcı adı (ShipsGo) sınıf adlarında geçiyor ve hiçbir görünen
          yüzeyde olmamalı. Yerine planın kendisi gösterilir; bilinmeyen işin adını jobLabel zaten yazar. */}
      {job.schedule && (
        <p className="text-xs font-mono text-text-secondary truncate" title={job.schedule}>
          {job.schedule}
        </p>
      )}
      {interval && <p className="text-xs text-text-secondary mt-0.5">{t('scheduledJobs.interval')}: {interval}</p>}
    </div>
  );
}

function Counts({ job }) {
  if (!job.lastFinishedAt) return <span className="text-text-secondary">—</span>;
  return (
    <div className="text-xs text-text-secondary space-y-0.5">
      <p>{t('scheduledJobs.counts.succeeded')}: <span className="text-text-main font-medium">{job.succeededCount}</span></p>
      <p>
        {t('scheduledJobs.counts.failed')}:{' '}
        <span className={job.failedCount > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-text-main font-medium'}>
          {job.failedCount}
        </span>
      </p>
      <p>{t('scheduledJobs.counts.skipped')}: <span className="text-text-main font-medium">{job.skippedCount}</span></p>
    </div>
  );
}

export default function ScheduledJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await scheduledJobService.list();
    if (result.success) {
      setJobs(result.data);
      setLoadedAt(new Date());
    } else {
      showError(result.error || t('scheduledJobs.loadError'));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(
    () => [...jobs].sort((a, b) => severity(a) - severity(b) || jobLabel(a.jobName).localeCompare(jobLabel(b.jobName), getCurrentLocale())),
    [jobs]
  );
  const troubled = useMemo(() => sorted.filter(isTroubled).length, [sorted]);

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary">schedule</span>
                {t('scheduledJobs.title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{t('scheduledJobs.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 self-start"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              {t('scheduledJobs.refresh')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loading ? (
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-64" />
          ) : sorted.length === 0 ? (
            <p className="text-center text-text-secondary py-12">{t('scheduledJobs.empty')}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={`px-3 py-1 rounded-full font-semibold ${
                    troubled === 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}
                >
                  {troubled === 0
                    ? t('scheduledJobs.allHealthy', { count: sorted.length })
                    : t('scheduledJobs.troubled', { count: troubled, total: sorted.length })}
                </span>
                {loadedAt && (
                  <span className="text-text-secondary">
                    {t('scheduledJobs.loadedAt')}: {loadedAt.toLocaleTimeString(getCurrentLocale())}
                  </span>
                )}
              </div>

              {/* Masaüstü: tablo */}
              <div className="hidden lg:block bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs uppercase text-text-secondary">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{t('scheduledJobs.columns.job')}</th>
                      <th className="px-4 py-3 font-semibold">{t('scheduledJobs.columns.status')}</th>
                      <th className="px-4 py-3 font-semibold">{t('scheduledJobs.columns.lastRun')}</th>
                      <th className="px-4 py-3 font-semibold">{t('scheduledJobs.columns.lastSuccess')}</th>
                      <th className="px-4 py-3 font-semibold">{t('scheduledJobs.columns.nextRun')}</th>
                      <th className="px-4 py-3 font-semibold">{t('scheduledJobs.columns.counts')}</th>
                      <th className="px-4 py-3 font-semibold text-center">{t('scheduledJobs.columns.consecutiveFailures')}</th>
                      <th className="px-4 py-3 font-semibold">{t('scheduledJobs.columns.lastError')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sorted.map((job) => (
                      <tr key={job.jobName} className={job.stale ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                        <td className="px-4 py-3 max-w-xs"><JobName job={job} /></td>
                        <td className="px-4 py-3"><StatusBadges job={job} /></td>
                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDateTime(job.lastFinishedAt)}</td>
                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDateTime(job.lastSuccessAt)}</td>
                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDateTime(job.nextExpectedRunAt)}</td>
                        <td className="px-4 py-3"><Counts job={job} /></td>
                        <td className="px-4 py-3 text-center">
                          <span className={job.consecutiveFailures > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-text-secondary'}>
                            {job.consecutiveFailures}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary max-w-sm">
                          {job.errorSummary ? (
                            <span className="line-clamp-3" title={job.errorSummary}>{job.errorSummary}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobil: kart listesi */}
              <div className="lg:hidden space-y-3">
                {sorted.map((job) => (
                  <div
                    key={job.jobName}
                    className={`bg-white dark:bg-background-dark rounded-xl shadow-sm border p-4 transition-colors ${
                      job.stale ? 'border-red-300 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <JobName job={job} />
                      <StatusBadges job={job} />
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <dt className="text-text-secondary">{t('scheduledJobs.columns.lastRun')}</dt>
                      <dd className="text-text-main text-right">{formatDateTime(job.lastFinishedAt)}</dd>
                      <dt className="text-text-secondary">{t('scheduledJobs.columns.lastSuccess')}</dt>
                      <dd className="text-text-main text-right">{formatDateTime(job.lastSuccessAt)}</dd>
                      <dt className="text-text-secondary">{t('scheduledJobs.columns.nextRun')}</dt>
                      <dd className="text-text-main text-right">{formatDateTime(job.nextExpectedRunAt)}</dd>
                      <dt className="text-text-secondary">{t('scheduledJobs.columns.consecutiveFailures')}</dt>
                      <dd className="text-text-main text-right">{job.consecutiveFailures}</dd>
                      {job.lastFinishedAt && (
                        <>
                          <dt className="text-text-secondary">{t('scheduledJobs.columns.counts')}</dt>
                          <dd className="text-text-main text-right">
                            {job.succeededCount} / {job.failedCount} / {job.skippedCount}
                          </dd>
                        </>
                      )}
                    </dl>
                    {job.errorSummary && (
                      <p className="mt-2 text-xs text-red-700 dark:text-red-400 break-words">{job.errorSummary}</p>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-text-secondary">{t('scheduledJobs.footnote')}</p>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
