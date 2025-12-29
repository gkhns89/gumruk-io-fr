import React, { useState } from 'react';
import { companyService } from '../../api/companyService';
import AgreementInfoPanel from '../agreements/AgreementInfoPanel';
import { toUpperCase } from '../../utils/textUtils';
import { getCurrentLocale } from '../../locales';

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
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: client?.name || '',
    shortName: client?.shortName || '',
    description: client?.description || ''
  });

  if (!isOpen || !client) return null;

  // Yetki kontrolü - Sadece SUPER_ADMIN ve BROKER_ADMIN düzenleyebilir
  const canEdit = currentUser?.globalRole === 'SUPER_ADMIN' || currentUser?.role === 'BROKER_ADMIN';

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
    setError('');
    setLoading(true);

    try {
      const result = await companyService.updateClientCompany(client.id, {
        name: toUpperCase(formData.name, locale),
        shortName: toUpperCase(formData.shortName, locale),
        description: formData.description
      });

      if (result.success) {
        onSuccess(result.data);
        setIsEditing(false);
        onClose();
      } else {
        setError(result.error || 'Güncelleme başarısız oldu');
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setError('');
    setFormData({
      name: client?.name || '',
      shortName: client?.shortName || '',
      description: client?.description || ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isEditing ? 'Müşteri Bilgilerini Düzenle' : 'Müşteri Detayları'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {client.name}
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
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol Kolon - Firma Bilgileri */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Firma Bilgileri
              </h3>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Firma Adı */}
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  {/* Kısa Ad */}
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
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
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
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
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Firma Adı
                    </label>
                    <p className="text-base font-semibold text-gray-800">
                      {client.name}
                    </p>
                  </div>

                  {/* Kısa Ad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Kısa Ad
                    </label>
                    <p className="text-base font-semibold text-gray-800">
                      {client.shortName || '-'}
                    </p>
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Açıklama
                    </label>
                    <p className="text-base text-gray-700">
                      {client.description || '-'}
                    </p>
                  </div>

                  {/* Oluşturulma Tarihi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Oluşturulma Tarihi
                    </label>
                    <p className="text-base text-gray-700">
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
                      className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
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
              />

              {/* Vekalet Düzenle Butonu */}
              {hasAgreement && canEdit && onEditAgreement && (
                <button
                  onClick={() => onEditAgreement(client, agreement)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <span className="material-symbols-outlined">edit_document</span>
                  Vekalet Bilgilerini Düzenle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
