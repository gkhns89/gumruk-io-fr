import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TransactionDetailModal from "../common/TransactionDetailModal";
import { useEdgeScroll } from "../../hooks/useEdgeScroll";

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
      border: 'border-l-4 border-l-orange-700',
    },
    'WITHDRAWN': {
      border: 'border-l-4 border-l-green-500 bg-red-50 dark:bg-red-900/30',
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
    'SARI': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700',
    'KIRMIZI': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700',
  };

  return badgeStyles[gate] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
};

export default function TransactionsTable({ transactions, loading, error, onRetry }) {
  const navigate = useNavigate();
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Edge-scrolling functionality - auto-scroll when mouse near edges
  const { containerRef: scrollContainerRef, scrollDirection } = useEdgeScroll({
    edgeZoneWidth: 25,
    scrollSpeed: 10,
    enableOnTouch: false,
  });

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'PENDING': { color: 'pending', label: 'BEKLİYOR' },
      'REGISTERED': { color: 'registered', label: 'TESCİL EDİLDİ' },
      'INSPECTION': { color: 'inspection', label: 'MUAYENEDE' },
      'CP_COMPLETED': { color: 'completed', label: 'TAMAMLANDI' },
      'WITHDRAWN': { color: 'withdrawn', label: 'ÇEKİLDİ' },
      'CANCELLED': { color: 'cancelled', label: 'İPTAL' },
    };

    const statusInfo = statusMap[status] || { color: 'default', label: status };

    const colors = {
      pending: "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700",
      registered: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700",
      inspection: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700",
      completed: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700",
      withdrawn: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700",
      cancelled: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700",
      default: "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600",
    };

    return {
      className: colors[statusInfo.color],
      label: statusInfo.label,
    };
  };

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
  };

  // Satır tıklama handler'ı - metin seçimi kontrolü ile
  const handleRowClick = (transaction, event) => {
    // Eğer kullanıcı metin seçiyorsa modal açma
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    // Eğer tıklanan element bir button veya button içindeyse, işlemi yapma
    // (Görüntüle butonunun kendi onClick'i çalışsın)
    const target = event.target;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    // Modal'ı aç
    handleViewTransaction(transaction);
  };

  // Loading state
  if (loading) {
    return (
      <>
        <h2 className="text-text-main text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-2">
          Son İşlemler
        </h2>
        <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
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
        <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
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
        <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
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
      <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto relative"
        >
          {/* Scroll direction indicator overlay - covers full scroll width */}
          {scrollDirection && (
            <div className="absolute inset-y-0 left-0 right-0 min-w-full pointer-events-none flex items-center justify-center z-10">
              <div className="sticky left-1/2 -translate-x-1/2">
                <div className="bg-black/10 dark:bg-white/10 backdrop-blur-sm rounded-full p-2 shadow-2xl">
                  <div className="bg-white dark:bg-gray-800 rounded-full p-6 shadow-lg animate-pulse w-20 h-20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-primary font-bold">
                      {scrollDirection === "left" ? "arrow_back" : "arrow_forward"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <table className="w-full text-left relative">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-text-main uppercase tracking-wider">
                  Dosya No
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
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((transaction) => {
                const statusInfo = getStatusBadgeClass(transaction.status);
                const statusStyle = getStatusRowStyle(transaction.status);
                const gateBadgeClass = getGateBadge(transaction.gate);

                return (
                  <tr
                    key={transaction.id}
                    onClick={(e) => handleRowClick(transaction, e)}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${statusStyle.border} transition-colors cursor-pointer`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main font-medium">
                      {transaction.fileNo || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
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
                        <span className={`px-2 py-1 inline-flex justify-center text-xs leading-5 font-semibold rounded-full w-20 ${gateBadgeClass}`}>
                          {transaction.gate}
                        </span>
                      ) : (
                        <span className="text-sm text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex justify-center text-xs leading-5 font-semibold rounded-full min-w-[140px] ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewTransaction(transaction)}
                        className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors cursor-pointer"
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
          onEdit={(transaction) => {
            setSelectedTransaction(null);
            navigate(`/transactions?edit=${transaction.id}`);
          }}
        />
      )}
    </>
  );
}