import { useEffect, useRef } from 'react';
import { t } from '../../locales';

/**
 * Kaydedilmemiş değişiklik uyarısı. `ConfirmModal` ile aynı kabuk; üç seçenekli olduğu için ayrı bileşen.
 * `src/utils/unsavedChangesDialog.js` üzerinden imperatif açılır.
 *
 * ESC, arka plan ve çarpı "Düzenlemeye dön" demektir. ESC ve Ctrl+S window'da capture aşamasında durdurulur:
 * alttaki form modalının document dinleyicileri aynı tuşla kapanmaz ya da kayıt başlatmaz.
 */
export default function UnsavedChangesModal({ allowDraft = false, onChoose }) {
  const keepRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isEscape = e.key === 'Escape';
      const isSave = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S');
      if (!isEscape && !isSave) return;
      e.preventDefault();
      e.stopPropagation();
      if (isEscape && !e.repeat) onChoose('keep');
    };
    window.addEventListener('keydown', onKeyDown, true);
    const frame = requestAnimationFrame(() => keepRef.current?.focus());
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      cancelAnimationFrame(frame);
    };
  }, [onChoose]);

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
      onClick={(e) => { e.stopPropagation(); onChoose('keep'); }}
    >
      <div
        // Taslak seçeneğiyle üç düğme oluyor: dar kutuda uzun etiketler kırılıp bozuk görünüyordu
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full animate-zoom-in ${
          allowDraft ? 'max-w-2xl' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-message"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-yellow-500">warning</span>
            <h2 id="unsaved-changes-title" className="text-xl font-bold text-text-main dark:text-gray-100">
              {t('unsavedChanges.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onChoose('keep')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={t('common.close')}
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="p-6">
          <p id="unsaved-changes-message" className="text-text-secondary dark:text-gray-400 whitespace-pre-line">
            {t('unsavedChanges.message')}
          </p>
        </div>

        {/* Tek satır: "at" solda ve çerçevesiz (yıkıcı ama ikincil), "taslak" ve "devam" sağda. Üç düğme sarmalayınca
            görüntü dağılıyordu; dar ekranda alt alta diziliyor. */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 rounded-b-2xl">
          <button
            type="button"
            onClick={() => onChoose('discard')}
            className="sm:mr-auto px-3 py-2 whitespace-nowrap text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            <span>{t('unsavedChanges.discard')}</span>
          </button>
          {allowDraft && (
            <button
              type="button"
              onClick={() => onChoose('draft')}
              className="px-4 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm text-sm font-medium flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">draft</span>
              <span>{t('unsavedChanges.saveDraft')}</span>
            </button>
          )}
          <button
            ref={keepRef}
            type="button"
            onClick={() => onChoose('keep')}
            className="px-4 py-2.5 whitespace-nowrap text-white bg-primary hover:opacity-90 rounded-lg transition-colors shadow-sm text-sm font-semibold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            <span>{t('unsavedChanges.keepEditing')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
