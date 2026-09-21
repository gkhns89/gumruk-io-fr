import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  changeRequestService,
  isRequestNotFound,
  isRequestNotPending,
  isFeatureDisabled,
} from '../../api/changeRequestService';
import { confirmDialog } from '../../utils/confirmDialog';
import { isStackedDialogOpen } from '../../utils/unsavedChangesDialog';
import { showSuccess, showError } from '../../utils/toastUtils';
import { buildPendingChange } from '../../utils/draftDiff';
import { formatRequestTime, requestLabel } from '../../utils/changeRequests';
import { t } from '../../locales';

/**
 * Bir değişiklik talebinin karşılaştırması ve kararı (CHANGE_REQUESTS bayrağı).
 *
 * Hesap `PendingChangeModal` ile ortaktır (`buildPendingChange`): **talep bir farktır.** Gösterilen ve uygulanan
 * şey, talebi açanın talebi aldığı andaki forma göre gerçekten değiştirdiği alanlardır (`payload.base`);
 * uygulamak = kaydın **şimdiki** hâli + bu fark. Böylece talep, personelin açmadığı bir alanı bu arada
 * yöneticinin değiştirmiş olmasını sessizce geri almaz.
 *
 * **Çakışma** yalnızca aynı alanı iki tarafın da değiştirmesidir: kırmızı uyarı çıkar ve onay, yönetici gözden
 * geçirdiğini işaretleyene kadar kilitli kalır. Kaydın başka alanlarının değişmesi çakışma değildir.
 *
 * Neden taslakların penceresi değil de ayrı bir pencere: o pencere `draftService`'e bağlı ve taslak yaşam
 * döngüsüne göre yazılmış (süre dolması, silme). Karar burada kalıcıdır ve reddetme gerekçe ister. Ortak olan
 * şey hesaptır ve o tek yerdedir.
 *
 * @param {number}   props.requestId
 * @param {object}   props.record          Listedeki kaydın şimdiki hâli — farkın üstüne yazılacağı taban
 * @param {Array}    props.fields          Alan tanımları ({ key, label, format }), bkz. utils/draftDiff.js
 * @param {Function} props.recordToFields  (record) => karşılaştırma alanları
 * @param {Function} props.payloadToFields (payloadLike, record) => karşılaştırma alanları
 * @param {Function} props.recordToPayload (record) => kaydın şimdiki payload'ı
 * @param {Function} props.buildUpdateBody (effectivePayload) => güncelleme ucunun gövdesi
 * @param {boolean}  [props.canReview]     Yönetici mi ve talep bekliyor mu (sunucu da kontrol ediyor)
 * @param {boolean}  [props.canCancel]     Talebi geri çekebilir mi (kendi talebi ya da yönetici)
 * @param {string}   [props.blockedReason] Karar düğmeleri kapalıysa başlığı (ödeme kısıtı gibi)
 * @param {Function} [props.onDone]        Karar verildi: liste ve rozetler tazelensin
 * @param {Function} props.onClose
 */
// Talep henüz okunmadı: aynı nesne kullanılır ki türetilen useMemo'lar her render'da değişmesin.
const EMPTY_PENDING = { legacy: false, effectivePayload: null, changes: [], conflicts: [], otherChanges: [] };

export default function ChangeRequestModal({ requestId, record, fields, recordToFields, payloadToFields,
  recordToPayload, buildUpdateBody, canReview = false, canCancel = false, blockedReason, onDone, onClose }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [conflictAcknowledged, setConflictAcknowledged] = useState(false);

  // Çağıranlar `onDone` / `onClose`'u satır içi veriyor (her render'da yeni kimlik). Talep yalnızca id değişince
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
      const result = await changeRequestService.getRequest(requestId);
      if (!active) return;
      if (result.success) setRequest(result.data);
      // Talep bu arada silinmiş ya da bayrak kapatılmış: pencere kapanır, liste tazelenir
      else if (isRequestNotFound(result) || isFeatureDisabled(result)) {
        callbacks.current.onDone?.();
        callbacks.current.onClose();
        return;
      } else setError(result.error);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [requestId]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || isStackedDialogOpen()) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const pending = useMemo(
    () => (request?.payload && record
      ? buildPendingChange({ payload: request.payload, record, fields, recordToFields, payloadToFields,
        recordToPayload })
      : null),
    [request, record, fields, recordToFields, payloadToFields, recordToPayload],
  );

  const { changes, conflicts, otherChanges, legacy } = pending || EMPTY_PENDING;

  const stale = request?.target?.stale === true;
  const targetGone = request?.target?.exists === false;
  const isPending = request?.status === 'PENDING';
  /**
   * Kayıt duruyor ama listede yok (süzgeç dışında ya da başka sayfada): farkın yazılacağı tabanı gösteremeyiz.
   * Pencere yine de açılır — yönetici burada reddedebilir ya da talep sahibi geri çekebilir; onay ise
   * tabansız yapılamaz.
   */
  const recordMissing = !record && !targetGone;
  // Sunucu kararı da kontrol ediyor; buradaki kilit yalnızca düğmeyi boşuna göstermemek için.
  const reviewable = canReview && isPending && !targetGone;

  const hasConflict = conflicts.length > 0 || (legacy && stale);
  const conflictKeys = useMemo(() => new Set(conflicts.map((conflict) => conflict.key)), [conflicts]);

  const approveBlocked = !reviewable || recordMissing || changes.length === 0
    || (hasConflict && !conflictAcknowledged);

  // Karar verildi: pencere kapanır, liste ve rozetler tazelenir.
  const finish = useCallback((message) => {
    setBusy('');
    showSuccess(message);
    onDone?.();
    onClose();
  }, [onDone, onClose]);

  // Talep bu arada başka bir yönetici tarafından sonuçlandırılmış olabilir.
  const handleStaleDecision = useCallback((result) => {
    setBusy('');
    if (isRequestNotPending(result) || isRequestNotFound(result)) {
      showError(t('changeRequests.modal.alreadyDecided'));
      onDone?.();
      onClose();
      return true;
    }
    return false;
  }, [onDone, onClose]);

  const handleApprove = useCallback(async () => {
    if (approveBlocked || busy) return;
    const ok = await confirmDialog({
      title: t('changeRequests.modal.approveTitle'),
      message: hasConflict
        ? t('changeRequests.modal.approveConflictMessage')
        : t('changeRequests.modal.approveMessage', { record: requestLabel(request) }),
      details: changes.map((change) => `${change.label}: ${change.currentText} → ${change.draftText}`),
      intent: hasConflict ? 'warning' : 'primary',
      confirmText: t('changeRequests.modal.approve'),
    });
    if (!ok) return;

    setBusy('approve');
    // Kaydın şimdiki hâli + talebin farkı. Gövde normal kaydetmedekiyle aynı yerden üretilir.
    const result = await changeRequestService.approveRequest(requestId, buildUpdateBody(pending.effectivePayload));
    if (!result.success) {
      if (handleStaleDecision(result)) return;
      setBusy('');
      showError(result.error || t('changeRequests.modal.approveError'));
      return;
    }
    finish(t('changeRequests.modal.approved'));
  }, [approveBlocked, busy, hasConflict, changes, request, requestId, buildUpdateBody, pending,
    handleStaleDecision, finish]);

  const handleReject = useCallback(async () => {
    if (!reviewable || busy) return;
    // confirmDialog ayrı bir React kökünde çiziliyor: gerekçe state'e değil buraya yazılır.
    const values = { reason: '' };
    const ok = await confirmDialog({
      title: t('changeRequests.modal.rejectTitle'),
      message: t('changeRequests.modal.rejectMessage', { record: requestLabel(request) }),
      intent: 'danger',
      icon: 'block',
      confirmText: t('changeRequests.modal.reject'),
      content: <RejectReasonField onChange={(value) => { values.reason = value; }} />,
    });
    if (!ok) return;
    const reason = values.reason.trim();
    if (!reason) {
      showError(t('changeRequests.modal.rejectReasonRequired'));
      return;
    }

    setBusy('reject');
    const result = await changeRequestService.rejectRequest(requestId, reason);
    if (!result.success) {
      if (handleStaleDecision(result)) return;
      setBusy('');
      showError(result.error || t('changeRequests.modal.rejectError'));
      return;
    }
    finish(t('changeRequests.modal.rejected'));
  }, [reviewable, busy, request, requestId, handleStaleDecision, finish]);

  const handleCancel = useCallback(async () => {
    if (!canCancel || !isPending || busy) return;
    const ok = await confirmDialog({
      title: t('changeRequests.modal.cancelTitle'),
      message: t('changeRequests.modal.cancelMessage'),
      intent: 'warning',
      confirmText: t('changeRequests.modal.cancelConfirm'),
    });
    if (!ok) return;

    setBusy('cancel');
    const result = await changeRequestService.cancelRequest(requestId);
    if (!result.success) {
      if (handleStaleDecision(result)) return;
      setBusy('');
      showError(result.error || t('changeRequests.modal.cancelError'));
      return;
    }
    finish(t('changeRequests.modal.cancelled'));
  }, [canCancel, isPending, busy, requestId, handleStaleDecision, finish]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-request-title"
      >
        {/* Başlık */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gradient-to-r from-amber-500/10 to-amber-500/5 p-5 dark:border-gray-700 dark:from-amber-500/20 dark:to-amber-500/10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">rate_review</span>
            </div>
            <div className="min-w-0">
              <h2 id="change-request-title" className="text-lg font-bold text-text-main">
                {t('changeRequests.modal.title')}
              </h2>
              <p className="truncate text-sm text-text-secondary">
                {t('changeRequests.modal.subtitle', { record: requestLabel(request) })}
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
                  {request?.mine
                    ? t('changeRequests.modal.byYou')
                    : t('changeRequests.modal.byUser', { name: request?.requestedBy?.fullName || '—' })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {formatRequestTime(request?.requestedAt)}
                </span>
              </div>

              {/* Talebi açanın açıklaması */}
              {request?.note && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    {t('changeRequests.modal.noteLabel')}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-text-main">{request.note}</p>
                </div>
              )}

              {/* Karar verilmiş talep: kim, ne zaman, gerekçe */}
              {!isPending && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/60">
                  <p className="font-semibold text-text-main">
                    {t(`changeRequests.modal.decided.${request?.status}`, {
                      name: request?.reviewedBy?.fullName || '—',
                      time: formatRequestTime(request?.reviewedAt),
                    })}
                  </p>
                  {request?.reviewReason && (
                    <p className="mt-1 text-text-secondary">
                      {t('changeRequests.modal.reasonLabel')}: {request.reviewReason}
                    </p>
                  )}
                </div>
              )}

              {targetGone && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  <p className="font-semibold">{t('changeRequests.modal.targetGoneTitle')}</p>
                  <p className="mt-1">{t('changeRequests.modal.targetGoneMessage')}</p>
                </div>
              )}

              {/* Payload okunamadı ya da fark taban bilgisi taşımıyor */}
              {legacy && !targetGone && changes.length > 0 && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  {t('changeRequests.modal.legacyNote')}
                </p>
              )}

              {/* Gerçek çakışma: aynı alanı iki taraf da değiştirmiş */}
              {hasConflict && !targetGone && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <p className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-300">
                    <span className="material-symbols-outlined text-lg">warning</span>
                    {t('changeRequests.modal.conflictTitle')}
                  </p>
                  <p className="mt-1 text-sm text-red-800 dark:text-red-300">
                    {t('changeRequests.modal.conflictMessage', {
                      time: formatRequestTime(request?.target?.updatedAt),
                    })}
                  </p>
                  {conflicts.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm text-red-900 dark:text-red-200">
                      {conflicts.map((conflict) => (
                        <li key={`conflict-${conflict.key}`} className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-medium">{conflict.label}:</span>
                          <span className="line-through opacity-70">{conflict.currentText}</span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          <span className="font-semibold">{conflict.draftText}</span>
                          <span className="rounded-full bg-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-900 dark:bg-red-800 dark:text-red-100">
                            {t('changeRequests.modal.willOverwrite')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {reviewable && (
                    <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm font-medium text-red-900 dark:text-red-200">
                      <input
                        type="checkbox"
                        checked={conflictAcknowledged}
                        onChange={(e) => setConflictAcknowledged(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-red-400 text-red-600 focus:ring-red-500"
                      />
                      {t('changeRequests.modal.conflictAcknowledge')}
                    </label>
                  )}
                </div>
              )}

              {/* Kayıt bu arada değişti ama talep o alanlara dokunmuyor: yalnızca bilgi, uyarı değil */}
              {!hasConflict && !targetGone && otherChanges.length > 0 && (
                <p className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-800/60">
                  <span className="material-symbols-outlined mr-1 align-[-3px] text-sm">info</span>
                  {t('changeRequests.modal.otherChanged', {
                    fields: otherChanges.map((change) => change.label).join(', '),
                  })}
                </p>
              )}

              {/* Kayıt duruyor ama listede yok: "değişiklik yok" demek yanlış olur, sebebini söyleyelim */}
              {recordMissing ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 py-10 text-center dark:border-amber-700/60">
                  <span className="material-symbols-outlined text-4xl text-amber-400">filter_alt_off</span>
                  <p className="text-sm font-semibold text-text-main">{t('changeRequests.modal.recordMissingTitle')}</p>
                  <p className="max-w-sm text-xs text-text-secondary">
                    {t('changeRequests.modal.recordMissingHint')}
                  </p>
                </div>
              ) : /* Değişiklik listesi */ changes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-10 text-center dark:border-gray-600">
                  <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">done_all</span>
                  <p className="text-sm font-semibold text-text-main">{t('changeRequests.modal.noChanges')}</p>
                  <p className="max-w-sm text-xs text-text-secondary">{t('changeRequests.modal.noChangesHint')}</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary dark:border-gray-700 dark:bg-gray-800/60">
                    <span>{t('changeRequests.modal.columnField')}</span>
                    <span>{t('changeRequests.modal.columnCurrent')}</span>
                    <span>{t('changeRequests.modal.columnRequested')}</span>
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {changes.map((change) => (
                      <li key={change.key} className="grid grid-cols-[1fr_1fr_1fr] items-start gap-2 px-4 py-2.5 text-sm">
                        <span className="font-medium text-text-main">{change.label}</span>
                        <span className="break-words text-text-secondary line-through">{change.currentText}</span>
                        <span className="break-words font-semibold text-text-main">
                          {change.draftText}
                          {conflictKeys.has(change.key) && (
                            <span className="ml-1.5 whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-200">
                              {t('changeRequests.modal.willOverwrite')}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alt çubuk */}
        {!loading && !error && (
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
            {canCancel && isPending ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={!!busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {busy === 'cancel' ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                ) : (
                  <span className="material-symbols-outlined text-base">undo</span>
                )}
                {t('changeRequests.modal.withdraw')}
              </button>
            ) : <span />}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onClose}
                disabled={!!busy}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                {t('common.close')}
              </button>
              {reviewable && (
                <>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={!!busy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    {busy === 'reject' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                    ) : (
                      <span className="material-symbols-outlined text-base">block</span>
                    )}
                    {t('changeRequests.modal.reject')}
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={approveBlocked || !!busy}
                    title={approveBlocked ? blockedReason : undefined}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === 'approve' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                    ) : (
                      <span className="material-symbols-outlined text-base">check</span>
                    )}
                    {t('changeRequests.modal.approve')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Reddetme gerekçesi. confirmDialog ayrı bir React kökünde çizildiği için değer state'e değil
 * `onChange(value)` ile çağırana gider. Zorunlu: gerekçesiz reddetme sunucuda da reddedilir.
 */
function RejectReasonField({ onChange }) {
  return (
    <div className="text-left">
      <label htmlFor="change-request-reject-reason" className="block text-sm font-medium text-text-main mb-1">
        {t('changeRequests.modal.rejectReasonLabel')}
      </label>
      <textarea
        id="change-request-reject-reason"
        rows={3}
        maxLength={500}
        autoFocus
        placeholder={t('changeRequests.modal.rejectReasonPlaceholder')}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors text-sm resize-none"
      />
    </div>
  );
}
