import React, { useState, useEffect } from 'react';
import { employeeService } from '../../api/employeeService';
import { toUpperCase } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getCurrentLocale } from '../../locales';

export default function EditEmployeeModal({ onClose, employee, currentUser, onSuccess }) {
  const locale = getCurrentLocale();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    globalRole: 'BROKER_USER',
    isActive: true
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
        isActive: employee.isActive !== undefined ? employee.isActive : true
      });
    }
  }, [employee]);

  // Check if editing self
  const isEditingSelf = currentUser?.id === employee.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailError('Geçerli bir email adresi giriniz');
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

      if (result.success) {
        showSuccess('Çalışan bilgileri başarıyla güncellendi!');
        onSuccess(result.data);
        onClose();
      } else {
        // API error - show as toast
        showError(result.error || 'Çalışan güncellenemedi');
      }
    } catch (err) {
      // Network/unexpected error - show as toast
      showError(err.response?.data?.error || 'Beklenmeyen bir hata oluştu');
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
              Çalışan Düzenle
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {isEditingSelf ? 'Kendi bilgilerinizi düzenleyin' : 'Çalışan bilgilerini güncelleyin'}
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
                    Kendi rolünüzü ve durumunuzu değiştiremezsiniz
                  </p>
                </div>
              </div>
            )}

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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors"
                style={{ textTransform: 'uppercase' }}
              />
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
                Rol *
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
                <option value="BROKER_USER">Broker Kullanıcısı</option>
                <option value="BROKER_ADMIN">Broker Yöneticisi</option>
              </select>
              {isEditingSelf && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Kendi rolünüzü değiştiremezsiniz
                </p>
              )}
            </div>

            {/* Status Selection - Disabled when editing self */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Durum *
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
                <option value="true">Aktif</option>
                <option value="false">Beklemede</option>
              </select>
              {isEditingSelf && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Kendi durumunuzu değiştiremezsiniz
                </p>
              )}
            </div>
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
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Güncelleniyor...' : 'Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
