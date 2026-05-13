import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { warehouseService } from "../../api/warehouseService";
import { transactionService } from "../../api/transactionService";
import { companyService } from "../../api/companyService";
import { customsService } from "../../api/customsService";
import { employeeService } from "../../api/employeeService";
import { GATE_OPTIONS } from "../../utils/constants";
import { toUpperCase } from "../../utils/textUtils";
import { showSuccess, showError } from "../../utils/toastUtils";
import { useDropdownKeyboard } from "../../hooks/useDropdownKeyboard";
import AgreementInfoPanel from "../agreements/AgreementInfoPanel";

const today = new Date().toISOString().split("T")[0];

const getRepName = (r) =>
  r ? (r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : r.username || r.email || "") : "";

/* ─── Module-level UI primitives ─── */

const getIc = (hasError) =>
  `w-full h-11 px-3 pr-8 rounded-lg border text-sm text-text-main dark:text-gray-100 bg-white dark:bg-gray-800 transition-colors focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
    hasError
      ? "border-red-400 dark:border-red-500 focus:ring-red-400"
      : "border-gray-300 dark:border-gray-600 focus:ring-amber-400 focus:border-amber-400"
  }`;

function FieldLabel({ text, required, note }) {
  return (
    <label className="block text-xs font-semibold text-text-secondary tracking-wide mb-1.5">
      {text}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {note && <span className="text-xs text-text-secondary font-normal tracking-normal ml-1.5">{note}</span>}
    </label>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
      <span className="material-symbols-outlined text-xs">error</span>
      {msg}
    </p>
  );
}

function DdList({ items, onSelect, highlightIdx, emptyText, ddId, renderItem }) {
  return (
    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-56 overflow-y-auto">
      {items.length === 0 ? (
        <div className="p-4 text-center text-text-secondary text-sm">{emptyText}</div>
      ) : (
        items.map((item, idx) => (
          <button
            key={typeof item === "object" ? item.id : item}
            type="button"
            data-dropdown-id={ddId}
            data-dropdown-index={idx}
            onMouseDown={() => onSelect(item)}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${
              idx === highlightIdx ? "bg-amber-50 dark:bg-amber-900/20 text-text-main" : "hover:bg-gray-50 dark:hover:bg-gray-700 text-text-main"
            }`}
          >
            {renderItem(item)}
          </button>
        ))
      )}
    </div>
  );
}

function AutoField({ containerId, ddId, label, required, note, value, onChange, onFocus, showDd, filtered, kbHook, onSelect, error }) {
  const notExact = value.trim() && !filtered.some((s) => s.toLowerCase() === value.toLowerCase());
  return (
    <div>
      <FieldLabel text={label} required={required} note={note} />
      <div className="relative" id={containerId}>
        <input
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onKeyDown={kbHook.handleKeyDown}
          placeholder={`${label} girin veya seçin`}
          autoComplete="off"
          className={getIc(!!error)}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { onChange({ target: { value: "" } }); onFocus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined text-base">{value ? "close" : "expand_more"}</span>
        </button>
        {showDd && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-56 overflow-y-auto">
            {notExact && (
              <button
                type="button"
                onMouseDown={() => onSelect(value.trim())}
                className="w-full text-left px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                <span>Yeni ekle: <strong>{toUpperCase(value.trim())}</strong></span>
              </button>
            )}
            {filtered.length === 0 && !notExact ? (
              <div className="p-4 text-center text-text-secondary text-sm">Kayıtlı {label.toLowerCase()} bulunamadı</div>
            ) : (
              filtered.map((s, idx) => (
                <button
                  key={s}
                  type="button"
                  data-dropdown-id={ddId}
                  data-dropdown-index={idx}
                  onMouseDown={() => onSelect(s)}
                  className={`w-full text-left px-4 py-2.5 text-sm text-text-main transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${
                    idx === kbHook.highlightedIndex ? "bg-amber-50 dark:bg-amber-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {s}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
      <span className="material-symbols-outlined text-amber-500 text-base">{icon}</span>
      <span className="text-xs font-semibold text-text-secondary tracking-wider">{title}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

export default function EditWarehouseModal({ declaration, onClose, onSuccess }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN";
  const brokerId = declaration.brokerCompany?.id;

  const [formData, setFormData] = useState({
    brokerCompanyId: brokerId || "",
    clientCompanyId: declaration.clientCompany?.id || "",
    fileNo: declaration.fileNo || "",
    declarationNo: declaration.declarationNo || "",
    recipientName: declaration.recipientName || "",
    senderName: declaration.senderName || "",
    warehouse: declaration.warehouse || "",
    customsId: declaration.customs?.id || "",
    containerAmount: declaration.containerAmount || "",
    weight: declaration.weight || "",
    carrierName: declaration.carrierName || "",
    representativeId: declaration.representative?.id || "",
    gate: declaration.gate || "",
    declarationDate: declaration.declarationDate || "",
    stampPaymentDate: declaration.stampPaymentDate || "",
    protocol: declaration.protocol || false,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  /* ── Broker (SUPER_ADMIN only) ── */
  const [availableBrokers, setAvailableBrokers] = useState([]);
  const [filteredBrokers, setFilteredBrokers] = useState([]);
  const [brokerSearch, setBrokerSearch] = useState(declaration.brokerCompany?.name || "");
  const [showBrokerDd, setShowBrokerDd] = useState(false);
  const [loadingBrokers, setLoadingBrokers] = useState(false);

  /* ── Client ── */
  const [availableClients, setAvailableClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientSearch, setClientSearch] = useState(declaration.clientCompany?.name || "");
  const [showClientDd, setShowClientDd] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientAgreements, setClientAgreements] = useState({});
  const [selectedClientAgreement, setSelectedClientAgreement] = useState(null);

  /* ── Customs ── */
  const [availableCustoms, setAvailableCustoms] = useState([]);
  const [filteredCustoms, setFilteredCustoms] = useState([]);
  const [customsSearch, setCustomsSearch] = useState(declaration.customs?.customsShortName || "");
  const [showCustomsDd, setShowCustomsDd] = useState(false);

  /* ── Autocomplete ── */
  const [senderSuggestions, setSenderSuggestions] = useState([]);
  const [filteredSenders, setFilteredSenders] = useState([]);
  const [senderSearch, setSenderSearch] = useState(declaration.senderName || "");
  const [showSenderDd, setShowSenderDd] = useState(false);

  const [whSuggestions, setWhSuggestions] = useState([]);
  const [filteredWh, setFilteredWh] = useState([]);
  const [whSearch, setWhSearch] = useState(declaration.warehouse || "");
  const [showWhDd, setShowWhDd] = useState(false);

  const [carrierSuggestions, setCarrierSuggestions] = useState([]);
  const [filteredCarriers, setFilteredCarriers] = useState([]);
  const [carrierSearch, setCarrierSearch] = useState(declaration.carrierName || "");
  const [showCarrierDd, setShowCarrierDd] = useState(false);

  /* ── Representatives ── */
  const [representatives, setRepresentatives] = useState([]);
  const [filteredReps, setFilteredReps] = useState([]);
  const [repSearch, setRepSearch] = useState(getRepName(declaration.representative));
  const [showRepDd, setShowRepDd] = useState(false);

  const clearErr = (f) => setFieldErrors((p) => ({ ...p, [f]: null }));

  /* ── Keyboard hooks ── */
  const brokerKb  = useDropdownKeyboard(showBrokerDd,  filteredBrokers,  (b) => selectBroker(b),  () => setShowBrokerDd(false),  "edit-wh-broker-dd");
  const clientKb  = useDropdownKeyboard(showClientDd,  filteredClients,  (c) => selectClient(c),  () => setShowClientDd(false),  "edit-wh-client-dd");
  const customsKb = useDropdownKeyboard(showCustomsDd, filteredCustoms, (c) => selectCustoms(c), () => setShowCustomsDd(false), "edit-wh-customs-dd");
  const senderKb  = useDropdownKeyboard(showSenderDd,  filteredSenders,  (s) => selectSender(s),  () => setShowSenderDd(false),  "edit-wh-sender-dd");
  const whKb      = useDropdownKeyboard(showWhDd,      filteredWh,      (w) => selectWh(w),      () => setShowWhDd(false),      "edit-wh-wh-dd");
  const carrierKb = useDropdownKeyboard(showCarrierDd, filteredCarriers, (c) => selectCarrier(c), () => setShowCarrierDd(false), "edit-wh-carrier-dd");
  const repKb     = useDropdownKeyboard(showRepDd,     filteredReps,
    (r) => { setFormData((p) => ({ ...p, representativeId: r.id })); setRepSearch(getRepName(r)); setShowRepDd(false); clearErr("representativeId"); },
    () => setShowRepDd(false), "edit-wh-rep-dd");

  /* ── Selectors ── */
  const selectBroker = (b) => {
    setFormData((p) => ({ ...p, brokerCompanyId: b.id, clientCompanyId: "", recipientName: "", representativeId: "" }));
    setBrokerSearch(b.name);
    setShowBrokerDd(false);
    setClientSearch(""); setFilteredClients([]); setAvailableClients([]);
    setRepSearch(""); setFilteredReps([]); setRepresentatives([]);
    setSelectedClientAgreement(null);
    clearErr("brokerCompanyId");
    // reload clients and reps for new broker
    setLoadingClients(true);
    companyService.getClientCompanies(b.id).then((r) => {
      if (r?.success) {
        setAvailableClients(r.data);
        setFilteredClients(r.data.slice(0, 100));
        const agMap = {};
        r.data.forEach((c) => { if (c.agreementId) agMap[c.id] = { agreementId: c.agreementId, agreementStatus: c.agreementStatus, agreementStartDate: c.agreementStartDate, agreementEndDate: c.agreementEndDate, documentPath: c.documentPath }; });
        setClientAgreements(agMap);
      }
      setLoadingClients(false);
    });
    employeeService.getEmployees(b.id).then((r) => {
      if (r?.success) { setRepresentatives(r.data); setFilteredReps(r.data.slice(0, 100)); }
    });
  };

  const selectClient = (c) => {
    setFormData((p) => ({ ...p, clientCompanyId: c.id, recipientName: toUpperCase(c.shortName || c.name || "") }));
    setClientSearch(c.name);
    setShowClientDd(false);
    setSelectedClientAgreement(clientAgreements[c.id] || null);
    clearErr("clientCompanyId");
  };

  const selectCustoms = (c) => {
    setFormData((p) => ({ ...p, customsId: c.id }));
    setCustomsSearch(c.customsShortName);
    setShowCustomsDd(false);
    clearErr("customsId");
  };

  const selectSender  = (s) => { const v = toUpperCase(s); setFormData((p) => ({ ...p, senderName: v }));   setSenderSearch(v);  setShowSenderDd(false);  clearErr("senderName"); };
  const selectWh      = (w) => { const v = toUpperCase(w); setFormData((p) => ({ ...p, warehouse: v }));     setWhSearch(v);      setShowWhDd(false);      clearErr("warehouse"); };
  const selectCarrier = (c) => { const v = toUpperCase(c); setFormData((p) => ({ ...p, carrierName: v }));   setCarrierSearch(v); setShowCarrierDd(false); clearErr("carrierName"); };

  /* ── Initial load ── */
  useEffect(() => {
    customsService.getActiveCustoms().then((r) => {
      if (r?.success) { setAvailableCustoms(r.data); setFilteredCustoms(r.data.slice(0, 50)); }
    });

    if (isSuperAdmin) {
      setLoadingBrokers(true);
      companyService.getAllBrokerCompanies().then((r) => {
        if (r?.success) { setAvailableBrokers(r.data); setFilteredBrokers(r.data.slice(0, 100)); }
        setLoadingBrokers(false);
      });
    }

    if (brokerId) {
      setLoadingClients(true);
      companyService.getClientCompanies(brokerId).then((r) => {
        if (r?.success) {
          setAvailableClients(r.data);
          setFilteredClients(r.data.slice(0, 100));
          const agMap = {};
          r.data.forEach((c) => {
            if (c.agreementId) {
              agMap[c.id] = {
                agreementId: c.agreementId,
                agreementStatus: c.agreementStatus,
                agreementStartDate: c.agreementStartDate,
                agreementEndDate: c.agreementEndDate,
                documentPath: c.documentPath,
              };
            }
          });
          setClientAgreements(agMap);
          /* Fix: initialize clientSearch and clientCompanyId from loaded list */
          const clientIdTarget = declaration.clientCompany?.id || declaration.clientCompanyId;
          const currentClient = r.data.find((c) => c.id === Number(clientIdTarget));
          if (currentClient) {
            setClientSearch(currentClient.name);
            setFormData((p) => ({ ...p, clientCompanyId: currentClient.id }));
            setSelectedClientAgreement(agMap[currentClient.id] || null);
          } else if (declaration.clientCompany?.id) {
            setSelectedClientAgreement(agMap[declaration.clientCompany.id] || null);
          }
        }
        setLoadingClients(false);
      });

      employeeService.getEmployees(brokerId).then((r) => {
        if (r?.success) {
          setRepresentatives(r.data);
          setFilteredReps(r.data.slice(0, 100));
          /* Fix: initialize repSearch from loaded employees list */
          const currentRep = r.data.find((emp) => emp.id === declaration.representative?.id);
          if (currentRep) {
            setRepSearch(getRepName(currentRep));
            setFormData((p) => ({ ...p, representativeId: currentRep.id }));
          }
        }
      });
    }

    Promise.all([
      transactionService.getAllTransactions().catch(() => null),
      warehouseService.getAll().catch(() => null),
    ]).then(([txRes, whRes]) => {
      const senders = new Set();
      const whs = new Set();
      const carriers = new Set();
      if (txRes?.success) {
        txRes.data.forEach((t) => {
          if (t.senderName) senders.add(t.senderName);
          if (t.customsWarehouse) whs.add(t.customsWarehouse);
        });
      }
      if (whRes?.success) {
        whRes.data.forEach((w) => {
          if (w.senderName) senders.add(w.senderName);
          if (w.warehouse) whs.add(w.warehouse);
          if (w.carrierName) carriers.add(w.carrierName);
        });
      }
      const sortTR = (a, b) => a.localeCompare(b, "tr");
      setSenderSuggestions([...senders].sort(sortTR));
      setWhSuggestions([...whs].sort(sortTR));
      setCarrierSuggestions([...carriers].sort(sortTR));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Filter effects ── */
  useEffect(() => {
    const q = brokerSearch.toLowerCase();
    setFilteredBrokers(availableBrokers.filter((b) => b.name.toLowerCase().includes(q) || b.shortName?.toLowerCase().includes(q)).slice(0, 100));
  }, [brokerSearch, availableBrokers]);

  useEffect(() => {
    const q = clientSearch.toLowerCase();
    setFilteredClients(availableClients.filter((c) => c.name.toLowerCase().includes(q) || c.shortName?.toLowerCase().includes(q)).slice(0, 100));
  }, [clientSearch, availableClients]);

  useEffect(() => {
    const q = customsSearch.toLowerCase();
    setFilteredCustoms(availableCustoms.filter((c) => c.customsShortName?.toLowerCase().includes(q) || c.customsName?.toLowerCase().includes(q)).slice(0, 50));
  }, [customsSearch, availableCustoms]);

  useEffect(() => {
    const q = senderSearch.toLowerCase();
    setFilteredSenders(senderSuggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 50));
  }, [senderSearch, senderSuggestions]);

  useEffect(() => {
    const q = whSearch.toLowerCase();
    setFilteredWh(whSuggestions.filter((w) => w.toLowerCase().includes(q)).slice(0, 50));
  }, [whSearch, whSuggestions]);

  useEffect(() => {
    const q = carrierSearch.toLowerCase();
    setFilteredCarriers(carrierSuggestions.filter((c) => c.toLowerCase().includes(q)).slice(0, 50));
  }, [carrierSearch, carrierSuggestions]);

  useEffect(() => {
    const q = repSearch.toLowerCase();
    setFilteredReps(representatives.filter((r) => getRepName(r).toLowerCase().includes(q)).slice(0, 100));
  }, [repSearch, representatives]);

  /* ── Click outside ── */
  useEffect(() => {
    if (!showBrokerDd) return;
    const h = (e) => { const el = document.getElementById("edit-wh-broker-c"); if (el && !el.contains(e.target)) setShowBrokerDd(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [showBrokerDd]);

  useEffect(() => {
    if (!showClientDd) return;
    const h = (e) => { const el = document.getElementById("edit-wh-client-c"); if (el && !el.contains(e.target)) setShowClientDd(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [showClientDd]);

  useEffect(() => {
    if (!showCustomsDd) return;
    const h = (e) => { const el = document.getElementById("edit-wh-customs-c"); if (el && !el.contains(e.target)) setShowCustomsDd(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [showCustomsDd]);

  useEffect(() => {
    if (!showSenderDd) return;
    const h = (e) => { const el = document.getElementById("edit-wh-sender-c"); if (el && !el.contains(e.target)) setShowSenderDd(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [showSenderDd]);

  useEffect(() => {
    if (!showWhDd) return;
    const h = (e) => { const el = document.getElementById("edit-wh-wh-c"); if (el && !el.contains(e.target)) setShowWhDd(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [showWhDd]);

  useEffect(() => {
    if (!showCarrierDd) return;
    const h = (e) => { const el = document.getElementById("edit-wh-carrier-c"); if (el && !el.contains(e.target)) setShowCarrierDd(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [showCarrierDd]);

  useEffect(() => {
    if (!showRepDd) return;
    const h = (e) => { const el = document.getElementById("edit-wh-rep-c"); if (el && !el.contains(e.target)) setShowRepDd(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [showRepDd]);

  /* ── Validation & Submit ── */
  const validate = () => {
    const e = {};
    if (isSuperAdmin && !formData.brokerCompanyId) e.brokerCompanyId = "Gümrük firması seçimi zorunludur";
    if (!formData.clientCompanyId) e.clientCompanyId = "Alıcı firma seçimi zorunludur";
    if (!formData.fileNo.trim()) e.fileNo = "Dosya No zorunludur";
    if (!formData.declarationNo.trim()) e.declarationNo = "Beyanname No zorunludur";
    if (!senderSearch.trim()) e.senderName = "Gönderici zorunludur";
    if (!whSearch.trim()) e.warehouse = "Antrepo zorunludur";
    if (!formData.customsId) e.customsId = "Gümrük zorunludur";
    if (!carrierSearch.trim()) e.carrierName = "Nakliyeci zorunludur";
    if (!formData.containerAmount || Number(formData.containerAmount) <= 0) e.containerAmount = "Kap miktarı zorunludur";
    if (!formData.weight || Number(formData.weight) <= 0) e.weight = "Kilo zorunludur";
    if (!formData.gate) e.gate = "Hat seçimi zorunludur";
    if (!formData.representativeId) e.representativeId = "Temsilci zorunludur";
    if (!formData.declarationDate) e.declarationDate = "Beyanname tarihi zorunludur";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { showError("Lütfen tüm zorunlu alanları doldurun"); return; }
    setLoading(true);
    try {
      const payload = {
        brokerCompanyId: Number(formData.brokerCompanyId),
        clientCompanyId: Number(formData.clientCompanyId),
        fileNo: formData.fileNo.trim(),
        declarationNo: formData.declarationNo.trim(),
        recipientName: formData.recipientName.trim() || toUpperCase(clientSearch),
        senderName: toUpperCase(senderSearch.trim()),
        warehouse: toUpperCase(whSearch.trim()),
        customsId: Number(formData.customsId),
        containerAmount: Number(formData.containerAmount),
        weight: parseFloat(formData.weight),
        carrierName: toUpperCase(carrierSearch.trim()),
        representativeId: Number(formData.representativeId),
        gate: formData.gate,
        declarationDate: formData.declarationDate,
        stampPaymentDate: formData.stampPaymentDate || null,
        protocol: formData.protocol,
      };
      const result = await warehouseService.update(declaration.id, payload);
      if (result.success) {
        showSuccess(result.message || "Antrepo kaydı güncellendi");
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
        if (!loading) handleSubmit();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose]);

  /* ── Render ── */
  const statusIsKapandi = declaration.status === "KAPANDI";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-amber-500/10 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 bg-amber-500/15 rounded-xl">
              <span className="material-symbols-outlined text-amber-500">edit</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main">Antrepo Kaydı Düzenle</h2>
              <p className="text-text-secondary text-sm font-mono">{declaration.fileNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              statusIsKapandi
                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
            }`}>
              {statusIsKapandi ? "KAPANDI" : "TESCİL EDİLDİ"}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-text-secondary">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Firma & Alıcı */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700">
            <SectionHeader icon="business" title="FİRMA & ALICI" />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isSuperAdmin && (
                <div>
                  <FieldLabel text="Gümrük Firması (Broker)" required />
                  <div className="relative" id="edit-wh-broker-c">
                    <input
                      value={brokerSearch}
                      onChange={(e) => { setBrokerSearch(e.target.value); setShowBrokerDd(true); clearErr("brokerCompanyId"); if (!e.target.value) setFormData((p) => ({ ...p, brokerCompanyId: "" })); }}
                      onFocus={() => setShowBrokerDd(true)}
                      onKeyDown={brokerKb.handleKeyDown}
                      placeholder={loadingBrokers ? "Yükleniyor..." : "Gümrük firması ara veya seçin"}
                      disabled={loadingBrokers}
                      autoComplete="off"
                      className={getIc(!!fieldErrors.brokerCompanyId) + " disabled:bg-gray-50 dark:disabled:bg-gray-700"}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowBrokerDd(!showBrokerDd)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                      <span className="material-symbols-outlined text-base">{showBrokerDd ? "expand_less" : "expand_more"}</span>
                    </button>
                    {showBrokerDd && !loadingBrokers && (
                      <DdList
                        items={filteredBrokers} highlightIdx={brokerKb.highlightedIndex} ddId="edit-wh-broker-dd"
                        emptyText="Kayıtlı gümrük firması bulunamadı"
                        onSelect={selectBroker}
                        renderItem={(b) => (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{b.name}</p>
                              {b.shortName && <p className="text-xs text-text-secondary">{b.shortName}</p>}
                            </div>
                            {Number(formData.brokerCompanyId) === Number(b.id) && <span className="material-symbols-outlined text-amber-500 text-base">check_circle</span>}
                          </div>
                        )}
                      />
                    )}
                  </div>
                  <FieldError msg={fieldErrors.brokerCompanyId} />
                </div>
              )}

              <div className={!isSuperAdmin ? "sm:col-span-2" : ""}>
                <FieldLabel text="Alıcı (Müşteri Firma)" required />
                <div className="relative" id="edit-wh-client-c">
                  <input
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setShowClientDd(true); clearErr("clientCompanyId"); if (!e.target.value) { setFormData((p) => ({ ...p, clientCompanyId: "", recipientName: "" })); setSelectedClientAgreement(null); } }}
                    onFocus={() => setShowClientDd(true)}
                    onKeyDown={clientKb.handleKeyDown}
                    placeholder={loadingClients ? "Yükleniyor..." : "Müşteri firma ara veya seçin"}
                    disabled={loadingClients}
                    autoComplete="off"
                    className={getIc(!!fieldErrors.clientCompanyId) + " disabled:bg-gray-50 dark:disabled:bg-gray-700"}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowClientDd(!showClientDd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                    <span className="material-symbols-outlined text-base">{showClientDd ? "expand_less" : "expand_more"}</span>
                  </button>
                  {showClientDd && !loadingClients && (
                    <DdList
                      items={filteredClients} highlightIdx={clientKb.highlightedIndex} ddId="edit-wh-client-dd"
                      emptyText="Kayıtlı müşteri bulunamadı"
                      onSelect={(c) => selectClient(c)}
                      renderItem={(c) => (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{c.name}</p>
                            {c.shortName && <p className="text-xs text-text-secondary">{c.shortName}</p>}
                          </div>
                          {Number(formData.clientCompanyId) === Number(c.id) && <span className="material-symbols-outlined text-amber-500 text-base">check_circle</span>}
                        </div>
                      )}
                    />
                  )}
                </div>
                <FieldError msg={fieldErrors.clientCompanyId} />
                {formData.clientCompanyId && formData.recipientName && (
                  <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">person</span>
                    Alıcı adı: <span className="font-medium text-text-main">{formData.recipientName}</span>
                  </p>
                )}
              </div>

              {formData.clientCompanyId && (
                <div className="col-span-full">
                  <AgreementInfoPanel
                    agreement={selectedClientAgreement}
                    clientName={clientSearch}
                    compact={true}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Kayıt Numaraları */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700">
            <SectionHeader icon="badge" title="KAYIT NUMARALARI" />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel text="Antrepo Dosya No" required />
                <input value={formData.fileNo}
                  onChange={(e) => { setFormData((p) => ({ ...p, fileNo: toUpperCase(e.target.value) })); clearErr("fileNo"); }}
                  className={getIc(!!fieldErrors.fileNo)} />
                <FieldError msg={fieldErrors.fileNo} />
              </div>
              <div>
                <FieldLabel text="Ant. Beyanname No" required />
                <input value={formData.declarationNo}
                  onChange={(e) => { setFormData((p) => ({ ...p, declarationNo: toUpperCase(e.target.value) })); clearErr("declarationNo"); }}
                  className={getIc(!!fieldErrors.declarationNo)} />
                <FieldError msg={fieldErrors.declarationNo} />
              </div>
              <div>
                <FieldLabel text="Hat" required />
                <div className="flex gap-2 h-11">
                  {GATE_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => { setFormData((p) => ({ ...p, gate: opt.value })); clearErr("gate"); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-all ${
                        formData.gate === opt.value
                          ? opt.value === "SARI"
                            ? "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 text-yellow-800 dark:text-yellow-300 shadow-sm"
                            : "bg-red-100 dark:bg-red-900/40 border-red-400 text-red-800 dark:text-red-300 shadow-sm"
                          : "border-gray-300 dark:border-gray-600 text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}>
                      {opt.emoji} {opt.value}
                    </button>
                  ))}
                </div>
                <FieldError msg={fieldErrors.gate} />
              </div>
            </div>
          </div>

          {/* Lojistik */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700">
            <SectionHeader icon="local_shipping" title="LOJİSTİK BİLGİLERİ" />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AutoField containerId="edit-wh-sender-c" ddId="edit-wh-sender-dd" label="Gönderici" required
                value={senderSearch}
                onChange={(e) => { setSenderSearch(e.target.value); setFormData((p) => ({ ...p, senderName: e.target.value })); setShowSenderDd(true); clearErr("senderName"); }}
                onFocus={() => setShowSenderDd(true)}
                showDd={showSenderDd} filtered={filteredSenders} kbHook={senderKb} onSelect={selectSender}
                error={fieldErrors.senderName}
              />
              <AutoField containerId="edit-wh-carrier-c" ddId="edit-wh-carrier-dd" label="Nakliyeci" required
                value={carrierSearch}
                onChange={(e) => { setCarrierSearch(e.target.value); setFormData((p) => ({ ...p, carrierName: e.target.value })); setShowCarrierDd(true); clearErr("carrierName"); }}
                onFocus={() => setShowCarrierDd(true)}
                showDd={showCarrierDd} filtered={filteredCarriers} kbHook={carrierKb} onSelect={selectCarrier}
                error={fieldErrors.carrierName}
              />
              <AutoField containerId="edit-wh-wh-c" ddId="edit-wh-wh-dd" label="Antrepo" required
                value={whSearch}
                onChange={(e) => { setWhSearch(e.target.value); setFormData((p) => ({ ...p, warehouse: e.target.value })); setShowWhDd(true); clearErr("warehouse"); }}
                onFocus={() => setShowWhDd(true)}
                showDd={showWhDd} filtered={filteredWh} kbHook={whKb} onSelect={selectWh}
                error={fieldErrors.warehouse}
              />
              <div>
                <FieldLabel text="Gümrük" required />
                <div className="relative" id="edit-wh-customs-c">
                  <input
                    value={customsSearch}
                    onChange={(e) => { setCustomsSearch(e.target.value); setShowCustomsDd(true); clearErr("customsId"); }}
                    onFocus={() => setShowCustomsDd(true)}
                    onKeyDown={customsKb.handleKeyDown}
                    placeholder="Gümrük ara veya seçin"
                    autoComplete="off"
                    className={getIc(!!fieldErrors.customsId)}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowCustomsDd(!showCustomsDd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                    <span className="material-symbols-outlined text-base">{showCustomsDd ? "expand_less" : "expand_more"}</span>
                  </button>
                  {showCustomsDd && (
                    <DdList
                      items={filteredCustoms} highlightIdx={customsKb.highlightedIndex} ddId="edit-wh-customs-dd"
                      emptyText="Kayıtlı gümrük bulunamadı"
                      onSelect={(c) => selectCustoms(c)}
                      renderItem={(c) => (
                        <div>
                          <span className="font-semibold">{c.customsShortName}</span>
                          <span className="text-text-secondary text-xs ml-2">{c.customsName}</span>
                        </div>
                      )}
                    />
                  )}
                </div>
                <FieldError msg={fieldErrors.customsId} />
              </div>
            </div>
          </div>

          {/* Yük Bilgileri */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700">
            <SectionHeader icon="inventory_2" title="YÜK BİLGİLERİ" />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel text="Kap" required />
                <input type="number" min="1" value={formData.containerAmount}
                  onChange={(e) => { setFormData((p) => ({ ...p, containerAmount: e.target.value })); clearErr("containerAmount"); }}
                  placeholder="0" className={getIc(!!fieldErrors.containerAmount)} />
                <FieldError msg={fieldErrors.containerAmount} />
              </div>
              <div>
                <FieldLabel text="Kilo (Kg)" required />
                <input type="number" min="0" step="0.001" value={formData.weight}
                  onChange={(e) => { setFormData((p) => ({ ...p, weight: e.target.value })); clearErr("weight"); }}
                  placeholder="0.000" className={getIc(!!fieldErrors.weight)} />
                <FieldError msg={fieldErrors.weight} />
              </div>
            </div>
          </div>

          {/* Temsilci & Tarihler */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700">
            <SectionHeader icon="event" title="TEMSİLCİ & TARİHLER" />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <FieldLabel text="Temsilci" required />
                <div className="relative" id="edit-wh-rep-c">
                  <input
                    value={repSearch}
                    onChange={(e) => { setRepSearch(e.target.value); setShowRepDd(true); clearErr("representativeId"); }}
                    onFocus={() => setShowRepDd(true)}
                    onKeyDown={repKb.handleKeyDown}
                    placeholder="Temsilci ara veya seçin"
                    autoComplete="off"
                    className={getIc(!!fieldErrors.representativeId)}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowRepDd(!showRepDd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                    <span className="material-symbols-outlined text-base">{showRepDd ? "expand_less" : "expand_more"}</span>
                  </button>
                  {showRepDd && (
                    <DdList
                      items={filteredReps} highlightIdx={repKb.highlightedIndex} ddId="edit-wh-rep-dd"
                      emptyText="Çalışan bulunamadı"
                      onSelect={(r) => { setFormData((p) => ({ ...p, representativeId: r.id })); setRepSearch(getRepName(r)); setShowRepDd(false); clearErr("representativeId"); }}
                      renderItem={(r) => (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{getRepName(r)}</p>
                            {r.email && <p className="text-xs text-text-secondary">{r.email}</p>}
                          </div>
                          {formData.representativeId === r.id && <span className="material-symbols-outlined text-amber-500 text-base">check_circle</span>}
                        </div>
                      )}
                    />
                  )}
                </div>
                <FieldError msg={fieldErrors.representativeId} />
              </div>

              <div>
                <FieldLabel text="Beyanname Tarihi" required />
                <input type="date" value={formData.declarationDate} max={today}
                  onChange={(e) => { setFormData((p) => ({ ...p, declarationDate: e.target.value })); clearErr("declarationDate"); }}
                  className={getIc(!!fieldErrors.declarationDate)} />
                <FieldError msg={fieldErrors.declarationDate} />
              </div>

              <div>
                <FieldLabel text="Pul Ödeme Tarihi" />
                <input type="date" value={formData.stampPaymentDate} max={today}
                  onChange={(e) => setFormData((p) => ({ ...p, stampPaymentDate: e.target.value }))}
                  className={getIc(false)} />
              </div>

              <div>
                <FieldLabel text="Tutanak" />
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full h-11">
                  <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${formData.protocol ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.protocol ? "translate-x-6" : "translate-x-1"}`} />
                    <input type="checkbox" checked={formData.protocol} onChange={(e) => setFormData((p) => ({ ...p, protocol: e.target.checked }))} className="sr-only" />
                  </div>
                  <p className={`text-sm font-semibold ${formData.protocol ? "text-emerald-600 dark:text-emerald-400" : "text-text-main"}`}>
                    {formData.protocol ? "Tutanak Geldi" : "Tutanak Bekliyor"}
                  </p>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0 rounded-b-2xl">
          <p className="text-xs text-text-secondary"><span className="text-red-500">*</span> Zorunlu alanlar</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} disabled={loading}
              className="px-5 py-2.5 text-text-secondary hover:text-text-main font-medium transition-colors disabled:opacity-50 text-sm">
              İptal
            </button>
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {loading
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /><span>Güncelleniyor...</span></>
                : <><span className="material-symbols-outlined text-lg">save</span><span>Güncelle</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
