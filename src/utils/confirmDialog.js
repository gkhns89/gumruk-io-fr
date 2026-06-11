import React from 'react';
import { createRoot } from 'react-dom/client';
import ConfirmModal from '../components/common/ConfirmModal';

/**
 * Imperative Promise-based confirmation dialog — the project's replacement
 * for window.confirm(). Mounts a fresh ConfirmModal into a temporary div on
 * <body>, resolves true on confirm / false on cancel, then tears the mount
 * back down. Safe to call from event handlers anywhere in the app without
 * threading state through every level.
 *
 * Usage:
 *   const ok = await confirmDialog({
 *     title: 'Bildirimi sil',
 *     message: 'Bu işlem geri alınamaz.',
 *     intent: 'danger',
 *     confirmText: 'Sil',
 *   });
 *   if (!ok) return;
 *
 * Options mirror ConfirmModal's props except onConfirm/onCancel — those are
 * managed internally so the caller just awaits the boolean.
 *
 * @param {object}   options
 * @param {string}   options.title           Header text (required).
 * @param {string}   [options.message]       Body paragraph. Newlines respected.
 * @param {string[]} [options.details]       Bullet list rendered under the message.
 * @param {string}   [options.confirmText='Onayla']
 * @param {string}   [options.cancelText='Vazgeç']
 * @param {'primary'|'danger'|'warning'} [options.intent='primary']
 * @param {string}   [options.icon]          Override the intent's default icon.
 * @returns {Promise<boolean>}
 */
export function confirmDialog(options) {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.setAttribute('data-confirm-dialog', '');
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = (result) => {
      // Defer the unmount to next tick so React can finish its commit phase
      // before we tear the tree down — avoids a "synchronously unmount during
      // render" warning when the consumer awaits inside a state setter.
      setTimeout(() => {
        root.unmount();
        if (container.parentNode) container.parentNode.removeChild(container);
      }, 0);
      resolve(result);
    };

    root.render(
      React.createElement(ConfirmModal, {
        open: true,
        title: options.title,
        message: options.message,
        details: options.details,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        intent: options.intent,
        icon: options.icon,
        onConfirm: () => cleanup(true),
        onCancel: () => cleanup(false),
      })
    );
  });
}
