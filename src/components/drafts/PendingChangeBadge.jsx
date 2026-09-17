import { t } from '../../locales';

/**
 * Liste satırındaki "Bekleyen değişiklik" rozeti (DRAFTS bayrağı, taslak aşama 3).
 * Tıklanınca karşılaştırma açılır; satırın kendi tıklamasını tetiklemez.
 *
 * @param {Array}    drafts   Kaydın bekleyen taslakları (usePendingDrafts → pendingFor(id))
 * @param {Function} onClick  (drafts) => void
 */
export default function PendingChangeBadge({ drafts, onClick, className = '' }) {
  if (!Array.isArray(drafts) || drafts.length === 0) return null;
  const many = drafts.length > 1;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(drafts);
      }}
      title={many ? t('drafts.pending.badgeManyTitle', { count: drafts.length }) : t('drafts.pending.badgeTitle')}
      aria-label={t('drafts.pending.badge')}
      className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 ${className}`}
    >
      <span className="material-symbols-outlined text-sm">pending_actions</span>
      <span className="hidden sm:inline">{t('drafts.pending.badge')}</span>
      {many && <span>({drafts.length})</span>}
    </button>
  );
}
