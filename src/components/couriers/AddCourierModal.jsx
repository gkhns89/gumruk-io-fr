import React, { useState } from 'react';
import { courierService } from '../../api/courierService';
import { toUpperCase, COURIER_UPPERCASE_FIELDS } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { t } from '../../locales';
import InHouseDispatchFields from './InHouseDispatchFields';

const EMPTY_FORM = {
  name: '',
  shortName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
  // Yalnızca firma içi sevkiyat (IN_HOUSE)
  vehicleType: '',
  vehiclePlate: '',
  driverName: '',
};

/**
 * courierType: 'EXTERNAL' (kurye firması, varsayılan) | 'IN_HOUSE' (firma içi sevkiyat —
 * COURIER_CLIENT_STOPS bayrağı arkasında; backend de bayrağı kontrol eder).
 */
export default function AddCourierModal({ onClose, onSuccess, brokerCompanyId = null, courierType = 'EXTERNAL' }) {
  const isInHouse = courierType === 'IN_HOUSE';
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;

    // UPPERCASE conversion for specific fields; plaka veridir, dilden bağımsız Türkçe kuralla
    let newValue = value;
    if (COURIER_UPPERCASE_FIELDS.includes(name)) newValue = toUpperCase(value);
    else if (name === 'vehiclePlate') newValue = value.toLocaleUpperCase('tr-TR');

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear email error when typing
    if (name === 'contactEmail') {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setEmailError('');

    // Validate required fields
    if (!formData.name.trim()) {
      showError(isInHouse ? t('couriers.inHouse.nameRequired') : t('couriers.form.nameRequired'));
      return;
    }

    // Validate email format if provided
    if (!isInHouse && formData.contactEmail && formData.contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactEmail)) {
        setEmailError(t('management.invalidEmail'));
        return;
      }
    }

    setLoading(true);

    try {
      const result = await courierService.createCourierCompany({
        courierType,
        name: formData.name.trim(),
        contactPhone: formData.contactPhone.trim() || null,
        notes: formData.notes.trim() || null,
        active: true,
        ...(isInHouse
          ? {
              vehicleType: formData.vehicleType || null,
              vehiclePlate: formData.vehiclePlate.trim() || null,
              driverName: formData.driverName.trim() || null,
            }
          : {
              shortName: formData.shortName.trim() || null,
              contactEmail: formData.contactEmail.trim() || null,
            }),
      }, brokerCompanyId);

      if (result.success) {
        showSuccess(t('management.addedSuccess', { name: formData.name }));
        onSuccess(result.data);

        // Reset form and close
        setFormData(EMPTY_FORM);
        onClose();
      } else {
        showError(result.error || t('couriers.add.createError'));
      }
    } catch (err) {
      showError(getApiErrorMessage(err, t('management.unexpectedError')));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(EMPTY_FORM);
    setEmailError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 transition-colors duration-300">
          <div>
            <h2 className="text-2xl font-bold text-text-main">
              {isInHouse ? t('couriers.inHouse.add') : t('couriers.add.title')}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {isInHouse ? t('couriers.inHouse.addSubtitle') : t('couriers.add.subtitle')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company Name / Dispatch Name */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {isInHouse ? t('couriers.inHouse.name') : t('couriers.form.name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder={isInHouse ? t('couriers.inHouse.namePlaceholder') : t('couriers.form.namePlaceholder')}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              />
            </div>

            {isInHouse ? (
              <InHouseDispatchFields formData={formData} onChange={handleChange} />
            ) : (
              <>
                {/* Short Name */}
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    {t('company.shortName')}
                  </label>
                  <input
                    type="text"
                    name="shortName"
                    value={formData.shortName}
                    onChange={handleChange}
                    placeholder={t('couriers.form.shortNamePlaceholder')}
                    maxLength={100}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    {t('couriers.form.shortNameHint')}
                  </p>
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    {t('couriers.form.phone')}
                  </label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    placeholder={t('couriers.form.phonePlaceholder')}
                    maxLength={100}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  />
                </div>

                {/* Contact Email */}
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    {t('couriers.form.email')}
                  </label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    placeholder={t('couriers.form.emailPlaceholder')}
                    maxLength={255}
                    className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                      emailError
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {emailError && (
                    <p className="text-xs text-red-500 mt-1">{emailError}</p>
                  )}
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('management.notes')}
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder={isInHouse ? t('couriers.inHouse.notesPlaceholder') : t('couriers.form.notesPlaceholder')}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 pt-0 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            type="button"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('management.adding') : t('common.add')}
          </button>
        </div>
      </div>
    </div>
  );
}
