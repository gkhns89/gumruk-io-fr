import { t } from '../../locales';
import NewFeatureBadge from '../common/NewFeatureBadge';

// Yeni kayıt modallarının alt çubuğundaki ikincil "Taslak olarak kaydet" düğmesi (DRAFTS bayrağı).
// Boyut ve yerleşim modalın kendi düğmelerine uysun diye `className` ile verilir.
export default function SaveDraftButton({ onClick, disabled = false, saving = false, isPilot = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || saving}
      className={`flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 ${className}`}
    >
      {saving ? (
        <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
      ) : (
        <span className="material-symbols-outlined text-lg">draft</span>
      )}
      <span>{saving ? t('drafts.saving') : t('unsavedChanges.saveDraft')}</span>
      {isPilot && !saving && <NewFeatureBadge />}
    </button>
  );
}
