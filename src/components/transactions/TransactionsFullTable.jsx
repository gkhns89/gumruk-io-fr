import { useState } from "react";
import EditTransactionModal from "./EditTransactionModal";
import PendingChangeBadge from '../drafts/PendingChangeBadge';
import DeleteConfirmModal from "./DeleteConfirmModal";
import { useEdgeScroll } from "../../hooks/useEdgeScroll";
import { warehouseOriginLabel } from "../../utils/warehouseOrigin";
import { getGateOption } from "../../utils/constants";
import { t, getCurrentLocale } from "../../locales";

// Hat değeri (SARI / KIRMIZI) veridir; ekranda sözlükteki karşılığı gösterilir
const getGateLabel = (gate) => {
  const option = getGateOption(gate);
  return option ? t(option.labelKey) : gate;
};

// Hat badge renkleri
const getGateBadge = (gate) => {
  const badgeStyles = {
    SARI: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700",
    KIRMIZI: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700",
  };
  return badgeStyles[gate] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300";
};

// Sol border — sadece ilk TD'ye uygulanır
const getStatusBorderClass = (status) => {
  const map = {
    PENDING:      "border-l-4 border-l-sky-400",
    REGISTERED:   "border-l-4 border-l-amber-400",
    INSPECTION:   "border-l-4 border-l-purple-400",
    CP_COMPLETED: "border-l-4 border-l-orange-700",
    WITHDRAWN:    "border-l-4 border-l-green-500",
    CANCELLED:    "border-l-4 border-l-rose-500",
  };
  return map[status] || "border-l-4 border-l-gray-300";
};

// Satır arkaplan rengi — TR'ye uygulanır
const getStatusRowBgClass = (status) => {
  if (status === "WITHDRAWN") return "bg-red-50 dark:bg-red-900/30";
  return "";
};

// Vergi ve teminat tek sütunda gösteriliyor — dolu olanların dökümü
const getAmountBreakdown = (transaction) => {
  const rows = [
    { type: "tax", label: t("transactions.table.tax"), amount: transaction.tax },
    { type: "guarantee", label: t("transactions.table.guarantee"), amount: transaction.guaranteeAmount },
  ];
  return rows
    .filter(({ amount }) => amount)
    .map(({ type, label, amount }) => ({ type, label, amount: Number(amount) }));
};

const formatAmount = (amount) =>
  amount.toLocaleString(getCurrentLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export default function TransactionsFullTable({
  transactions,
  loading,
  error,
  onRetry,
  onRefresh,
  canDelete,
  isReadOnly,
  onRowClick,
  pendingFor = null,
  onOpenPendingChange = null,
  scrollHeight = null,
  onScroll = null,
}) {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { containerRef: edgeScrollRef, scrollDirection } = useEdgeScroll({
    edgeZoneWidth: 25,
    scrollSpeed: 10,
  });

  const handleBodyScroll = (e) => {
    const { scrollTop } = e.currentTarget;
    onScroll?.(scrollTop);
    window.dispatchEvent(new CustomEvent("innerTableScroll", { detail: { scrollTop } }));
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      PENDING:      { color: "pending",    label: t("dashboard.recent.transactionStatus.PENDING")         },
      REGISTERED:   { color: "registered", label: t("dashboard.recent.transactionStatus.REGISTERED")    },
      INSPECTION:   { color: "inspection", label: t("dashboard.recent.transactionStatus.INSPECTION")         },
      CP_COMPLETED: { color: "completed",  label: t("dashboard.recent.transactionStatus.CP_COMPLETED")        },
      WITHDRAWN:    { color: "withdrawn",  label: t("dashboard.recent.transactionStatus.WITHDRAWN")           },
      CANCELLED:    { color: "cancelled",  label: t("dashboard.recent.transactionStatus.CANCELLED")             },
    };
    const statusInfo = statusMap[status] || { color: "default", label: status };
    const colors = {
      pending:    "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700",
      registered: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700",
      inspection: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700",
      completed:  "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700",
      withdrawn:  "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700",
      cancelled:  "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700",
      default:    "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600",
    };
    return { className: colors[statusInfo.color], label: statusInfo.label };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(getCurrentLocale());
  };

  const handleEdit   = (row) => { setSelectedTransaction(row); setShowEditModal(true); };
  const handleDelete = (row) => { setSelectedTransaction(row); setShowDeleteModal(true); };

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

  const handleRowClick = (transaction, event) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    const target = event.target;
    if (target.tagName === "BUTTON" || target.closest("button")) return;
    if (onRowClick) onRowClick(transaction);
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white dark:bg-background-dark p-8 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-text-secondary">{t("dashboard.recent.transactionsLoading")}</p>
      </div>
    );
  }

  // Error state
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

  // Empty state
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-background-dark p-8 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <span className="material-symbols-outlined text-6xl text-text-secondary">inbox</span>
        <div className="text-center">
          <p className="text-text-main font-semibold mb-2">{t("transactions.table.emptyTitle")}</p>
          <p className="text-text-secondary text-sm">
            {t("transactions.table.emptyHint")}
          </p>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────
  return (
    <>
      <div
        className="bg-white dark:bg-background-dark transition-colors duration-300 relative"
      >
        {/* Ok göstergesi */}
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

        {/* ── Tek kaydırmalı container, thead sticky ───────────────── */}
        <div
          ref={edgeScrollRef}
          className="overflow-auto relative overscroll-contain"
          style={scrollHeight != null ? { maxHeight: scrollHeight } : undefined}
          onScroll={handleBodyScroll}
        >
          {scrollDirection && (
            <div
              className="absolute inset-0 bg-black/10 dark:bg-white/10 pointer-events-none z-10"
              style={{ width: "100%", minWidth: "max-content" }}
            />
          )}

          <table className="w-full text-left min-w-max border-spacing-0 border-separate">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-20">
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.fileNo")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.declarationNumber")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.recipient")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.sender")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.customsWarehouse")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.customsName")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.gate")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.containerAmount")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.weight")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transactions.table.columns.taxGuarantee")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("dashboard.recent.columns.status")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transactions.table.columns.warehouseArrival")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.registrationDate")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.lineClosureDate")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transaction.withdrawalDate")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transactions.table.columns.processingDays")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transactions.table.columns.totalDays")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider text-right whitespace-nowrap">{t("transactions.table.columns.actions")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-main uppercase tracking-wider whitespace-nowrap">{t("transactions.table.columns.brokerCompany")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((transaction) => {
                const statusInfo    = getStatusBadgeClass(transaction.status);
                const borderClass   = getStatusBorderClass(transaction.status);
                const rowBgClass    = getStatusRowBgClass(transaction.status);
                const gateBadgeClass = getGateBadge(transaction.gate);

                return (
                  <tr
                    key={transaction.id}
                    onClick={(e) => handleRowClick(transaction, e)}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${rowBgClass}`}
                  >
                    {/* İlk hücre: durum rengi burada */}
                    <td className={`px-4 py-3 whitespace-nowrap ${borderClass}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-text-main">{transaction.fileNo}</span>
                        {transaction.warehouseDeclarationId && (
                          <span
                            title={warehouseOriginLabel(transaction)}
                            className="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-400 cursor-help"
                          >
                            warehouse
                          </span>
                        )}
                        {/* Bekleyen taslak değişiklik (DRAFTS) */}
                        <PendingChangeBadge
                          drafts={pendingFor?.(transaction.id)}
                          onClick={(drafts) => onOpenPendingChange?.(drafts, transaction)}
                        />
                      </div>
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
                        <span className={`px-3 py-1 inline-flex justify-center text-xs leading-5 font-semibold rounded-full w-20 ${gateBadgeClass}`}>
                          {getGateLabel(transaction.gate)}
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
                        ? transaction.weight.toLocaleString(getCurrentLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const breakdown = getAmountBreakdown(transaction);
                        if (breakdown.length === 0) return <span className="text-sm text-text-secondary">-</span>;
                        const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
                        return (
                          <div className="space-y-0.5">
                            {breakdown.map((item) => (
                              <div key={item.type} className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-400 dark:text-gray-500 w-[52px] shrink-0">{item.label}</span>
                                <span className="text-xs font-semibold text-text-main dark:text-gray-300 tabular-nums">
                                  {formatAmount(item.amount)}
                                </span>
                                <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 leading-none">TL</span>
                              </div>
                            ))}
                            {breakdown.length > 1 && (
                              <div className="pt-1 mt-1 border-t border-gray-200 dark:border-gray-700 flex items-center gap-1.5">
                                <span className="text-xs text-primary dark:text-primary-light w-[52px] shrink-0 font-medium">{t("transactions.common.total")}</span>
                                <span className="text-xs font-bold text-primary dark:text-primary-light tabular-nums">
                                  {formatAmount(total)}
                                </span>
                                <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light leading-none">TL</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex justify-center text-xs leading-5 font-semibold rounded-full min-w-[140px] ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
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
                      {transaction.importProcessingTime === 0 ? "<1" : transaction.importProcessingTime ?? "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary text-center">
                      {transaction.totalProcessingTime === 0 ? "<1" : transaction.totalProcessingTime ?? "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(transaction); }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                          title={isReadOnly ? t("common.view") : t("common.edit")}
                        >
                          <span className="material-symbols-outlined text-lg">
                            {isReadOnly ? "visibility" : "edit"}
                          </span>
                        </button>
                        {canDelete && !isReadOnly && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(transaction); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title={t("common.delete")}
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
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
      </div>

      {showEditModal && selectedTransaction && (
        <EditTransactionModal
          transaction={selectedTransaction}
          onClose={() => { setShowEditModal(false); setSelectedTransaction(null); }}
          onSuccess={handleEditSuccess}
          isReadOnly={isReadOnly}
        />
      )}

      {showDeleteModal && selectedTransaction && (
        <DeleteConfirmModal
          transaction={selectedTransaction}
          onClose={() => { setShowDeleteModal(false); setSelectedTransaction(null); }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
