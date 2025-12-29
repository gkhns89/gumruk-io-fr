import React from 'react';
import { agencyAgreementService } from '../../api/agencyAgreementService';

/**
 * Vekalet bilgilerini gösteren panel
 * @param {Object} agreement - Vekalet anlaşması bilgileri
 * @param {string} clientName - Müşteri firma adı
 * @param {function} onCreateAgreement - Vekalet oluşturma callback'i
 * @param {boolean} compact - Dar alanlarda kullanım için kompakt mod (default: false)
 */
const AgreementInfoPanel = ({ agreement, clientName, onCreateAgreement, compact = false }) => {
  const handleDownloadDocument = async () => {
    if (!agreement?.agreementId) return;

    const result = await agencyAgreementService.downloadDocument(agreement.agreementId);
    if (!result.success) {
      alert(result.error);
    }
  };

  // Durum badge renkleri
  const getStatusBadge = (status) => {
    const badges = {
      ACTIVE: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
        label: 'Aktif'
      },
      PENDING: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        label: 'Onay Bekliyor'
      },
      INACTIVE: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
        label: 'Pasif'
      },
      SUSPENDED: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
        label: 'Askıda'
      },
      TERMINATED: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        label: 'Sonlandırıldı'
      },
      NO_AGREEMENT: {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        border: 'border-gray-300',
        label: 'Anlaşma Yok'
      }
    };

    return badges[status] || badges.NO_AGREEMENT;
  };

  // Anlaşma yoksa
  if (!agreement || !agreement.agreementStatus) {
    const badge = getStatusBadge('NO_AGREEMENT');

    return (
      <div className={`bg-gray-50 border-2 border-gray-200 rounded-xl p-4 ${compact ? '' : 'lg:col-span-3'}`}>
        <div className={`flex items-center ${compact ? 'flex-col gap-3' : 'justify-between'}`}>
          <div className="flex items-center gap-3 w-full">
            <span className="material-symbols-outlined text-gray-500 text-2xl">
              info
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-700">
                  {clientName}
                </span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Bu müşteri ile vekalet anlaşmanız bulunmamaktadır
              </p>
            </div>
          </div>

          {onCreateAgreement && (
            <button
              type="button"
              onClick={onCreateAgreement}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors ${compact ? 'w-full justify-center' : ''}`}
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Vekalet Ekle
            </button>
          )}
        </div>
      </div>
    );
  }

  // Anlaşma varsa
  const badge = getStatusBadge(agreement.agreementStatus);
  const isActive = agreement.agreementStatus === 'ACTIVE';

  // Kalan süre hesapla (sadece ACTIVE için)
  let remainingDays = null;
  if (isActive && agreement.agreementEndDate) {
    const today = new Date();
    const endDate = new Date(agreement.agreementEndDate);
    remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className={`border-2 rounded-xl p-4 ${compact ? '' : 'lg:col-span-3'} ${
      isActive ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className={`flex ${compact ? 'flex-col' : 'items-start justify-between'}`}>
        <div className={`flex items-start gap-3 flex-1 ${compact ? 'w-full' : ''}`}>
          <span className={`material-symbols-outlined ${compact ? 'text-xl' : 'text-2xl'} mt-0.5 ${
            isActive ? 'text-green-600' : 'text-yellow-600'
          }`}>
            verified
          </span>

          <div className="flex-1">
            {/* Firma adı ve durum badge'i */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800">
                {clientName}
              </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                {badge.label}
              </span>
            </div>

            {/* Tarih bilgileri */}
            {isActive && (
              <div className={`grid gap-3 mt-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                {/* Başlangıç tarihi */}
                {agreement.agreementStartDate && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-sm">
                      event
                    </span>
                    <div>
                      <p className="text-xs text-gray-600">Başlangıç</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(agreement.agreementStartDate).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bitiş tarihi */}
                {agreement.agreementEndDate && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-sm">
                      event
                    </span>
                    <div>
                      <p className="text-xs text-gray-600">Bitiş</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(agreement.agreementEndDate).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Kalan süre */}
                {remainingDays !== null && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-sm">
                      schedule
                    </span>
                    <div>
                      <p className="text-xs text-gray-600">Kalan Süre</p>
                      <p className={`text-sm font-semibold ${
                        remainingDays < 30 ? 'text-red-600' : 'text-gray-800'
                      }`}>
                        {remainingDays} gün
                        {remainingDays < 30 && ' ⚠️'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PENDING durumu için uyarı */}
            {agreement.agreementStatus === 'PENDING' && (
              <p className="text-xs text-yellow-700 mt-2">
                ⏳ Anlaşma onay bekliyor. Aktifleştirme için yöneticinizle iletişime geçin.
              </p>
            )}
          </div>
        </div>

        {/* Belge indirme butonu */}
        {agreement.documentPath && (
          <button
            type="button"
            onClick={handleDownloadDocument}
            className={`flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors ${
              compact ? 'w-full justify-center mt-3' : ''
            }`}
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Belge İndir
          </button>
        )}
      </div>
    </div>
  );
};

export default AgreementInfoPanel;
