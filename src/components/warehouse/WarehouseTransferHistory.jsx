import { useEffect, useState } from "react";
import { warehouseService } from "../../api/warehouseService";
import { t, getCurrentLocale } from "../../locales";

const formatNum = (n, dec = 3) => {
  if (n == null) return "-";
  return Number(n).toLocaleString(getCurrentLocale(), { minimumFractionDigits: 0, maximumFractionDigits: dec });
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString(getCurrentLocale()) : "-");

const transferTypeShortLabel = (type) => {
  if (type === "FULL") return t("warehouse.history.full");
  if (type === "PARTIAL") return t("warehouse.common.partial");
  return type;
};

// İşlem Takip durumları; etiketleri panelin son işlemler tablosuyla ortak
const TRANSACTION_STATUSES = ["PENDING", "REGISTERED", "INSPECTION", "CP_COMPLETED", "WITHDRAWN", "CANCELLED"];

const transactionStatusLabel = (status) =>
  TRANSACTION_STATUSES.includes(status) ? t(`dashboard.recent.transactionStatus.${status}`) : status;

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
  emptyText = t("warehouse.history.empty"),
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
    ? transfers.filter((transfer) => transfer.transaction?.id !== excludeTransactionId)
    : transfers;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
        {t("warehouse.history.loading")}
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
            <th className="px-4 py-2 font-semibold whitespace-nowrap">{t("transactions.detail.date")}</th>
            <th className="px-4 py-2 font-semibold whitespace-nowrap">{t("warehouse.history.type")}</th>
            <th className="px-4 py-2 font-semibold whitespace-nowrap text-right">{t("transaction.containerAmount")}</th>
            <th className="px-4 py-2 font-semibold whitespace-nowrap text-right">{t("transaction.weight")}</th>
            <th className="px-4 py-2 font-semibold whitespace-nowrap">{t("warehouse.history.transactionFileNo")}</th>
            <th className="px-4 py-2 font-semibold whitespace-nowrap">{t("dashboard.recent.columns.status")}</th>
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
                  {transferTypeShortLabel(transfer.transferType)}
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
                {transactionStatusLabel(transfer.transaction?.status) || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
