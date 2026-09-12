import React, { useState, useEffect } from 'react';
import { employeeService } from '../../api/employeeService';
import { paymentService } from '../../api/paymentService';
import { toUpperCase } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { t, getCurrentLocale } from '../../locales';

export default function EditEmployeeModal({ onClose, employee, currentUser, onSuccess }) {
  const locale = getCurrentLocale();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    globalRole: 'BROKER_USER',
    isActive: true,
    isPaymentResponsible: false,
  });

  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Populate form when employee changes
  useEffect(() => {
    if (employee) {
      setFormData({
        username: employee.username || '',
        email: employee.email || '',
        globalRole: employee.globalRole || 'BROKER_USER',
        isActive: employee.isActive !== undefined ? employee.isActive : true,
        isPaymentResponsible: employee.isPaymentResponsible ?? false,
      });
    }
  }, [employee]);

  // Check if editing self
  const isEditingSelf = currentUser?.id === employee.id;
  const isBrokerStaffRole = (role) => role === 'BROKER_ADMIN' || role === 'BROKER_USER';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailError(t('management.invalidEmail'));
      return;
    }

    setLoading(true);

    try {
      const updateData = {
        username: formData.username,
        email: formData.email
      };

      // Only include role and status if not editing self
      if (!isEditingSelf) {
        updateData.globalRole = formData.globalRole;
        updateData.isActive = formData.isActive;
      }

      const result = await employeeService.updateEmployee(employee.id, updateData);

      // Ödeme sorumlusu değiştiyse güncelle
      if (!isEditingSelf && isBrokerStaffRole(formData.globalRole)) {
        await paymentService.setPaymentResponsible(employee.id, formData.isPaymentResponsible);
      }

      if (result.success) {
        showSuccess(t('employee.messages.updateSuccess'));
        onSuccess(result.data);
        onClose();
      } else {
        // API error - show as toast
        showError(result.error || t('employee.messages.updateError'));
      }
    } catch (err) {
      // Network/unexpected error - show as toast
      showError(err.response?.data?.error || t('management.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
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
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 transition-colors duration-300">
          <div>
            <h2 className="text-2xl font-bold text-text-main">
              {t('employee.edit')}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {isEditingSelf ? t('employees.edit.subtitleSelf') : t('employees.edit.subtitle')}
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
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Self-edit warning */}
            {isEditingSelf && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">info</span>
                  <p className="text-blue-800 dark:text-blue-300 text-sm">
                    {t('employees.edit.selfWarning')}
                  </p>
                </div>
              </div>
            )}

            {/* Username - UPPERCASE transformation */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('management.username')} *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  username: toUpperCase(e.target.value, locale)
                }))}
                required
                placeholder={t('employees.common.usernamePlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            {/* Email - lowercase transformation */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('employee.email')} *
              </label>
              <input
                type="text"
                value={formData.email}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    email: e.target.value.toLowerCase()
                  }));
                  if (emailError) setEmailError('');
                }}
                required
                placeholder={t('employee.placeholders.email')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary lowercase bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors ${
                  emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ textTransform: 'lowercase' }}
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-600">{emailError}</p>
              )}
            </div>

            {/* Role Selection - Disabled when editing self */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('employee.role')} *
              </label>
              <select
                value={formData.globalRole}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  globalRole: e.target.value
                }))}
                disabled={isEditingSelf}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors"
              >
                <option value="BROKER_USER">{t('roles.brokerUser')}</option>
                <option value="BROKER_ADMIN">{t('roles.brokerAdmin')}</option>
              </select>
              {isEditingSelf && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {t('employees.edit.cannotChangeOwnRole')}
                </p>
              )}
            </div>

            {/* Status Selection - Disabled when editing self */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('employee.status')} *
              </label>
              <select
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  isActive: e.target.value === 'true'
                }))}
                disabled={isEditingSelf}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors"
              >
                <option value="true">{t('employee.statuses.active')}</option>
                <option value="false">{t('employee.statuses.pending')}</option>
              </select>
              {isEditingSelf && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {t('employees.edit.cannotChangeOwnStatus')}
                </p>
              )}
            </div>


            {/* Ödeme Sorumlusu - Sadece BROKER_ADMIN veya BROKER_USER için */}
            {!isEditingSelf && isBrokerStaffRole(formData.globalRole) && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors">
                <div>
                  <p className="text-sm font-medium text-text-main">{t('payment.paymentResponsible')}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{t('employees.edit.paymentResponsibleHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isPaymentResponsible: !prev.isPaymentResponsible }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isPaymentResponsible ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                    formData.isPaymentResponsible ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('management.updating') : t('common.update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
