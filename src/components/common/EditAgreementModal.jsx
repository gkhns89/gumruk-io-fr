import React, { useState, useEffect } from 'react';
import { agencyAgreementService } from '../../api/agencyAgreementService';
import { configService } from '../../api/configService';
import { handleError, handleApiResponse } from '../../utils/errorUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { t } from '../../locales';

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
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
    notes: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadConfig, setUploadConfig] = useState(null);

  // Agreement prop'u değiştiğinde formData'yı güncelle
  useEffect(() => {
    if (agreement && isOpen) {
      setFormData({
        startDate: agreement.agreementStartDate || '',
        endDate: agreement.agreementEndDate || '',
        status: agreement.agreementStatus || 'ACTIVE',
        notes: agreement.notes || ''
      });
      // Modal her açıldığında state'i temizle
      setSelectedFile(null);
      setUploadProgress(0);
    }
  }, [agreement, isOpen]);

  // Load file upload configuration
  useEffect(() => {
    if (isOpen) {
      loadUploadConfig();
    }
  }, [isOpen]);

  const loadUploadConfig = async () => {
    const result = await configService.getFileUploadConfig();
    setUploadConfig(result.data);
  };

  if (!isOpen || !agreement) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        handleApiResponse(result, null, null, 'EditAgreementModal - updateAgreement');
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
          handleApiResponse(uploadResult, null, null, 'EditAgreementModal - uploadDocument');
          setLoading(false);
          return;
        }
        setUploadProgress(100);
      }

      // Başarılı
      showSuccess(t('agreements.edit.success'));
      onSuccess();
      onClose();
    } catch (err) {
      handleError(err, null, 'EditAgreementModal - handleSubmit', t('management.unexpectedError'));
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Dosya validasyonu
    if (uploadConfig) {
      const validation = configService.validateFile(file, uploadConfig);
      if (!validation.valid) {
        // Dosya sessizce temizleniyordu; kullanıcı nedenini görmeli
        showError(validation.error);
        e.target.value = ''; // ÖNEMLİ: Input'u temizle
        setSelectedFile(null);
        return;
      }
    }

    setSelectedFile(file);
  };

  // Dosya yükleme kısıtlamalarını göster
  const renderUploadConstraints = () => {
    if (!uploadConfig) return null;

    return (
      <p className="mt-2 text-xs text-text-secondary">
        {t('agreements.form.maxFileSize')} <strong>{uploadConfig.maxFileSizeMB} MB</strong> |{' '}
        {t('agreements.form.allowedFormats')} <strong>{uploadConfig.allowedFormats}</strong>
      </p>
    );
  };

  const handleClose = () => {
    // State temizleme useEffect'te yapılıyor
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between transition-colors duration-300">
          <div>
            <h2 className="text-2xl font-bold text-text-main">
              {t('agreements.edit.title')}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {clientInfo?.name || t('transactions.common.client')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Tarih Aralığı */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  {t('agreements.form.startDate')} *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  {t('agreements.form.endDate')} *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Durum */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('management.status')} *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="ACTIVE">{t('agreements.edit.optionActive')}</option>
                <option value="SUSPENDED">{t('agreements.edit.optionSuspended')}</option>
                <option value="TERMINATED">{t('agreements.edit.optionTerminated')}</option>
              </select>
              <p className="mt-1 text-xs text-text-secondary">
                {t('agreements.edit.statusNote')}
              </p>
            </div>

            {/* Notlar */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('management.notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                placeholder={t('agreements.edit.notesPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            {/* Belge Yükleme */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('agreements.form.document')}
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary dark:hover:border-primary transition-colors">
                    <span className="material-symbols-outlined text-gray-400 dark:text-gray-500">
                      upload_file
                    </span>
                    <span className="text-sm text-text-secondary">
                      {selectedFile ? selectedFile.name : t('agreements.edit.chooseNewDocument')}
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
                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>
              {renderUploadConstraints() || (
                <p className="mt-1 text-xs text-text-secondary">
                  {t('agreements.edit.defaultConstraints')}
                </p>
              )}

              {/* Mevcut Belge Bilgisi */}
              {agreement.documentPath && !selectedFile && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg transition-colors">
                  <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <span className="material-symbols-outlined text-lg">description</span>
                    <span>{t('agreements.edit.currentDocument')}</span>
                  </div>
                </div>
              )}
            </div>

              {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>{t('agreements.form.uploading')}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 transition-colors">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('management.saving') : t('agreements.edit.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
