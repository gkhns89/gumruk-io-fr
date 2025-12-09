import React, { useState } from "react";
import TransactionDetailModal from "./TransactionDetailModal";

// Hat renk mapping
const getGateRowStyle = (gate) => {
  const gateStyles = {
    'SARI': {
      bg: 'bg-yellow-50',
      hoverBg: 'hover:bg-yellow-100',
      border: 'border-l-4 border-l-yellow-400',
    },
    'KIRMIZI': {
      bg: 'bg-red-50',
      hoverBg: 'hover:bg-red-100',
      border: 'border-l-4 border-l-red-500',
    },
  };

  return gateStyles[gate] || { bg: '', hoverBg: 'hover:bg-gray-50', border: '' };
};

// Hat badge renkleri
const getGateBadge = (gate) => {
  const badgeStyles = {
    'SARI': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    'KIRMIZI': 'bg-red-100 text-red-800 border border-red-300',
  };

  return badgeStyles[gate] || 'bg-gray-100 text-gray-800';
};

export default function TransactionsTable({ transactions, loading, error, onRetry }) {
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'COMPLETED': { color: 'green', label: 'Tamamlandı' },
      'IN_PROGRESS': { color: 'yellow', label: 'İşlemde' },
      'PENDING': { color: 'blue', label: 'Bekliyor' },
      'CANCELLED': { color: 'red', label: 'İptal' },
    };

    const statusInfo = statusMap[status] || { color: 'gray', label: status };
    
    const colors = {
      green: "bg-green-100 text-green-800",
      yellow: "bg-yellow-100 text-yellow-800",
      blue: "bg-blue-100 text-blue-800",
      red: "bg-red-100 text-red-800",
      gray: "bg-gray-100 text-gray-800",
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

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
  };

  const handleViewFull = (transactionId) => {
    // İşlem detay sayfasına yönlendir
    window.location.href = `/transactions/${transactionId}`;
  };

  // Loading state
  if (loading) {
    return (
      <>
        <h2 className="text-text-main text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-2">
          Son İşlemler
        </h2>
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-text-secondary">İşlemler yükleniyor...</p>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <h2 className="text-text-main text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-2">
          Son İşlemler
        </h2>
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-6xl text-red-500">error</span>
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-2">Bir Hata Oluştu</p>
            <p className="text-text-secondary text-sm mb-4">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  Tekrar Dene
                </span>
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // Empty state
  if (!transactions || transactions.length === 0) {
    return (
      <>
        <h2 className="text-text-main text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-2">
          Son İşlemler
        </h2>
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-6xl text-text-secondary">inbox</span>
          <div className="text-center">
            <p className="text-text-main font-semibold mb-2">Henüz İşlem Yok</p>
            <p className="text-text-secondary text-sm">
              Gümrük işlemleriniz burada görüntülenecektir.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Success state with data
  return (
    <>
      <div className="flex items-center justify-between pb-3 pt-2">
        <h2 className="text-text-main text-[22px] font-bold leading-tight tracking-[-0.015em]">
          Son İşlemler
        </h2>
        <span className="text-text-secondary text-sm">
          {transactions.length} işlem gösteriliyor
        </span>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        {/* Hat Renk Açıklaması */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <span className="text-xs text-text-secondary font-medium">Hat Renkleri:</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-medium border border-yellow-300">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
              Sarı
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-xs font-medium border border-red-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Kırmızı
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium border border-green-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              Yeşil
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium border border-blue-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Mavi
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Antrepo Varış
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Beyanname No
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Alıcı Firma
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Gönderici Firma
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Hat
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Detaylar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction) => {
                const statusInfo = getStatusBadgeClass(transaction.status);
                const gateStyle = getGateRowStyle(transaction.gate);
                const gateBadgeClass = getGateBadge(transaction.gate);
                
                return (
                  <tr 
                    key={transaction.id} 
                    className={`${gateStyle.bg} ${gateStyle.hoverBg} ${gateStyle.border} transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {formatDate(transaction.warehouseArrivalDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main font-medium">
                      {transaction.declarationNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {transaction.clientCompany?.name || transaction.recipientName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {transaction.senderCompany?.name || transaction.senderName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.gate ? (
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${gateBadgeClass}`}>
                          {transaction.gate}
                        </span>
                      ) : (
                        <span className="text-sm text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewTransaction(transaction)}
                        className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">visibility</span>
                        Görüntüle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={handleCloseModal}
          onViewFull={handleViewFull}
        />
      )}
    </>
  );
}