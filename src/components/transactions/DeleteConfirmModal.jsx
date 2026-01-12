import React, { useState } from "react";
import { transactionService } from "../../api/transactionService";
import { handleError, handleApiResponse } from '../../utils/errorUtils';
import { showSuccess } from '../../utils/toastUtils';

export default function DeleteConfirmModal({ transaction, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");

    try {
      // İşlemi iptal et (silme yerine)
      const result = await transactionService.cancelTransaction(transaction.id, reason);

      if (result.success) {
        showSuccess('İşlem başarıyla silindi!');
        onSuccess();
      } else {
        handleApiResponse(result, null, setError, 'transaction cancellation');
      }
    } catch (err) {
      handleError(err, setError, 'transaction cancellation', 'İşlem iptal edilirken beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-md w-full animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="flex items-center gap-4 p-6 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center justify-center h-12 w-12 bg-red-100 rounded-full">
              <span className="material-symbols-outlined text-red-600 text-2xl">warning</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main">
                İşlemi İptal Et
              </h2>
              <p className="text-text-secondary text-sm mt-1">
                Bu işlem geri alınamaz
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Transaction Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-sm">Dosya No:</span>
                <span className="text-text-main font-semibold">{transaction.fileNo}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-sm">Müşteri:</span>
                <span className="text-text-main font-semibold">
                  {transaction.clientCompany?.name || transaction.recipientName || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">Beyanname No:</span>
                <span className="text-text-main font-semibold">
                  {transaction.declarationNumber || '-'}
                </span>
              </div>
            </div>

            {/* Warning Text */}
            <p className="text-text-secondary text-sm mb-4">
              Bu işlemi iptal etmek istediğinizden emin misiniz? İşlem durumu "İptal" olarak değiştirilecek.
            </p>

            {/* Reason Input */}
            <label className="flex flex-col w-full mb-4">
              <p className="text-text-main text-sm font-medium pb-2">İptal Nedeni</p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows="3"
                className="form-textarea w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-red-500 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-red-500 placeholder:text-neutral p-3 text-base font-normal transition-colors"
                placeholder="İptal nedenini belirtin..."
              />
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 text-text-secondary hover:text-text-main font-medium transition-colors disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">delete</span>
              {loading ? 'İptal Ediliyor...' : 'İptal Et'}
            </button>
          </div>
      </div>
    </div>
  );
}