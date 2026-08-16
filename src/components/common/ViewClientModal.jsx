import React, { useEffect, useState } from 'react';
import { companyService } from '../../api/companyService';
import SectorSelect from './SectorSelect';
import AgreementInfoPanel from '../agreements/AgreementInfoPanel';
import { toUpperCase } from '../../utils/textUtils';
import { getCurrentLocale } from '../../locales';
import { handleError, handleApiResponse } from '../../utils/errorUtils';
import { showSuccess } from '../../utils/toastUtils';

/**
 * Müşteri Detay Modalı
 * Müşteri bilgilerini görüntüler ve düzenlemeye izin verir
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal açık mı
 * @param {function} props.onClose - Modal kapama callback
 * @param {Object} props.client - Müşteri firması bilgileri
 * @param {Object} props.currentUser - Aktif kullanıcı
 * @param {function} props.onSuccess - Başarılı işlem sonrası callback
 * @param {function} props.onEditAgreement - Vekalet düzenleme callback
 */
export default function ViewClientModal({
  isOpen,
  onClose,
  client,
  currentUser,
  onSuccess,
  onEditAgreement
}) {
  const locale = getCurrentLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: client?.name || '',
    shortName: client?.shortName || '',
    description: client?.description || '',
    sectorIds: []
  });

  // Modal mount'ta kalıp farklı müşterilerle yeniden açıldığı için formu
  // prop değişiminde tazelemek gerekiyor; yoksa düzenleme ekranı bir önceki
  // müşterinin bilgileriyle açılıyor.
  useEffect(() => {
    setFormData({
      name: client?.name || '',
      shortName: client?.shortName || '',
      description: client?.description || '',
      sectorIds: (client?.sectors || []).map(s => s.id)
    });
    setIsEditing(false);
  }, [client]);

  if (!isOpen || !client) return null;

  // Yetki kontrolü - Sadece SUPER_ADMIN ve BROKER_ADMIN düzenleyebilir
  const canEdit = currentUser?.globalRole === 'SUPER_ADMIN' || currentUser?.globalRole === 'BROKER_ADMIN';

  // Vekalet bilgileri
  const hasAgreement = client.agreementId != null;
  const agreement = hasAgreement ? {
    agreementId: client.agreementId,
    agreementStatus: client.agreementStatus,
    agreementStartDate: client.agreementStartDate,
    agreementEndDate: client.agreementEndDate,
    documentPath: client.documentPath
  } : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await companyService.updateClientCompany(client.id, {
        name: toUpperCase(formData.name, locale),
        shortName: toUpperCase(formData.shortName, locale),
        description: formData.description,
        sectorIds: formData.sectorIds
      });

      if (result.success) {
        showSuccess('Müşteri bilgileri başarıyla güncellendi!');
        onSuccess(result.data);
        setIsEditing(false);
        onClose();
      } else {
        handleApiResponse(result, null, null, 'ViewClientModal - updateClientCompany');
      }
    } catch (err) {
      handleError(err, null, 'ViewClientModal - handleSubmit', 'Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setFormData({
      name: client?.name || '',
      shortName: client?.shortName || '',
      description: client?.description || '',
      sectorIds: (client?.sectors || []).map(s => s.id)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between transition-colors duration-300">
          <div>
            <h2 className="text-2xl font-bold text-text-main">
              {isEditing ? 'Müşteri Bilgilerini Düzenle' : 'Müşteri Detayları'}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {client.name}
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
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol Kolon - Firma Bilgileri */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-text-main border-b border-gray-200 dark:border-gray-700 pb-2">
                Firma Bilgileri
              </h3>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Firma Adı */}
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
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
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase transition-colors"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  {/* Kısa Ad */}
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
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
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase transition-colors"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  {/* Sektör */}
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Sektör
                    </label>
                    <SectorSelect
                      value={formData.sectorIds}
                      onChange={(sectorIds) => setFormData(prev => ({ ...prev, sectorIds }))}
                      disabled={loading}
                    />
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Form Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          name: client?.name || '',
                          shortName: client?.shortName || '',
                          description: client?.description || ''
                        });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* Firma Adı */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Firma Adı
                    </label>
                    <p className="text-base font-semibold text-text-main">
                      {client.name}
                    </p>
                  </div>

                  {/* Kısa Ad */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Kısa Ad
                    </label>
                    <p className="text-base font-semibold text-text-main">
                      {client.shortName || '-'}
                    </p>
                  </div>

                  {/* Sektör */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Sektör
                    </label>
                    {client.sectors?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {client.sectors.map(sector => (
                          <span
                            key={sector.id}
                            className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 dark:bg-primary/20 text-primary"
                          >
                            {sector.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-base text-text-main">-</p>
                    )}
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Açıklama
                    </label>
                    <p className="text-base text-text-main">
                      {client.description || '-'}
                    </p>
                  </div>

                  {/* Giriş Hesabı */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Giriş Hesabı
                    </label>
                    {client.account ? (
                      <div className="mt-1">
                        <p className="text-base font-medium text-text-main break-all">
                          {client.account.email}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                            client.account.isActive
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {client.account.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-base text-text-main">Hesap açılmamış</p>
                    )}
                  </div>

                  {/* Oluşturulma Tarihi */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Oluşturulma Tarihi
                    </label>
                    <p className="text-base text-text-main">
                      {client.createdAt
                        ? new Date(client.createdAt).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : '-'}
                    </p>
                  </div>

                  {/* Düzenle Butonu */}
                  {canEdit && !isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      <span className="material-symbols-outlined">edit</span>
                      Firma Bilgilerini Düzenle
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sağ Kolon - Vekalet Bilgileri */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-text-main border-b border-gray-200 dark:border-gray-700 pb-2">
                Vekalet Bilgileri
              </h3>

              {/* Agreement Info Panel */}
              <AgreementInfoPanel
                agreement={agreement}
                clientName={client.name}
                onCreateAgreement={
                  !hasAgreement && canEdit
                    ? () => onEditAgreement(client, null)
                    : undefined
                }
                compact={true}
              />

              {/* Vekalet Düzenle Butonu */}
              {hasAgreement && canEdit && onEditAgreement && (
                <button
                  onClick={() => onEditAgreement(client, agreement)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                >
                  <span className="material-symbols-outlined">edit_document</span>
                  Vekalet Bilgilerini Düzenle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end transition-colors duration-300">
          <button
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
