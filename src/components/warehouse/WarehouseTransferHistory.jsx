import { useEffect, useState } from "react";
import { warehouseService } from "../../api/warehouseService";

const formatNum = (n, dec = 3) => {
  if (n == null) return "-";
  return Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: dec });
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("tr-TR") : "-");

const TRANSFER_TYPE_LABEL = {
  FULL: "Tam",
  PARTIAL: "Düşümlü",
};

const STATUS_LABEL = {
  PENDING: "BEKLİYOR",
  REGISTERED: "TESCİL EDİLDİ",
  INSPECTION: "MUAYENEDE",
  CP_COMPLETED: "TAMAMLANDI",
  WITHDRAWN: "ÇEKİLDİ",
  CANCELLED: "İPTAL",
};

/**
 * Bir antrepo kaydından İşlem Takip'e yapılmış aktarımların listesi.
 *
 * Üç yerden kullanılıyor: antrepo detayında geçmiş, yeni düşüm yapılırken
 * önceki düşümler, işlem detayında aynı antrepodan çıkmış diğer dosyalar.
 * excludeTransactionId verilirse o işlem listeden düşer (işlem kendi detayında
 * "diğer işlemler" başlığı altında kendini göstermesin diye).
 */
export default function WarehouseTransferHistory({
  declarationId,
  excludeTransactionId,
  emptyText = "Bu kayıttan henüz aktarım yapılmamış.",
}) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!declarationId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    warehouseService.getTransfers(declarationId).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setTransfers(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [declarationId]);

  const visible = excludeTransactionId
    ? transfers.filter((t) => t.transaction?.id !== excludeTransactionId)
    : transfers;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
        Aktarım geçmişi yükleniyor…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400">
        <span className="material-symbols-outlined text-base">error</span>
        {error}
      </div>
    );
  }

  if (visible.length === 0) {
    return <p className="px-4 py-3 text-sm text-text-secondary">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-text-secondary border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-2 font-semibold whitespace-nowrap">Tarih</th>
            <th className="px-4 py-2 font-semibold whitespace-nowrap">Tip</th>
            <th className="px-4 py-2 font-semibold whitespace-nowrap text-right">Kap</th>
            <th className="px-4 py-2 font-semibold whitespace-nowrap text-right">Kilo (Kg)</th>
            <th className="px-4 py-2 font-semibold whitespace-nowrap">İşlem Dosya No</th>
            <th className="px-4 py-2 font-semibold whitespace-nowrap">Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {visible.map((transfer) => (
            <tr key={transfer.id}>
              <td className="px-4 py-2 whitespace-nowrap text-text-secondary">
                {formatDate(transfer.transferredAt)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                  transfer.transferType === "PARTIAL"
                    ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                    : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                }`}>
                  {TRANSFER_TYPE_LABEL[transfer.transferType] || transfer.transferType}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-text-main">
                {transfer.transferredContainerAmount ?? "-"}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-text-main">
                {formatNum(transfer.transferredWeight)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap font-mono font-semibold text-text-main">
                {transfer.transaction?.fileNo || "-"}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-xs text-text-secondary">
                {STATUS_LABEL[transfer.transaction?.status] || transfer.transaction?.status || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
