import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";

const formatNum = (n, dec = 3) => {
  if (n == null) return "-";
  return Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: dec });
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("tr-TR") : "-");

const getRepName = (r) =>
  r ? (r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : r.username || r.email || "-") : "-";

/* Try multiple field name patterns that the backend might use */
const resolveName = (...candidates) => candidates.find((v) => v && String(v).trim() !== "") || "-";

function InfoRow({ label, value, mono = false, accent }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-text-secondary tracking-wide">{label}</p>
      <p className={`text-sm font-semibold ${accent || "text-text-main"} ${mono ? "font-mono" : ""}`}>
        {value || "-"}
      </p>
    </div>
  );
}

function Section({ icon, title, children, cols = 2 }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
        <span className="material-symbols-outlined text-primary text-base">{icon}</span>
        <span className="text-xs font-semibold text-text-secondary tracking-wider">{title}</span>
      </div>
      <div className={`p-4 grid gap-4 ${
        cols === 3 ? "grid-cols-2 sm:grid-cols-3"
        : cols === 4 ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2"
      }`}>
        {children}
      </div>
    </div>
  );
}

export default function ViewWarehouseModal({ declaration, onClose, onEdit, onTransfer, canEdit, canTransfer }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN";
  const isClientUser = user?.globalRole === "CLIENT_USER";
  const showBroker = isSuperAdmin || isClientUser;

  const statusIsKapandi = declaration.status === "KAPANDI";
  const hasRemaining = declaration.remainingContainerAmount != null || declaration.remainingWeight != null;

  /* Resolve company names from multiple possible field patterns */
  const brokerName = resolveName(
    declaration.brokerCompany?.name,
    declaration.brokerCompanyName,
    declaration.broker?.name,
  );
  const clientName = resolveName(
    declaration.clientCompany?.name,
    declaration.clientCompanyName,
    declaration.client?.name,
    declaration.recipientName,
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 bg-primary/15 rounded-xl">
              <span className="material-symbols-outlined text-primary">warehouse</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main font-mono">{declaration.fileNo}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                  statusIsKapandi
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                    : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                }`}>
                  {statusIsKapandi ? "KAPANDI" : "TESCİL EDİLDİ"}
                </span>
                {declaration.gate && (
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                    declaration.gate === "SARI"
                      ? "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
                      : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
                  }`}>
                    {declaration.gate}
                  </span>
                )}
                <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${
                  declaration.protocol
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                }`}>
                  <span className="material-symbols-outlined text-xs">{declaration.protocol ? "check_circle" : "hourglass_empty"}</span>
                  {declaration.protocol ? "Tutanak Geldi" : "Tutanak Bekliyor"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canTransfer && statusIsKapandi && (
              <button
                onClick={() => { onClose(); onTransfer(declaration); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 transition-colors text-sm font-medium"
              >
                <span className="material-symbols-outlined text-lg">swap_horiz</span>
                <span className="hidden sm:inline">Aktar</span>
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => { onClose(); onEdit(declaration); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 dark:bg-primary/20 text-primary rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors text-sm font-medium"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                <span className="hidden sm:inline">Düzenle</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-text-secondary">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Firma & Alıcı — broker sadece SUPER_ADMIN ve CLIENT_USER için */}
          <Section icon="business" title="FİRMA & ALICI" cols={2}>
            {showBroker && (
              <InfoRow label="Gümrük Firması" value={brokerName} />
            )}
            <InfoRow label="Alıcı Firma" value={clientName} />
            <InfoRow label="Gönderici" value={declaration.senderName} />
          </Section>

          {/* Kayıt Numaraları */}
          <Section icon="badge" title="KAYIT NUMARALARI" cols={2}>
            <InfoRow label="Dosya No" value={declaration.fileNo} mono />
            <InfoRow label="Ant. Beyanname No" value={declaration.declarationNo} mono />
          </Section>

          {/* Lojistik */}
          <Section icon="local_shipping" title="LOJİSTİK BİLGİLERİ" cols={2}>
            <InfoRow label="Antrepo" value={declaration.warehouse} />
            <InfoRow
              label="Gümrük"
              value={resolveName(
                declaration.customs?.customsShortName,
                declaration.customs?.name,
                declaration.customs?.shortName,
                declaration.customsShortName,
              )}
            />
            <InfoRow label="Nakliyeci" value={declaration.carrierName} />
            <InfoRow
              label="Temsilci"
              value={resolveName(
                getRepName(declaration.representative),
                declaration.representativeName,
              )}
            />
          </Section>

          {/* Yük Bilgileri */}
          <Section icon="inventory_2" title="YÜK BİLGİLERİ" cols={hasRemaining ? 4 : 2}>
            <InfoRow label="Kap" value={declaration.containerAmount != null ? String(declaration.containerAmount) : "-"} />
            <InfoRow label="Kilo (Kg)" value={formatNum(declaration.weight)} />
            {hasRemaining && (
              <>
                <InfoRow
                  label="Kalan Kap"
                  value={declaration.remainingContainerAmount != null ? String(declaration.remainingContainerAmount) : "-"}
                  accent="text-amber-600 dark:text-amber-400"
                />
                <InfoRow
                  label="Kalan Kilo (Kg)"
                  value={formatNum(declaration.remainingWeight)}
                  accent="text-amber-600 dark:text-amber-400"
                />
              </>
            )}
          </Section>

          {/* Tarihler */}
          <Section icon="event" title="TARİHLER" cols={2}>
            <InfoRow label="Beyanname Tarihi" value={formatDate(declaration.declarationDate)} />
            <InfoRow label="Pul Ödeme Tarihi" value={formatDate(declaration.stampPaymentDate)} />
          </Section>

          {/* Düşümlü aktarım notu */}
          {statusIsKapandi && hasRemaining && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">info</span>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Bu kayıtta düşümlü aktarım yapılmış, kalan stok yukarıda gösterilmektedir.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0 rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2.5 text-text-secondary hover:text-text-main font-medium transition-colors text-sm">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
