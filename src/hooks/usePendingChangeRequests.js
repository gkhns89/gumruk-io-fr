import { useCallback, useEffect, useState } from 'react';
import {
  changeRequestService,
  CHANGE_REQUESTS_CHANGED_EVENT,
  isFeatureDisabled,
} from '../api/changeRequestService';
import { useFeatureFlags } from './useFeatureFlags';
import { canSeeChangeRequests } from '../utils/changeRequests';

/**
 * Listedeki "Değişiklik talebi" rozetleri (CHANGE_REQUESTS bayrağı).
 *
 * Tek bir `GET /change-requests/pending?module=` çağrısı bütün satırların rozetini doldurur — satır başına istek yok.
 * Sonuç kayıt id'sine göre anahtarlanır. Kayıt başına yalnızca bir bekleyen talep olabildiği için değer tek nesnedir
 * (taslaklarda dizi: orada aynı kayda birden çok taslak düşebiliyor). Rozet bir talep açılınca, onaylanınca,
 * reddedilince ya da geri çekilince `changeRequestsChanged` olayıyla tazelenir.
 *
 * @param {string} module DRAFT_MODULES değeri ('TRANSACTION' ...)
 * @param {object} currentUser
 * @returns {{ requestFor: Function, pendingCount: number, refresh: Function }}
 */
export function usePendingChangeRequests(module, currentUser) {
  const { hasFeature } = useFeatureFlags();
  const enabled = canSeeChangeRequests(currentUser, hasFeature);
  const [byTarget, setByTarget] = useState(() => new Map());

  const refresh = useCallback(async () => {
    if (!enabled) {
      setByTarget(new Map());
      return;
    }
    const result = await changeRequestService.listPending(module);
    // Bayrak sayfa açıkken kapatıldı ya da uç erişilemedi: rozetler kaybolur, liste çalışmaya devam eder.
    if (!result.success) {
      if (isFeatureDisabled(result)) setByTarget(new Map());
      return;
    }
    const grouped = new Map();
    result.data.forEach((row) => {
      if (row?.targetId == null) return;
      // Sunucu kayıt başına tek bekleyen talep tutuyor; yine de ilk satır kazansın (en yenisi başta geliyor).
      if (!grouped.has(row.targetId)) grouped.set(row.targetId, row);
    });
    setByTarget(grouped);
  }, [enabled, module]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => refresh();
    window.addEventListener(CHANGE_REQUESTS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CHANGE_REQUESTS_CHANGED_EVENT, onChanged);
  }, [refresh]);

  const requestFor = useCallback((targetId) => byTarget.get(targetId) || null, [byTarget]);

  return { requestFor, pendingCount: byTarget.size, refresh };
}
