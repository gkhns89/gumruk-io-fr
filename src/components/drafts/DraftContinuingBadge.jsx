import { t } from '../../locales';
import { formatDraftClock } from '../../utils/drafts';

// Taslaktan açılan yeni kayıt modalının başlığında: "Taslaktan devam ediyorsunuz · saat 21:00 itibarıyla silinir"
export default function DraftContinuingBadge({ draft, className = '' }) {
  if (!draft) return null;
  const time = formatDraftClock(draft.expiresAt);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-300 ${className}`}
    >
      <span className="material-symbols-outlined text-sm">draft</span>
      {time ? t('drafts.continuingUntil', { time }) : t('drafts.continuing')}
    </span>
  );
}
