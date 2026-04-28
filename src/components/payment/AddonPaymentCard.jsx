import React, { useState } from 'react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
const fmtMoney = (v) => v != null ? `₺${Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-';

// Addon durumunu hesapla
const getAddonStatus = (addon) => {
  if (addon.isPaid) return { label: 'Ödendi', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700', icon: 'check_circle' };

  const dueDate = addon.dueDate ? new Date(addon.dueDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dueDate && dueDate < today) {
    return { label: 'Gecikmiş', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700', icon: 'error' };
  }

  if (addon.type === 'RECURRING') {
    return { label: 'Dönemsel', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700', icon: 'repeat' };
  }

  return { label: 'Bekliyor', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700', icon: 'schedule' };
};

export default function AddonPaymentCard({ addon, balance = 0, onPay }) {
  const [useBalance, setUseBalance] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const status = getAddonStatus(addon);
  const canUseBalance = balance >= addon.amount;
  const isDisabled = addon.isPaid || isLoading;

  const handlePay = async () => {
    if (isDisabled) return;

    setIsLoading(true);
    setError(null);

    try {
      await onPay(addon.id, useBalance);
    } catch (err) {
      setError(err.message || 'İşlem başarısız oldu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`rounded-xl p-4 border transition-colors ${
      addon.isPaid
        ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary/30'
    }`}>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-text-main">{addon.name}</h3>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.color}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{status.icon}</span>
              {status.label}
            </span>
          </div>
          {addon.description && (
            <p className="text-xs text-text-secondary mt-1">{addon.description}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-semibold text-text-main">{fmtMoney(addon.amount)}</p>
          {addon.dueDate && (
            <p className="text-xs text-text-secondary mt-0.5">Ödeme: {fmt(addon.dueDate)}</p>
          )}
        </div>
      </div>

      {/* Hata mesajı */}
      {error && (
        <div className="mb-3 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-red-500 text-base flex-shrink-0 mt-0.5">error</span>
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Checkbox + Ödeme Butonu */}
      {!addon.isPaid && (
        <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useBalance}
              onChange={(e) => setUseBalance(e.target.checked)}
              disabled={!canUseBalance || isLoading}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-text-secondary">
              Bakiye kullan
              {useBalance && !canUseBalance && (
                <span className="ml-1 text-red-600 dark:text-red-400">
                  (Yetersiz: {fmtMoney(balance)})
                </span>
              )}
            </span>
          </label>

          <button
            onClick={handlePay}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors
              bg-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">
              {isLoading ? 'schedule' : 'check'}
            </span>
            {isLoading ? 'İşlem yapılıyor...' : 'Öde'}
          </button>
        </div>
      )}
    </div>
  );
}
