import React, { useState, useMemo } from "react";
import EditTransactionModal from "./EditTransactionModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

// Durum renk mapping - Sadece sol border
const getStatusRowStyle = (status) => {
  const statusStyles = {
    PENDING: {
      border: 'border-l-4 border-l-sky-400',
    },
    REGISTERED: {
      border: 'border-l-4 border-l-amber-400',
    },
    INSPECTION: {
      border: 'border-l-4 border-l-purple-400',
    },
    CP_COMPLETED: {
      border: 'border-l-4 border-l-orange-700',
    },
    WITHDRAWN: {
      border: 'border-l-4 border-l-green-500 bg-red-50',
    },
    CANCELLED: {
      border: 'border-l-4 border-l-rose-500',
    },
  };

  return statusStyles[status] || { border: "border-l-4 border-l-gray-300" };
};

// Hat badge renkleri
const getGateBadge = (gate) => {
  const badgeStyles = {
    SARI: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    KIRMIZI: "bg-red-100 text-red-800 border border-red-300",
  };

  return badgeStyles[gate] || "bg-gray-100 text-gray-800";
};

export default function TransactionsFullTable({
  transactions,
  loading,
  error,
  onRetry,
  onRefresh,
  canDelete,
  isReadOnly,
  onRowClick,
}) {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // İşlemleri sırala: 3 seviye - Aktif, Kapanan, Çekilen
  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];

    return [...transactions].sort((a, b) => {
      // Öncelik seviyelerini belirle
      const getPriority = (status) => {
        if (status === 'WITHDRAWN') return 3; // En son: Çekilenler
        if (status === 'CP_COMPLETED' || status === 'CANCELLED') return 2; // Ortada: Kapananlar
        return 1; // En üstte: Aktif işlemler (PENDING, REGISTERED, INSPECTION)
      };

      const priorityA = getPriority(a.status);
      const priorityB = getPriority(b.status);

      // Önce önceliğe göre sırala
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Aynı öncelik seviyesindeyse, tarihe göre sırala (yeni en üstte)
      const dateA = new Date(a.createdAt || a.warehouseArrivalDate || 0);
      const dateB = new Date(b.createdAt || b.warehouseArrivalDate || 0);
      return dateB - dateA; // Azalan sıralama (yeni önce)
    });
  }, [transactions]);

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      PENDING: { color: "pending", label: "Bekliyor" },
      REGISTERED: { color: "registered", label: "Tescil Edildi" },
      INSPECTION: { color: "inspection", label: "Muayene Sürecinde" },
      CP_COMPLETED: {
        color: "completed",
        label: "Gümrük İşlemleri Tamamlandı",
      },
      WITHDRAWN: { color: "withdrawn", label: "Çekildi" },
      CANCELLED: { color: "cancelled", label: "İptal" },
    };

    const statusInfo = statusMap[status] || { color: "default", label: status };

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
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR");
  };

  const handleEdit = (transaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  };

  const handleDelete = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDeleteModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedTransaction(null);
    onRefresh();
  };

  const handleDeleteSuccess = () => {
    setShowDeleteModal(false);
    setSelectedTransaction(null);
    onRefresh();
  };

  // Satır tıklama handler'ı - metin seçimi kontrolü ile
  const handleRowClick = (transaction, event) => {
    // Eğer kullanıcı metin seçiyorsa modal açma
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    // Eğer tıklanan element bir button veya button içindeyse, işlemi yapma
    const target = event.target;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    // onRowClick callback'ini çağır
    if (onRowClick) {
      onRowClick(transaction);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-8 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-text-secondary">İşlemler yükleniyor...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white p-8 flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl text-red-500">
          error
        </span>
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Bir Hata Oluştu</p>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">
                  refresh
                </span>
                Tekrar Dene
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!sortedTransactions || sortedTransactions.length === 0) {
    return (
      <div className="bg-white p-8 flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl text-text-secondary">
          inbox
        </span>
        <div className="text-center">
          <p className="text-text-main font-semibold mb-2">İşlem Bulunamadı</p>
          <p className="text-text-secondary text-sm">
            Filtreleri değiştirerek tekrar deneyin veya yeni işlem ekleyin.
          </p>
        </div>
      </div>
    );
  }

  // Success state with data
  return (
    <>
      <div className="bg-white overflow-x-auto">
        <table className="w-full text-left min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Dosya No
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Beyanname No
              </th>

              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Alıcı
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Gönderici
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Antrepo
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Gümrük
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Hat
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Kap
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Kilo (Kg)
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Vergi (TL)
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Antrepo Varış
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Tescil Tarihi
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Kapanma Tarihi
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Çekilme Tarihi
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                İşlem Süresi (Gün)
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Toplam Süre (Gün)
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Durum
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider text-right whitespace-nowrap">
                İşlemler
              </th>
                            <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">
                Broker Firma
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedTransactions.map((transaction) => {
              const statusInfo = getStatusBadgeClass(transaction.status);
              const statusStyle = getStatusRowStyle(transaction.status);
              const gateBadgeClass = getGateBadge(transaction.gate);

              return (
                <tr
                  key={transaction.id}
                  onClick={(e) => handleRowClick(transaction, e)}
                  className={`hover:bg-gray-50 ${statusStyle.border} transition-colors cursor-pointer`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-text-main">
                      {transaction.fileNo}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {transaction.declarationNumber || "-"}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {transaction.recipientName || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {transaction.senderName || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {transaction.customsWarehouse || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {transaction.customs?.customsShortName || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {transaction.gate ? (
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${gateBadgeClass}`}
                      >
                        {transaction.gate}
                      </span>
                    ) : (
                      <span className="text-sm text-text-secondary">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {transaction.containerAmount || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary text-right">
                    {transaction.weight
                      ? transaction.weight.toLocaleString(
                          "tr-TR",
                          { minimumFractionDigits: 2 },
                          { maximumFractionDigits: 2 }
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary text-right">
                    {transaction.tax
                      ? transaction.tax.toLocaleString(
                          "tr-TR",
                          { minimumFractionDigits: 2 },
                          { maximumFractionDigits: 4 }
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {formatDate(transaction.warehouseArrivalDate)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {formatDate(transaction.registrationDate)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {formatDate(transaction.lineClosureDate)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {formatDate(transaction.withdrawalDate)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary text-center">
                    {transaction.importProcessingTime === 0
                      ? "<1"
                      : transaction.importProcessingTime ?? "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary text-center">
                    {transaction.totalProcessingTime === 0
                      ? "<1"
                      : transaction.totalProcessingTime ?? "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* Görüntüle/Düzenle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(transaction);
                        }}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title={isReadOnly ? "Görüntüle" : "Düzenle"}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {isReadOnly ? "visibility" : "edit"}
                        </span>
                      </button>

                      {/* Sil - Sadece yetkili kullanıcılar */}
                      {canDelete && !isReadOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(transaction);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <span className="material-symbols-outlined text-lg">
                            delete
                          </span>
                        </button>
                      )}
                    </div>
                  </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {transaction.brokerCompany?.name || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit/View Modal */}
      {showEditModal && selectedTransaction && (
        <EditTransactionModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTransaction(null);
          }}
          onSuccess={handleEditSuccess}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedTransaction && (
        <DeleteConfirmModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedTransaction(null);
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
