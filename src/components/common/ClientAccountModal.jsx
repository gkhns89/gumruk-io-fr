import React, { useState } from 'react';
import { clientUserService } from '../../api/clientUserService';
import { userService } from '../../api/userService';
import { toUpperCase } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getApiErrorMessage } from '../../utils/errorUtils';
import {
  generatePassword,
  passwordByteLength,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_BYTES,
} from '../../utils/passwordUtils';
import { t, getCurrentLocale } from '../../locales';

/**
 * Müşteri firmasının giriş hesabı.
 *
 * Firma başına tek hesap açılabiliyor (backend kuralı), o yüzden modal iki modda
 * çalışıyor: hesap yoksa oluşturma, varsa e-posta/parola güncelleme. Parola
 * yalnızca burada bir kez görünür — sistem henüz e-posta göndermediği için
 * broker'ın onu müşteriye kendi kanalından iletmesi gerekiyor.
 *
 * Düzenlemede e-posta/kullanıcı adı PUT /users/{id} ile, yeni parola ayrı olarak
 * PUT /users/{id}/password ile gider; o uç müşterinin açık oturumlarını kapatır.
 *
 * @param {Object} props.client - Müşteri firması (account alanı hesabı taşır)
 * @param {function} props.onSuccess - Kaydetme sonrası listeyi tazelemek için
 */
export default function ClientAccountModal({ isOpen, onClose, client, onSuccess }) {
  const locale = getCurrentLocale();
  const account = client?.account || null;
  const isEdit = account != null;

  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  // Modal her açılışında forma müşterinin güncel hesabını bas.
  const [syncedFor, setSyncedFor] = useState(null);

  if (!isOpen || !client) return null;

  const formKey = `${client.id}:${account?.id ?? 'new'}`;
  if (syncedFor !== formKey) {
    setSyncedFor(formKey);
    setFormData({
      email: account?.email || '',
      username: account?.username || client.shortName || client.name || '',
      password: '',
    });
    setFieldErrors({});
    setShowPassword(false);
    return null;
  }

  const validate = () => {
    const errors = {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('clients.account.invalidEmail');
    }

    if (!formData.username.trim()) {
      errors.username = t('clients.account.usernameRequired');
    } else if (formData.username.trim().length < 3) {
      errors.username = t('clients.account.usernameMin');
    }

    // Düzenlemede boş parola "değiştirme" anlamına geliyor, o yüzden serbest.
    const passwordRequired = !isEdit || formData.password.length > 0;
    if (passwordRequired && formData.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = t('clients.account.passwordMin', { min: MIN_PASSWORD_LENGTH });
    } else if (passwordRequired && passwordByteLength(formData.password) > MAX_PASSWORD_BYTES) {
      errors.password = t('passwordForm.tooLong', { max: MAX_PASSWORD_BYTES });
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (!isEdit) {
        const result = await clientUserService.createAccount({
          clientCompanyId: client.id,
          email: formData.email,
          username: formData.username,
          password: formData.password,
        });
        if (!result.success) {
          showError(result.error);
          return;
        }
        showSuccess(t('clients.account.createSuccess', { name: client.name }));
        onSuccess();
        onClose();
        return;
      }

      const detailsChanged = formData.email !== account.email || formData.username !== account.username;
      if (detailsChanged) {
        const updated = await clientUserService.updateAccount(account.id, {
          email: formData.email,
          username: formData.username,
        });
        if (!updated.success) {
          showError(updated.error);
          return;
        }
      }

      if (formData.password) {
        // Bu modalda tekrar alanı yok: parola göster/üret ile görünür durumda ve müşteriye iletilecek.
        const passwordResult = await userService.setUserPassword(account.id, {
          newPassword: formData.password,
          confirmPassword: formData.password,
        });
        if (!passwordResult.success) {
          showError(passwordResult.error);
          if (detailsChanged) onSuccess();
          return;
        }
      }

      showSuccess(formData.password
        ? t('clients.account.passwordSetSuccess')
        : t('clients.account.updateSuccess'));
      onSuccess();
      onClose();
    } catch (err) {
      showError(getApiErrorMessage(err, t('management.unexpectedError')));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    setFormData((prev) => ({ ...prev, password: generatePassword() }));
    setShowPassword(true);
    setFieldErrors((prev) => ({ ...prev, password: undefined }));
  };

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      const result = await clientUserService.updateAccount(account.id, {
        isActive: !account.isActive,
      });
      if (result.success) {
        showSuccess(account.isActive ? t('clients.account.deactivated') : t('clients.account.activated'));
        onSuccess();
        onClose();
      } else {
        showError(result.error);
      }
    } catch (err) {
      showError(getApiErrorMessage(err, t('management.unexpectedError')));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
      fieldErrors[field] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between transition-colors duration-300">
          <div>
            <h2 className="text-2xl font-bold text-text-main">
              {isEdit ? t('clients.account.editTitle') : t('clients.account.createTitle')}
            </h2>
            <p className="text-sm text-text-secondary mt-1">{client.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="p-6">
          <div className="space-y-4">
            {/* E-posta */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('clients.account.email')} *
              </label>
              <input
                type="email"
                autoComplete="off"
                value={formData.email}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value.toLowerCase() }));
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                required
                placeholder={t('clients.account.emailPlaceholder')}
                className={`${inputClass('email')} lowercase`}
                style={{ textTransform: 'lowercase' }}
              />
              {fieldErrors.email ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary">
                  {t('clients.account.emailHint')}
                </p>
              )}
            </div>

            {/* Kullanıcı adı */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('management.username')} *
              </label>
              <input
                type="text"
                autoComplete="off"
                value={formData.username}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    username: toUpperCase(e.target.value, locale),
                  }));
                  if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }}
                required
                placeholder={t('clients.account.usernamePlaceholder')}
                className={`${inputClass('username')} uppercase`}
                style={{ textTransform: 'uppercase' }}
              />
              {fieldErrors.username ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.username}</p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary">
                  {t('clients.account.usernameHint')}
                </p>
              )}
            </div>

            {/* Parola */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-main">
                  {isEdit ? t('clients.account.newPassword') : `${t('clients.account.password')} *`}
                </label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">casino</span>
                  {t('clients.account.generatePassword')}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, password: e.target.value }));
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  required={!isEdit}
                  placeholder={isEdit ? t('clients.account.passwordKeepPlaceholder') : t('clients.account.passwordMinHint', { min: MIN_PASSWORD_LENGTH })}
                  className={`${inputClass('password')} pr-10 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary"
                  title={showPassword ? t('clients.account.hide') : t('clients.account.show')}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {fieldErrors.password ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary">
                  {isEdit
                    ? t('clients.account.passwordKeepHint')
                    : t('clients.account.passwordMinHint', { min: MIN_PASSWORD_LENGTH })}
                </p>
              )}
            </div>

            {/* Parola teslimi uyarısı */}
            {formData.password && (
              <div className="bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg p-3 transition-colors">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5">key</span>
                  <p className="text-amber-800 dark:text-amber-300 text-sm">
                    {t('clients.account.passwordOnceWarning')}
                  </p>
                </div>
              </div>
            )}

            {/* Vekalet uyarısı — hesap açık olsa bile giriş engellenir */}
            {client.agreementStatus !== 'ACTIVE' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 transition-colors">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm mt-0.5">
                    gpp_maybe
                  </span>
                  <p className="text-red-800 dark:text-red-300 text-sm">
                    {t('clients.account.noAgreementWarning')}
                  </p>
                </div>
              </div>
            )}

            {/* Mevcut hesabın durumu */}
            {isEdit && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-main">{t('clients.account.status')}</p>
                  <p className="text-xs text-text-secondary">
                    {account.isActive
                      ? t('clients.account.statusActive')
                      : t('clients.account.statusInactive')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={loading}
                  className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
                    account.isActive
                      ? 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30'
                      : 'text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/30'
                  }`}
                >
                  {account.isActive ? t('management.deactivate') : t('management.activate')}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
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
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('management.saving') : isEdit ? t('common.save') : t('clients.account.submitCreate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
