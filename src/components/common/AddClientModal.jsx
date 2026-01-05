import React, { useState } from 'react';
import { companyService } from '../../api/companyService';
import { toUpperCase } from '../../utils/textUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getCurrentLocale } from '../../locales';

/**
 * Unified Add Client Modal
 * Combines ClientsPage's clean UI with AddTransaction's validation & UPPERCASE transformations
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {function} props.onClose - Close handler
 * @param {function} props.onSuccess - Success callback after client creation
 * @param {number} props.brokerCompanyId - Broker company ID (required)
 */
export default function AddClientModal({ isOpen, onClose, onSuccess, brokerCompanyId }) {
  const locale = getCurrentLocale();

  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate brokerCompanyId
    if (!brokerCompanyId || isNaN(brokerCompanyId)) {
      showError('Broker firma bilgisi eksik. Lütfen sayfayı yenileyin.');
      return;
    }

    setLoading(true);

    try {
      const result = await companyService.createClientCompany({
        ...formData,
        parentBrokerId: brokerCompanyId  // Backend expects 'parentBrokerId'
      });

      if (result.success) {
        // Success feedback
        showSuccess(`${formData.name} başarıyla eklendi!`);
        onSuccess(result.data);

        // Reset form and close
        setFormData({ name: '', shortName: '', description: '' });
        onClose();
      } else {
        // API error - show as toast
        showError(result.error || 'Müşteri firma oluşturulamadı');
      }
    } catch (err) {
      // Network/unexpected error - show as toast
      showError(err.response?.data?.error || 'Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', shortName: '', description: '' });
    onClose();
  };

  const handleBackdropClick = (e) => {
    console.log('🔵 Backdrop clicked!', e.target.className);
    handleClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => {
          console.log('🟢 Modal content clicked - STOPPING propagation');
          e.stopPropagation();
        }}
      >
        {/* Modal Header - ClientsPage style */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Yeni Müşteri Firması Ekle
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Yeni bir müşteri firma kaydı oluşturun
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Firma Adı - UPPERCASE transformation from AddTransaction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Firma Adı *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  name: toUpperCase(e.target.value, locale)
                }))}
                required
                placeholder="Örn: ABC DIŞ TİCARET LTD. ŞTİ."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            {/* Kısa Ad - UPPERCASE transformation + Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kısa Ad *
              </label>
              <input
                type="text"
                value={formData.shortName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  shortName: toUpperCase(e.target.value, locale)
                }))}
                required
                placeholder="Örn: ABC DT"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase"
                style={{ textTransform: 'uppercase' }}
              />
              <p className="mt-1 text-xs text-gray-500">
                Belgelerde ve raporlarda kullanılacak kısa ad
              </p>
            </div>

            {/* Açıklama - Optional, NO uppercase */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama (İsteğe Bağlı)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                rows={3}
                placeholder="Firma hakkında notlar..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
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
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Oluşturuluyor...' : 'Müşteri Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
