import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { draftService, isDraftNotFound, isFeatureDisabled } from '../../api/draftService';
import { confirmDialog } from '../../utils/confirmDialog';
import { isStackedDialogOpen } from '../../utils/unsavedChangesDialog';
import { showSuccess, showError } from '../../utils/toastUtils';
import { draftDisplayLabel, formatDraftDateTime } from '../../utils/drafts';
import { diffDraftFields } from '../../utils/draftDiff';
import { t } from '../../locales';

/**
 * Bir kayıttaki bekleyen değişikliğin karşılaştırması (DRAFTS bayrağı, taslak aşama 3).
 *
 * Alan bazlı "şimdiki değer → taslaktaki değer" listesi; yalnızca gerçekten değişen alanlar görünür ve etiketler
 * formdakilerle aynıdır. "Uygula" onay diyaloğundan sonra normal güncelleme ucunu çağırır, başarılı olunca taslağı
 * siler. "Sil" taslağı onayla atar.
 *
 * **Çakışma.** Taslak alındıktan sonra kaydı başkası değiştirdiyse (`draft.target.stale`) kırmızı uyarı çıkar ve
 * uygulama, kullanıcı listeyi gözden geçirdiğini onaylayana kadar kilitli kalır. Taslak, alındığı andaki kaydı da
 * (`payload.base.formData`) taşıdığı için "altından değişen alanlar" tam olarak hesaplanır; bunlardan taslakta da
 * değişmiş olanlar ayrıca "üzerine yazılacak" diye işaretlenir. Hiçbir zaman sessizce üzerine yazılmaz.
 *
 * @param {number}   props.draftId
 * @param {string}   props.module          DRAFT_MODULES değeri
 * @param {object}   props.record          Listedeki kaydın şimdiki hâli
 * @param {Array}    props.fields          Alan tanımları ({ key, label, format }), bkz. utils/draftDiff.js
 * @param {Function} props.recordToFields  (record) => karşılaştırma alanları
 * @param {Function} props.payloadToFields (payloadLike, record) => karşılaştırma alanları
 * @param {Function} [props.onApply]       async (draftPayload, draft) => { success, error } — normal güncelleme ucu
 * @param {boolean}  props.canApply        Kullanıcının bu kaydı düzenleme yetkisi var mı (ödeme kısıtı dahil)
 * @param {string}   [props.blockedReason] canApply false ise düğmenin başlığı
 * @param {boolean}  [props.readOnly]      Yalnızca karşılaştırma: düzenleme modalının taslak bandından açılır.
 *   Uygulama formu kaydetmektir, silme bandın kendi düğmesindedir; burada ikisi de gösterilmez.
 * @param {Function} [props.onDone]        Taslak uygulandı ya da silindi: liste tazelensin
 * @param {Function} props.onClose
 */
export default function PendingChangeModal({ draftId, module, record, fields, recordToFields, payloadToFields,
  onApply, canApply = true, blockedReason, readOnly = false, onDone, onClose }) {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [conflictAcknowledged, setConflictAcknowledged] = useState(false);

  // Çağıranlar `onDone` / `onClose`'u satır içi veriyor (her render'da yeni kimlik). Taslak yalnızca id değişince
  // yeniden okunsun diye bunlar bir ref üzerinden çağrılır.
  const callbacks = useRef({ onDone, onClose });
  useEffect(() => {
    callbacks.current = { onDone, onClose };
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      const result = await draftService.getDraft(draftId);
      if (!active) return;
      if (result.success) setDraft(result.data);
      // Taslak bu arada silinmiş, süresi dolmuş ya da bayrak kapatılmış: pencere kapanır, liste tazelenir
      else if (isDraftNotFound(result) || isFeatureDisabled(result)) {
        callbacks.current.onDone?.();
        callbacks.current.onClose();
        return;
      } else setError(result.error);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [draftId]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || isStackedDialogOpen()) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const currentFields = useMemo(() => (record ? recordToFields(record) : null), [record, recordToFields]);

  // Taslaktaki hâl: taslakta olmayan alanlar kaydınkiyle kalır, böylece form sonradan büyüdüyse sahte fark çıkmaz.
  const draftFields = useMemo(
    () => (draft && record ? payloadToFields(draft.payload, record) : null),
    [draft, record, payloadToFields],
  );

  const changes = useMemo(
    () => diffDraftFields(currentFields, draftFields, fields),
    [currentFields, draftFields, fields],
  );

  const stale = draft?.target?.stale === true;
  const targetGone = draft?.target?.exists === false;

  // Taslak alındıktan sonra kaydı başkasının değiştirdiği alanlar: taslak, alındığı andaki kaydı da taşıyor.
  const conflicts = useMemo(() => {
    if (!stale || !record || !draft?.payload?.base) return [];
    return diffDraftFields(payloadToFields(draft.payload.base, record), currentFields, fields);
  }, [stale, draft, record, currentFields, payloadToFields, fields]);

  const overwritten = useMemo(() => {
    const changedKeys = new Set(changes.map((change) => change.key));
    return conflicts.filter((conflict) => changedKeys.has(conflict.key));
  }, [changes, conflicts]);

  const applyBlocked = !canApply || draft?.mine === false || targetGone || changes.length === 0
    || (stale && !conflictAcknowledged);

  const handleApply = useCallback(async () => {
    if (readOnly || applyBlocked || busy) return;
    const ok = await confirmDialog({
      title: t('drafts.pending.applyTitle'),
      message: stale ? t('drafts.pending.applyStaleMessage') : t('drafts.pending.applyMessage'),
      details: changes.map((change) => `${change.label}: ${change.currentText} → ${change.draftText}`),
      intent: stale ? 'warning' : 'primary',
      confirmText: t('drafts.pending.apply'),
    });
    if (!ok) return;

    setBusy('apply');
    const result = await onApply(draft.payload, draft);
    if (!result?.success) {
      setBusy('');
      // 409: kayıt tam da bu sırada değişti. Taslak durur, kullanıcı yeniden bakar.
      if (result?.status === 409 || result?.code === 'CONCURRENT_UPDATE') {
        setConflictAcknowledged(false);
        const refreshed = await draftService.getDraft(draftId);
        if (refreshed.success) setDraft(refreshed.data);
        showError(t('drafts.pending.concurrentUpdate'));
        onDone?.();
      } else {
        showError(result?.error || t('drafts.pending.applyError'));
      }
      return;
    }
    // Kayıt güncellendi: taslak artık gereksiz. Silinemezse günlük temizlik zaten siler.
    await draftService.deleteDraft(draftId);
    setBusy('');
    showSuccess(t('drafts.pending.applied'));
    onDone?.();
    onClose();
  }, [readOnly, applyBlocked, busy, stale, changes, onApply, draft, draftId, onDone, onClose]);

  const handleDelete = useCallback(async () => {
    if (busy) return;
    const ok = await confirmDialog({
      title: t('drafts.pending.deleteTitle'),
      message: t('drafts.pending.deleteMessage', { label: draftDisplayLabel(draft) }),
      intent: 'danger',
      confirmText: t('drafts.panel.delete'),
    });
    if (!ok) return;

    setBusy('delete');
    const result = await draftService.deleteDraft(draftId);
    setBusy('');
    if (!result.success) {
      showError(result.error);
      return;
    }
    if (!result.data?.alreadyGone) showSuccess(t('drafts.panel.deleted'));
    onDone?.();
    onClose();
  }, [busy, draft, draftId, onDone, onClose]);

  const mine = draft?.mine !== false;

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
        aria-labelledby="pending-change-title"
      >
        {/* Başlık */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gradient-to-r from-amber-500/10 to-amber-500/5 p-5 dark:border-gray-700 dark:from-amber-500/20 dark:to-amber-500/10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">pending_actions</span>
            </div>
            <div className="min-w-0">
              <h2 id="pending-change-title" className="text-lg font-bold text-text-main">
                {t('drafts.pending.title')}
              </h2>
              <p className="truncate text-sm text-text-secondary">
                {t('drafts.pending.subtitle', {
                  module: t(`drafts.modules.${module}`),
                  record: draft?.target?.label || draftDisplayLabel(draft),
                })}
              </p>
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

        {/* Gövde */}
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
            </div>
          ) : (
            <div className="space-y-4">
              {/* Kim, ne zaman */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">person</span>
                  {mine ? t('drafts.panel.you') : t('drafts.panel.createdBy', { name: draft?.createdBy?.fullName || '—' })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {t('drafts.panel.updatedAt', { time: formatDraftDateTime(draft?.updatedAt || draft?.createdAt) })}
                </span>
                {draft?.expiresAt && (
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <span className="material-symbols-outlined text-sm">auto_delete</span>
                    {t('drafts.panel.expiresAt', { time: formatDraftDateTime(draft.expiresAt) })}
                  </span>
                )}
              </div>

              {targetGone && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  <p className="font-semibold">{t('drafts.pending.targetGoneTitle')}</p>
                  <p className="mt-1">{t('drafts.pending.targetGoneMessage')}</p>
                </div>
              )}

              {/* Çakışma uyarısı */}
              {stale && !targetGone && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <p className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-300">
                    <span className="material-symbols-outlined text-lg">warning</span>
                    {t('drafts.pending.conflictTitle')}
                  </p>
                  <p className="mt-1 text-sm text-red-800 dark:text-red-300">
                    {t('drafts.pending.conflictMessage', { time: formatDraftDateTime(draft?.target?.updatedAt) })}
                  </p>
                  {conflicts.length > 0 ? (
                    <ul className="mt-3 space-y-1.5 text-sm text-red-900 dark:text-red-200">
                      {conflicts.map((conflict) => (
                        <li key={`conflict-${conflict.key}`} className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-medium">{conflict.label}:</span>
                          <span className="line-through opacity-70">{conflict.currentText}</span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          <span className="font-semibold">{conflict.draftText}</span>
                          {overwritten.some((item) => item.key === conflict.key) && (
                            <span className="rounded-full bg-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-900 dark:bg-red-800 dark:text-red-100">
                              {t('drafts.pending.willOverwrite')}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-red-800 dark:text-red-300">
                      {t('drafts.pending.conflictUnknownFields')}
                    </p>
                  )}
                  {!readOnly && (
                    <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm font-medium text-red-900 dark:text-red-200">
                      <input
                        type="checkbox"
                        checked={conflictAcknowledged}
                        onChange={(e) => setConflictAcknowledged(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-red-400 text-red-600 focus:ring-red-500"
                      />
                      {t('drafts.pending.conflictAcknowledge')}
                    </label>
                  )}
                </div>
              )}

              {/* Değişiklik listesi */}
              {changes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-10 text-center dark:border-gray-600">
                  <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">done_all</span>
                  <p className="text-sm font-semibold text-text-main">{t('drafts.pending.noChanges')}</p>
                  <p className="max-w-sm text-xs text-text-secondary">{t('drafts.pending.noChangesHint')}</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary dark:border-gray-700 dark:bg-gray-800/60">
                    <span>{t('drafts.pending.columnField')}</span>
                    <span>{t('drafts.pending.columnCurrent')}</span>
                    <span>{t('drafts.pending.columnDraft')}</span>
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {changes.map((change) => (
                      <li key={change.key} className="grid grid-cols-[1fr_1fr_1fr] items-start gap-2 px-4 py-2.5 text-sm">
                        <span className="font-medium text-text-main">{change.label}</span>
                        <span className="break-words text-text-secondary line-through">{change.currentText}</span>
                        <span className="break-words font-semibold text-text-main">{change.draftText}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!mine && (
                <p className="text-xs italic text-text-secondary">{t('drafts.pending.othersHint')}</p>
              )}
            </div>
          )}
        </div>

        {/* Alt çubuk */}
        {!loading && !error && (
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
            {readOnly ? (
              // Düzenleme modalının bandından açıldı: uygulamak formu kaydetmek, silmek de bandın kendi düğmesi.
              <p className="text-xs italic text-text-secondary">{t('drafts.editBanner.compareHint')}</p>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={!!busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {busy === 'delete' ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                ) : (
                  <span className="material-symbols-outlined text-base">delete</span>
                )}
                {t('drafts.panel.delete')}
              </button>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onClose}
                disabled={!!busy}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                {t('common.close')}
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applyBlocked || !!busy}
                  title={canApply ? undefined : blockedReason}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === 'apply' ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                  ) : (
                    <span className="material-symbols-outlined text-base">{canApply ? 'check' : 'lock'}</span>
                  )}
                  {t('drafts.pending.apply')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
