import { useCallback, useEffect, useRef, useState } from 'react';
import { draftService, DRAFT_SCHEMA_VERSION } from '../api/draftService';
import { useFeatureFlags } from './useFeatureFlags';
import { FEATURE_FLAGS } from '../utils/featureFlags';
import { canUseDrafts, formatDraftClock } from '../utils/drafts';
import { showSuccess, showError } from '../utils/toastUtils';
import { t } from '../locales';

/**
 * Yeni kayıt modallarının taslak kaydı (DRAFTS bayrağı). `useUnsavedChangesGuard` ile birlikte kullanılır:
 * `saveDraft` guard'ın `onSaveDraft`'ına verilir; bayrak kapalıysa ya da rol taslak kullanmıyorsa undefined döner ve
 * diyalog bugünkü gibi iki seçenekli kalır.
 *
 * İlk kayıt POST, sonrakiler aynı taslağa PUT. Taslaktan açılan modalda (`initialDraft`, yalnızca kendi taslağı)
 * kayıt aynı taslağı günceller; taslak bu arada silinmişse (günlük temizlik, yönetici) yenisi oluşturulur.
 * Kayıt başarıyla oluşturulunca modal `discardDraft()` çağırır.
 *
 * @param {object}   options
 * @param {string}   options.module       DRAFT_MODULES değeri
 * @param {object}   options.currentUser
 * @param {object}   [options.initialDraft] Taslaktan devam ediliyorsa taslak öğesi
 * @param {Function} options.getSnapshot  `() => ({ payload, label })` — kayıt anındaki form görüntüsü
 * @returns {{ draftsEnabled: boolean, isDraftPilot: boolean, saveDraft: Function|undefined, savingDraft: boolean,
 *   discardDraft: Function }}
 */
export function useRecordDraft({ module, currentUser, initialDraft, getSnapshot }) {
  const { hasFeature, isPilotFeature } = useFeatureFlags();
  const enabled = canUseDrafts(currentUser, hasFeature);
  const isPilot = enabled && isPilotFeature(FEATURE_FLAGS.DRAFTS);

  // Başkasının taslağına asla PUT gönderilmez; liste zaten yalnızca kendi taslağında "Devam et" gösterir.
  const draftIdRef = useRef(initialDraft && initialDraft.mine !== false ? initialDraft.id ?? null : null);
  const getSnapshotRef = useRef(getSnapshot);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSnapshotRef.current = getSnapshot;
  });

  const saveDraft = useCallback(async () => {
    if (!enabled || savingRef.current) return false;
    const { payload, label } = getSnapshotRef.current();
    const body = { label, payload, schemaVersion: DRAFT_SCHEMA_VERSION };

    savingRef.current = true;
    setSaving(true);
    try {
      let result = null;
      if (draftIdRef.current) {
        result = await draftService.updateDraft(draftIdRef.current, body);
        if (!result.success && result.status === 404) result = null;
      }
      if (!result) result = await draftService.createDraft({ module, ...body });

      if (!result.success) {
        showError(result.error);
        return false;
      }
      if (result.data?.id != null) draftIdRef.current = result.data.id;
      const time = formatDraftClock(result.data?.expiresAt);
      showSuccess(time ? t('drafts.savedUntil', { time }) : t('drafts.saved'));
      return true;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [enabled, module]);

  // Kayıt oluşturulduktan sonra taslağı kaldırır. Beklenmez: silinemezse günlük temizlik zaten siler.
  const discardDraft = useCallback(() => {
    const id = draftIdRef.current;
    if (!id) return;
    draftIdRef.current = null;
    draftService.deleteDraft(id);
  }, []);

  return {
    draftsEnabled: enabled,
    isDraftPilot: isPilot,
    saveDraft: enabled ? saveDraft : undefined,
    savingDraft: saving,
    discardDraft,
  };
}
