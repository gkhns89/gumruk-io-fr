import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TransactionDetailModal from "./TransactionDetailModal";

// Durum renk mapping - Sadece sol border
const getStatusRowStyle = (status) => {
  const statusStyles = {
    'PENDING': {
      border: 'border-l-4 border-l-sky-400',
    },
    'REGISTERED': {
      border: 'border-l-4 border-l-amber-400',
    },
    'INSPECTION': {
      border: 'border-l-4 border-l-purple-400',
    },
    'CP_COMPLETED': {
      border: 'border-l-4 border-l-emerald-400',
    },
    'WITHDRAWN': {
      border: 'border-l-4 border-l-green-500',
    },
    'CANCELLED': {
      border: 'border-l-4 border-l-rose-500',
    },
  };

  return statusStyles[status] || { border: 'border-l-4 border-l-gray-300' };
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
  const navigate = useNavigate();
  const [selectedTransaction, setSelectedTransaction] = useState(null);

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
      completed: "bg-emerald-50 text-emerald-700 border border-emerald-300",
      withdrawn: "bg-green-50 text-green-700 border border-green-300",
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

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
  };

  const handleViewFull = (transactionId) => {
    // İşlem takip sayfasına yönlendir ve düzenleme modunda aç
    setSelectedTransaction(null);
    navigate(`/transactions?edit=${transactionId}`);
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
                const statusStyle = getStatusRowStyle(transaction.status);
                const gateBadgeClass = getGateBadge(transaction.gate);

                return (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-50 ${statusStyle.border} transition-colors`}
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