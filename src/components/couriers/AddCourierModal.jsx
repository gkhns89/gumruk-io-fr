import React, { useState } from 'react';
import { courierService } from '../../api/courierService';
import { toUpperCase, COURIER_UPPERCASE_FIELDS } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';

export default function AddCourierModal({ onClose, onSuccess, brokerCompanyId = null }) {
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    contactPhone: '',
    contactEmail: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;

    // UPPERCASE conversion for specific fields
    const newValue = COURIER_UPPERCASE_FIELDS.includes(name)
      ? toUpperCase(value)
      : value;

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
      showError('Kurye firması adı zorunludur');
      return;
    }

    // Validate email format if provided
    if (formData.contactEmail && formData.contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactEmail)) {
        setEmailError('Geçerli bir email adresi giriniz');
        return;
      }
    }

    setLoading(true);

    try {
      const result = await courierService.createCourierCompany({
        name: formData.name.trim(),
        shortName: formData.shortName.trim() || null,
        contactPhone: formData.contactPhone.trim() || null,
        contactEmail: formData.contactEmail.trim() || null,
        notes: formData.notes.trim() || null,
        active: true
      }, brokerCompanyId);

      if (result.success) {
        showSuccess(`${formData.name} başarıyla eklendi!`);
        onSuccess(result.data);

        // Reset form and close
        setFormData({
          name: '',
          shortName: '',
          contactPhone: '',
          contactEmail: '',
          notes: ''
        });
        onClose();
      } else {
        showError(result.error || 'Kurye firması oluşturulamadı');
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      shortName: '',
      contactPhone: '',
      contactEmail: '',
      notes: ''
    });
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
              Yeni Kurye Firması Ekle
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Yeni bir kurye firması kaydı oluşturun
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
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Kurye Firması Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Örn: HIZLI GÖTÜR KURYE"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              />
            </div>

            {/* Short Name */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Kısa Ad
              </label>
              <input
                type="text"
                name="shortName"
                value={formData.shortName}
                onChange={handleChange}
                placeholder="Örn: HGK"
                maxLength={100}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              />
              <p className="text-xs text-text-secondary mt-1">
                Gösterim için kısa ad (opsiyonel)
              </p>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                İletişim Telefonu
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="Örn: 0212 555 1234"
                maxLength={100}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                İletişim Email
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="Örn: info@kuryefirmasi.com"
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

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Notlar
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Kurye firması hakkında notlar..."
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
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}
