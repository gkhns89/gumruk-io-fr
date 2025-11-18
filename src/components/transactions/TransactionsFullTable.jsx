import React, { useState } from "react";
import EditTransactionModal from "./EditTransactionModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

export default function TransactionsFullTable({ 
  transactions, 
  loading, 
  error, 
  onRetry, 
  onRefresh,
  canEdit,
  canDelete,
  isReadOnly
}) {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    );
  }

  // Empty state
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white p-8 flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl text-text-secondary">inbox</span>
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
      <div className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-text-main uppercase tracking-wider">
                  Dosya No
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main uppercase tracking-wider">
                  Beyanname No
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main uppercase tracking-wider">
                  Alıcı Firma
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main uppercase tracking-wider">
                  Gümrük
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main uppercase tracking-wider">
                  Antrepo Varış
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main uppercase tracking-wider text-right">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction) => {
                const statusInfo = getStatusBadgeClass(transaction.status);
                return (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-text-main">
                        {transaction.fileNo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {transaction.declarationNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {transaction.clientCompany?.name || transaction.recipientName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {transaction.customsWarehouse || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {formatDate(transaction.warehouseArrivalDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {/* Görüntüle - Herkes görebilir */}
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title={isReadOnly ? "Görüntüle" : "Düzenle"}
                        >
                          <span className="material-symbols-outlined text-lg">
                            {isReadOnly ? 'visibility' : 'edit'}
                          </span>
                        </button>

                        {/* Durum Değiştir - Sadece yetkili kullanıcılar */}
                        {canEdit && !isReadOnly && (
                          <button
                            onClick={() => {/* Status change handler */}}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Durum Değiştir"
                          >
                            <span className="material-symbols-outlined text-lg">
                              swap_horiz
                            </span>
                          </button>
                        )}

                        {/* Sil - Sadece ADMIN yetkisi olanlar */}
                        {canDelete && !isReadOnly && (
                          <button
                            onClick={() => handleDelete(transaction)}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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