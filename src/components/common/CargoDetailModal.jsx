import {
  getCargoStatus,
  getVehicleType,
  getDocumentDeliveryType,
  PAYMENT_STATUS_OPTIONS,
  formatCurrency,
} from "../../utils/constants";

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("tr-TR") : "-");

// Araç tipine göre birincil tanımlayıcı (B/L, Konteyner, AWB, Plaka)
const getIdentifier = (cargo) => {
  switch (cargo.vehicleType) {
    case "AIRPLANE":
      return { label: "Konşimento (AWB)", value: cargo.consignmentNumber };
    case "SHIP":
      return {
        label: "B/L / Konteyner",
        value:
          cargo.billOfLading ||
          (Array.isArray(cargo.containerNumbers) && cargo.containerNumbers.length > 0
            ? cargo.containerNumbers.join(", ")
            : null),
      };
    case "TRUCK":
      return { label: "Plaka", value: cargo.licensePlate };
    default:
      return { label: "Tanımlayıcı", value: null };
  }
};

const Cost = ({ label, amount, currency }) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
    <p className="text-text-secondary text-sm mb-1">{label}</p>
    <p className="text-text-main font-semibold">
      {amount != null ? formatCurrency(amount, currency || "TRY") : "-"}
    </p>
  </div>
);

export default function CargoDetailModal({ cargo, onClose, onEdit }) {
  if (!cargo) return null;

  const statusInfo = getCargoStatus(cargo.status);
  const vehicle = getVehicleType(cargo.vehicleType);
  const paymentInfo = PAYMENT_STATUS_OPTIONS.find((p) => p.value === cargo.paymentStatus);
  const docType = getDocumentDeliveryType(cargo.documentDeliveryType);
  const identifier = getIdentifier(cargo);

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 bg-primary rounded-full text-white">
              <span className="material-symbols-outlined text-xl">inventory_2</span>
            </div>
            <h2 className="text-text-main text-lg font-bold">Yük Detayları</h2>
            {cargo.isDraft && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                Taslak
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[calc(90vh-160px)] bg-white dark:bg-background-dark">
          {/* Özet satırı */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-3 bg-primary/5 dark:bg-primary/10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">
                  {vehicle?.icon || "local_shipping"}
                </span>
                <span className="text-sm font-bold text-text-main">
                  {vehicle?.displayName || cargo.vehicleType || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {statusInfo && (
                  <span className={`px-3 py-0.5 text-xs font-semibold rounded-full ${statusInfo.badgeClass}`}>
                    {statusInfo.displayName?.toUpperCase()}
                  </span>
                )}
                {paymentInfo && (
                  <span className={paymentInfo.badgeClass}>{paymentInfo.label}</span>
                )}
              </div>
            </div>
            {/* Key info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800/40">
              <div className="px-6 py-3">
                <p className="text-xs text-text-secondary mb-0.5">Alıcı Firma</p>
                <p className="text-sm font-semibold text-text-main truncate">
                  {(cargo.clientCompany?.shortName || cargo.clientCompany?.name || "-").toUpperCase()}
                </p>
              </div>
              <div className="px-6 py-3">
                <p className="text-xs text-text-secondary mb-0.5">{identifier.label}</p>
                <p className="text-sm font-semibold text-text-main truncate">{identifier.value || "-"}</p>
              </div>
              <div className="px-6 py-3">
                <p className="text-xs text-text-secondary mb-0.5">Tahmini Varış (ETA)</p>
                <p className="text-sm font-semibold text-text-main">{formatDate(cargo.estimatedArrivalDate)}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Gönderici Firma</p>
                <p className="text-text-main font-semibold">{cargo.senderCompany || "-"}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Taşıyıcı</p>
                <p className="text-text-main font-semibold">{cargo.carrierName || "-"}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Kap</p>
                <p className="text-text-main font-semibold">{cargo.containerCount ?? "-"}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Ağırlık</p>
                <p className="text-text-main font-semibold">
                  {cargo.weightKg != null ? `${Number(cargo.weightKg).toLocaleString("tr-TR")} kg` : "-"}
                </p>
              </div>

              <Cost label="Lokal" amount={cargo.lokalAmount} currency={cargo.lokalCurrency} />
              <Cost label="Depozito" amount={cargo.depositoAmount} currency={cargo.depositoCurrency} />
              <Cost label="Ordino" amount={cargo.ordinoAmount} currency={cargo.ordinoCurrency} />

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Evrak Teslim</p>
                <p className="text-text-main font-semibold">
                  {docType?.label || "-"}
                  {cargo.documentReceiver ? ` · ${cargo.documentReceiver}` : ""}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                <p className="text-text-secondary text-sm mb-1">Varış Tarihi</p>
                <p className="text-text-main font-semibold">{formatDate(cargo.cargoArrivalDate)}</p>
              </div>

              {cargo.transportInfo && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 col-span-full transition-colors">
                  <p className="text-text-secondary text-sm mb-1">Taşıma Bilgisi</p>
                  <p className="text-text-main whitespace-pre-wrap">{cargo.transportInfo}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
          <button
            onClick={onClose}
            className="w-full md:w-auto px-6 py-2 text-text-secondary hover:text-text-main font-medium transition-colors"
          >
            Kapat
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(cargo)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
              Yükü Düzenle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
