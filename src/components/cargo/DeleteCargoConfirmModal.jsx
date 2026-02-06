import { useState } from 'react';
import { cargoService } from '../../api/cargoService';
import { showSuccess, showError } from '../../utils/toastUtils';
import { getVehicleType } from '../../utils/constants';
import { handleError, handleApiResponse } from '../../utils/errorUtils';

export default function DeleteCargoConfirmModal({ cargo, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const vehicleType = getVehicleType(cargo.vehicleType);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const result = await cargoService.deleteCargo(cargo.id);

      if (result.success) {
        showSuccess('Yük kaydı başarıyla silindi');
        onSuccess();
      } else {
        handleApiResponse(result, null, (err) => showError(err), 'cargo deletion');
      }
    } catch (err) {
      handleError(err, (err) => showError(err), 'cargo deletion', 'Yük kaydı silinirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
            <h2 className="text-xl font-bold text-text-main dark:text-gray-100">Yük Kaydını Sil</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-text-secondary dark:text-gray-400 mb-4">
            Aşağıdaki yük kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">{vehicleType?.icon}</span>
              <span className="font-semibold text-text-main dark:text-gray-100">
                {vehicleType?.displayName}
              </span>
            </div>
            <div className="text-sm text-text-secondary dark:text-gray-400 space-y-1">
              <p><strong className="text-text-main dark:text-gray-300">Alıcı:</strong> {cargo.clientCompany?.name || '-'}</p>
              <p><strong className="text-text-main dark:text-gray-300">Gönderici:</strong> {cargo.senderCompany || '-'}</p>
              {cargo.licensePlate && <p><strong className="text-text-main dark:text-gray-300">Plaka:</strong> {cargo.licensePlate}</p>}
              {cargo.billOfLading && <p><strong className="text-text-main dark:text-gray-300">B/L:</strong> {cargo.billOfLading}</p>}
              {cargo.consignmentNumber && <p><strong className="text-text-main dark:text-gray-300">Konşimento:</strong> {cargo.consignmentNumber}</p>}
            </div>
          </div>

          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">info</span>
              Bu işlem geri alınamaz!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 shadow-sm"
          >
            İptal
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-2.5 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Siliniyor...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">delete</span>
                <span>Sil</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
