import { useState, useEffect } from "react";
import { warehouseService } from "../../api/warehouseService";
import { showSuccess, showError } from "../../utils/toastUtils";

const formatNum = (n, dec = 3) => {
  if (n == null) return "-";
  return Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: dec });
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("tr-TR") : "-");

export default function TransferToTransactionModal({ declaration, onClose, onSuccess }) {
  const effectiveContainer = declaration.remainingContainerAmount ?? declaration.containerAmount;
  const effectiveWeight    = declaration.remainingWeight          ?? declaration.weight;

  const [transferType, setTransferType] = useState("FULL");
  const [fileNo, setFileNo] = useState("");
  const [partialContainer, setPartialContainer] = useState("");
  const [partialWeight, setPartialWeight] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const isPartial = transferType === "PARTIAL";

  const displayContainer = isPartial ? (partialContainer || "—") : formatNum(effectiveContainer, 0);
  const displayWeight    = isPartial ? (partialWeight    || "—") : formatNum(effectiveWeight);

  const validate = () => {
    const errors = {};
    if (!fileNo.trim()) errors.fileNo = "Dosya No zorunludur";
    if (isPartial) {
      const cap = Number(partialContainer);
      const kg  = Number(partialWeight);
      if (!partialContainer || isNaN(cap) || cap <= 0) errors.partialContainer = "Geçerli bir kap miktarı girin";
      else if (cap > effectiveContainer) errors.partialContainer = `En fazla ${effectiveContainer} kap aktarabilirsiniz`;
      if (!partialWeight || isNaN(kg) || kg <= 0) errors.partialWeight = "Geçerli bir kilo girin";
      else if (kg > effectiveWeight) errors.partialWeight = `En fazla ${formatNum(effectiveWeight)} kg aktarabilirsiniz`;
    }
    return errors;
  };

  const handleTransfer = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      const payload = {
        fileNo: fileNo.trim().toUpperCase(),
        transferType,
        transferredContainerAmount: isPartial ? Number(partialContainer) : null,
        transferredWeight:          isPartial ? Number(partialWeight)    : null,
      };
      const result = await warehouseService.transfer(declaration.id, payload);
      if (result.success) {
        showSuccess(`İşlem Takip'e aktarıldı — Dosya No: ${result.fileNo || fileNo.trim().toUpperCase()}`);
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
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!loading) handleTransfer();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose]);

  const inputCls = (field) =>
    `w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-500 text-sm bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors ${
      fieldErrors[field]
        ? "border-red-400 dark:border-red-500"
        : "border-gray-300 dark:border-gray-600"
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl w-full max-w-3xl animate-zoom-in transition-colors duration-300 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/10 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-11 w-11 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">output</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main">İşlem Takip'e Aktar</h2>
              <p className="text-text-secondary text-sm">Antrepo kaydından işlem takibine veri aktarımı</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Antrepo Kayıt Özeti — 2 kolon grid */}
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-text-secondary text-base">warehouse</span>
              <span className="text-xs font-semibold text-text-secondary tracking-wider">ANTREPO KAYIT BİLGİLERİ</span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-text-secondary mb-1">Dosya No</p>
                <p className="font-bold text-text-main font-mono">{declaration.fileNo}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Beyanname No</p>
                <p className="font-semibold text-text-main">{declaration.declarationNo || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Gümrük</p>
                <p className="font-semibold text-text-main">{declaration.customs?.customsShortName || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Alıcı</p>
                <p className="font-semibold text-text-main truncate" title={declaration.recipientName}>{declaration.recipientName || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Gönderici</p>
                <p className="font-semibold text-text-main truncate" title={declaration.senderName}>{declaration.senderName || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Antrepo</p>
                <p className="font-semibold text-text-main truncate" title={declaration.warehouse}>{declaration.warehouse || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Beyan Tarihi</p>
                <p className="font-semibold text-text-main">{formatDate(declaration.declarationDate)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Hat</p>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  declaration.gate === "SARI"
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                    : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                }`}>{declaration.gate || "-"}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-text-secondary mb-1">Mevcut Stok</p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sm font-bold text-text-main">
                    <span className="material-symbols-outlined text-text-secondary text-base">inventory_2</span>
                    {effectiveContainer ?? "-"} kap
                  </span>
                  <span className="text-text-secondary text-xs">/</span>
                  <span className="flex items-center gap-1 text-sm font-bold text-text-main">
                    <span className="material-symbols-outlined text-text-secondary text-base">scale</span>
                    {formatNum(effectiveWeight)} kg
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Aktarım Tipi */}
          <div>
            <p className="text-sm font-semibold text-text-main mb-3">Aktarım Tipi</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "FULL",    icon: "move_to_inbox", label: "Tamamı",  desc: "Kalan tüm stok aktarılır" },
                { value: "PARTIAL", icon: "call_split",    label: "Düşümlü", desc: "Kısmi miktar belirleyin" },
              ].map(({ value, icon, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setTransferType(value); setFieldErrors({}); }}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    transferType === value
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className={`flex items-center justify-center h-10 w-10 rounded-xl flex-shrink-0 ${
                    transferType === value ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-gray-100 dark:bg-gray-700"
                  }`}>
                    <span className={`material-symbols-outlined text-2xl ${transferType === value ? "text-emerald-600 dark:text-emerald-400" : "text-text-secondary"}`}>
                      {icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${transferType === value ? "text-emerald-700 dark:text-emerald-300" : "text-text-main"}`}>{label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
                  </div>
                  {transferType === value && (
                    <span className="material-symbols-outlined text-emerald-500 text-xl flex-shrink-0">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Düşümlü Miktar Girişi */}
          {isPartial && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-text-secondary tracking-wide mb-1.5">
                  Kap Miktarı <span className="text-red-500">*</span>
                  <span className="font-normal text-text-secondary ml-1">(max: {effectiveContainer})</span>
                </label>
                <input
                  type="number" min="1" max={effectiveContainer} value={partialContainer}
                  onChange={(e) => { setPartialContainer(e.target.value); if (fieldErrors.partialContainer) setFieldErrors((p) => ({ ...p, partialContainer: "" })); }}
                  placeholder="Kap adedi"
                  className={inputCls("partialContainer")}
                />
                {fieldErrors.partialContainer && <p className="text-red-500 text-xs mt-1">{fieldErrors.partialContainer}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary tracking-wide mb-1.5">
                  Kilo (kg) <span className="text-red-500">*</span>
                  <span className="font-normal text-text-secondary ml-1">(max: {formatNum(effectiveWeight)})</span>
                </label>
                <input
                  type="number" min="0.001" step="0.001" max={effectiveWeight} value={partialWeight}
                  onChange={(e) => { setPartialWeight(e.target.value); if (fieldErrors.partialWeight) setFieldErrors((p) => ({ ...p, partialWeight: "" })); }}
                  placeholder="Kilo (örn: 1250.500)"
                  className={inputCls("partialWeight")}
                />
                {fieldErrors.partialWeight && <p className="text-red-500 text-xs mt-1">{fieldErrors.partialWeight}</p>}
              </div>
            </div>
          )}

          {/* İşlem Takip Dosya No */}
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              İşlem Takip Dosya No <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fileNo}
              onChange={(e) => { setFileNo(e.target.value.toUpperCase()); if (fieldErrors.fileNo) setFieldErrors((p) => ({ ...p, fileNo: "" })); }}
              placeholder="İşlem Takip'teki dosya numarasını girin"
              className={inputCls("fileNo")}
            />
            {fieldErrors.fileNo && <p className="text-red-500 text-xs mt-1">{fieldErrors.fileNo}</p>}
          </div>

          {/* Aktarım Özeti */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base">summarize</span>
              <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 tracking-wider">AKTARILACAK BİLGİLER</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">Yeni Dosya No</p>
                <p className="font-bold text-text-main font-mono">{fileNo.trim().toUpperCase() || "—"}</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">Alıcı</p>
                <p className="font-semibold text-text-main truncate">{declaration.recipientName || "-"}</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">Gönderici</p>
                <p className="font-semibold text-text-main truncate">{declaration.senderName || "-"}</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">Aktarılacak Kap</p>
                <p className="font-bold text-emerald-700 dark:text-emerald-300 text-base">{displayContainer}</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">Aktarılacak Kilo</p>
                <p className="font-bold text-emerald-700 dark:text-emerald-300 text-base">{displayWeight} kg</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-1">İşlem Takip Durumu</p>
                <span className="inline-flex px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">BEKLİYOR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-6 py-2.5 text-text-secondary hover:text-text-main font-medium transition-colors disabled:opacity-50">
            Vazgeç
          </button>
          <button
            onClick={handleTransfer}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">output</span>
            {loading ? "Aktarılıyor..." : "Aktar"}
          </button>
        </div>
      </div>
    </div>
  );
}
