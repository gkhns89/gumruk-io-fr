import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import UnsavedChangesModal from '../components/common/UnsavedChangesModal';

const DIALOG_ATTRIBUTE = 'data-unsaved-changes-dialog';

/**
 * "Kaydedilmemiş değişiklikler" diyaloğu. `confirmDialog` gibi `<body>`'ye geçici bir kök bağlar ve
 * kullanıcının seçimiyle çözülür:
 *  - `'keep'`    Düzenlemeye dön (varsayılan: ESC, arka plan, çarpı, odaklı düğme)
 *  - `'discard'` Değişiklikleri at
 *  - `'draft'`   Taslak olarak kaydet (yalnızca `allowDraft` verilirse gösterilir)
 *
 * Genelde doğrudan değil, `useUnsavedChangesGuard` üzerinden kullanılır.
 *
 * @param {object}  [options]
 * @param {boolean} [options.allowDraft=false]
 * @returns {Promise<'keep'|'discard'|'draft'>}
 */
export function unsavedChangesDialog({ allowDraft = false } = {}) {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.setAttribute(DIALOG_ATTRIBUTE, '');
    document.body.appendChild(container);
    const root = createRoot(container);
    const previousFocus = document.activeElement;
    let settled = false;

    const choose = (choice) => {
      if (settled) return;
      settled = true;
      // confirmDialog ile aynı: React commit'ini bitirsin diye unmount bir sonraki tura bırakılır.
      setTimeout(() => {
        root.unmount();
        container.remove();
      }, 0);
      if (choice === 'keep' && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
      resolve(choice);
    };

    root.render(createElement(UnsavedChangesModal, { allowDraft, onChoose: choose }));
  });
}

/** Modalın üstünde imperatif bir diyalog (confirmDialog ya da bu diyalog) açık mı? */
export function isStackedDialogOpen() {
  return !!document.querySelector(`[${DIALOG_ATTRIBUTE}], [data-confirm-dialog]`);
}
