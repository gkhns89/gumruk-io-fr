import { useCallback, useEffect, useState } from 'react';
import { draftService, DRAFTS_CHANGED_EVENT, isFeatureDisabled } from '../api/draftService';
import { useFeatureFlags } from './useFeatureFlags';
import { canUseDrafts } from '../utils/drafts';

/**
 * Listedeki "Bekleyen değişiklik" rozetleri (DRAFTS bayrağı, taslak aşama 3).
 *
 * Tek bir `GET /drafts/pending?module=` çağrısı bütün satırların rozetini doldurur — satır başına istek yok.
 * Sonuç kayıt id'sine göre anahtarlanır; aynı kayıtta birden çok taslak olabilir (yönetici meslektaşınınkini de görür),
 * bu yüzden değer bir dizidir. Rozet bir taslak kaydedilince, silinince ya da uygulanınca `draftsChanged` olayıyla
 * tazelenir.
 *
 * @param {string} module DRAFT_MODULES değeri
 * @param {object} currentUser
 * @returns {{ pendingByTarget: Map<number, Array>, pendingFor: Function, refresh: Function }}
 */
export function usePendingDrafts(module, currentUser) {
  const { hasFeature } = useFeatureFlags();
  const enabled = canUseDrafts(currentUser, hasFeature);
  const [pendingByTarget, setPendingByTarget] = useState(() => new Map());

  const refresh = useCallback(async () => {
    if (!enabled) {
      setPendingByTarget(new Map());
      return;
    }
    const result = await draftService.listPendingDrafts(module);
    // Bayrak sayfa açıkken kapatıldı ya da uç erişilemedi: rozetler kaybolur, liste çalışmaya devam eder.
    if (!result.success) {
      if (isFeatureDisabled(result)) setPendingByTarget(new Map());
      return;
    }
    const grouped = new Map();
    result.data.forEach((row) => {
      if (row?.targetId == null) return;
      const existing = grouped.get(row.targetId);
      if (existing) existing.push(row);
      else grouped.set(row.targetId, [row]);
    });
    setPendingByTarget(grouped);
  }, [enabled, module]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => refresh();
    window.addEventListener(DRAFTS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(DRAFTS_CHANGED_EVENT, onChanged);
  }, [refresh]);

  const pendingFor = useCallback((targetId) => pendingByTarget.get(targetId) || null, [pendingByTarget]);

  return { pendingByTarget, pendingFor, refresh };
}

// Düzenleme modalı açılırken kullanıcının kendi bekleyen taslağını bulup forma yükleyen kanca artık ayrı dosyada:
// hooks/useEditDraftPrefill.js (taslak aşama 4).
