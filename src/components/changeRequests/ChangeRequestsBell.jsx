import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import {
  changeRequestService,
  CHANGE_REQUESTS_CHANGED_EVENT,
  OPEN_CHANGE_REQUESTS_EVENT,
  isFeatureDisabled,
} from '../../api/changeRequestService';
import { canReviewChanges, formatRequestTime, requestLabel } from '../../utils/changeRequests';
import { DRAFT_MODULE_PATHS } from '../../utils/drafts';
import { t } from '../../locales';

/**
 * Başlıktaki "bekleyen değişiklik talepleri" zili (CHANGE_REQUESTS bayrağı) — yalnızca BROKER_ADMIN için,
 * yani karar verebilen kişi için. Talebi açan BROKER_USER zil görmez; kendi talebinin durumunu satırdaki
 * rozetten ve bildirimden öğrenir.
 *
 * **Zil karar vermez, karar verilen yere götürür.** Karşılaştırma kaydın şimdiki hâline ihtiyaç duyar (talep bir
 * farktır, kaydın üstüne yazılır) ve o kayıt listenin yüklediği kayıttır. Bu yüzden "İncele" modülün sayfasına
 * gider ve karşılaştırmayı orada açtırır; kaydı kendisi çekip ikinci bir gerçek kaynağı ortaya çıkarmaz.
 *
 * Yoklama: takıldığı sürece 10 dakikada bir. Kaynak seyrek değişir (insanlar form dolduruyor), daha sıkısı
 * yalnızca gürültü olurdu. Talep açıldığında/karara bağlandığında `changeRequestsChanged` ile hemen tazelenir.
 */
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 dakika

export default function ChangeRequestsBell() {
  const { user } = useAuth();
  const { hasFeature } = useFeatureFlags();
  const navigate = useNavigate();
  const isEligible = canReviewChanges(user, hasFeature);

  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  const load = useCallback(async () => {
    if (!isEligible) return;
    setLoading(true);
    const result = await changeRequestService.listPending();
    if (result.success) setRequests(result.data);
    // Bayrak sayfa açıkken kapatıldı: zil sessizce kaybolur.
    else if (isFeatureDisabled(result)) setRequests([]);
    setLoading(false);
  }, [isEligible]);

  useEffect(() => {
    if (!isEligible) {
      setRequests([]);
      return undefined;
    }
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isEligible, load]);

  useEffect(() => {
    const onChanged = () => load();
    window.addEventListener(CHANGE_REQUESTS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CHANGE_REQUESTS_CHANGED_EVENT, onChanged);
  }, [load]);

  // Bildirime tıklanınca sayfa değiştirmeden zili aç (utils/changeRequests.js → openChangeRequests)
  useEffect(() => {
    const onOpen = () => {
      if (!isEligible) return;
      setOpen(true);
      load();
    };
    window.addEventListener(OPEN_CHANGE_REQUESTS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHANGE_REQUESTS_EVENT, onOpen);
  }, [isEligible, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const review = (request) => {
    setOpen(false);
    const path = DRAFT_MODULE_PATHS[request.module] || DRAFT_MODULE_PATHS.TRANSACTION;
    navigate(path, { state: { changeRequestId: request.id, targetId: request.targetId } });
  };

  if (!isEligible) return null;

  const count = requests.length;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); if (!open) load(); }}
        className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        title={t('changeRequests.bell.title')}
        aria-label={t('changeRequests.bell.title')}
      >
        <span className="material-symbols-outlined">rate_review</span>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="text-sm font-bold text-text-main">{t('changeRequests.bell.title')}</p>
            <p className="text-xs text-text-secondary">{t('changeRequests.bell.subtitle')}</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && count === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : count === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <span className="material-symbols-outlined text-3xl text-gray-300 dark:text-gray-600">done_all</span>
                <p className="text-sm text-text-secondary">{t('changeRequests.bell.empty')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {requests.map((request) => (
                  <li key={request.id} className="px-4 py-3">
                    <p className="text-sm font-semibold text-text-main">{requestLabel(request)}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {t('changeRequests.bell.by', {
                        name: request.requestedBy?.fullName || '—',
                        time: formatRequestTime(request.requestedAt),
                      })}
                    </p>
                    {request.note && (
                      <p className="mt-1 line-clamp-2 text-xs italic text-text-secondary">"{request.note}"</p>
                    )}
                    {request.target?.exists === false && (
                      <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                        {t('changeRequests.bell.targetGone')}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => review(request)}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      {t('changeRequests.bell.review')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
