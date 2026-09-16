import React, { useState } from 'react';
import { userService } from '../../api/userService';
import NewPasswordFields from '../common/NewPasswordFields';
import { showSuccess, showError } from '../../utils/toastUtils';
import { confirmDialog } from '../../utils/confirmDialog';
import { validateNewPassword } from '../../utils/passwordUtils';
import { t } from '../../locales';

/**
 * Yönetici bir çalışana şifre belirler (PUT /users/{id}/password). Backend kullanıcının bütün açık oturumlarını
 * kapatır ve audit kaydı yazar; kaydetmeden önce bu confirmDialog ile söylenir.
 *
 * Kimin kime belirleyebileceğini EmployeesPage süzer (BROKER_ADMIN → BROKER_USER, SUPER_ADMIN → SUPER_ADMIN
 * olmayan, kimse kendine); son söz backend'de.
 */
export default function SetPasswordModal({ employee, onClose, onSuccess }) {
  const [value, setValue] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (next) => {
    setValue(next);
    if (errors.password || errors.confirm) setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateNewPassword(value.password, value.confirm);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const ok = await confirmDialog({
      title: t('employees.setPassword.confirmTitle'),
      message: t('employees.setPassword.confirmMessage', { name: employee.username }),
      intent: 'warning',
      icon: 'lock_reset',
      confirmText: t('employees.setPassword.submit'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;

    setSaving(true);
    const result = await userService.setUserPassword(employee.id, {
      newPassword: value.password,
      confirmPassword: value.confirm,
    });
    setSaving(false);

    if (result.success) {
      showSuccess(t('employees.setPassword.success', { name: employee.username }));
      onSuccess?.();
      onClose();
    } else {
      showError(result.error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 transition-colors duration-300">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-text-main">{t('employees.setPassword.title')}</h2>
            <p className="text-sm text-text-secondary mt-1 truncate">
              {employee.username} · {employee.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="p-6">
          <div className="space-y-4">
            <NewPasswordFields
              value={value}
              onChange={handleChange}
              errors={errors}
              label={t('passwordForm.newPassword')}
              disabled={saving}
              idPrefix="set-password"
            />

            <div className="bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg p-3 transition-colors">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5">logout</span>
                <p className="text-amber-800 dark:text-amber-300 text-sm">{t('employees.setPassword.sessionsWarning')}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 transition-colors">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('management.saving') : t('employees.setPassword.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
