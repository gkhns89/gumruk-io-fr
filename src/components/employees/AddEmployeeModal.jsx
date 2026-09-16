import React, { useState } from 'react';
import { employeeService } from '../../api/employeeService';
import NewPasswordFields from '../common/NewPasswordFields';
import { toUpperCase } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { validateNewPassword } from '../../utils/passwordUtils';
import { t, getCurrentLocale } from '../../locales';

const EMPTY_FORM = { username: '', email: '', password: '', confirmPassword: '', globalRole: 'BROKER_USER' };

/**
 * Yeni çalışan.
 *
 * Broker Yöneticisi seçeneği yalnızca SUPER_ADMIN'e görünür: BROKER_ADMIN'in açtığı her hesap BROKER_USER'dır
 * (backend başka rolü 403 ile reddeder).
 *
 * Form giriş formuna benzemesin diye e-posta type="email" + autoComplete="off", şifreler autoComplete="new-password"
 * ve tekrar alanıyla: tarayıcı yöneticinin kendi kayıtlı şifresini doldurunca çalışan, kimsenin bilmediği bir şifreyle
 * açılıyordu.
 */
export default function AddEmployeeModal({ onClose, onSuccess, brokerCompanyId, currentLimits, canCreateAdmin = false }) {
  const locale = getCurrentLocale();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setEmailError('');
    setPasswordErrors({});

    // Validate broker company ID
    if (!brokerCompanyId || isNaN(brokerCompanyId)) {
      showError(t('employees.add.companyMissing'));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailError(t('management.invalidEmail'));
      return;
    }

    // Şifre: en az 8 karakter, en fazla 72 bayt, tekrarıyla aynı
    const errors = validateNewPassword(formData.password, formData.confirmPassword);
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    // Check quota
    if (currentLimits && (currentLimits.canAddUser === false || currentLimits.remainingUserQuota <= 0)) {
      showError(t('employees.add.quotaExceeded'));
      return;
    }

    setLoading(true);

    try {
      const result = await employeeService.createEmployee({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        globalRole: canCreateAdmin ? formData.globalRole : 'BROKER_USER',
        companyId: brokerCompanyId
      });

      if (result.success) {
        showSuccess(t('management.addedSuccess', { name: formData.username }));
        onSuccess(result.data);

        // Reset form and close
        setFormData(EMPTY_FORM);
        onClose();
      } else {
        // API error - show as toast
        showError(result.error || t('employee.messages.createError'));
      }
    } catch (err) {
      // Network/unexpected error - show as toast
      showError(getApiErrorMessage(err, t('management.unexpectedError')));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(EMPTY_FORM);
    setEmailError('');
    setPasswordErrors({});
    onClose();
  };

  const isQuotaExceeded = currentLimits && (currentLimits.canAddUser === false || currentLimits.remainingUserQuota <= 0);

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
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 transition-colors duration-300">
          <div>
            <h2 className="text-2xl font-bold text-text-main">
              {t('employee.addNew')}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {t('employees.add.subtitle')}
            </p>
            {currentLimits && (
              <p className="text-xs text-text-secondary mt-1">
                {currentLimits.currentBrokerUsers} / {currentLimits.maxBrokerUsers} {t('employees.common.brokerUsers')}
                {isQuotaExceeded && (
                  <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">• {t('employees.common.limitReached')}</span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} autoComplete="off" className="p-6 overflow-y-auto">
          <div className="space-y-4">
            {/* Username - UPPERCASE transformation */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('management.username')} *
              </label>
              <input
                type="text"
                autoComplete="off"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  username: toUpperCase(e.target.value, locale)
                }))}
                required
                placeholder={t('employees.common.usernamePlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase transition-colors"
                style={{ textTransform: 'uppercase' }}
              />
              <p className="mt-1 text-xs text-text-secondary">
                {t('employees.add.usernameHint')}
              </p>
            </div>

            {/* Email - lowercase transformation */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('employee.email')} *
              </label>
              <input
                type="email"
                autoComplete="off"
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
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary lowercase transition-colors ${
                  emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ textTransform: 'lowercase' }}
              />
              {emailError ? (
                <p className="mt-1 text-xs text-red-600">{emailError}</p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary">
                  {t('employees.add.emailHint')}
                </p>
              )}
            </div>

            {/* Password + confirmation */}
            <NewPasswordFields
              value={{ password: formData.password, confirm: formData.confirmPassword }}
              onChange={({ password, confirm }) => {
                setFormData(prev => ({ ...prev, password, confirmPassword: confirm }));
                if (passwordErrors.password || passwordErrors.confirm) setPasswordErrors({});
              }}
              errors={passwordErrors}
              label={t('employee.password')}
              disabled={loading}
              idPrefix="add-employee"
            />

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('employee.role')} *
              </label>
              {canCreateAdmin ? (
                <>
                  <select
                    value={formData.globalRole}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      globalRole: e.target.value
                    }))}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  >
                    <option value="BROKER_USER">{t('roles.brokerUser')}</option>
                    <option value="BROKER_ADMIN">{t('roles.brokerAdmin')}</option>
                  </select>
                  <p className="mt-1 text-xs text-text-secondary">
                    {t('employees.add.roleHint')}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-text-main rounded-lg transition-colors">
                    {t('roles.brokerUser')}
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {t('employees.add.roleBrokerUserOnly')}
                  </p>
                </>
              )}
            </div>

            {/* Quota Warning */}
            {isQuotaExceeded && (
              <div className="bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg p-3 transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-sm">warning</span>
                  <p className="text-amber-800 dark:text-amber-300 text-sm">
                    {t('employees.add.quotaWarning')}
                  </p>
                </div>
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
              disabled={loading || isQuotaExceeded}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('management.creating') : t('employees.add.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
