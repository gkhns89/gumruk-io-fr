import React from 'react';
import { COURIER_VEHICLE_TYPES } from '../../utils/constants';
import { t } from '../../locales';

const inputClass = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors';

/**
 * Firma içi sevkiyat kaydının araç ve sürücü alanları (Ekle / Düzenle modalları ortak).
 * formData: { vehicleType, vehiclePlate, driverName, contactPhone } — contactPhone sürücü telefonudur.
 * Plakanın büyük harfe çevrilmesi modalın onChange'inde yapılır.
 *
 * `vehiclesManagedElsewhere` (canlı takip bayrağı açık, düzenleme modalı): kaydın tek plakası artık Araçlar
 * sekmesindeki araç listesiyle aynı şeyi anlatır. İki yerde ayrı ayrı tutulursa birbirinden kayarlar, bu yüzden
 * araç alanları gizlenir ve kullanıcı sekmeye yönlendirilir; telefon kaydın kendi iletişim bilgisi olarak kalır.
 */
export default function InHouseDispatchFields({ formData, onChange, vehiclesManagedElsewhere = false,
  noticeKey = 'couriers.inHouse.vehiclesInTab' }) {
  if (vehiclesManagedElsewhere) {
    return (
      <>
        <p className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>directions_car</span>
          {t(noticeKey)}
        </p>
        <div>
          <label className="block text-sm font-medium text-text-main mb-2">
            {t('couriers.inHouse.driverPhone')}
          </label>
          <input
            type="tel"
            name="contactPhone"
            value={formData.contactPhone}
            onChange={onChange}
            placeholder={t('couriers.form.phonePlaceholder')}
            maxLength={100}
            className={inputClass}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vehicle Type */}
        <div>
          <label className="block text-sm font-medium text-text-main mb-2">
            {t('couriers.inHouse.vehicleType')}
          </label>
          <select
            name="vehicleType"
            value={formData.vehicleType}
            onChange={onChange}
            className={inputClass}
          >
            <option value="">{t('couriers.inHouse.selectVehicleType')}</option>
            {COURIER_VEHICLE_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Plate */}
        <div>
          <label className="block text-sm font-medium text-text-main mb-2">
            {t('couriers.inHouse.plate')}
          </label>
          <input
            type="text"
            name="vehiclePlate"
            value={formData.vehiclePlate}
            onChange={onChange}
            placeholder={t('couriers.inHouse.platePlaceholder')}
            maxLength={20}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Driver Name */}
        <div>
          <label className="block text-sm font-medium text-text-main mb-2">
            {t('couriers.inHouse.driverName')}
          </label>
          <input
            type="text"
            name="driverName"
            value={formData.driverName}
            onChange={onChange}
            placeholder={t('couriers.inHouse.driverNamePlaceholder')}
            maxLength={150}
            className={inputClass}
          />
        </div>

        {/* Driver Phone */}
        <div>
          <label className="block text-sm font-medium text-text-main mb-2">
            {t('couriers.inHouse.driverPhone')}
          </label>
          <input
            type="tel"
            name="contactPhone"
            value={formData.contactPhone}
            onChange={onChange}
            placeholder={t('couriers.form.phonePlaceholder')}
            maxLength={100}
            className={inputClass}
          />
        </div>
      </div>
    </>
  );
}
