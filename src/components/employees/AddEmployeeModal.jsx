import React, { useState } from 'react';
import { employeeService } from '../../api/employeeService';
import { toUpperCase } from '../../utils/textUtils';
import { handleError, handleApiResponse } from '../../utils/errorUtils';
import { showSuccess } from '../../utils/toastUtils';
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
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate broker company ID
    if (!brokerCompanyId || isNaN(brokerCompanyId)) {
      setError('Firma bilgisi eksik. Lütfen sayfayı yenileyin.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Geçerli bir email adresi giriniz');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    // Check quota
    if (currentLimits && (currentLimits.canAddUser === false || currentLimits.remainingUserQuota <= 0)) {
      setError('Çalışan limiti doldu. Lütfen aboneliğinizi yükseltin.');
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
        handleApiResponse(result, null, setError, 'Çalışan oluşturma');
      }
    } catch (err) {
      handleError(err, setError, 'Çalışan oluşturma', 'Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ username: '', email: '', password: '', globalRole: 'BROKER_USER' });
    setError('');
    onClose();
  };

  const isQuotaExceeded = currentLimits && (currentLimits.canAddUser === false || currentLimits.remainingUserQuota <= 0);

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Yeni Çalışan Ekle
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Yeni bir çalışan kaydı oluşturun
            </p>
            {currentLimits && (
              <p className="text-xs text-gray-500 mt-1">
                {currentLimits.currentBrokerUsers} / {currentLimits.maxBrokerUsers} broker kullanıcı
                {isQuotaExceeded && (
                  <span className="ml-2 text-red-600 font-semibold">• Limit doldu!</span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-gray-600">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Username - UPPERCASE transformation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase"
                style={{ textTransform: 'uppercase' }}
              />
              <p className="mt-1 text-xs text-gray-500">
                Çalışanın adı ve soyadı
              </p>
            </div>

            {/* Email - lowercase transformation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="text"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  email: e.target.value.toLowerCase()
                }))}
                required
                placeholder="ahmet.yilmaz@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary lowercase"
                style={{ textTransform: 'lowercase' }}
              />
              <p className="mt-1 text-xs text-gray-500">
                Giriş için kullanılacak email adresi
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  password: e.target.value
                }))}
                required
                minLength={6}
                placeholder="En az 6 karakter"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum 6 karakter
              </p>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol *
              </label>
              <select
                value={formData.globalRole}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  globalRole: e.target.value
                }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="BROKER_USER">Broker Kullanıcısı</option>
                <option value="BROKER_ADMIN">Broker Yöneticisi</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Broker Yöneticisi: Tüm yetkilere sahip • Broker Kullanıcısı: İşlem yönetimi
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600 text-sm">error</span>
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Quota Warning */}
            {isQuotaExceeded && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-sm">warning</span>
                  <p className="text-amber-800 text-sm">
                    Çalışan limiti doldu. Yeni çalışan ekleyebilmek için aboneliğinizi yükseltin.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
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
