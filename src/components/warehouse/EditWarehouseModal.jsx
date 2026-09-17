import { useState, useEffect, useRef, useMemo } from "react";
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
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import AgreementInfoPanel from "../agreements/AgreementInfoPanel";
import { useRecordDraft } from "../../hooks/useRecordDraft";
import { useEditDraftPrefill } from "../../hooks/useEditDraftPrefill";
import { DRAFT_MODULES } from "../../api/draftService";
import { buildDraftLabel, draftText, isConcurrentUpdate } from "../../utils/drafts";
import SaveDraftButton from "../drafts/SaveDraftButton";
import EditDraftBanner from "../drafts/EditDraftBanner";
import {
  createWarehouseFormData,
  buildWarehouseUpdatePayload,
  getRepName,
  warehousePayloadToFormData,
  warehouseDraftFields,
  warehouseRecordToFields,
  warehousePayloadToFields,
  warehouseRecordToPayload,
} from "./warehouseDraftFields";
import { t } from "../../locales";

const today = new Date().toISOString().split("T")[0];

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

function AutoField({ containerId, ddId, label, placeholder, emptyText, required, note, value, onChange, onFocus, showDd, filtered, kbHook, onSelect, error }) {
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
          placeholder={placeholder}
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
                <span>{t("warehouse.form.addNew")} <strong>{toUpperCase(value.trim())}</strong></span>
              </button>
            )}
            {filtered.length === 0 && !notExact ? (
              <div className="p-4 text-center text-text-secondary text-sm">{emptyText}</div>
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

  // Açılıştaki hâl taslakta da saklanır: bekleyen değişiklik uygulanırken "kaydı başkası değiştirdi mi" bunun
  // üzerinden bulunur (bkz. warehouseDraftFields.js).
  const [baseFormData] = useState(() => createWarehouseFormData(declaration));
  const [formData, setFormData] = useState(baseFormData);

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

  // Taslak forma yüklendiyse açılıştaki listeler (müşteri, temsilci) kaydın değerlerini geri yazmasın.
  const draftAppliedRef = useRef(false);
  // Açılış yüklemeleri geç bittiğinde formun o anki hâline bakabilsin diye
  const formDataRef = useRef(formData);
  useEffect(() => { formDataRef.current = formData; });

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
          /* Fix: initialize clientSearch and clientCompanyId from loaded list.
             Taslak yüklendiyse formdaki müşteri taslağınkidir; kaydınkine geri dönülmez, yalnızca vekalet
             bilgisi formdaki müşteriye göre tazelenir. */
          if (draftAppliedRef.current) {
            setSelectedClientAgreement(agMap[formDataRef.current.clientCompanyId] || null);
          } else {
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
        }
        setLoadingClients(false);
      });

      employeeService.getEmployees(brokerId).then((r) => {
        if (r?.success) {
          setRepresentatives(r.data);
          setFilteredReps(r.data.slice(0, 100));
          /* Fix: initialize repSearch from loaded employees list (taslak yüklendiyse dokunulmaz) */
          const currentRep = r.data.find((emp) => emp.id === declaration.representative?.id);
          if (currentRep && !draftAppliedRef.current) {
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
        txRes.data.forEach((tx) => {
          if (tx.senderName) senders.add(tx.senderName);
          if (tx.customsWarehouse) whs.add(tx.customsWarehouse);
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
    if (isSuperAdmin && !formData.brokerCompanyId) e.brokerCompanyId = t("warehouse.validation.brokerRequired");
    if (!formData.clientCompanyId) e.clientCompanyId = t("warehouse.validation.clientRequired");
    if (!formData.fileNo.trim()) e.fileNo = t("warehouse.validation.fileNoRequired");
    if (!formData.declarationNo.trim()) e.declarationNo = t("warehouse.validation.declarationNoRequired");
    if (!senderSearch.trim()) e.senderName = t("warehouse.validation.senderRequired");
    if (!whSearch.trim()) e.warehouse = t("transactions.validation.warehouseRequired");
    if (!formData.customsId) e.customsId = t("warehouse.validation.customsRequired");
    if (!carrierSearch.trim()) e.carrierName = t("warehouse.validation.carrierRequired");
    if (!formData.containerAmount || Number(formData.containerAmount) <= 0) e.containerAmount = t("warehouse.validation.containerAmountRequired");
    if (!formData.weight || Number(formData.weight) <= 0) e.weight = t("transactions.validation.weightRequired");
    if (!formData.gate) e.gate = t("transactions.validation.gateRequired");
    if (!formData.representativeId) e.representativeId = t("warehouse.validation.representativeRequired");
    if (!formData.declarationDate) e.declarationDate = t("warehouse.validation.declarationDateRequired");
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { showError(t("transactions.form.fillRequired")); return; }
    setLoading(true);
    try {
      // Gövde bekleyen değişikliğin "Uygula"sıyla aynı yerden gelir (warehouseDraftFields.js)
      const payload = buildWarehouseUpdatePayload(formData, { clientSearch, senderSearch, whSearch, carrierSearch });
      const result = await warehouseService.update(declaration.id, payload);
      if (result.success) {
        // Bu kayda ait kendi taslağımız varsa değişiklik uygulandı, taslak gereksiz
        discardDraft();
        showSuccess(result.message || t("warehouse.form.updateSuccess"));
        onSuccess();
      } else if (isConcurrentUpdate(result)) {
        // Kayıt tam bu sırada değişti: taslak durur, bant uyarıya döner, kullanıcı karşılaştırıp yeniden kaydeder.
        draftPrefill.reportConflict();
        showError(t("drafts.pending.concurrentUpdate"));
      } else {
        showError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Ctrl+S dinleyicisi yalnızca loading/requestClose değişince yeniden bağlanıyor; ref olmadan
  // bağlandığı andaki handleSubmit'i, yani formun eski halini doğrulayıp gönderirdi.
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; });

  // Kapatma koruması. Seçim alanlarında (broker, alıcı, gümrük, temsilci) değer id'dir; arama metni yalnızca seçim
  // yokken sayılır, çünkü açılıştaki yüklemeler seçili kaydın adını yeniden yazıyor.
  const unsavedValues = useMemo(() => ({
    formData,
    brokerSearch: formData.brokerCompanyId ? "" : brokerSearch,
    clientSearch: formData.clientCompanyId ? "" : clientSearch,
    customsSearch: formData.customsId ? "" : customsSearch,
    repSearch: formData.representativeId ? "" : repSearch,
    senderSearch,
    whSearch,
    carrierSearch,
  }), [formData, brokerSearch, clientSearch, customsSearch, repSearch, senderSearch, whSearch, carrierSearch]);

  // Bekleyen değişiklik taslağı: kaydın id'si hedef, açılıştaki `updatedAt` çakışma ölçüsü.
  const [existingDraft, setExistingDraft] = useState(null);
  const { draftsEnabled, isDraftPilot, saveDraft, savingDraft, discardDraft } = useRecordDraft({
    module: DRAFT_MODULES.WAREHOUSE,
    currentUser: user,
    initialDraft: existingDraft,
    targetId: declaration.id,
    baseUpdatedAt: declaration.updatedAt || null,
    getSnapshot: () => ({
      payload: {
        formData,
        brokerSearch,
        clientSearch,
        customsSearch,
        repSearch,
        senderSearch,
        whSearch,
        carrierSearch,
        // Taslak alındığı andaki kayıt. Taslağın *farkı* bununla bulunur: uygulanırken yalnızca bu tabana göre
        // değişmiş alanlar yazılır, geri kalanı kaydın o anki değerinde kalır.
        base: warehouseRecordToPayload(declaration),
      },
      label: buildDraftLabel([formData.fileNo, formData.clientCompanyId ? clientSearch : ""], DRAFT_MODULES.WAREHOUSE),
    }),
  });

  // Taslağın form görüntüsü: aynı alanlar kaydederken de kullanılıyor, böylece yüklenen ile kaydedilen ayrışamaz.
  const applyDraftPayload = (payload) => {
    draftAppliedRef.current = true;
    const draftForm = warehousePayloadToFormData(payload, declaration);
    setFormData(draftForm);
    setBrokerSearch(draftText(payload, "brokerSearch", declaration.brokerCompany?.name || ""));
    setClientSearch(draftText(payload, "clientSearch", declaration.clientCompany?.name || ""));
    setCustomsSearch(draftText(payload, "customsSearch", declaration.customs?.customsShortName || ""));
    setRepSearch(draftText(payload, "repSearch", getRepName(declaration.representative)));
    setSenderSearch(draftText(payload, "senderSearch", declaration.senderName || ""));
    setWhSearch(draftText(payload, "whSearch", declaration.warehouse || ""));
    setCarrierSearch(draftText(payload, "carrierSearch", declaration.carrierName || ""));
    setSelectedClientAgreement(clientAgreements[draftForm.clientCompanyId] || null);
    setFieldErrors({});
  };

  // "Orijinali yükle" ve "Taslağı sil": form kaydın açılıştaki hâline döner.
  const resetFormToRecord = () => {
    draftAppliedRef.current = false;
    setFormData(baseFormData);
    setBrokerSearch(declaration.brokerCompany?.name || "");
    setClientSearch(declaration.clientCompany?.name || "");
    setCustomsSearch(declaration.customs?.customsShortName || "");
    setRepSearch(getRepName(declaration.representative));
    setSenderSearch(declaration.senderName || "");
    setWhSearch(declaration.warehouse || "");
    setCarrierSearch(declaration.carrierName || "");
    setSelectedClientAgreement(clientAgreements[baseFormData.clientCompanyId] || null);
    setFieldErrors({});
  };

  const draftCompareFields = useMemo(() => warehouseDraftFields(), []);

  const draftPrefill = useEditDraftPrefill({
    enabled: draftsEnabled,
    module: DRAFT_MODULES.WAREHOUSE,
    targetId: declaration.id,
    record: declaration,
    fields: draftCompareFields,
    recordToFields: warehouseRecordToFields,
    payloadToFields: warehousePayloadToFields,
    recordToPayload: warehouseRecordToPayload,
    onDraftFound: setExistingDraft,
    applyPayload: applyDraftPayload,
    resetToRecord: resetFormToRecord,
    discardDraft,
  });

  const { requestClose, isDirty } = useUnsavedChangesGuard({
    values: unsavedValues,
    onClose,
    onSaveDraft: saveDraft,
  });

  const handleSaveDraftAndClose = async () => {
    if (await saveDraft?.()) onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Üstte taslak karşılaştırması açıksa ESC onundur
      if (e.key === "Escape") { if (!draftPrefill.compareOpen) requestClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!loading) handleSubmitRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, requestClose, draftPrefill.compareOpen]);

  /* ── Render ── */
  const statusIsKapandi = declaration.status === "KAPANDI";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={requestClose}>
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
              <h2 className="text-xl font-bold text-text-main">{t("warehouse.form.editTitle")}</h2>
              <p className="text-text-secondary text-sm font-mono">{declaration.fileNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              statusIsKapandi
                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
            }`}>
              {statusIsKapandi
                ? t("dashboard.recent.warehouseStatus.KAPANDI")
                : t("dashboard.recent.warehouseStatus.TESCIL_EDILDI")}
            </span>
            <button onClick={requestClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-text-secondary">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Kendi bekleyen taslağınız formda (DRAFTS) */}
          {draftPrefill.active && (
            <EditDraftBanner
              prefill={draftPrefill}
              module={DRAFT_MODULES.WAREHOUSE}
              record={declaration}
              fields={draftCompareFields}
              recordToFields={warehouseRecordToFields}
              payloadToFields={warehousePayloadToFields}
              recordToPayload={warehouseRecordToPayload}
            />
          )}

          {/* Firma & Alıcı */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700">
            <SectionHeader icon="business" title={t("warehouse.form.sectionCompany")} />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isSuperAdmin && (
                <div>
                  <FieldLabel text={t("warehouse.form.brokerLabel")} required />
                  <div className="relative" id="edit-wh-broker-c">
                    <input
                      value={brokerSearch}
                      onChange={(e) => { setBrokerSearch(e.target.value); setShowBrokerDd(true); clearErr("brokerCompanyId"); if (!e.target.value) setFormData((p) => ({ ...p, brokerCompanyId: "" })); }}
                      onFocus={() => setShowBrokerDd(true)}
                      onKeyDown={brokerKb.handleKeyDown}
                      placeholder={loadingBrokers ? t("common.loading") : t("warehouse.form.brokerPlaceholder")}
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
                        emptyText={t("warehouse.form.noBrokers")}
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
                <FieldLabel text={t("warehouse.form.clientLabel")} required />
                <div className="relative" id="edit-wh-client-c">
                  <input
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setShowClientDd(true); clearErr("clientCompanyId"); if (!e.target.value) { setFormData((p) => ({ ...p, clientCompanyId: "", recipientName: "" })); setSelectedClientAgreement(null); } }}
                    onFocus={() => setShowClientDd(true)}
                    onKeyDown={clientKb.handleKeyDown}
                    placeholder={loadingClients ? t("common.loading") : t("warehouse.form.clientPlaceholder")}
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
                      emptyText={t("warehouse.form.noClients")}
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
                    {t("warehouse.form.recipientName")} <span className="font-medium text-text-main">{formData.recipientName}</span>
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
            <SectionHeader icon="badge" title={t("warehouse.form.sectionNumbers")} />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel text={t("transactions.detail.warehouseFileNo")} required />
                <input value={formData.fileNo}
                  onChange={(e) => { setFormData((p) => ({ ...p, fileNo: toUpperCase(e.target.value) })); clearErr("fileNo"); }}
                  className={getIc(!!fieldErrors.fileNo)} />
                <FieldError msg={fieldErrors.fileNo} />
              </div>
              <div>
                <FieldLabel text={t("transactions.detail.warehouseDeclarationNo")} required />
                <input value={formData.declarationNo}
                  onChange={(e) => { setFormData((p) => ({ ...p, declarationNo: toUpperCase(e.target.value) })); clearErr("declarationNo"); }}
                  className={getIc(!!fieldErrors.declarationNo)} />
                <FieldError msg={fieldErrors.declarationNo} />
              </div>
              <div>
                <FieldLabel text={t("transaction.gate")} required />
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
                      {opt.emoji} {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
                <FieldError msg={fieldErrors.gate} />
              </div>
            </div>
          </div>

          {/* Lojistik */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700">
            <SectionHeader icon="local_shipping" title={t("warehouse.form.sectionLogistics")} />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AutoField containerId="edit-wh-sender-c" ddId="edit-wh-sender-dd" label={t("transaction.sender")} required
                placeholder={t("warehouse.form.senderPlaceholder")} emptyText={t("warehouse.form.noSenders")}
                value={senderSearch}
                onChange={(e) => { setSenderSearch(e.target.value); setFormData((p) => ({ ...p, senderName: e.target.value })); setShowSenderDd(true); clearErr("senderName"); }}
                onFocus={() => setShowSenderDd(true)}
                showDd={showSenderDd} filtered={filteredSenders} kbHook={senderKb} onSelect={selectSender}
                error={fieldErrors.senderName}
              />
              <AutoField containerId="edit-wh-carrier-c" ddId="edit-wh-carrier-dd" label={t("cargo.fields.carrierName")} required
                placeholder={t("warehouse.form.carrierPlaceholder")} emptyText={t("warehouse.form.noCarriers")}
                value={carrierSearch}
                onChange={(e) => { setCarrierSearch(e.target.value); setFormData((p) => ({ ...p, carrierName: e.target.value })); setShowCarrierDd(true); clearErr("carrierName"); }}
                onFocus={() => setShowCarrierDd(true)}
                showDd={showCarrierDd} filtered={filteredCarriers} kbHook={carrierKb} onSelect={selectCarrier}
                error={fieldErrors.carrierName}
              />
              <AutoField containerId="edit-wh-wh-c" ddId="edit-wh-wh-dd" label={t("transaction.customsWarehouse")} required
                placeholder={t("warehouse.form.warehousePlaceholder")} emptyText={t("warehouse.form.noWarehouses")}
                value={whSearch}
                onChange={(e) => { setWhSearch(e.target.value); setFormData((p) => ({ ...p, warehouse: e.target.value })); setShowWhDd(true); clearErr("warehouse"); }}
                onFocus={() => setShowWhDd(true)}
                showDd={showWhDd} filtered={filteredWh} kbHook={whKb} onSelect={selectWh}
                error={fieldErrors.warehouse}
              />
              <div>
                <FieldLabel text={t("transaction.customsName")} required />
                <div className="relative" id="edit-wh-customs-c">
                  <input
                    value={customsSearch}
                    onChange={(e) => { setCustomsSearch(e.target.value); setShowCustomsDd(true); clearErr("customsId"); }}
                    onFocus={() => setShowCustomsDd(true)}
                    onKeyDown={customsKb.handleKeyDown}
                    placeholder={t("warehouse.form.customsPlaceholder")}
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
                      emptyText={t("warehouse.form.noCustoms")}
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
            <SectionHeader icon="inventory_2" title={t("warehouse.form.sectionCargo")} />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel text={t("transaction.containerAmount")} required />
                <input type="number" min="1" value={formData.containerAmount}
                  onChange={(e) => { setFormData((p) => ({ ...p, containerAmount: e.target.value })); clearErr("containerAmount"); }}
                  placeholder="0" className={getIc(!!fieldErrors.containerAmount)} />
                <FieldError msg={fieldErrors.containerAmount} />
              </div>
              <div>
                <FieldLabel text={t("transaction.weight")} required />
                <input type="number" min="0" step="0.001" value={formData.weight}
                  onChange={(e) => { setFormData((p) => ({ ...p, weight: e.target.value })); clearErr("weight"); }}
                  placeholder="0.000" className={getIc(!!fieldErrors.weight)} />
                <FieldError msg={fieldErrors.weight} />
              </div>
            </div>
          </div>

          {/* Temsilci & Tarihler */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700">
            <SectionHeader icon="event" title={t("warehouse.form.sectionRepresentativeDates")} />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <FieldLabel text={t("warehouse.common.representative")} required />
                <div className="relative" id="edit-wh-rep-c">
                  <input
                    value={repSearch}
                    onChange={(e) => { setRepSearch(e.target.value); setShowRepDd(true); clearErr("representativeId"); }}
                    onFocus={() => setShowRepDd(true)}
                    onKeyDown={repKb.handleKeyDown}
                    placeholder={t("warehouse.form.representativePlaceholder")}
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
                      emptyText={t("warehouse.form.noEmployees")}
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
                <FieldLabel text={t("warehouse.common.declarationDate")} required />
                <input type="date" value={formData.declarationDate} max={today}
                  onChange={(e) => { setFormData((p) => ({ ...p, declarationDate: e.target.value })); clearErr("declarationDate"); }}
                  className={getIc(!!fieldErrors.declarationDate)} />
                <FieldError msg={fieldErrors.declarationDate} />
              </div>

              <div>
                <FieldLabel text={t("warehouse.common.stampPaymentDate")} />
                <input type="date" value={formData.stampPaymentDate} max={today}
                  onChange={(e) => setFormData((p) => ({ ...p, stampPaymentDate: e.target.value }))}
                  className={getIc(false)} />
              </div>

              <div>
                <FieldLabel text={t("warehouse.common.protocol")} />
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full h-11">
                  <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${formData.protocol ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.protocol ? "translate-x-6" : "translate-x-1"}`} />
                    <input type="checkbox" checked={formData.protocol} onChange={(e) => setFormData((p) => ({ ...p, protocol: e.target.checked }))} className="sr-only" />
                  </div>
                  <p className={`text-sm font-semibold ${formData.protocol ? "text-emerald-600 dark:text-emerald-400" : "text-text-main"}`}>
                    {formData.protocol ? t("warehouse.common.protocolArrived") : t("warehouse.common.protocolPending")}
                  </p>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0 rounded-b-2xl">
          <p className="text-xs text-text-secondary"><span className="text-red-500">*</span> {t("warehouse.form.requiredFields")}</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={requestClose} disabled={loading}
              className="px-5 py-2.5 text-text-secondary hover:text-text-main font-medium transition-colors disabled:opacity-50 text-sm">
              {t("common.cancel")}
            </button>
            {draftsEnabled && (
              <SaveDraftButton
                onClick={handleSaveDraftAndClose}
                disabled={loading || !isDirty}
                saving={savingDraft}
                isPilot={isDraftPilot}
                className="px-5 py-2.5 text-sm rounded-xl"
              />
            )}
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {loading
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /><span>{t("cargoTracking.form.updating")}</span></>
                : <><span className="material-symbols-outlined text-lg">save</span><span>{t("common.update")}</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
