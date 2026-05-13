import { useState, useEffect } from "react";
import { warehouseService } from "../../api/warehouseService";
import { showSuccess, showError } from "../../utils/toastUtils";

export default function DeleteWarehouseConfirmModal({ declaration, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await warehouseService.delete(declaration.id);
      if (result.success) {
        showSuccess("Antrepo kaydı silindi");
        onSuccess();
      } else {
        showError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Enter" && !loading) handleDelete();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose]);

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-md w-full animate-zoom-in transition-colors duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-full">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">warning</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-main">Kaydı Sil</h2>
            <p className="text-text-secondary text-sm mt-1">Bu işlem geri alınamaz</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Dosya No:</span>
              <span className="text-text-main font-semibold">{declaration.fileNo}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Alıcı:</span>
              <span className="text-text-main font-semibold">{declaration.recipientName || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Durum:</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                declaration.status === "KAPANDI"
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
              }`}>
                {declaration.status === "KAPANDI" ? "KAPANDI" : "TESCİL EDİLDİ"}
              </span>
            </div>
          </div>

          <p className="text-text-secondary text-sm">
            Bu antrepo kaydını silmek istediğinizden emin misiniz? Kayda bağlı aktarım geçmişi de silinecektir.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button type="button" onClick={onClose} disabled={loading} className="px-6 py-3 text-text-secondary hover:text-text-main font-medium transition-colors disabled:opacity-50">
            Vazgeç
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">delete</span>
            {loading ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </div>
    </div>
  );
}
