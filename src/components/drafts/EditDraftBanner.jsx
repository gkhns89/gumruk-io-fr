import PendingChangeModal from './PendingChangeModal';
import { formatDraftDateTime } from '../../utils/drafts';
import { t } from '../../locales';

/**
 * Düzenleme modalının üstündeki taslak bandı (DRAFTS bayrağı, taslak aşama 4).
 *
 * Kullanıcının bu kayıtta kendi bekleyen taslağı varsa form **kaydın şimdiki hâli + taslağın farkı** ile açılır
 * (`useEditDraftPrefill`); bu bant ne olduğunu söyler ve üç çıkış sunar: orijinali yükle, karşılaştır, taslağı sil.
 * Her şey yolundayken sakin görünür — kullanıcı zaten bilerek kendi taslağına dönmüştür.
 *
 * Bant yalnızca **gerçek çakışmada** kırmızıya döner: taslakçının değiştirdiği bir alanı bu arada başkası da
 * değiştirmişse (ya da kaydederken 409 geldiyse, ya da taslak `payload.base` taşımayan eski bir taslaksa).
 * Kaydın başka alanlarının değişmiş olması çakışma değil, bilgidir: taslak onlara dokunmaz. Kaydetmek yine
 * serbesttir — kullanıcının bilerek üzerine yazması engellenmez.
 *
 * "Karşılaştır" var olan karşılaştırma penceresini salt okunur açar: uygulama ve silme bandın kendi düğmelerinde.
 *
 * @param {object}   props.prefill         useEditDraftPrefill sonucu
 * @param {string}   props.module          DRAFT_MODULES değeri
 * @param {object}   props.record          Kaydın şimdiki hâli
 * @param {Array}    props.fields          Alan tanımları (bkz. utils/draftDiff.js)
 * @param {Function} props.recordToFields  (record) => karşılaştırma alanları
 * @param {Function} props.payloadToFields (payloadLike, record) => karşılaştırma alanları
 * @param {Function} props.recordToPayload (record) => kaydın şimdiki payload'ı
 * @param {string}   [props.className]
 */
export default function EditDraftBanner({ prefill, module, record, fields, recordToFields, payloadToFields,
  recordToPayload, className = '' }) {
  const { draft, pending, hasConflict } = prefill;
  const stale = hasConflict;
  const conflicts = pending?.conflicts || [];
  const otherChanges = pending?.otherChanges || [];

  if (!draft) return null;

  const time = formatDraftDateTime(draft.updatedAt || draft.createdAt);
  const onRecord = prefill.mode === 'record';

  const actionBase = 'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
  const quietAction = `${actionBase} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700`;
  const dangerAction = `${actionBase} border-red-300 bg-white text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20`;
  const strongAction = `${actionBase} border-red-600 bg-red-600 text-white hover:bg-red-700 dark:border-red-500 dark:bg-red-600`;

  return (
    <>
      <div
        className={`rounded-xl border p-3 sm:p-4 ${
          stale
            ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60'
        } ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <span
              className={`material-symbols-outlined text-xl ${
                stale ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {stale ? 'warning' : 'draft'}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${stale ? 'text-red-800 dark:text-red-300' : 'text-text-main'}`}>
                {onRecord ? t('drafts.editBanner.originalLoaded') : t('drafts.editBanner.loaded', { time })}
              </p>
              <p className={`mt-0.5 text-xs ${stale ? 'text-red-800 dark:text-red-300' : 'text-text-secondary'}`}>
                {onRecord
                  ? t('drafts.editBanner.originalHint')
                  : t('drafts.editBanner.hint')}
              </p>
              {stale && (
                <p className="mt-1.5 text-xs font-medium text-red-800 dark:text-red-300">
                  {t('drafts.editBanner.staleMessage', { time: formatDraftDateTime(draft.target?.updatedAt) })}
                </p>
              )}
              {stale && (
                conflicts.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-red-900 dark:text-red-200">
                    {conflicts.map((conflict) => (
                      <li key={`edit-conflict-${conflict.key}`} className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{conflict.label}:</span>
                        <span className="line-through opacity-70">{conflict.currentText}</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        <span className="font-semibold">{conflict.draftText}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-xs text-red-800 dark:text-red-300">
                    {t('drafts.editBanner.staleUnknownFields')}
                  </p>
                )
              )}
              {stale && (
                <p className="mt-1.5 text-xs text-red-800 dark:text-red-300">
                  {t('drafts.editBanner.staleSaveHint')}
                </p>
              )}
              {/* Kayıt bu arada değişti ama taslak o alanlara dokunmuyor: uyarı değil, bilgi */}
              {!stale && !onRecord && otherChanges.length > 0 && (
                <p className="mt-1.5 text-xs text-text-secondary">
                  {t('drafts.pending.otherChanged', {
                    fields: otherChanges.map((change) => change.label).join(', '),
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRecord ? prefill.loadDraft : prefill.loadOriginal}
              disabled={prefill.busy}
              className={quietAction}
            >
              <span className="material-symbols-outlined text-base">{onRecord ? 'draft' : 'history'}</span>
              {onRecord ? t('drafts.editBanner.loadDraft') : t('drafts.editBanner.loadOriginal')}
            </button>
            <button
              type="button"
              onClick={prefill.openCompare}
              disabled={prefill.busy}
              className={stale ? strongAction : quietAction}
            >
              <span className="material-symbols-outlined text-base">compare_arrows</span>
              {t('drafts.editBanner.compare')}
            </button>
            <button
              type="button"
              onClick={prefill.removeDraft}
              disabled={prefill.busy}
              className={dangerAction}
            >
              {prefill.busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
              ) : (
                <span className="material-symbols-outlined text-base">delete</span>
              )}
              {t('drafts.editBanner.delete')}
            </button>
          </div>
        </div>
      </div>

      {/* Karşılaştırma: var olan pencere, salt okunur. Uygulama formu kaydetmek, silme bandın düğmesi. */}
      {prefill.compareOpen && (
        <PendingChangeModal
          readOnly
          draftId={draft.id}
          module={module}
          record={record}
          fields={fields}
          recordToFields={recordToFields}
          payloadToFields={payloadToFields}
          recordToPayload={recordToPayload}
          onClose={prefill.closeCompare}
        />
      )}
    </>
  );
}
