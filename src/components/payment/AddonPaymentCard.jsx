import React, { useState } from 'react';
import { addonService } from '../../api/addonService';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { confirmDialog } from '../../utils/confirmDialog';
import { showSuccess, showInfo } from '../../utils/toastUtils';
import { t, getCurrentLocale } from '../../locales';

const fmt = (d) => d ? new Date(d).toLocaleDateString(getCurrentLocale()) : '-';
const fmtMoney = (v) => v != null ? `₺${Number(v).toLocaleString(getCurrentLocale(), { minimumFractionDigits: 2 })}` : '-';

// "2026-09-19" gibi saatsiz tarih: new Date() onu UTC gece yarısı sayar, yerel
// gece yarısıyla karşılaştırmak "bugün"ü bir gün kaydırabilirdi.
const parseDueDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Vadesi gelmemiş, otomatik kesilebilir bir ek ücret mi?
 *
 * Gece koşan iş yalnızca vadesi gelmiş ONE_TIME ek ücretleri bakiyeden keser.
 * Vadesi olmayan ya da dönemsel bir ek ücrette "bakiye kullan" işaretlenirse
 * kendiliğinden hiçbir zaman kesilmez — o yüzden bu durumda tercih değil,
 * hemen ödeme sorulur.
 */
const willBeChargedAutomatically = (addon) => {
  if (addon.addonType !== 'ONE_TIME') return false;
  const due = parseDueDate(addon.dueDate);
  return due != null && due > startOfToday();
};

const getAddonStatus = (addon) => {
  if (addon.isPaid) return { label: t('paymentStatus.paid'), color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700', icon: 'check_circle' };

  const dueDate = parseDueDate(addon.dueDate);

  if (dueDate && dueDate < startOfToday()) {
    return { label: t('paymentPage.overdue'), color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700', icon: 'error' };
  }

  if (addon.addonType === 'RECURRING') {
    return { label: t('addonPayment.recurring'), color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700', icon: 'repeat' };
  }

  return { label: t('addonPayment.pending'), color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700', icon: 'schedule' };
};

/**
 * Tek bir ek ücretin ödeme kartı.
 *
 * "Bakiye kullan" kutusu tek başına para hareket ettirmez: niyeti kaydeder ve
 * onay sorar. Vadesi geldiyse (bugün ya da geçmiş) onaydan sonra tutar hemen
 * bakiyeden düşülür; gelmediyse yalnızca tercih kaydedilir ve kesimi vadesinde
 * gece koşan iş yapar. İşareti kaldırmak tercihi iptal eder, para çıkmaz.
 */
export default function AddonPaymentCard({ addon, balance = 0, onPay, onScrollToTransfer }) {
  const [useBalance, setUseBalance] = useState(addon.payFromBalance ?? false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [error, setError] = useState(null);

  const status = getAddonStatus(addon);
  const busy = isLoading || savingPreference;
  const balanceEnough = Number(balance) >= Number(addon.amount);

  /** Bakiyeden kesimi yapar; kart üstünde hata gösterir. Kesildiyse true döner. */
  const chargeNow = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await onPay(addon, true);
      if (result?.status === 'INSUFFICIENT_BALANCE') {
        setError(t('addonPayment.insufficientBalance'));
        onScrollToTransfer?.();
        return false;
      }
      // PAID_WITH_BALANCE → üst sayfa veriyi tazeler, kart listeden düşer
      return result?.status === 'PAID_WITH_BALANCE';
    } catch (err) {
      // markAddonAsPaid ham axios hatası fırlatır; err.message İngilizce ("Request failed with status code 400")
      setError(getApiErrorMessage(err, t('addonPayment.actionFailed')));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /** Tercihi kaydeder; kaydedilemezse kutuyu eski hâline döndürür. */
  const savePreference = async (checked) => {
    setSavingPreference(true);
    try {
      await addonService.updatePayPreference(addon.id, checked);
      return true;
    } catch (err) {
      setUseBalance(!checked);
      setError(getApiErrorMessage(err, t('addonPayment.actionFailed')));
      return false;
    } finally {
      setSavingPreference(false);
    }
  };

  const handleToggleUseBalance = async (checked) => {
    setError(null);

    if (!checked) {
      // İşaret kaldırıldı: yalnızca tercih iptal edilir, para hareket etmez.
      setUseBalance(false);
      if (await savePreference(false)) {
        showInfo(t('addonPayment.autoPayCancelled'));
      }
      return;
    }

    if (willBeChargedAutomatically(addon)) {
      const confirmed = await confirmDialog({
        title: t('addonPayment.confirmAutoPayTitle'),
        message: t('addonPayment.confirmAutoPayMessage', {
          date: fmt(addon.dueDate), amount: fmtMoney(addon.amount),
        }),
        confirmText: t('addonPayment.confirmAutoPayYes'),
        intent: 'primary',
      });
      if (!confirmed) return;
      setUseBalance(true);
      if (await savePreference(true)) {
        showSuccess(t('addonPayment.autoPaySaved', { date: fmt(addon.dueDate) }));
      }
      return;
    }

    // Vadesi geldi (ya da vadesiz/dönemsel): onaydan sonra tutar hemen düşülür.
    const confirmed = await confirmDialog({
      title: t('addonPayment.confirmTitle'),
      message: t('addonPayment.confirmChargeNowMessage', {
        amount: fmtMoney(addon.amount), name: addon.name,
      }),
      confirmText: t('addonPayment.confirmYes'),
      intent: 'primary',
    });
    if (!confirmed) return;

    setUseBalance(true);
    const saved = await savePreference(true);
    if (!saved) return;

    if (!balanceEnough) {
      // Tercih kaydedildi ama para çıkmadı: bakiye yüklendiğinde vadesinde kesilir.
      setError(t('addonPayment.insufficientBalanceNotCharged'));
      onScrollToTransfer?.();
      return;
    }
    await chargeNow();
  };

  const handlePayClick = async () => {
    if (addon.isPaid || busy) return;
    setError(null);

    if (!useBalance) {
      // Bakiye kullanılmıyor → havale formuna yönlendir
      onScrollToTransfer?.();
      return;
    }

    if (!balanceEnough) {
      setError(t('addonPayment.insufficientBalance'));
      onScrollToTransfer?.();
      return;
    }

    const confirmed = await confirmDialog({
      title: t('addonPayment.confirmTitle'),
      message: t('addonPayment.confirmChargeNowMessage', {
        amount: fmtMoney(addon.amount), name: addon.name,
      }),
      confirmText: t('addonPayment.confirmYes'),
      intent: 'primary',
    });
    if (!confirmed) return;

    await chargeNow();
  };

  return (
    <div className={`rounded-xl p-4 border transition-colors ${
      addon.isPaid
        ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary/30'
    }`}>

      {/* Başlık + Tutar */}
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
            <p className="text-xs text-text-secondary mt-0.5">{t('addonPayment.dueDate', { date: fmt(addon.dueDate) })}</p>
          )}
        </div>
      </div>

      {/* Hata */}
      {error && (
        <div className="mb-3 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-red-500 text-base flex-shrink-0 mt-0.5">error</span>
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Tercih kaydedildi bilgisi — kesim vadesinde yapılacak */}
      {!addon.isPaid && useBalance && !savingPreference && willBeChargedAutomatically(addon) && (
        <div className="mb-3 flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-blue-500 text-base flex-shrink-0 mt-0.5">event_available</span>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {t('addonPayment.autoPayPlanned', { date: fmt(addon.dueDate) })}
          </p>
        </div>
      )}

      {/* Kontroller */}
      {!addon.isPaid && (
        <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useBalance}
              onChange={(e) => handleToggleUseBalance(e.target.checked)}
              disabled={busy}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer disabled:opacity-50"
            />
            <span className="text-sm text-text-secondary">
              {savingPreference ? t('management.saving') : t('addonPayment.useBalance')}
              {useBalance && !savingPreference && balance > 0 && (
                <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                  {t('addonPayment.available', { amount: fmtMoney(balance) })}
                </span>
              )}
            </span>
          </label>

          <button
            onClick={handlePayClick}
            disabled={busy}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              useBalance
                ? 'bg-primary text-white hover:opacity-90'
                : 'bg-gray-100 dark:bg-gray-700 text-text-main hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {isLoading ? 'schedule' : useBalance ? 'account_balance_wallet' : 'account_balance'}
            </span>
            {isLoading ? t('addonPayment.processing') : useBalance ? t('addonPayment.payFromBalance') : t('addonPayment.payByTransfer')}
          </button>
        </div>
      )}
    </div>
  );
}
