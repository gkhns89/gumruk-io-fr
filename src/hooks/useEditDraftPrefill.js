import { useCallback, useEffect, useRef, useState } from 'react';
import { draftService } from '../api/draftService';
import { readDraftPayload } from '../utils/drafts';
import { confirmDialog } from '../utils/confirmDialog';
import { showSuccess, showError } from '../utils/toastUtils';
import { t } from '../locales';

/**
 * Düzenleme modalı açılırken kullanıcının **kendi** bekleyen taslağını forma yükler (DRAFTS bayrağı, taslak aşama 4).
 *
 * Aşama 3'te bekleyen değişiklik yalnızca satırdaki rozetten "İncele → Uygula" ile uygulanabiliyordu; "Düzenle"
 * diyen kullanıcı ise kaydın eski hâlini görüyordu. Artık taslağı olan kişi düzenlemeye girdiğinde formu kendi
 * taslağıyla dolu bulur, üstte de ne olduğunu anlatan bir bant çıkar (`EditDraftBanner`).
 *
 * Kurallar:
 *  - Yalnızca kendi taslağı (`mine !== false`) yüklenir. Başkasının taslağı asla forma girmez; yönetici onu eskisi
 *    gibi rozetten inceler.
 *  - Taslak bulunur bulunmaz `onDraftFound` ile modala bildirilir; `useRecordDraft` böylece ikinci bir taslak
 *    açmaz, aynı taslağı günceller. Payload okunamasa da (eski şema) bu bildirim yapılır.
 *  - Form geri yükleme modalın kendi işi: `applyPayload(payload)` ve `resetToRecord()` modaldan gelir, çünkü her
 *    formun arama kutuları ve görüntü metinleri farklıdır.
 *  - Silme `discardDraft` üzerinden gider (useRecordDraft): sunucudan siler **ve** modalın taslak kimliğini unutur,
 *    böylece sonra "Taslak olarak kaydet" yeni bir taslak açar.
 *
 * @param {object}   options
 * @param {boolean}  options.enabled      Taslaklar açık ve form düzenlenebilir mi
 * @param {string}   options.module       DRAFT_MODULES değeri
 * @param {number}   options.targetId     Düzenlenen kaydın id'si
 * @param {Function} options.onDraftFound `({ id, mine })` ya da null — useRecordDraft'ın `initialDraft`'ı
 * @param {Function} options.applyPayload Taslak payload'ını forma yazar
 * @param {Function} options.resetToRecord Formu kaydın şimdiki hâline döndürür
 * @param {Function} options.discardDraft useRecordDraft'ın `discardDraft`'ı (promise döner)
 */
export function useEditDraftPrefill({ enabled, module, targetId, onDraftFound, applyPayload, resetToRecord,
  discardDraft }) {
  const [draft, setDraft] = useState(null);
  // 'draft' → formda taslak değerleri, 'record' → kullanıcı "Orijinali yükle" dedi (taslak duruyor)
  const [mode, setMode] = useState('draft');
  const [busy, setBusy] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  // Kayıt tam kaydederken değişti (409): taslak duruyor, bant uyarıya döner
  const [conflict, setConflict] = useState(false);

  // Modal bu geri çağrıları satır içi veriyor (her render'da yeni kimlik); etki yalnızca kayıt değişince çalışsın.
  const callbacks = useRef({ onDraftFound, applyPayload, resetToRecord, discardDraft });
  useEffect(() => {
    callbacks.current = { onDraftFound, applyPayload, resetToRecord, discardDraft };
  });

  useEffect(() => {
    if (!enabled || targetId == null) return undefined;
    let active = true;
    (async () => {
      const list = await draftService.listPendingDrafts(module);
      if (!active || !list.success) return;
      const own = list.data.find((row) => row.targetId === targetId && row.mine !== false);
      if (!own) return;
      // Payload okunamasa bile aynı taslağa yazılır: ikinci taslak açılmaz.
      callbacks.current.onDraftFound({ id: own.id, mine: true });

      const full = await draftService.getDraft(own.id);
      if (!active || !full.success) return;
      const payload = readDraftPayload(full.data, module);
      // Eski şema ya da başkasının taslağı: form kaydın hâliyle kalır, bant çıkmaz.
      if (!payload) return;
      callbacks.current.applyPayload(payload);
      setDraft(full.data);
      setMode('draft');
    })();
    return () => { active = false; };
  }, [enabled, module, targetId]);

  /** Formu kaydın şimdiki hâline döndürür; taslak durur. */
  const loadOriginal = useCallback(() => {
    callbacks.current.resetToRecord();
    setMode('record');
  }, []);

  /** "Orijinali yükle"den sonra taslağa geri döner. */
  const loadDraft = useCallback(() => {
    const payload = draft?.payload;
    if (!payload) return;
    callbacks.current.applyPayload(payload);
    setMode('draft');
  }, [draft]);

  const openCompare = useCallback(() => setCompareOpen(true), []);
  const closeCompare = useCallback(() => setCompareOpen(false), []);

  /** Taslağı onayla siler ve formu kaydın hâline döndürür. */
  const removeDraft = useCallback(async () => {
    if (busy) return;
    const ok = await confirmDialog({
      title: t('drafts.editBanner.deleteTitle'),
      message: t('drafts.editBanner.deleteMessage'),
      intent: 'danger',
      confirmText: t('drafts.panel.delete'),
    });
    if (!ok) return;

    setBusy(true);
    const result = await callbacks.current.discardDraft();
    setBusy(false);
    if (result && result.success === false) {
      showError(result.error || t('api.drafts.deleteError'));
      return;
    }
    callbacks.current.resetToRecord();
    callbacks.current.onDraftFound(null);
    setDraft(null);
    setConflict(false);
    setCompareOpen(false);
    if (!result?.data?.alreadyGone) showSuccess(t('drafts.panel.deleted'));
  }, [busy]);

  /**
   * Güncelleme 409 `CONCURRENT_UPDATE` ile döndü: taslak silinmez, bant uyarıya döner ve taslağın hedef bilgisi
   * (kimin ne zaman değiştirdiği) yeniden okunur.
   */
  const reportConflict = useCallback(async () => {
    setConflict(true);
    if (!draft?.id) return;
    const refreshed = await draftService.getDraft(draft.id);
    if (refreshed.success) setDraft(refreshed.data);
  }, [draft]);

  return {
    draft,
    draftId: draft?.id ?? null,
    active: !!draft,
    mode,
    // Kayıt taslaktan sonra değişti: ya sunucu öyle diyor ya da kaydederken 409 aldık
    stale: !!draft && (draft.target?.stale === true || conflict),
    busy,
    compareOpen,
    loadOriginal,
    loadDraft,
    openCompare,
    closeCompare,
    removeDraft,
    reportConflict,
  };
}
