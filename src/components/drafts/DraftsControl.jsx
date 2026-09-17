import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { draftService, DRAFTS_CHANGED_EVENT } from '../../api/draftService';
import { FEATURE_FLAGS } from '../../utils/featureFlags';
import { canUseDrafts } from '../../utils/drafts';
import NewFeatureBadge from '../common/NewFeatureBadge';
import DraftsPanel from './DraftsPanel';
import { t } from '../../locales';

/**
 * Takip sayfalarının başlığındaki "Taslaklar (N)" düğmesi ve taslak listesi (DRAFTS).
 *
 * Bayrak kapalıysa ya da rol taslak kullanmıyorsa (SUPER_ADMIN, CLIENT_USER) hiçbir şey çizmez. Düğme yalnızca
 * modülde taslak varken görünür; sayı `draftsChanged` olayıyla tazelenir. Hatırlatma bildiriminden gelinince
 * (`location.state.openDrafts`, `draftId`) liste sayı sıfır olsa da açılır ve taslak vurgulanır.
 * "Devam et" → `onContinue(draft)`: sayfa yeni kayıt modalını `initialDraft` ile açar. Bekleyen değişiklik
 * taslağında (hedefi olan) "İncele" → `onReview(draft)`: sayfa karşılaştırmayı açar (aşama 3).
 */
export default function DraftsControl({ module, isScrolled = false, canContinue = true, onContinue, onReview }) {
  const { user } = useAuth();
  const { hasFeature, isPilotFeature } = useFeatureFlags();
  const enabled = canUseDrafts(user, hasFeature);
  const isPilot = enabled && isPilotFeature(FEATURE_FLAGS.DRAFTS);
  const location = useLocation();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [panel, setPanel] = useState(null); // null | { highlightId }

  const loadSummary = useCallback(async () => {
    const result = await draftService.getSummary();
    if (result.success) setSummary(result.data);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    loadSummary();
    window.addEventListener(DRAFTS_CHANGED_EVENT, loadSummary);
    return () => window.removeEventListener(DRAFTS_CHANGED_EVENT, loadSummary);
  }, [enabled, loadSummary]);

  // Bildirimden gelindiyse listeyi aç; state temizlenir ki yenilemede tekrar açılmasın. Bayraklar henüz
  // yüklenmediyse state bekler.
  const openFromNav = location.state?.openDrafts === true;
  const navDraftId = location.state?.draftId ?? null;
  useEffect(() => {
    if (!openFromNav || !enabled) return;
    setPanel({ highlightId: navDraftId });
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [openFromNav, navDraftId, enabled, navigate, location.pathname, location.search]);

  const closePanel = useCallback(() => setPanel(null), []);

  const handleContinue = (draft) => {
    setPanel(null);
    onContinue?.(draft);
  };

  const handleReview = (draft) => {
    setPanel(null);
    onReview?.(draft);
  };

  if (!enabled) return null;
  const count = summary?.[module] ?? 0;

  return (
    <>
      {count > 0 && (
        <button
          type="button"
          onClick={() => setPanel({ highlightId: null })}
          className={`relative flex items-center justify-center rounded-lg border-2 border-gray-200 bg-white font-semibold transition-all duration-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 ${
            isScrolled ? 'gap-0 p-2' : 'gap-2 px-3 py-2.5 sm:px-4'
          }`}
          title={t('drafts.buttonTitle', { count })}
        >
          <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400">draft</span>
          {!isScrolled && (
            <span className="hidden whitespace-nowrap text-sm text-text-main md:inline">{t('drafts.button')}</span>
          )}
          <span
            className={`bg-amber-500 font-medium text-white transition-all duration-300 ${
              isScrolled
                ? 'absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px]'
                : 'rounded-full px-2 py-0.5 text-xs'
            }`}
          >
            {count}
          </span>
          {isPilot && !isScrolled && <NewFeatureBadge />}
        </button>
      )}

      {/* Başlık çubuğunun yığın bağlamından çıksın diye body'ye */}
      {panel && createPortal(
        <DraftsPanel
          module={module}
          purgeTime={summary?.purgeTime}
          canContinue={canContinue}
          highlightId={panel.highlightId}
          onContinue={handleContinue}
          onReview={onReview ? handleReview : undefined}
          onClose={closePanel}
        />,
        document.body,
      )}
    </>
  );
}
