import React, { useState } from 'react';
import { agencyAgreementService } from '../../api/agencyAgreementService';

/**
 * Vekalet Düzenleme Modalı
 * Mevcut vekalet anlaşmalarını düzenlemek için kullanılır
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal açık mı
 * @param {function} props.onClose - Modal kapama callback
 * @param {Object} props.agreement - Düzenlenecek anlaşma bilgileri
 * @param {Object} props.clientInfo - Müşteri bilgileri
 * @param {function} props.onSuccess - Başarılı işlem sonrası callback
 */
export default function EditAgreementModal({
  isOpen,
  onClose,
  agreement,
  clientInfo,
  onSuccess
}) {
  const [formData, setFormData] = useState({
    startDate: agreement?.agreementStartDate || '',
    endDate: agreement?.agreementEndDate || '',
    status: agreement?.agreementStatus || 'ACTIVE',
    notes: agreement?.notes || ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen || !agreement) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadProgress(0);

    try {
      // Anlaşma bilgilerini güncelle
      const updateData = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        notes: formData.notes
      };

      const result = await agencyAgreementService.updateAgreement(
        agreement.agreementId,
        updateData
      );

      if (!result.success) {
        setError(result.error || 'Anlaşma güncellenemedi');
        setLoading(false);
        return;
      }

      // Eğer yeni belge seçildiyse yükle
      if (selectedFile) {
        setUploadProgress(50);
        const uploadResult = await agencyAgreementService.uploadDocument(
          agreement.agreementId,
          selectedFile
        );

        if (!uploadResult.success) {
          setError(uploadResult.error || 'Belge yüklenemedi');
          setLoading(false);
          return;
        }
        setUploadProgress(100);
      }

      // Başarılı
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Agreement update error:', err);
      setError('Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Dosya boyutu kontrolü (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Dosya boyutu 10MB\'dan küçük olmalıdır');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleClose = () => {
    setFormData({
      startDate: agreement?.agreementStartDate || '',
      endDate: agreement?.agreementEndDate || '',
      status: agreement?.agreementStatus || 'ACTIVE',
      notes: agreement?.notes || ''
    });
    setSelectedFile(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Vekalet Anlaşmasını Düzenle
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {clientInfo?.name || 'Müşteri'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Tarih Aralığı */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç Tarihi *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş Tarihi *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Durum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durum *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="ACTIVE">Aktif</option>
                <option value="PENDING">Onay Bekliyor</option>
                <option value="INACTIVE">Pasif</option>
                <option value="SUSPENDED">Askıda</option>
                <option value="TERMINATED">Sonlandırılmış</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Anlaşmanın mevcut durumu
              </p>
            </div>

            {/* Notlar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notlar
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                placeholder="Anlaşma hakkında notlar..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Belge Yükleme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vekalet Belgesi
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary transition-colors">
                    <span className="material-symbols-outlined text-gray-400">
                      upload_file
                    </span>
                    <span className="text-sm text-gray-600">
                      {selectedFile ? selectedFile.name : 'Yeni belge seç (opsiyonel)'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                PDF, JPG veya PNG formatında, maksimum 10MB
              </p>

              {/* Mevcut Belge Bilgisi */}
              {agreement.documentPath && !selectedFile && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <span className="material-symbols-outlined text-lg">description</span>
                    <span>Mevcut belge kayıtlı</span>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Yükleniyor...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
