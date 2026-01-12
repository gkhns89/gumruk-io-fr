import React from 'react';
import { agencyAgreementService } from '../../api/agencyAgreementService';
import { showError } from '../../utils/toastUtils';

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
      showError(result.error || 'Belge indirilemedi');
    }
  };

  // Durum badge renkleri
  const getStatusBadge = (status) => {
    const badges = {
      ACTIVE: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        border: 'border-green-300 dark:border-green-700',
        label: 'Aktif'
      },
      PENDING: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        border: 'border-yellow-300 dark:border-yellow-700',
        label: 'Onay Bekliyor'
      },
      INACTIVE: {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-300',
        border: 'border-gray-300 dark:border-gray-600',
        label: 'Pasif'
      },
      SUSPENDED: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-800 dark:text-orange-300',
        border: 'border-orange-300 dark:border-orange-700',
        label: 'Askıda'
      },
      TERMINATED: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-300',
        border: 'border-red-300 dark:border-red-700',
        label: 'Sonlandırıldı'
      },
      NO_AGREEMENT: {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-300 dark:border-gray-600',
        label: 'Anlaşma Yok'
      }
    };

    return badges[status] || badges.NO_AGREEMENT;
  };

  // Anlaşma yoksa
  if (!agreement || !agreement.agreementStatus) {
    const badge = getStatusBadge('NO_AGREEMENT');

    return (
      <div className={`bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 ${compact ? '' : 'lg:col-span-3'} transition-colors`}>
        <div className={`flex items-center ${compact ? 'flex-col gap-3' : 'justify-between'}`}>
          <div className="flex items-center gap-3 w-full">
            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-2xl">
              info
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {clientName}
                </span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full border transition-colors ${badge.bg} ${badge.text} ${badge.border}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
    <div className={`border-2 rounded-xl p-4 ${compact ? '' : 'lg:col-span-3'} transition-colors ${
      isActive ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
    }`}>
      <div className={`flex ${compact ? 'flex-col' : 'items-start justify-between'}`}>
        <div className={`flex items-start gap-3 flex-1 ${compact ? 'w-full' : ''}`}>
          <span className={`material-symbols-outlined ${compact ? 'text-xl' : 'text-2xl'} mt-0.5 ${
            isActive ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
          }`}>
            verified
          </span>

          <div className="flex-1">
            {/* Firma adı ve durum badge'i */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {clientName}
              </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border transition-colors ${badge.bg} ${badge.text} ${badge.border}`}>
                {badge.label}
              </span>
            </div>

            {/* Tarih bilgileri */}
            {isActive && (
              <div className={`grid gap-3 mt-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                {/* Başlangıç tarihi */}
                {agreement.agreementStartDate && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">
                      event
                    </span>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Başlangıç</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {new Date(agreement.agreementStartDate).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bitiş tarihi */}
                {agreement.agreementEndDate && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">
                      event
                    </span>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Bitiş</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {new Date(agreement.agreementEndDate).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Kalan süre */}
                {remainingDays !== null && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">
                      schedule
                    </span>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Kalan Süre</p>
                      <p className={`text-sm font-semibold ${
                        remainingDays < 30 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'
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
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
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
            className={`flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
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
