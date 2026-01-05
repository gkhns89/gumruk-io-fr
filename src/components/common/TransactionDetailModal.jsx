import React from "react";

// Hat badge renkleri
const getGateBadge = (gate) => {
  const badgeStyles = {
    'SARI': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    'KIRMIZI': 'bg-red-100 text-red-800 border border-red-300',
  };

  return badgeStyles[gate] || 'bg-gray-100 text-gray-800';
};

export default function TransactionDetailModal({ transaction, onClose, onEdit }) {
  if (!transaction) return null;

  // Parse delay reasons from JSON
  const delayReasons = (() => {
    try {
      return transaction.delayReason ? JSON.parse(transaction.delayReason) : {};
    } catch {
      return {};
    }
  })();

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'PENDING': { color: 'pending', label: 'BEKLİYOR' },
      'REGISTERED': { color: 'registered', label: 'TESCİL EDİLDİ' },
      'INSPECTION': { color: 'inspection', label: 'MUAYENE SÜRECİNDE' },
      'CP_COMPLETED': { color: 'completed', label: 'GÜMRÜK İŞLEMLERİ TAMAMLANDI' },
      'WITHDRAWN': { color: 'withdrawn', label: 'ÇEKİLDİ' },
      'CANCELLED': { color: 'cancelled', label: 'İPTAL' },
    };

    const statusInfo = statusMap[status] || { color: 'default', label: status };

    const colors = {
      pending: "bg-sky-50 text-sky-700 border border-sky-300",
      registered: "bg-amber-50 text-amber-700 border border-amber-300",
      inspection: "bg-purple-50 text-purple-700 border border-purple-300",
      completed: "bg-orange-50 text-orange-700 border border-orange-300",
      withdrawn: "bg-emerald-50 text-emerald-700 border border-emerald-300",
      cancelled: "bg-rose-50 text-rose-700 border border-rose-300",
      default: "bg-gray-50 text-gray-600 border border-gray-300",
    };

    return {
      className: colors[statusInfo.color],
      label: statusInfo.label,
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  const statusInfo = getStatusBadgeClass(transaction.status);
  const gateBadgeClass = getGateBadge(transaction.gate);

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12 bg-primary rounded-full text-white">
                <span className="material-symbols-outlined text-2xl">description</span>
              </div>
              <div>
                <h2 className="text-text-main text-xl font-bold">
                  İşlem Detayları
                </h2>
                <p className="text-text-secondary text-sm">
                  Dosya No: {transaction.fileNo}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-text-secondary">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Status Badge */}
            <div className="mb-6 flex justify-center gap-3">
              <span className={`px-6 py-2 inline-flex text-sm font-semibold rounded-full ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
              {transaction.gate && (
                <span className={`px-6 py-2 inline-flex text-sm font-semibold rounded-full ${gateBadgeClass}`}>
                  {transaction.gate} Hat
                </span>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-text-secondary text-sm mb-1">Alıcı Firma</p>
                <p className="text-text-main font-semibold">
                  {transaction.clientCompany?.name || transaction.recipientName || '-'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-text-secondary text-sm mb-1">Beyanname No</p>
                <p className="text-text-main font-semibold">
                  {transaction.declarationNumber || '-'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-text-secondary text-sm mb-1">Antrepo Varış Tarihi</p>
                <p className="text-text-main font-semibold">
                  {formatDate(transaction.warehouseArrivalDate)}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-text-secondary text-sm mb-1">Gümrük Antrepo</p>
                <p className="text-text-main font-semibold">
                  {transaction.customsWarehouse || '-'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-text-secondary text-sm mb-1">Kap</p>
                <p className="text-text-main font-semibold">
                  {transaction.containerAmount || '-'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-text-secondary text-sm mb-1">Ağırlık</p>
                <p className="text-text-main font-semibold">
                  {transaction.weight ? `${transaction.weight} kg` : '-'}
                </p>
              </div>

              {transaction.description && (
                <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                  <p className="text-text-secondary text-sm mb-1">Açıklama</p>
                  <p className="text-text-main">
                    {transaction.description}
                  </p>
                </div>
              )}
            </div>

            {/* Gecikme Nedenleri */}
            {(delayReasons.arrivalToRegistration || delayReasons.registrationToClosure || delayReasons.closureToWithdrawal) && (
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Gecikme Nedenleri</h3>

                {delayReasons.arrivalToRegistration && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-yellow-600">warning</span>
                      <p className="text-sm font-bold text-gray-800">
                        Antrepo Varış → Tescil Gecikme Nedeni
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {delayReasons.arrivalToRegistration}
                    </p>
                  </div>
                )}

                {delayReasons.registrationToClosure && (
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-orange-600">warning</span>
                      <p className="text-sm font-bold text-gray-800">
                        Tescil → Kapanma Gecikme Nedeni
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {delayReasons.registrationToClosure}
                    </p>
                  </div>
                )}

                {delayReasons.closureToWithdrawal && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-red-600">warning</span>
                      <p className="text-sm font-bold text-gray-800">
                        Kapanma → Çekilme Gecikme Nedeni
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {delayReasons.closureToWithdrawal}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2 text-text-secondary hover:text-text-main font-medium transition-colors"
            >
              Kapat
            </button>
            <button
              onClick={() => onEdit && onEdit(transaction)}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
              İşlemi Düzenle
            </button>
          </div>
        </div>
    </div>
  );
}
