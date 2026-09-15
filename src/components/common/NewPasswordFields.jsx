import React, { useState } from 'react';
import { t } from '../../locales';
import { generatePassword, MIN_PASSWORD_LENGTH } from '../../utils/passwordUtils';

/**
 * Yöneticinin başka biri için girdiği yeni şifre: şifre + tekrar, ortak göster/gizle ve "Parola oluştur".
 *
 * İki alan da autoComplete="new-password": aksi halde tarayıcı formu giriş formu sanıp yöneticinin kendi kayıtlı
 * şifresini doldurabiliyor, çalışan da bilmediği bir şifreyle açılıyordu.
 *
 * @param {{password: string, confirm: string}} props.value
 * @param {function({password: string, confirm: string})} props.onChange
 * @param {{password?: string, confirm?: string}} [props.errors]
 * @param {string} [props.label] - Şifre alanının etiketi (varsayılan "Şifre")
 */
export default function NewPasswordFields({ value, onChange, errors = {}, label, disabled = false, idPrefix = 'new-password' }) {
  const [visible, setVisible] = useState(false);

  const handleGenerate = () => {
    const generated = generatePassword();
    onChange({ password: generated, confirm: generated });
    setVisible(true);
  };

  const inputClass = (field) =>
    `w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary font-mono transition-colors ${
      errors[field] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
    }`;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label htmlFor={`${idPrefix}-password`} className="block text-sm font-medium text-text-main">
            {label || t('passwordForm.password')} *
          </label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">casino</span>
            {t('passwordForm.generate')}
          </button>
        </div>
        <div className="relative">
          <input
            id={`${idPrefix}-password`}
            type={visible ? 'text' : 'password'}
            value={value.password}
            onChange={(e) => onChange({ ...value, password: e.target.value })}
            autoComplete="new-password"
            disabled={disabled}
            required
            className={`${inputClass('password')} pr-10`}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary"
            title={visible ? t('passwordForm.hide') : t('passwordForm.show')}
            aria-label={visible ? t('passwordForm.hide') : t('passwordForm.show')}
          >
            <span className="material-symbols-outlined">{visible ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>
        {errors.password ? (
          <p className="mt-1 text-xs text-red-600">{errors.password}</p>
        ) : (
          <p className="mt-1 text-xs text-text-secondary">{t('passwordForm.hint', { min: MIN_PASSWORD_LENGTH })}</p>
        )}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-confirm`} className="block text-sm font-medium text-text-main mb-2">
          {t('passwordForm.confirm')} *
        </label>
        <input
          id={`${idPrefix}-confirm`}
          type={visible ? 'text' : 'password'}
          value={value.confirm}
          onChange={(e) => onChange({ ...value, confirm: e.target.value })}
          autoComplete="new-password"
          disabled={disabled}
          required
          className={inputClass('confirm')}
        />
        {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm}</p>}
      </div>
    </div>
  );
}
