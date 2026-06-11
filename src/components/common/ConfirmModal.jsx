import React from 'react';

/**
 * Reusable confirmation modal. Use the {@link confirmDialog} helper from
 * `src/utils/confirmDialog.js` to invoke imperatively (await-able promise);
 * use this component directly when you want to inline the state in a parent.
 *
 * Three intent variants drive the colour theme:
 *  - "primary" (default): blue/primary confirm button. For neutral actions.
 *  - "danger": red confirm button. For destructive / irreversible actions.
 *  - "warning": amber confirm button. For "are you sure?" without losing data.
 *
 * Closes on ESC, backdrop click, or explicit cancel. Focus is moved to the
 * confirm button on open so Enter accepts.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  details,
  confirmText = 'Onayla',
  cancelText = 'Vazgeç',
  intent = 'primary',
  icon,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    // Move focus to confirm button so Enter accepts.
    requestAnimationFrame(() => confirmRef.current?.focus());
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const palette = INTENT[intent] || INTENT.primary;
  const resolvedIcon = icon || palette.icon;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
      onClick={(e) => { if (!loading) onCancel?.(); e.stopPropagation(); }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined text-3xl ${palette.iconColor}`}>
              {resolvedIcon}
            </span>
            <h2 id="confirm-modal-title" className="text-xl font-bold text-text-main dark:text-gray-100">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !loading && onCancel?.()}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="p-6 space-y-3">
          {message && (
            <p className="text-text-secondary dark:text-gray-400 whitespace-pre-line">{message}</p>
          )}
          {details && (
            <ul className="space-y-1 text-sm text-text-secondary dark:text-gray-400 list-disc list-inside">
              {details.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 rounded-b-2xl">
          <button
            type="button"
            onClick={() => !loading && onCancel?.()}
            disabled={loading}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 shadow-sm text-sm font-medium"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onConfirm?.()}
            disabled={loading}
            className={`px-6 py-2.5 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm text-sm font-semibold ${palette.confirmBg}`}
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const INTENT = {
  primary: {
    icon: 'help',
    iconColor: 'text-primary',
    confirmBg: 'bg-primary hover:opacity-90',
  },
  danger: {
    icon: 'warning',
    iconColor: 'text-red-500',
    confirmBg: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: 'info',
    iconColor: 'text-yellow-500',
    confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
  },
};
