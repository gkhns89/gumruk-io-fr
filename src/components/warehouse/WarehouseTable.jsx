import { useEdgeScroll } from "../../hooks/useEdgeScroll";
import { warehouseService } from "../../api/warehouseService";
import { showSuccess, showError } from "../../utils/toastUtils";
import { getGateOption } from "../../utils/constants";
import { t, getCurrentLocale } from "../../locales";

// Hat değeri (SARI / KIRMIZI) veridir; ekranda sözlükteki karşılığı gösterilir
const getGateLabel = (gate) => {
  const option = getGateOption(gate);
  return option ? t(option.labelKey) : gate;
};

const getGateBadge = (gate) => {
  const styles = {
    SARI:    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700",
    KIRMIZI: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700",
  };
  return styles[gate] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300";
};

const getStatusInfo = (status) => {
  const map = {
    TESCIL_EDILDI: {
      label: t("dashboard.recent.warehouseStatus.TESCIL_EDILDI"),
      className: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700",
      borderClass: "border-l-4 border-l-amber-400",
    },
    KAPANDI: {
      label: t("dashboard.recent.warehouseStatus.KAPANDI"),
      className: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700",
      borderClass: "border-l-4 border-l-emerald-500",
    },
  };
  return map[status] || {
    label: status,
    className: "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600",
    borderClass: "border-l-4 border-l-gray-300",
  };
};

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(getCurrentLocale());
};

const formatNumber = (n, decimals = 3) => {
  if (n == null) return "-";
  return Number(n).toLocaleString(getCurrentLocale(), { minimumFractionDigits: 0, maximumFractionDigits: decimals });
};

export default function WarehouseTable({
  declarations,
  loading,
  error,
  onRetry,
  onRefresh,
  canDelete,
  canWrite,
  isReadOnly,
  userRole,
  onRowClick,
  onEdit,
  onDelete,
  onTransfer,
  scrollHeight = null,
  onScroll = null,
}) {
  const { containerRef: edgeScrollRef, scrollDirection } = useEdgeScroll({ edgeZoneWidth: 25, scrollSpeed: 10 });

  const handleBodyScroll = (e) => {
    const { scrollTop } = e.currentTarget;
    onScroll?.(scrollTop);
    window.dispatchEvent(new CustomEvent("innerTableScroll", { detail: { scrollTop } }));
  };

  const handleRowClick = (decl, event) => {
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) return;
    if (event.target.tagName === "BUTTON" || event.target.closest("button")) return;
    onRowClick?.(decl);
  };

  const handleProtocolToggle = async (e, decl) => {
    e.stopPropagation();
    const result = await warehouseService.toggleProtocol(decl.id);
    if (result.success) {
      showSuccess(result.data.message || t("warehouse.table.protocolUpdated"));
      onRefresh();
    } else {
      showError(result.error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-background-dark p-8 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-text-secondary">{t("warehouse.table.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-background-dark p-8 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <span className="material-symbols-outlined text-6xl text-red-500">error</span>
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">{t("dashboard.recent.errorTitle")}</p>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">refresh</span>
                {t("dashboard.recent.retry")}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!declarations || declarations.length === 0) {
    return (
      <div className="bg-white dark:bg-background-dark p-8 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <span className="material-symbols-outlined text-6xl text-text-secondary">warehouse</span>
        <div className="text-center">
          <p className="text-text-main font-semibold mb-2">{t("warehouse.table.emptyTitle")}</p>
          <p className="text-text-secondary text-sm">{t("warehouse.table.emptyHint")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-background-dark transition-colors duration-300 relative">
        {scrollDirection && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 pointer-events-none z-50">
            <div className="bg-black/10 dark:bg-white/10 backdrop-blur-sm rounded-full p-2 shadow-2xl">
              <div className="bg-white dark:bg-gray-800 rounded-full p-6 shadow-lg animate-pulse w-20 h-20 flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-primary font-bold">
                  {scrollDirection === "left" ? "arrow_back" : "arrow_forward"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div
          ref={edgeScrollRef}
          className="overflow-auto overscroll-contain"
          style={scrollHeight != null ? { maxHeight: scrollHeight } : undefined}
          onScroll={handleBodyScroll}
        >
          {scrollDirection && (
            <div className="absolute inset-0 bg-black/10 dark:bg-white/10 pointer-events-none z-10" style={{ width: "100%", minWidth: "max-content" }} />
          )}

          <table className="w-full text-left min-w-max border-spacing-0 border-separate">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-20">
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("dashboard.recent.columns.status")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.fileNo")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("warehouse.table.declarationNoShort")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.recipient")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.sender")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.customsWarehouse")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.customsName")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap text-center">{t("transaction.containerAmount")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap text-right">{t("transaction.weight")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("cargo.fields.carrierName")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("warehouse.common.representative")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.gate")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("warehouse.common.declarationDateShort")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("warehouse.common.stampDateShort")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap text-center">{t("warehouse.common.protocol")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap text-center">{t("warehouse.common.partial")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap text-right">{t("transactions.table.columns.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {declarations.map((decl) => {
                const statusInfo = getStatusInfo(decl.status);
                const gateBadgeClass = getGateBadge(decl.gate);
                const isKapandi = decl.status === "KAPANDI";
                const canEditThisRow = canWrite && !isReadOnly && (
                  !isKapandi || ["SUPER_ADMIN", "BROKER_ADMIN"].includes(userRole)
                );
                const hasRemaining = decl.remainingContainerAmount != null || decl.remainingWeight != null;
                const representativeName = decl.representative
                  ? (decl.representative.firstName && decl.representative.lastName
                      ? `${decl.representative.firstName} ${decl.representative.lastName}`
                      : decl.representative.username || decl.representative.email || "-")
                  : "-";

                return (
                  <tr
                    key={decl.id}
                    onClick={(e) => handleRowClick(decl, e)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    {/* Durum badge — left border burada */}
                    <td className={`px-4 py-3 whitespace-nowrap ${statusInfo.borderClass}`}>
                      <span className={`px-2 py-1 inline-flex justify-center text-xs leading-5 font-semibold rounded-full min-w-[130px] ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-main">
                      <div className="flex items-center gap-1.5">
                        {decl.fileNo}
                        {decl.transferredFileNos?.length > 0 && (
                          <span
                            title={t("warehouse.table.transferredTo", { fileNos: decl.transferredFileNos.join(", ") })}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-help"
                          >
                            <span className="material-symbols-outlined text-sm">swap_horiz</span>
                            {decl.transferredFileNos.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {decl.declarationNo || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {decl.recipientName || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {decl.senderName || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {decl.warehouse || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {decl.customs?.customsShortName || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary text-center">
                      {decl.containerAmount ?? "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary text-right">
                      {formatNumber(decl.weight)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {decl.carrierName || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {representativeName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {decl.gate ? (
                        <span className={`px-3 py-1 inline-flex justify-center text-xs leading-5 font-semibold rounded-full w-20 ${gateBadgeClass}`}>
                          {getGateLabel(decl.gate)}
                        </span>
                      ) : (
                        <span className="text-sm text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {formatDate(decl.declarationDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {formatDate(decl.stampPaymentDate)}
                    </td>

                    {/* Tutanak */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => canWrite && !isReadOnly ? handleProtocolToggle(e, decl) : e.stopPropagation()}
                        title={decl.protocol ? t("warehouse.table.protocolArrivedHint") : t("warehouse.table.protocolPendingHint")}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          canWrite && !isReadOnly ? "cursor-pointer hover:opacity-80" : "cursor-default"
                        } ${
                          decl.protocol
                            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {decl.protocol ? "check_circle" : "hourglass_empty"}
                        </span>
                        {decl.protocol ? t("warehouse.table.arrived") : t("transactions.filters.statusPending")}
                      </button>
                    </td>

                    {/* Düşümlü (kalan miktarlar) */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {hasRemaining ? (
                        <span className="text-text-secondary opacity-70">
                          {t("warehouse.table.remaining", { containers: decl.remainingContainerAmount ?? 0, weight: formatNumber(decl.remainingWeight) })}
                        </span>
                      ) : (
                        <span className="text-text-secondary opacity-40">-</span>
                      )}
                    </td>

                    {/* İşlemler */}
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1">
                        {canEditThisRow && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(decl); }}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            title={t("common.edit")}
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                        )}
                        {canDelete && !isReadOnly && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(decl); }}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                            title={t("common.delete")}
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        )}
                        {isKapandi && !isReadOnly && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onTransfer?.(decl); }}
                            className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors cursor-pointer"
                            title={t("warehouse.common.transferToTransaction")}
                          >
                            <span className="material-symbols-outlined text-lg">output</span>
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
    </>
  );
}
