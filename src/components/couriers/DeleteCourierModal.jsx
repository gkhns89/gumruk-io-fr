import React, { useState } from 'react';
import { courierService } from '../../api/courierService';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { getCourierVehicleType, isInHouseCourier } from '../../utils/constants';
import { t } from '../../locales';

export default function DeleteCourierModal({ onClose, courier, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const isInHouse = isInHouseCourier(courier);
  const courierName = courier.shortName || courier.name;
  // Firma içi kayıtta ikinci satır plaka · sürücü; kurye firmasında kısa ad varsa tam ad
  const subtitle = isInHouse
    ? [courier.vehiclePlate, courier.driverName].filter(Boolean).join(' · ')
    : (courier.shortName ? courier.name : '');
  const icon = isInHouse
    ? (getCourierVehicleType(courier.vehicleType)?.icon || 'local_shipping')
    : 'two_wheeler';
  // Kalın yazılan parçalar için metin yer tutucunun iki yanından bölünüyor
  const [confirmBefore, confirmAfter] = t(isInHouse ? 'couriers.inHouse.deleteConfirmMessage' : 'couriers.delete.confirmMessage').split('{{name}}');
  const [schedulesBefore, schedulesAfter] = t(isInHouse ? 'couriers.inHouse.deleteSchedulesWarning' : 'couriers.delete.schedulesWarning').split('{{schedules}}');

  const handleDelete = async () => {
    setLoading(true);

    try {
      const result = await courierService.deleteCourierCompany(courier.id);

      if (result.success) {
        showSuccess(t('management.deletedSuccess', { name: courierName }));
        onSuccess();
        onClose();
      } else {
        showError(result.error || t('couriers.delete.error'));
      }
    } catch (err) {
      showError(getApiErrorMessage(err, t('management.unexpectedError')));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-md w-full animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">warning</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main">
                {isInHouse ? t('couriers.inHouse.deleteTitle') : t('couriers.delete.title')}
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {t('management.irreversible')}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Courier info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                  {icon}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-main">
                  {courierName}
                </p>
                {subtitle && (
                  <p className="text-xs text-text-secondary">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-text-secondary">{t('management.status')}</p>
                <p className="text-text-main font-medium">
                  {courier.active ? t('transactions.common.active') : t('management.inactive')}
                </p>
              </div>
              <div>
                <p className="text-text-secondary">{t('couriers.delete.departureTimes')}</p>
                <p className="text-text-main font-medium">
                  {t('couriers.delete.count', { count: courier.schedules?.length || 0 })}
                </p>
              </div>
            </div>
            {courier.contactPhone && (
              <div className="mt-2 text-xs">
                <p className="text-text-secondary">
                  {isInHouse ? t('couriers.inHouse.driverPhone') : t('couriers.delete.contact')}
                </p>
                <p className="text-text-main font-medium">{courier.contactPhone}</p>
              </div>
            )}
          </div>

          {/* Warning message */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 transition-colors duration-300">
            <p className="text-red-800 dark:text-red-300 text-sm">
              {confirmBefore}<span className="font-semibold">{courierName}</span>{confirmAfter}
            </p>
          </div>

          {/* Schedule warning if exists */}
          {courier.schedules && courier.schedules.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 transition-colors duration-300">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-sm mt-0.5">schedule</span>
                <p className="text-amber-800 dark:text-amber-300 text-xs">
                  {schedulesBefore}
                  <span className="font-semibold">{t('couriers.delete.schedulesCount', { count: courier.schedules.length })}</span>
                  {schedulesAfter}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('management.deleting') : t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
