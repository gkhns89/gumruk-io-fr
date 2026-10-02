import { t } from '../../locales';

/**
 * Liste satırındaki "Değişiklik talebi" rozeti (CHANGE_REQUESTS bayrağı).
 * Tıklanınca karşılaştırma açılır; satırın kendi tıklamasını tetiklemez.
 *
 * Taslak rozetinden ayrı durur ve ayrı görünür (bu turuncu, taslaklarınki sarı "pending_actions"): ikisi aynı
 * satırda birlikte olabilir ve farklı şeyleri söylerler — biri "birisi bu kaydı düzenlemeye başlamış", diğeri
 * "birisi bu kayıt için karar bekliyor".
 *
 * @param {object}   request Kaydın bekleyen talebi (usePendingChangeRequests → requestFor(id))
 * @param {Function} onClick (request) => void
 */
export default function ChangeRequestBadge({ request, onClick, className = '' }) {
  if (!request) return null;
  const mine = request.mine === true;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(request);
      }}
      title={mine ? t('changeRequests.badge.mineTitle') : t('changeRequests.badge.title', {
        name: request.requestedBy?.fullName || '—',
      })}
      aria-label={t('changeRequests.badge.label')}
      className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-800 transition-colors hover:bg-orange-100 dark:border-orange-700/60 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 ${className}`}
    >
      <span className="material-symbols-outlined text-sm">rate_review</span>
      <span className="hidden sm:inline">
        {mine ? t('changeRequests.badge.mine') : t('changeRequests.badge.label')}
      </span>
    </button>
  );
}
