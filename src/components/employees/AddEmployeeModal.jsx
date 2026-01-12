import React, { useState } from 'react';
import { employeeService } from '../../api/employeeService';
import { toUpperCase } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getCurrentLocale } from '../../locales';

export default function AddEmployeeModal({ onClose, onSuccess, brokerCompanyId, currentLimits }) {
  const locale = getCurrentLocale();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    globalRole: 'BROKER_USER'
  });

  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setEmailError('');
    setPasswordError('');

    // Validate broker company ID
    if (!brokerCompanyId || isNaN(brokerCompanyId)) {
      showError('Firma bilgisi eksik. Lütfen sayfayı yenileyin.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailError('Geçerli bir email adresi giriniz');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setPasswordError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    // Check quota
    if (currentLimits && (currentLimits.canAddUser === false || currentLimits.remainingUserQuota <= 0)) {
      showError('Çalışan limiti doldu. Lütfen aboneliğinizi yükseltin.');
      return;
    }

    setLoading(true);

    try {
      const result = await employeeService.createEmployee({
        ...formData,
        companyId: brokerCompanyId
      });

      if (result.success) {
        showSuccess(`${formData.username} başarıyla eklendi!`);
        onSuccess(result.data);

        // Reset form and close
        setFormData({ username: '', email: '', password: '', globalRole: 'BROKER_USER' });
        onClose();
      } else {
        // API error - show as toast
        showError(result.error || 'Çalışan oluşturulamadı');
      }
    } catch (err) {
      // Network/unexpected error - show as toast
      showError(err.response?.data?.error || 'Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ username: '', email: '', password: '', globalRole: 'BROKER_USER' });
    setEmailError('');
    setPasswordError('');
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
              Yeni Çalışan Ekle
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Yeni bir çalışan kaydı oluşturun
            </p>
            {currentLimits && (
              <p className="text-xs text-text-secondary mt-1">
                {currentLimits.currentBrokerUsers} / {currentLimits.maxBrokerUsers} broker kullanıcı
                {isQuotaExceeded && (
                  <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">• Limit doldu!</span>
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
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Username - UPPERCASE transformation */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Kullanıcı Adı *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  username: toUpperCase(e.target.value, locale)
                }))}
                required
                placeholder="AHMET YILMAZ"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase transition-colors"
                style={{ textTransform: 'uppercase' }}
              />
              <p className="mt-1 text-xs text-text-secondary">
                Çalışanın adı ve soyadı
              </p>
            </div>

            {/* Email - lowercase transformation */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Email *
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
                placeholder="ahmet.yilmaz@example.com"
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary lowercase transition-colors ${
                  emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ textTransform: 'lowercase' }}
              />
              {emailError ? (
                <p className="mt-1 text-xs text-red-600">{emailError}</p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary">
                  Giriş için kullanılacak email adresi
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Şifre *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    password: e.target.value
                  }));
                  if (passwordError) setPasswordError('');
                }}
                required
                minLength={6}
                placeholder="En az 6 karakter"
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                  passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {passwordError ? (
                <p className="mt-1 text-xs text-red-600">{passwordError}</p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary">
                  Minimum 6 karakter
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Rol *
              </label>
              <select
                value={formData.globalRole}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  globalRole: e.target.value
                }))}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="BROKER_USER">Broker Kullanıcısı</option>
                <option value="BROKER_ADMIN">Broker Yöneticisi</option>
              </select>
              <p className="mt-1 text-xs text-text-secondary">
                Broker Yöneticisi: Tüm yetkilere sahip • Broker Kullanıcısı: İşlem yönetimi
              </p>
            </div>

            {/* Quota Warning */}
            {isQuotaExceeded && (
              <div className="bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg p-3 transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-sm">warning</span>
                  <p className="text-amber-800 dark:text-amber-300 text-sm">
                    Çalışan limiti doldu. Yeni çalışan ekleyebilmek için aboneliğinizi yükseltin.
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
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || isQuotaExceeded}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Oluşturuluyor...' : 'Çalışan Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
