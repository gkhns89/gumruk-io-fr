import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TransactionDetailModal from "../common/TransactionDetailModal";
import ViewWarehouseModal from "../warehouse/ViewWarehouseModal";
import { useEdgeScroll } from "../../hooks/useEdgeScroll";
import { getCargoStatus, VEHICLE_TYPES } from "../../utils/constants";

// Birleşik tablo: satır türü ikonu (İşlem → ithalat, Antrepo → depo) + tooltip
const getTypeInfo = (kind) =>
  kind === "warehouse"
    ? { icon: "warehouse", label: "Antrepo", className: "text-indigo-600 dark:text-indigo-400" }
    : { icon: "input", label: "İşlem (İthalat)", className: "text-blue-600 dark:text-blue-400" };

// Hat göstergesi: renkli yuvarlak (Sarı / Kırmızı) + tooltip
const getGateDot = (gate) => {
  if (gate === "SARI") return { color: "bg-yellow-400", label: "Sarı Hat" };
  if (gate === "KIRMIZI") return { color: "bg-red-500", label: "Kırmızı Hat" };
  return null;
};

// Antrepo durum badge (TESCIL_EDILDI / KAPANDI)
const getWarehouseStatusBadge = (status) => {
  const map = {
    TESCIL_EDILDI: { label: "TESCİL EDİLDİ", className: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700" },
    KAPANDI:       { label: "KAPANDI",       className: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700" },
  };
  return map[status] || { label: status, className: "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600" };
};

// İşlem durumu - sol border rengi
const getStatusRowStyle = (status) => {
  const statusStyles = {
    PENDING:      { border: "border-l-4 border-l-sky-400" },
    REGISTERED:   { border: "border-l-4 border-l-amber-400" },
    INSPECTION:   { border: "border-l-4 border-l-purple-400" },
    CP_COMPLETED: { border: "border-l-4 border-l-orange-700" },
    WITHDRAWN:    { border: "border-l-4 border-l-green-500 bg-red-50 dark:bg-red-900/30" },
    CANCELLED:    { border: "border-l-4 border-l-rose-500" },
  };
  return statusStyles[status] || { border: "border-l-4 border-l-gray-300" };
};

// İşlem durumu badge
const getStatusBadgeClass = (status) => {
  const statusMap = {
    PENDING:      { color: "pending",    label: "BEKLİYOR" },
    REGISTERED:   { color: "registered", label: "TESCİL EDİLDİ" },
    INSPECTION:   { color: "inspection", label: "MUAYENEDE" },
    CP_COMPLETED: { color: "completed",  label: "TAMAMLANDI" },
    WITHDRAWN:    { color: "withdrawn",  label: "ÇEKİLDİ" },
    CANCELLED:    { color: "cancelled",  label: "İPTAL" },
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

export default function TransactionsTable({
  transactions,
  loading,
  error,
  onRetry,
  recentCargo = [],
  cargoLoading = false,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("transactions");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  const { containerRef: txScrollRef, scrollDirection: txScrollDir } = useEdgeScroll({
    edgeZoneWidth: 25,
    scrollSpeed: 10,
    enableOnTouch: false,
  });

  const { containerRef: cargoScrollRef, scrollDirection: cargoScrollDir } = useEdgeScroll({
    edgeZoneWidth: 25,
    scrollSpeed: 10,
    enableOnTouch: false,
  });

  const handleRowClick = (item, event) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    const target = event.target;
    if (target.tagName === "BUTTON" || target.closest("button")) return;
    openDetail(item);
  };

  const openDetail = (item) => {
    if (item.kind === "warehouse") setSelectedWarehouse(item);
    else setSelectedTransaction(item);
  };

  const handleCloseModal = () => setSelectedTransaction(null);

  // ---------- Tab Bar ----------
  const TabBar = () => (
    <>
    {/* Mobil: başlık taşmasın diye sekme seçimi combobox */}
    <div className="sm:hidden mb-3">
      <label className="sr-only" htmlFor="dashboard-tab-select">Sekme seç</label>
      <select
        id="dashboard-tab-select"
        value={activeTab}
        onChange={(e) => setActiveTab(e.target.value)}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-background-dark text-text-main dark:text-gray-200 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <option value="transactions">Son İşlemler ({!loading && transactions ? transactions.length : 0})</option>
        <option value="cargo">Son Yükler ({!cargoLoading && recentCargo ? recentCargo.length : 0})</option>
      </select>
    </div>

    {/* Masaüstü: mevcut sekme çubuğu */}
    <div className="hidden sm:flex items-end gap-0 border-b border-gray-200 dark:border-gray-700 mb-0">
      {/* Son İşlemler */}
      <button
        onClick={() => setActiveTab("transactions")}
        className={`
          flex items-center gap-2 px-4 pb-3 pt-2 text-sm font-semibold
          border-b-2 transition-all duration-200 whitespace-nowrap
          ${activeTab === "transactions"
            ? "border-primary text-primary dark:text-primary-light dark:border-primary-light"
            : "border-transparent text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
          }
        `}
      >
        <span className="material-symbols-outlined text-[18px]">description</span>
        Son İşlemler
        {!loading && transactions && (
          <span className={`
            px-1.5 py-0.5 rounded-full text-[11px] font-bold
            ${activeTab === "transactions"
              ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }
          `}>
            {transactions.length}
          </span>
        )}
      </button>

      {/* Son Yükler */}
      <button
        onClick={() => setActiveTab("cargo")}
        className={`
          flex items-center gap-2 px-4 pb-3 pt-2 text-sm font-semibold
          border-b-2 transition-all duration-200 whitespace-nowrap
          ${activeTab === "cargo"
            ? "border-primary text-primary dark:text-primary-light dark:border-primary-light"
            : "border-transparent text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
          }
        `}
      >
        <span className="material-symbols-outlined text-[18px]">inventory_2</span>
        Son Yükler
        {!cargoLoading && recentCargo && (
          <span className={`
            px-1.5 py-0.5 rounded-full text-[11px] font-bold
            ${activeTab === "cargo"
              ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }
          `}>
            {recentCargo.length}
          </span>
        )}
      </button>

      {/* Sağ taraf boşluk + sayaç */}
      <div className="flex-1 flex items-center justify-end pb-3 pt-2 pr-1">
        {activeTab === "transactions" && !loading && transactions && (
          <span className="text-text-secondary dark:text-gray-500 text-xs">
            {transactions.length} işlem gösteriliyor
          </span>
        )}
        {activeTab === "cargo" && !cargoLoading && recentCargo && (
          <span className="text-text-secondary dark:text-gray-500 text-xs">
            {recentCargo.length} yük gösteriliyor
          </span>
        )}
      </div>
    </div>
    </>
  );

  // ---------- Yükler Sekmesi ----------
  const renderCargoContent = () => {
    if (cargoLoading) {
      return (
        <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-text-secondary dark:text-gray-400">Yükler yükleniyor...</p>
        </div>
      );
    }

    if (!recentCargo || recentCargo.length === 0) {
      return (
        <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
          <span className="material-symbols-outlined text-6xl text-text-secondary dark:text-gray-600">inventory_2</span>
          <div className="text-center">
            <p className="text-text-main dark:text-gray-200 font-semibold mb-2">Henüz Yük Yok</p>
            <p className="text-text-secondary dark:text-gray-400 text-sm">
              Yük takip kayıtlarınız burada görüntülenecektir.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-300 relative">
        {cargoScrollDir && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-30">
            <div className="bg-black/10 dark:bg-white/10 backdrop-blur-sm rounded-full p-2 shadow-2xl">
              <div className="bg-white dark:bg-gray-800 rounded-full p-6 shadow-lg animate-pulse w-20 h-20 flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-primary font-bold">
                  {cargoScrollDir === "left" ? "arrow_back" : "arrow_forward"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={cargoScrollRef} className="overflow-x-auto">
          {cargoScrollDir && (
            <div
              className="absolute inset-0 bg-black/10 dark:bg-white/10 pointer-events-none z-10"
              style={{ width: "100%", minWidth: "max-content" }}
            />
          )}
          <table className="w-full text-left relative">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Araç Tipi</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">ETA</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Alıcı Firma</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Gönderici</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Detaylar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentCargo.map((cargoItem) => {
                const statusInfo = getCargoStatus(cargoItem.status);
                const vehicleType = VEHICLE_TYPES.find((v) => v.value === cargoItem.vehicleType);
                const borderClass = statusInfo
                  ? `border-l-4 ${statusInfo.borderClass}`
                  : "border-l-4 border-l-gray-300 dark:border-l-gray-600";

                return (
                  <tr
                    key={cargoItem.id}
                    onClick={() => navigate("/cargo")}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${borderClass} transition-colors cursor-pointer`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo?.badgeClass || "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                        {statusInfo?.displayName?.toUpperCase() || cargoItem.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-lg">
                          {vehicleType?.icon || "local_shipping"}
                        </span>
                        <span className="text-sm text-text-main dark:text-gray-300">
                          {vehicleType?.displayName || cargoItem.vehicleType || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">
                      {cargoItem.estimatedArrivalDate
                        ? new Date(cargoItem.estimatedArrivalDate).toLocaleDateString("tr-TR")
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-300 font-medium">
                      {(cargoItem.clientCompany?.shortName || cargoItem.clientCompany?.name || "-").toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">
                      {cargoItem.senderCompany || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate("/cargo"); }}
                        className="flex items-center gap-1 text-primary hover:text-primary/80 dark:text-primary-light dark:hover:text-primary-light/80 transition-colors cursor-pointer"
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
    );
  };

  // ---------- İşlemler Sekmesi ----------
  const renderTransactionsContent = () => {
    if (loading) {
      return (
        <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-text-secondary dark:text-gray-400">İşlemler yükleniyor...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
          <span className="material-symbols-outlined text-6xl text-red-500">error</span>
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Bir Hata Oluştu</p>
            <p className="text-text-secondary dark:text-gray-400 text-sm mb-4">{error}</p>
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

    if (!transactions || transactions.length === 0) {
      return (
        <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
          <span className="material-symbols-outlined text-6xl text-text-secondary dark:text-gray-600">inbox</span>
          <div className="text-center">
            <p className="text-text-main dark:text-gray-200 font-semibold mb-2">Henüz İşlem Yok</p>
            <p className="text-text-secondary dark:text-gray-400 text-sm">
              Gümrük işlemleriniz burada görüntülenecektir.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-300 relative">
        {txScrollDir && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-30">
            <div className="bg-black/10 dark:bg-white/10 backdrop-blur-sm rounded-full p-2 shadow-2xl">
              <div className="bg-white dark:bg-gray-800 rounded-full p-6 shadow-lg animate-pulse w-20 h-20 flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-primary font-bold">
                  {txScrollDir === "left" ? "arrow_back" : "arrow_forward"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={txScrollRef} className="overflow-x-auto">
          {txScrollDir && (
            <div
              className="absolute inset-0 bg-black/10 dark:bg-white/10 pointer-events-none z-10"
              style={{ width: "100%", minWidth: "max-content" }}
            />
          )}
          <table className="w-full text-left relative">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Tür</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Dosya No</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Beyanname No</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Alıcı Firma</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Gönderici Firma</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Hat</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-xs font-semibold text-text-main dark:text-gray-400 uppercase tracking-wider">Detaylar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((item) => {
                const isWarehouse = item.kind === "warehouse";
                const statusInfo = isWarehouse
                  ? getWarehouseStatusBadge(item.status)
                  : getStatusBadgeClass(item.status);
                const typeInfo = getTypeInfo(item.kind);
                // Tür bazlı satır accent: işlem → durum rengi, antrepo → indigo
                const rowBorder = isWarehouse
                  ? "border-l-4 border-l-indigo-400"
                  : getStatusRowStyle(item.status).border;
                const gateDot = getGateDot(item.gate);
                const declarationNo = isWarehouse ? item.declarationNo : item.declarationNumber;

                return (
                  <tr
                    key={`${item.kind}-${item.id}`}
                    onClick={(e) => handleRowClick(item, e)}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${rowBorder} transition-colors cursor-pointer`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span title={typeInfo.label} aria-label={typeInfo.label} className="inline-flex">
                        <span className={`material-symbols-outlined text-xl ${typeInfo.className}`}>
                          {typeInfo.icon}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main dark:text-gray-200 font-medium">
                      {item.fileNo || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">
                      {declarationNo || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">
                      {item.clientCompany?.name || item.recipientName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-gray-400">
                      {item.senderCompany?.name || item.senderName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {gateDot ? (
                        <span title={gateDot.label} aria-label={gateDot.label} className="inline-flex items-center">
                          <span className={`w-3.5 h-3.5 rounded-full ${gateDot.color} ring-2 ring-white dark:ring-gray-800 shadow-sm`} />
                        </span>
                      ) : (
                        <span className="text-sm text-text-secondary dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex justify-center text-xs leading-5 font-semibold rounded-full min-w-[140px] ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openDetail(item)}
                        className="flex items-center gap-1 text-primary hover:text-primary/80 dark:text-primary-light dark:hover:text-primary-light/80 transition-colors cursor-pointer"
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
    );
  };

  // ---------- Ana Render ----------
  return (
    <>
      <TabBar />

      <div className="mt-4">
        {activeTab === "transactions" ? renderTransactionsContent() : renderCargoContent()}
      </div>

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

      {selectedWarehouse && (
        <ViewWarehouseModal
          declaration={selectedWarehouse}
          onClose={() => setSelectedWarehouse(null)}
        />
      )}
    </>
  );
}
