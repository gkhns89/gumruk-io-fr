import React, { useState } from 'react';
import { clientUserService } from '../../api/clientUserService';
import { toUpperCase } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getCurrentLocale } from '../../locales';

// Backend UserCreateRequest en az 8 karakter istiyor; formda da aynı eşik.
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Okunurluğu bozan l/1/O/0 çiftleri dışarıda: parola telefonda okunup yazılacak. */
function generatePassword() {
  const values = new Uint32Array(12);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => PASSWORD_ALPHABET[v % PASSWORD_ALPHABET.length]).join('');
}

/**
 * Müşteri firmasının giriş hesabı.
 *
 * Firma başına tek hesap açılabiliyor (backend kuralı), o yüzden modal iki modda
 * çalışıyor: hesap yoksa oluşturma, varsa e-posta/parola güncelleme. Parola
 * yalnızca burada bir kez görünür — sistem henüz e-posta göndermediği için
 * broker'ın onu müşteriye kendi kanalından iletmesi gerekiyor.
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
      errors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    if (!formData.username.trim()) {
      errors.username = 'Kullanıcı adı zorunludur';
    } else if (formData.username.trim().length < 3) {
      errors.username = 'Kullanıcı adı en az 3 karakter olmalıdır';
    }

    // Düzenlemede boş parola "değiştirme" anlamına geliyor, o yüzden serbest.
    const passwordRequired = !isEdit || formData.password.length > 0;
    if (passwordRequired && formData.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Parola en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const result = isEdit
        ? await clientUserService.updateAccount(account.id, {
            email: formData.email,
            username: formData.username,
            password: formData.password || undefined,
          })
        : await clientUserService.createAccount({
            clientCompanyId: client.id,
            email: formData.email,
            username: formData.username,
            password: formData.password,
          });

      if (result.success) {
        showSuccess(isEdit
          ? 'Giriş hesabı güncellendi'
          : `${client.name} için giriş hesabı oluşturuldu`);
        onSuccess();
        onClose();
      } else {
        showError(result.error);
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Beklenmeyen bir hata oluştu');
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
        showSuccess(account.isActive ? 'Hesap pasife alındı' : 'Hesap aktifleştirildi');
        onSuccess();
        onClose();
      } else {
        showError(result.error);
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Beklenmeyen bir hata oluştu');
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
              {isEdit ? 'Giriş Hesabını Düzenle' : 'Giriş Hesabı Oluştur'}
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

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* E-posta */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                E-Posta *
              </label>
              <input
                type="text"
                value={formData.email}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value.toLowerCase() }));
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                required
                placeholder="muhasebe@musterifirma.com"
                className={`${inputClass('email')} lowercase`}
                style={{ textTransform: 'lowercase' }}
              />
              {fieldErrors.email ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary">
                  Müşterinin sisteme gireceği adres
                </p>
              )}
            </div>

            {/* Kullanıcı adı */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Kullanıcı Adı *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    username: toUpperCase(e.target.value, locale),
                  }));
                  if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }}
                required
                placeholder="ABC DIŞ TİCARET"
                className={`${inputClass('username')} uppercase`}
                style={{ textTransform: 'uppercase' }}
              />
              {fieldErrors.username ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.username}</p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary">
                  Sistemde görünecek ad — genelde firmanın kısa adı
                </p>
              )}
            </div>

            {/* Parola */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-main">
                  {isEdit ? 'Yeni Parola' : 'Parola *'}
                </label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">casino</span>
                  Parola üret
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, password: e.target.value }));
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  required={!isEdit}
                  placeholder={isEdit ? 'Değiştirmek istemiyorsanız boş bırakın' : `En az ${MIN_PASSWORD_LENGTH} karakter`}
                  className={`${inputClass('password')} pr-10 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary"
                  title={showPassword ? 'Gizle' : 'Göster'}
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
                    ? 'Boş bırakırsanız mevcut parola korunur'
                    : `En az ${MIN_PASSWORD_LENGTH} karakter`}
                </p>
              )}
            </div>

            {/* Parola teslimi uyarısı */}
            {formData.password && (
              <div className="bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg p-3 transition-colors">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5">key</span>
                  <p className="text-amber-800 dark:text-amber-300 text-sm">
                    Bu parola yalnızca burada görünür. Kaydettikten sonra bir daha
                    gösterilemez — müşteriye iletmeyi unutmayın.
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
                    Bu firmanın aktif vekaleti yok. Hesabı şimdi açabilirsiniz ancak
                    vekalet aktifleşene kadar müşteri sisteme giriş yapamaz.
                  </p>
                </div>
              </div>
            )}

            {/* Mevcut hesabın durumu */}
            {isEdit && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-main">Hesap durumu</p>
                  <p className="text-xs text-text-secondary">
                    {account.isActive
                      ? 'Aktif — müşteri sisteme girebiliyor'
                      : 'Pasif — giriş denemeleri reddediliyor'}
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
                  {account.isActive ? 'Pasife al' : 'Aktifleştir'}
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
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Kaydediliyor...' : isEdit ? 'Kaydet' : 'Hesabı Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
