import { useCallback, useEffect, useState } from 'react';
import { draftService, isFeatureDisabled } from '../../api/draftService';
import { confirmDialog } from '../../utils/confirmDialog';
import { isStackedDialogOpen } from '../../utils/unsavedChangesDialog';
import { showSuccess, showError } from '../../utils/toastUtils';
import { draftDisplayLabel, formatDraftDateTime, readDraftPayload } from '../../utils/drafts';
import { t } from '../../locales';

/**
 * Bir modülün kaydedilmemiş taslakları (DRAFTS). `DraftsControl` açar.
 *  - Kendi taslağı: "Devam et" yeni kayıt modalını taslakla açar (ödeme kısıtında kilitli), "Sil".
 *  - BROKER_ADMIN'in gördüğü başkasının taslağı (`mine` false): oluşturanın adı, yalnızca "Sil".
 */
export default function DraftsPanel({ module, purgeTime, canContinue = true, highlightId = null, onContinue, onClose }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await draftService.listDrafts(module);
    // Bayrak sayfa açıkken kapatıldı: bayraklar tazelenir, panel sessizce kapanır
    if (isFeatureDisabled(result)) {
      onClose();
      return;
    }
    if (result.success) setDrafts(result.data);
    else setError(result.error);
    setLoading(false);
  }, [module, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  // ESC kapatır; üstte silme onayı açıksa ESC onundur.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || isStackedDialogOpen()) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleContinue = (draft) => {
    if (!readDraftPayload(draft, module)) {
      showError(t('drafts.unsupportedVersion'));
      return;
    }
    onContinue(draft);
  };

  const handleDelete = async (draft) => {
    const ok = await confirmDialog({
      title: t('drafts.panel.deleteTitle'),
      message: t('drafts.panel.deleteMessage', { label: draftDisplayLabel(draft) }),
      intent: 'danger',
      confirmText: t('drafts.panel.delete'),
    });
    if (!ok) return;

    setDeletingId(draft.id);
    const result = await draftService.deleteDraft(draft.id);
    setDeletingId(null);
    if (result.success) {
      setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
      // Zaten yoksa (temizlenmiş, süresi dolmuş, başkası silmiş) listeden sessizce kalkar
      if (!result.data?.alreadyGone) showSuccess(t('drafts.panel.deleted'));
    } else if (isFeatureDisabled(result)) {
      onClose();
    } else {
      showError(result.error);
    }
  };

  const moduleName = t(`drafts.modules.${module}`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-colors animate-zoom-in dark:bg-background-dark"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drafts-panel-title"
      >
        {/* Başlık */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5 p-5 dark:border-gray-700 dark:from-primary/20 dark:to-primary/10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <span className="material-symbols-outlined text-primary">draft</span>
            </div>
            <div className="min-w-0">
              <h2 id="drafts-panel-title" className="text-lg font-bold text-text-main">
                {t('drafts.panel.title', { module: moduleName })}
              </h2>
              {purgeTime && (
                <p className="text-sm text-text-secondary">{t('drafts.panel.purgeNote', { time: purgeTime })}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            aria-label={t('common.close')}
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-text-secondary">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              <p className="text-sm">{t('common.loading')}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-red-500">error</span>
              <p className="text-sm text-text-secondary">{error}</p>
              <button
                type="button"
                onClick={load}
                className="rounded-lg px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                {t('drafts.panel.retry')}
              </button>
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">draft</span>
              <p className="text-sm font-semibold text-text-main">{t('drafts.panel.empty')}</p>
              <p className="max-w-sm text-xs text-text-secondary">{t('drafts.panel.emptyHint')}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {drafts.map((draft) => {
                const mine = draft.mine !== false;
                const deleting = deletingId === draft.id;
                const highlighted = highlightId != null && String(draft.id) === String(highlightId);
                return (
                  <li
                    key={draft.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      highlighted
                        ? 'border-primary/60 bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text-main">{draftDisplayLabel(draft)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">person</span>
                            {mine
                              ? t('drafts.panel.you')
                              : t('drafts.panel.createdBy', { name: draft.createdBy?.fullName || '—' })}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {t('drafts.panel.updatedAt', { time: formatDraftDateTime(draft.updatedAt || draft.createdAt) })}
                          </span>
                          {draft.expiresAt && (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                              <span className="material-symbols-outlined text-sm">auto_delete</span>
                              {t('drafts.panel.expiresAt', { time: formatDraftDateTime(draft.expiresAt) })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        {mine ? (
                          <button
                            type="button"
                            onClick={() => handleContinue(draft)}
                            disabled={!canContinue || deleting}
                            title={canContinue ? undefined : t('payment.restrictionWarning')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-base">{canContinue ? 'edit_note' : 'lock'}</span>
                            {t('drafts.panel.continue')}
                          </button>
                        ) : (
                          <span className="text-xs italic text-text-secondary">{t('drafts.panel.othersHint')}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(draft)}
                          disabled={deleting}
                          aria-label={t('drafts.panel.delete')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          {deleting ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                          ) : (
                            <span className="material-symbols-outlined text-base">delete</span>
                          )}
                          <span className="hidden sm:inline">{t('drafts.panel.delete')}</span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
