import React, { useState, useEffect, useRef, useMemo } from "react";
import { transactionService } from "../../api/transactionService";
import { companyService } from "../../api/companyService";
import { customsService } from "../../api/customsService";
import { GATE_OPTIONS } from "../../utils/constants";
import { toUpperCase } from "../../utils/textUtils";
import { handleError, handleApiResponse, logError } from "../../utils/errorUtils";
import { showSuccess, showError } from "../../utils/toastUtils";
import { t, getCurrentLocale } from "../../locales";
import { formatLocaleNumber, parseLocaleNumber, toEditableNumber } from "../../utils/numberInput";
import AgreementInfoPanel from '../agreements/AgreementInfoPanel';
import { useDropdownKeyboard } from '../../hooks/useDropdownKeyboard';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { useRecordDraft } from '../../hooks/useRecordDraft';
import { DRAFT_MODULES } from '../../api/draftService';
import { buildDraftLabel, draftText, isConcurrentUpdate } from '../../utils/drafts';
import SaveDraftButton from '../drafts/SaveDraftButton';
import EditDraftBanner from '../drafts/EditDraftBanner';
import { useEditDraftPrefill } from '../../hooks/useEditDraftPrefill';
import { confirmDialog } from '../../utils/confirmDialog';
import {
  createTransactionFormData,
  buildTransactionUpdatePayload,
  transactionPayloadToFormData,
  transactionDraftFields,
  transactionRecordToFields,
  transactionPayloadToFields,
  transactionRecordToPayload,
} from './transactionDraftFields';

// Yalnızca zorunluluk kontrolünün yazdığı alan hataları. Kaydette yeniden hesaplanır; önceki kayıt denemesinden kalan
// hâli taşınmaz (alan "yeni ekle" gibi hatayı temizlemeyen bir yoldan doldurulmuş olabilir).
const PRESENCE_ERROR_KEYS = [
  "brokerCompany", "clientCompany", "fileNo", "customsId", "customsWarehouse", "containerAmount",
  "gate", "weight", "tax", "guaranteeAmount", "senderName",
];

export default function EditTransactionModal({ transaction, onClose, onSuccess, isReadOnly, currentUser }) {
  const locale = getCurrentLocale();

  // Yetki kontrolü
  const isAdmin = currentUser?.globalRole === "SUPER_ADMIN" || currentUser?.globalRole === "BROKER_ADMIN";

  // Açılıştaki hâl taslakta da saklanır: bekleyen değişiklik uygulanırken "kaydı başkası değiştirdi mi" bunun
  // üzerinden bulunur (bkz. transactionDraftFields.js).
  const [baseFormData] = useState(() => createTransactionFormData(transaction));
  const [formData, setFormData] = useState(baseFormData);

  // Broker ve client company state'leri (sadece admin için)
  const isSuperAdmin = currentUser?.globalRole === "SUPER_ADMIN";
  const [availableBrokers, setAvailableBrokers] = useState([]);
  const [filteredBrokers, setFilteredBrokers] = useState([]);
  const [brokerSearchTerm, setBrokerSearchTerm] = useState(transaction.brokerCompany?.name || "");
  const [showBrokerDropdown, setShowBrokerDropdown] = useState(false);
  const [loadingBrokers, setLoadingBrokers] = useState(false);

  const [availableClients, setAvailableClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState(transaction.clientCompany?.name || "");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  // Gönderici listesi state'leri
  const [availableSenders, setAvailableSenders] = useState([]);
  const [filteredSenders, setFilteredSenders] = useState([]);
  const [senderSearchTerm, setSenderSearchTerm] = useState(transaction.senderName || "");
  const [showSenderDropdown, setShowSenderDropdown] = useState(false);
  const [loadingSenders, setLoadingSenders] = useState(false);

  // Gümrük listesi state'leri
  const [availableCustoms, setAvailableCustoms] = useState([]);
  const [filteredCustoms, setFilteredCustoms] = useState([]);
  const [customsSearchTerm, setCustomsSearchTerm] = useState(transaction.customs?.customsShortName || "");
  const [selectedCustomsId, setSelectedCustomsId] = useState(transaction.customs?.id || null);
  const [showCustomsDropdown, setShowCustomsDropdown] = useState(false);
  const [loadingCustoms, setLoadingCustoms] = useState(false);

  // Antrepo listesi state'leri
  const [availableWarehouses, setAvailableWarehouses] = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);
  const [warehouseSearchTerm, setWarehouseSearchTerm] = useState(transaction.customsWarehouse || "");
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Durum kontrolleri - kritik alanlar kilitlenir
  const isInspectionStatus = transaction.status === "INSPECTION";
  const isCompletedStatus = transaction.status === "CP_COMPLETED";
  const isWithdrawnStatus = transaction.status === "WITHDRAWN";
  // Kapanmış kayıt: yalnızca yönetici, gerekçe yazarak yeniden açabilir (sunucu da aynı kuralı uyguluyor).
  const isClosedRecord = isWithdrawnStatus || transaction.status === "CANCELLED";
  // Admin kullanıcılar tüm alanları her durumda düzenleyebilir
  // "İptal Edildi" de kilitli: sunucu onu da kapanmış sayıyordu, arayüz saymıyordu — alanlar açık görünüp kayıt
  // sunucuda reddediliyordu.
  const isFieldLocked = isAdmin ? false : (isReadOnly || isInspectionStatus || isCompletedStatus || isClosedRecord);

  // Gecikme tespit state'i
  const [delays, setDelays] = useState({
    arrivalToRegistration: false,
    registrationToClosure: false,
    closureToWithdrawal: false,
  });

  // İthalat işlem süresi hesaplama (INSPECTION için)
  const [calculatedProcessingTime, setCalculatedProcessingTime] = useState(null);

  // Number formatlama için display state'leri
  const [displayWeight, setDisplayWeight] = useState(() => {
    if (transaction.weight) {
      return transaction.weight.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return "";
  });
  const [displayTax, setDisplayTax] = useState(() => {
    if (transaction.tax) {
      return transaction.tax.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return "";
  });
  const [displayGuaranteeAmount, setDisplayGuaranteeAmount] = useState(() => {
    if (transaction.guaranteeAmount) {
      return transaction.guaranteeAmount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return "";
  });

  // Ref for modal container (for auto-focus)
  const modalRef = useRef(null);

  // Keyboard navigation hooks for dropdowns
  const customsKeyboard = useDropdownKeyboard(
    showCustomsDropdown,
    filteredCustoms,
    (customs) => {
      setSelectedCustomsId(customs.id);
      setFormData((prev) => ({ ...prev, customsId: customs.id }));
      setCustomsSearchTerm(customs.customsShortName);
      setShowCustomsDropdown(false);
      if (fieldErrors.customsId) {
        setFieldErrors((prev) => ({ ...prev, customsId: null }));
      }
    },
    () => setShowCustomsDropdown(false),
    'edit-customs-dropdown'
  );

  const warehouseKeyboard = useDropdownKeyboard(
    showWarehouseDropdown,
    filteredWarehouses,
    (warehouse) => {
      setWarehouseSearchTerm(warehouse);
      setFormData((prev) => ({ ...prev, customsWarehouse: warehouse }));
      setShowWarehouseDropdown(false);
      if (fieldErrors.customsWarehouse) {
        setFieldErrors((prev) => ({ ...prev, customsWarehouse: null }));
      }
    },
    () => setShowWarehouseDropdown(false),
    'edit-warehouse-dropdown'
  );

  const senderKeyboard = useDropdownKeyboard(
    showSenderDropdown,
    filteredSenders,
    (sender) => {
      setSenderSearchTerm(sender);
      setFormData((prev) => ({ ...prev, senderName: sender }));
      setShowSenderDropdown(false);
      if (fieldErrors.senderName) {
        setFieldErrors((prev) => ({ ...prev, senderName: null }));
      }
    },
    () => setShowSenderDropdown(false),
    'edit-sender-dropdown'
  );

  // Broker firma keyboard navigation (sadece SUPER_ADMIN için)
  const brokerKeyboard = useDropdownKeyboard(
    showBrokerDropdown,
    filteredBrokers,
    (broker) => {
      setBrokerSearchTerm(broker.name);
      setFormData((prev) => ({ ...prev, brokerCompanyId: broker.id }));
      setShowBrokerDropdown(false);
      if (fieldErrors.brokerCompany) {
        setFieldErrors((prev) => ({ ...prev, brokerCompany: null }));
      }
    },
    () => setShowBrokerDropdown(false),
    'edit-broker-dropdown'
  );

  // Client firma keyboard navigation
  const clientKeyboard = useDropdownKeyboard(
    showClientDropdown,
    filteredClients,
    (client) => {
      setClientSearchTerm(client.name);
      setFormData((prev) => ({ ...prev, clientCompanyId: client.id }));
      setShowClientDropdown(false);
      if (fieldErrors.clientCompany) {
        setFieldErrors((prev) => ({ ...prev, clientCompany: null }));
      }
    },
    () => setShowClientDropdown(false),
    'edit-client-dropdown'
  );

  // Broker ve client listelerini yükle (admin için)
  useEffect(() => {
    if (isAdmin) {
      if (isSuperAdmin) {
        loadBrokerCompanies();
      }
      // Mevcut broker ID'si varsa client'ları yükle
      if (formData.brokerCompanyId) {
        loadClientCompanies(formData.brokerCompanyId);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Broker değiştiğinde client'ları yükle (SUPER_ADMIN için). Açılışta çalışmaz: kayıtlı müşteri firması silinmesin,
  // mevcut broker'ın client'larını yukarıdaki etki zaten yüklüyor.
  const previousBrokerIdRef = useRef(formData.brokerCompanyId);
  useEffect(() => {
    if (previousBrokerIdRef.current === formData.brokerCompanyId) return;
    previousBrokerIdRef.current = formData.brokerCompanyId;
    if (isSuperAdmin && formData.brokerCompanyId) {
      loadClientCompanies(formData.brokerCompanyId);
      // Client seçimini temizle
      setFormData((prev) => ({
        ...prev,
        clientCompanyId: "",
      }));
      setClientSearchTerm("");
    }
  }, [formData.brokerCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Broker arama filtresi
  useEffect(() => {
    if (brokerSearchTerm.trim() === "") {
      setFilteredBrokers(availableBrokers.slice(0, 100));
    } else {
      const searchLower = brokerSearchTerm.toLowerCase();
      const filtered = availableBrokers.filter(
        (broker) =>
          broker.name.toLowerCase().includes(searchLower) ||
          (broker.shortName && broker.shortName.toLowerCase().includes(searchLower))
      );
      setFilteredBrokers(filtered.slice(0, 100));
    }
  }, [brokerSearchTerm, availableBrokers]);

  // Client arama filtresi
  useEffect(() => {
    if (clientSearchTerm.trim() === "") {
      setFilteredClients(availableClients.slice(0, 100));
    } else {
      const searchLower = clientSearchTerm.toLowerCase();
      const filtered = availableClients.filter((client) =>
        client.name.toLowerCase().includes(searchLower)
      );
      setFilteredClients(filtered.slice(0, 100));
    }
  }, [clientSearchTerm, availableClients]);

  // Gönderici, gümrük ve antrepo listelerini yükle
  useEffect(() => {
    if (!isReadOnly) {
      loadSendersAndWarehouses();
      loadCustoms();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Gönderici arama filtresi
  useEffect(() => {
    if (senderSearchTerm.trim() === "") {
      setFilteredSenders(availableSenders.slice(0, 50));
    } else {
      const searchLower = senderSearchTerm.toLowerCase();
      const filtered = availableSenders.filter((sender) =>
        sender.toLowerCase().includes(searchLower)
      );
      setFilteredSenders(filtered.slice(0, 50));
    }
  }, [senderSearchTerm, availableSenders]);

  // Gümrük arama filtresi
  useEffect(() => {
    if (customsSearchTerm.trim() === "") {
      setFilteredCustoms(availableCustoms.slice(0, 50));
    } else {
      const searchLower = customsSearchTerm.toLowerCase();
      const filtered = availableCustoms.filter((customs) =>
        customs.customsShortName.toLowerCase().includes(searchLower) ||
        customs.customsName.toLowerCase().includes(searchLower)
      );
      setFilteredCustoms(filtered.slice(0, 50));
    }
  }, [customsSearchTerm, availableCustoms]);

  // Antrepo arama filtresi
  useEffect(() => {
    if (warehouseSearchTerm.trim() === "") {
      setFilteredWarehouses(availableWarehouses.slice(0, 50));
    } else {
      const searchLower = warehouseSearchTerm.toLowerCase();
      const filtered = availableWarehouses.filter((warehouse) =>
        warehouse.toLowerCase().includes(searchLower)
      );
      setFilteredWarehouses(filtered.slice(0, 50));
    }
  }, [warehouseSearchTerm, availableWarehouses]);

  // Gönderici dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById("edit-sender-dropdown-container");
      if (dropdown && !dropdown.contains(event.target)) {
        setShowSenderDropdown(false);
      }
    };

    if (showSenderDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSenderDropdown]);

  // Gümrük dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById("edit-customs-dropdown-container");
      if (dropdown && !dropdown.contains(event.target)) {
        setShowCustomsDropdown(false);
      }
    };

    if (showCustomsDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCustomsDropdown]);

  // Antrepo dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById("edit-warehouse-dropdown-container");
      if (dropdown && !dropdown.contains(event.target)) {
        setShowWarehouseDropdown(false);
      }
    };

    if (showWarehouseDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showWarehouseDropdown]);

  // Tarihlerdeki değişikliklerde gecikmeleri hesapla
  useEffect(() => {
    const calculateDelays = () => {
      const newDelays = {
        arrivalToRegistration: false,
        registrationToClosure: false,
        closureToWithdrawal: false,
      };

      // Delay #1: warehouseArrivalDate → registrationDate
      if (formData.warehouseArrivalDate && formData.registrationDate) {
        const arrival = new Date(formData.warehouseArrivalDate);
        const registration = new Date(formData.registrationDate);
        const daysDiff = Math.floor((registration - arrival) / (1000 * 60 * 60 * 24));
        newDelays.arrivalToRegistration = daysDiff > 4;
      }

      // Delay #2: registrationDate → lineClosureDate
      if (formData.registrationDate && formData.lineClosureDate) {
        const registration = new Date(formData.registrationDate);
        const closure = new Date(formData.lineClosureDate);
        const daysDiff = Math.floor((closure - registration) / (1000 * 60 * 60 * 24));
        newDelays.registrationToClosure = daysDiff > 4;
      }

      // Delay #3: lineClosureDate → withdrawalDate
      if (formData.lineClosureDate && formData.withdrawalDate) {
        const closure = new Date(formData.lineClosureDate);
        const withdrawal = new Date(formData.withdrawalDate);
        const daysDiff = Math.floor((withdrawal - closure) / (1000 * 60 * 60 * 24));
        newDelays.closureToWithdrawal = daysDiff > 4;
      }

      setDelays(newDelays);
    };

    calculateDelays();
  }, [
    formData.warehouseArrivalDate,
    formData.registrationDate,
    formData.lineClosureDate,
    formData.withdrawalDate,
  ]);

  // İthalat işlem süresini hesapla (sadece INSPECTION için)
  useEffect(() => {
    if (isInspectionStatus && formData.registrationDate && formData.lineClosureDate) {
      const regDate = new Date(formData.registrationDate);
      const closureDate = new Date(formData.lineClosureDate);

      // Gün farkını hesapla (backend ile aynı mantık)
      const diffTime = Math.abs(closureDate - regDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setCalculatedProcessingTime(diffDays);
    } else {
      setCalculatedProcessingTime(null);
    }
  }, [formData.registrationDate, formData.lineClosureDate, isInspectionStatus]);

  // Clear general error message when all field errors are resolved
  useEffect(() => {
    if (!Object.values(fieldErrors).some(Boolean) && error) {
      setError("");
    }
  }, [fieldErrors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mevcut işlemlerden unique gönderici ve antrepo isimlerini tek API çağrısında yükle
  const loadSendersAndWarehouses = async () => {
    try {
      setLoadingSenders(true);
      setLoadingWarehouses(true);
      const result = await transactionService.getAllTransactions();

      if (result.success) {
        const uniqueSenders = [...new Set(
          result.data
            .map((tx) => tx.senderName)
            .filter((name) => name && name.trim() !== "")
        )].sort((a, b) => a.localeCompare(b, 'tr'));

        const uniqueWarehouses = [...new Set(
          result.data
            .map((tx) => tx.customsWarehouse)
            .filter((name) => name && name.trim() !== "")
        )].sort((a, b) => a.localeCompare(b, 'tr'));

        setAvailableSenders(uniqueSenders);
        setFilteredSenders(uniqueSenders.slice(0, 50));
        setAvailableWarehouses(uniqueWarehouses);
        setFilteredWarehouses(uniqueWarehouses.slice(0, 50));
      } else {
        setAvailableSenders([]);
        setFilteredSenders([]);
        setAvailableWarehouses([]);
        setFilteredWarehouses([]);
      }
    } catch (err) {
      logError("Gönderici ve antrepo listesi yükleme", err);
      setAvailableSenders([]);
      setFilteredSenders([]);
      setAvailableWarehouses([]);
      setFilteredWarehouses([]);
    } finally {
      setLoadingSenders(false);
      setLoadingWarehouses(false);
    }
  };

  // Aktif gümrük idarelerini yükle
  const loadCustoms = async () => {
    try {
      setLoadingCustoms(true);
      const result = await customsService.getActiveCustoms();

      if (result.success) {
        setAvailableCustoms(result.data);
        setFilteredCustoms(result.data.slice(0, 50));
      } else {
        setAvailableCustoms([]);
        setFilteredCustoms([]);
      }
    } catch (err) {
      logError("Gümrük listesi yükleme", err);
      setAvailableCustoms([]);
      setFilteredCustoms([]);
    } finally {
      setLoadingCustoms(false);
    }
  };

  // Broker firma listesini yükle (sadece SUPER_ADMIN için)
  const loadBrokerCompanies = async () => {
    try {
      setLoadingBrokers(true);
      const result = await companyService.getAllCompanies();

      if (result.success) {
        const brokers = result.data.filter(
          (c) => c.companyType === "CUSTOMS_BROKER"
        );
        setAvailableBrokers(brokers);
        setFilteredBrokers(brokers.slice(0, 100));
      } else {
        setAvailableBrokers([]);
        setFilteredBrokers([]);
      }
    } catch (err) {
      logError("Broker listesi yükleme", err);
      setAvailableBrokers([]);
      setFilteredBrokers([]);
    } finally {
      setLoadingBrokers(false);
    }
  };

  // Client firma listesini yükle
  const loadClientCompanies = async (brokerId) => {
    try {
      setLoadingClients(true);

      const result = await companyService.getClientCompanies(brokerId);

      if (result.success) {
        setAvailableClients(result.data);
        setFilteredClients(result.data.slice(0, 100));
      } else {
        setAvailableClients([]);
        setFilteredClients([]);
      }
    } catch (err) {
      logError("Client listesi yükleme", err);
      setAvailableClients([]);
      setFilteredClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  // Number formatlama yardımcı fonksiyonları — ayraçlar seçili dilden gelir (bkz. utils/numberInput.js)
  const formatNumber = (value, decimals = 2) => formatLocaleNumber(value, decimals, locale);
  const parseFormattedNumber = (formattedValue) => parseLocaleNumber(formattedValue, locale);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Weight değeri için özel handler (formatlama ile)
  const handleWeightChange = (e) => {
    const inputValue = e.target.value;

    // Clear error when user types
    if (fieldErrors.weight) {
      setFieldErrors(prev => ({ ...prev, weight: null }));
    }

    // Display değerini güncelle
    setDisplayWeight(inputValue);

    // Boş değere izin ver
    if (inputValue === '') {
      setFormData(prev => ({ ...prev, weight: '' }));
      return;
    }

    // Parse et ve formData'ya kaydet
    const parsedValue = parseFormattedNumber(inputValue);
    if (parsedValue !== "") {
      setFormData(prev => ({ ...prev, weight: parsedValue }));
    }
  };

  const handleWeightBlur = () => {
    // onBlur'da formatla ve göster
    if (formData.weight) {
      setDisplayWeight(formatNumber(formData.weight, 2));
    }
  };

  const handleWeightFocus = () => {
    // onFocus'ta ham değeri göster
    if (formData.weight) {
      setDisplayWeight(toEditableNumber(formData.weight, locale));
    }
  };

  // Vergi değeri için özel handler (formatlama + maksimum 4 ondalık basamak)
  const handleTaxChange = (e) => {
    const inputValue = e.target.value;

    // Clear error when user types (vergi/teminat ortak hatası, ikisini de temizle)
    if (fieldErrors.tax || fieldErrors.guaranteeAmount) {
      setFieldErrors(prev => ({ ...prev, tax: null, guaranteeAmount: null }));
    }

    // Display değerini güncelle
    setDisplayTax(inputValue);

    // Boş değere izin ver
    if (inputValue === '') {
      setFormData(prev => ({ ...prev, tax: '' }));
      return;
    }

    // Parse et
    const parsedValue = parseFormattedNumber(inputValue);
    if (parsedValue !== "") {
      // Maksimum 2 ondalık basamak kontrolü
      const valueStr = parsedValue.toString();
      const parts = valueStr.split(',');
      if (parts.length === 2 && parts[1].length > 2) {
        // 2 haneden fazla ondalık varsa, 2 haneye kısalt
        const truncatedValue = parseFloat(`${parts[0]}.${parts[1].substring(0, 2)}`);
        setFormData(prev => ({ ...prev, tax: truncatedValue }));
        setDisplayTax(truncatedValue.toString());
      } else {
        setFormData(prev => ({ ...prev, tax: parsedValue }));
      }
    }
  };

  const handleTaxBlur = () => {
    // onBlur'da formatla ve göster
    if (formData.tax) {
      setDisplayTax(formatNumber(formData.tax, 2));
    }
  };

  const handleTaxFocus = () => {
    // onFocus'ta ham değeri göster
    if (formData.tax) {
      setDisplayTax(toEditableNumber(formData.tax, locale));
    }
  };

  // Teminat değeri için özel handler (vergi ile aynı formatlama, ancak zorunlu değil)
  const handleGuaranteeAmountChange = (e) => {
    const inputValue = e.target.value;

    // Clear error when user types (vergi/teminat ortak hatası, ikisini de temizle)
    if (fieldErrors.tax || fieldErrors.guaranteeAmount) {
      setFieldErrors(prev => ({ ...prev, tax: null, guaranteeAmount: null }));
    }

    // Display değerini güncelle
    setDisplayGuaranteeAmount(inputValue);

    // Boş değere izin ver (teminatsız evraklar)
    if (inputValue === '') {
      setFormData(prev => ({ ...prev, guaranteeAmount: '' }));
      return;
    }

    // Parse et
    const parsedValue = parseFormattedNumber(inputValue);
    if (parsedValue !== "") {
      // Maksimum 2 ondalık basamak kontrolü
      const valueStr = parsedValue.toString();
      const parts = valueStr.split(',');
      if (parts.length === 2 && parts[1].length > 2) {
        // 2 haneden fazla ondalık varsa, 2 haneye kısalt
        const truncatedValue = parseFloat(`${parts[0]}.${parts[1].substring(0, 2)}`);
        setFormData(prev => ({ ...prev, guaranteeAmount: truncatedValue }));
        setDisplayGuaranteeAmount(truncatedValue.toString());
      } else {
        setFormData(prev => ({ ...prev, guaranteeAmount: parsedValue }));
      }
    }
  };

  const handleGuaranteeAmountBlur = () => {
    // onBlur'da formatla ve göster
    if (formData.guaranteeAmount) {
      setDisplayGuaranteeAmount(formatNumber(formData.guaranteeAmount, 2));
    }
  };

  const handleGuaranteeAmountFocus = () => {
    // onFocus'ta ham değeri göster
    if (formData.guaranteeAmount) {
      setDisplayGuaranteeAmount(toEditableNumber(formData.guaranteeAmount, locale));
    }
  };

  // Bugünün tarihini yerel saat dilimine göre al (timezone sorunu olmadan)
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Tarih validasyonu - gelecekteki tarihleri engelle
  const handleDateChange = (e) => {
    const { name, value } = e.target;

    // Clear any existing error for this field
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }

    // Clear general error
    if (error) {
      setError("");
    }

    // Tarih alanlarında yıl henüz tam girilmemişse (browser ara değer: 0002, 0020 vb.) validasyonu atla
    const DATE_FIELDS = ['warehouseArrivalDate', 'registrationDate', 'lineClosureDate', 'withdrawalDate'];
    if (value && DATE_FIELDS.includes(name)) {
      const year = parseInt(value.substring(0, 4), 10);
      if (year < 1900) {
        setFormData(prev => ({ ...prev, [name]: value }));
        return; // kullanıcı yılı yazmaya devam ediyor, validasyon atla
      }
    }

    // Tarih boşsa validasyon yapma
    if (!value) {
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    // Gelecek tarih kontrolü
    const todayString = getTodayDateString();
    if (value > todayString) {
      const errorMessages = {
        warehouseArrivalDate: t("transactions.validation.warehouseArrivalDateFuture"),
        registrationDate: t("transactions.validation.registrationDateFuture"),
        lineClosureDate: t("transactions.validation.lineClosureDateFuture"),
        withdrawalDate: t("transactions.validation.withdrawalDateFuture")
      };

      setFieldErrors(prev => ({
        ...prev,
        [name]: errorMessages[name] || t("transactions.validation.dateFuture")
      }));
      return;
    }

    // Tarih sıralaması kontrolü
    const newFormData = { ...formData, [name]: value };

    if (name === 'warehouseArrivalDate' && newFormData.registrationDate) {
      if (value > newFormData.registrationDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: t("transactions.validation.arrivalAfterRegistration")
        }));
        return;
      }
    }

    if (name === 'registrationDate') {
      if (newFormData.warehouseArrivalDate && value < newFormData.warehouseArrivalDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: t("transactions.validation.registrationBeforeArrival")
        }));
        return;
      }
      if (newFormData.lineClosureDate && value > newFormData.lineClosureDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: t("transactions.validation.registrationAfterClosure")
        }));
        return;
      }
    }

    if (name === 'lineClosureDate') {
      if (newFormData.registrationDate && value < newFormData.registrationDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: t("transactions.validation.closureBeforeRegistration")
        }));
        return;
      }
      if (newFormData.withdrawalDate && value > newFormData.withdrawalDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: t("transactions.validation.closureAfterWithdrawal")
        }));
        return;
      }
    }

    if (name === 'withdrawalDate' && newFormData.lineClosureDate) {
      if (value < newFormData.lineClosureDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: t("transactions.validation.withdrawalBeforeClosure")
        }));
        return;
      }
    }

    // Validasyon geçtiyse değeri kaydet
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Gönderici seçildiğinde
  const handleSenderSelect = (senderName) => {
    setFormData((prev) => ({
      ...prev,
      senderName: senderName,
    }));
    setSenderSearchTerm(senderName);
    setShowSenderDropdown(false);
    // Clear error when sender is selected
    if (fieldErrors.senderName) {
      setFieldErrors(prev => ({ ...prev, senderName: null }));
    }
  };

  // Yeni gönderici ekle - BÜYÜK HARFE ÇEVİR
  const handleAddNewSender = () => {
    if (senderSearchTerm.trim()) {
      const upperCaseSender = toUpperCase(senderSearchTerm.trim(), locale);
      setFormData((prev) => ({
        ...prev,
        senderName: upperCaseSender,
      }));
      setSenderSearchTerm(upperCaseSender);
      setShowSenderDropdown(false);
    }
  };

  // Gümrük seçildiğinde
  const handleCustomsSelect = (customs) => {
    setFormData((prev) => ({
      ...prev,
      customsId: customs.id,
    }));
    setSelectedCustomsId(customs.id);
    setCustomsSearchTerm(customs.customsShortName);
    setShowCustomsDropdown(false);
    // Clear error when customs is selected
    if (fieldErrors.customsId) {
      setFieldErrors(prev => ({ ...prev, customsId: null }));
    }
  };

  // Antrepo seçildiğinde
  const handleWarehouseSelect = (warehouseName) => {
    setFormData((prev) => ({
      ...prev,
      customsWarehouse: warehouseName,
    }));
    setWarehouseSearchTerm(warehouseName);
    setShowWarehouseDropdown(false);
    // Clear error when warehouse is selected
    if (fieldErrors.customsWarehouse) {
      setFieldErrors(prev => ({ ...prev, customsWarehouse: null }));
    }
  };

  // Yeni antrepo ekle - BÜYÜK HARFE ÇEVİR
  const handleAddNewWarehouse = () => {
    if (warehouseSearchTerm.trim()) {
      const upperCaseWarehouse = toUpperCase(warehouseSearchTerm.trim(), locale);
      setFormData((prev) => ({
        ...prev,
        customsWarehouse: upperCaseWarehouse,
      }));
      setWarehouseSearchTerm(upperCaseWarehouse);
      setShowWarehouseDropdown(false);
    }
  };

  // Hat seçeneği için görüntüleme metni (büyük harf)
  const getGateDisplayLabel = (option) => {
    return `${option.emoji} ${t(option.labelKey)}`;
  };

  // Gecikme nedeni validasyon fonksiyonu
  const validateDelayReason = (fieldName, value) => {
    const trimmedValue = value.trim();

    // Boş değere izin ver (kullanıcı temizleyebilir)
    if (trimmedValue.length === 0) {
      // Error'ı temizle
      if (fieldErrors[fieldName]) {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
      return;
    }

    // 10 karakterden az ise hata göster
    if (trimmedValue.length < 10) {
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: t("transactions.delay.minLength")
      }));
    } else {
      // Hata varsa temizle
      if (fieldErrors[fieldName]) {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    }
  };

  // Validate required fields
  const validateRequiredFields = () => {
    const errors = {};

    // Admin kullanıcılar için broker ve client company zorunlu
    if (isAdmin) {
      if (isSuperAdmin && !formData.brokerCompanyId) {
        errors.brokerCompany = t("transactions.validation.brokerRequired");
      }
      if (!formData.clientCompanyId) {
        errors.clientCompany = t("transactions.validation.clientRequired");
      }
    }

    // Check each required field - only add error if field is empty
    if (!formData.fileNo || !formData.fileNo.trim()) {
      errors.fileNo = t("transactions.validation.fileNoRequired");
    }
    if (!formData.customsId) {
      errors.customsId = t("transactions.validation.customsRequired");
    }
    if (!warehouseSearchTerm || !warehouseSearchTerm.trim()) {
      errors.customsWarehouse = t("transactions.validation.warehouseRequired");
    }
    if (!formData.containerAmount) {
      errors.containerAmount = t("transactions.validation.containerAmountRequired");
    }
    if (!formData.gate) {
      errors.gate = t("transactions.validation.gateRequired");
    }
    if (!formData.weight) {
      errors.weight = t("transactions.validation.weightRequired");
    }
    // Bir evrak peşin vergili, teminatlı ya da ikisi birden olabilir: en az biri dolu olmalı
    const isEmptyAmount = (value) => value === '' || value === null || value === undefined;
    if (isEmptyAmount(formData.tax) && isEmptyAmount(formData.guaranteeAmount)) {
      errors.tax = t("transactions.validation.taxOrGuaranteeRequired");
      errors.guaranteeAmount = t("transactions.validation.taxOrGuaranteeRequired");
    }
    if (!senderSearchTerm || !senderSearchTerm.trim()) {
      errors.senderName = t("transactions.validation.senderRequired");
    }
    if (!formData.warehouseArrivalDate) {
      errors.warehouseArrivalDate = t("transactions.validation.arrivalDateRequired");
    }

    // Beyanname No ve Tescil Tarihi birbirine bağlı validasyon
    const hasDeclarationNumber = formData.declarationNumber && formData.declarationNumber.trim();
    const hasRegistrationDate = formData.registrationDate;

    if (hasDeclarationNumber && !hasRegistrationDate) {
      errors.registrationDate = t("transactions.validation.registrationDateRequired");
    }
    if (hasRegistrationDate && !hasDeclarationNumber) {
      errors.declarationNumber = t("transactions.validation.declarationNumberRequired");
    }

    // Beyanname numarası 18 karakter kontrolü
    if (hasDeclarationNumber && formData.declarationNumber.trim().length !== 18) {
      errors.declarationNumber = t("transactions.validation.declarationNumberLength");
    }

    // Çekilme tarihi varsa kapanma tarihi de olmalı — sunucudaki kuralın aynısı.
    // Kural eskiden kaydın durumuna bağlıydı ("CP_COMPLETED ise kapanma tarihi zorunlu"): bu, yanlışlıkla girilmiş
    // bir kapanma/çekilme tarihini silmenin önünü tıkıyordu, yani yanlış kapanan dosya bir daha açılamıyordu.
    // Alanlara zaten yalnızca yönetici dokunabiliyor (isFieldLocked), tarihleri temizlemek durumu geri yürütür.
    if (formData.withdrawalDate && !formData.lineClosureDate) {
      errors.lineClosureDate = t("transactions.validation.closureDateRequiredWithdrawn");
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    setLoading(true);
    setError("");

    // Temizlenen hatalar state'te null olarak kalıyor: yalnızca dolu mesajlar sayılır. Girilirken oluşan hatalar
    // (tarih sırası, gecikme nedeni) korunur; zorunluluk hataları her kaydette yeniden hesaplanır.
    const requiredErrors = validateRequiredFields();
    const pendingErrors = Object.fromEntries(
      Object.entries(fieldErrors).filter(([key, message]) => message && !PRESENCE_ERROR_KEYS.includes(key))
    );

    if (Object.keys(requiredErrors).length > 0) {
      setFieldErrors({ ...pendingErrors, ...requiredErrors });
      setLoading(false);
      showError(t("transactions.form.fillRequired"));
      return;
    }

    setFieldErrors(pendingErrors);
    if (Object.keys(pendingErrors).length > 0) {
      setLoading(false);
      showError(t("transactions.form.fixErrors"));
      return;
    }

    try {

      // Gecikme nedenleri için minimum karakter kontrolü
      if (delays.arrivalToRegistration && formData.delayReasons?.arrivalToRegistration) {
        const reason = formData.delayReasons.arrivalToRegistration.trim();
        if (reason.length > 0 && reason.length < 10) {
          showError(t("transactions.delay.arrivalToRegistrationMin"));
          setLoading(false);
          return;
        }
      }

      if (delays.registrationToClosure && formData.delayReasons?.registrationToClosure) {
        const reason = formData.delayReasons.registrationToClosure.trim();
        if (reason.length > 0 && reason.length < 10) {
          showError(t("transactions.delay.registrationToClosureMin"));
          setLoading(false);
          return;
        }
      }

      if (delays.closureToWithdrawal && formData.delayReasons?.closureToWithdrawal) {
        const reason = formData.delayReasons.closureToWithdrawal.trim();
        if (reason.length > 0 && reason.length < 10) {
          showError(t("transactions.delay.closureToWithdrawalMin"));
          setLoading(false);
          return;
        }
      }

      // Kapanmış bir işlemi yeniden açmak gerekçe ister; sunucu da istiyor
      // (400 TRANSACTION_REOPEN_REASON_REQUIRED). Gerekçe kaydın üstünde durmaz, audit log'a düşer.
      let reopenReason = null;
      if (isClosedRecord) {
        // confirmDialog ayrı bir React kökünde çiziliyor: gerekçe state'e değil buraya yazılır.
        const values = { reason: "" };
        const confirmed = await confirmDialog({
          title: t("transactions.reopen.title"),
          message: t("transactions.reopen.message", { fileNo: transaction.fileNo }),
          details: [t("transactions.reopen.audited")],
          intent: "warning",
          icon: "lock_open",
          confirmText: t("transactions.reopen.confirm"),
          content: <ReopenReasonField onChange={(value) => { values.reason = value; }} />,
        });
        if (!confirmed) return;
        reopenReason = values.reason.trim();
        if (!reopenReason) {
          showError(t("transactions.reopen.reasonRequired"));
          return;
        }
      } else {
        // Bir dosyayı kapatacak tarih ilk kez giriliyor: hangi dosyanın kapanacağını adıyla sor. Bu pencere,
        // bir üst satırın dosyasına yanlışlıkla girilen tarihi yakalamak için var.
        const addsWithdrawal = !transaction.withdrawalDate && !!formData.withdrawalDate;
        const addsClosure = !transaction.lineClosureDate && !!formData.lineClosureDate;
        if (addsWithdrawal || addsClosure) {
          const confirmed = await confirmDialog({
            title: t("transactions.closeConfirm.title"),
            message: t(addsWithdrawal
              ? "transactions.closeConfirm.messageWithdrawal"
              : "transactions.closeConfirm.messageClosure", {
              fileNo: transaction.fileNo,
              client: transaction.clientCompany?.name || "—",
            }),
            intent: "warning",
            icon: "event_busy",
            confirmText: t("transactions.closeConfirm.confirm"),
          });
          if (!confirmed) return;
        }
      }

      // Gövde bekleyen değişikliğin "Uygula"sıyla aynı yerden gelir (transactionDraftFields.js)
      const cleanedData = buildTransactionUpdatePayload(formData, locale);
      if (reopenReason) cleanedData.reopenReason = reopenReason;

      const result = await transactionService.updateTransaction(transaction.id, cleanedData);

      if (result.success) {
        // Bu kayda ait kendi taslağımız varsa değişiklik uygulandı, taslak gereksiz
        discardDraft();
        showSuccess(t(reopenReason ? "transactions.reopen.success" : "transactions.form.updateSuccess"));
        onSuccess();
      } else if (isConcurrentUpdate(result)) {
        // Kayıt tam bu sırada değişti: taslak durur, bant uyarıya döner, kullanıcı karşılaştırıp yeniden kaydeder.
        draftPrefill.reportConflict();
        setError(t("drafts.pending.concurrentUpdate"));
        showError(t("drafts.pending.concurrentUpdate"));
      } else {
        handleApiResponse(result, null, setError, "İşlem güncelleme");
      }
    } catch (err) {
      handleError(err, setError, "İşlem güncelleme", t("transactions.form.updateError"));
    } finally {
      setLoading(false);
    }
  };

  // Auto-focus first enabled input when modal opens (if not read-only)
  useEffect(() => {
    if (!isReadOnly && modalRef.current) {
      // Delay to ensure modal animation and data loading is complete
      const timer = setTimeout(() => {
        // Use requestAnimationFrame to wait for all renders to complete
        requestAnimationFrame(() => {
          if (modalRef.current) {
            // Açılır liste input'ları odaklanınca listeyi açıyor: düzenleme açılırken liste açılmasın, ilk düz alana odaklan
            const firstInput = [...modalRef.current.querySelectorAll('input:not([disabled])')]
              .find((input) => !input.closest('[id$="-dropdown-container"]'));
            if (firstInput) {
              firstInput.focus();
            }
          }
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isReadOnly]);

  // Kapatma koruması (salt okunur görünümde kapalı). Seçim alanlarında (broker, müşteri, gümrük) değer id'dir; arama
  // metni yalnızca seçim yokken sayılır. Sayıların görüntü metni odak/blur'da yeniden biçimlendiği için yalnızca sayı
  // değeri boşken sayılır (ayrıştırılamayan giriş); ayrıştırılan değer zaten formData'da.
  const unsavedValues = useMemo(() => ({
    formData,
    brokerSearch: formData.brokerCompanyId ? "" : brokerSearchTerm,
    clientSearch: formData.clientCompanyId ? "" : clientSearchTerm,
    customsSearch: formData.customsId ? "" : customsSearchTerm,
    senderSearchTerm,
    warehouseSearchTerm,
    displayWeight: formData.weight === "" ? displayWeight : "",
    displayTax: formData.tax === "" ? displayTax : "",
    displayGuaranteeAmount: formData.guaranteeAmount === "" ? displayGuaranteeAmount : "",
  }), [formData, brokerSearchTerm, clientSearchTerm, customsSearchTerm, senderSearchTerm, warehouseSearchTerm,
    displayWeight, displayTax, displayGuaranteeAmount]);

  // Bekleyen değişiklik taslağı: kaydın id'si hedef, açılıştaki `updatedAt` çakışma ölçüsü. Aynı kayıtta kendi açık
  // taslağımız varsa yenisi açılmaz, o güncellenir (`existingDraft`).
  const [existingDraft, setExistingDraft] = useState(null);
  const { draftsEnabled, isDraftPilot, saveDraft, savingDraft, discardDraft } = useRecordDraft({
    module: DRAFT_MODULES.TRANSACTION,
    currentUser,
    initialDraft: existingDraft,
    targetId: transaction.id,
    baseUpdatedAt: transaction.updatedAt || null,
    getSnapshot: () => ({
      payload: {
        formData,
        brokerSearchTerm,
        clientSearchTerm,
        customsSearchTerm,
        senderSearchTerm,
        warehouseSearchTerm,
        displayWeight,
        displayTax,
        displayGuaranteeAmount,
        // Taslak alındığı andaki kayıt. Taslağın *farkı* bununla bulunur: uygulanırken yalnızca bu tabana göre
        // değişmiş alanlar yazılır, geri kalanı kaydın o anki değerinde kalır.
        base: transactionRecordToPayload(transaction),
      },
      label: buildDraftLabel([
        toUpperCase(formData.fileNo || "", locale),
        formData.clientCompanyId ? clientSearchTerm : "",
      ], DRAFT_MODULES.TRANSACTION),
    }),
  });

  // Taslağın form görüntüsü: aynı alanlar kaydederken de kullanılıyor, böylece yüklenen ile kaydedilen ayrışamaz.
  const applyDraftPayload = (payload) => {
    const draftForm = transactionPayloadToFormData(payload, transaction);
    // Broker taslakta değiştiyse "broker değişti → müşteriyi temizle" etkisi taslağın müşterisini silmesin:
    // önceki broker'ı taslağınki sayıp müşteri listesini elle yükleriz.
    const brokerChanged = String(previousBrokerIdRef.current || "") !== String(draftForm.brokerCompanyId || "");
    previousBrokerIdRef.current = draftForm.brokerCompanyId;
    if (brokerChanged && isSuperAdmin && draftForm.brokerCompanyId) loadClientCompanies(draftForm.brokerCompanyId);
    setFormData(draftForm);
    setBrokerSearchTerm(draftText(payload, "brokerSearchTerm", transaction.brokerCompany?.name || ""));
    setClientSearchTerm(draftText(payload, "clientSearchTerm", transaction.clientCompany?.name || ""));
    setCustomsSearchTerm(draftText(payload, "customsSearchTerm", transaction.customs?.customsShortName || ""));
    setSelectedCustomsId(draftForm.customsId || null);
    setSenderSearchTerm(draftText(payload, "senderSearchTerm", transaction.senderName || ""));
    setWarehouseSearchTerm(draftText(payload, "warehouseSearchTerm", transaction.customsWarehouse || ""));
    // Sayı alanının görüntü metni seçili dilde yeniden biçimlenir; ayrıştırılamamış giriş taslaktaki gibi kalır.
    const display = (value, key) => (value !== "" && value != null
      ? formatNumber(value, 2)
      : draftText(payload, key));
    setDisplayWeight(display(draftForm.weight, "displayWeight"));
    setDisplayTax(display(draftForm.tax, "displayTax"));
    setDisplayGuaranteeAmount(display(draftForm.guaranteeAmount, "displayGuaranteeAmount"));
    setFieldErrors({});
    setError("");
  };

  // "Orijinali yükle" ve "Taslağı sil": form kaydın açılıştaki hâline döner.
  const resetFormToRecord = () => {
    previousBrokerIdRef.current = baseFormData.brokerCompanyId;
    setFormData(baseFormData);
    setBrokerSearchTerm(transaction.brokerCompany?.name || "");
    setClientSearchTerm(transaction.clientCompany?.name || "");
    setCustomsSearchTerm(transaction.customs?.customsShortName || "");
    setSelectedCustomsId(transaction.customs?.id || null);
    setSenderSearchTerm(transaction.senderName || "");
    setWarehouseSearchTerm(transaction.customsWarehouse || "");
    // Modal açılırkenki görüntünün aynısı (vergi ve teminatta 4 ondalığa kadar)
    const openingNumber = (value, max) => (value
      ? value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: max })
      : "");
    setDisplayWeight(openingNumber(transaction.weight, 2));
    setDisplayTax(openingNumber(transaction.tax, 4));
    setDisplayGuaranteeAmount(openingNumber(transaction.guaranteeAmount, 4));
    setFieldErrors({});
    setError("");
  };

  const draftCompareFields = useMemo(() => transactionDraftFields(), []);

  const draftPrefill = useEditDraftPrefill({
    enabled: draftsEnabled && !isReadOnly,
    module: DRAFT_MODULES.TRANSACTION,
    targetId: transaction.id,
    record: transaction,
    fields: draftCompareFields,
    recordToFields: transactionRecordToFields,
    payloadToFields: transactionPayloadToFields,
    recordToPayload: transactionRecordToPayload,
    onDraftFound: setExistingDraft,
    applyPayload: applyDraftPayload,
    resetToRecord: resetFormToRecord,
    discardDraft,
  });

  const { requestClose, isDirty } = useUnsavedChangesGuard({
    values: unsavedValues,
    onClose,
    enabled: !isReadOnly,
    onSaveDraft: isReadOnly ? undefined : saveDraft,
  });

  const handleSaveDraftAndClose = async () => {
    if (await saveDraft?.()) onClose();
  };

  // Keyboard shortcuts: ESC to close (through the guard), CTRL+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC to close modal — üstte taslak karşılaştırması açıksa ESC onundur
      if (e.key === 'Escape') {
        if (!draftPrefill.compareOpen) requestClose();
        return;
      }

      // CTRL+S (or CMD+S on Mac) to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!loading && !isReadOnly) {
          handleSubmit(e);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, isReadOnly, requestClose, draftPrefill.compareOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
      onClick={requestClose}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 transition-colors duration-300">
            <div>
              <h2 className="text-2xl font-bold text-text-main">
                {isReadOnly ? t('transaction.details') : t('transaction.edit')}
              </h2>
              <p className="text-text-secondary text-sm mt-1">
                {t('transaction.fileNo')}: {transaction.fileNo}
              </p>
            </div>
            <button
              onClick={requestClose}
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-text-secondary">close</span>
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            {/* Kendi bekleyen taslağınız formda (DRAFTS) */}
            {draftPrefill.active && (
              <EditDraftBanner
                prefill={draftPrefill}
                module={DRAFT_MODULES.TRANSACTION}
                record={transaction}
                fields={draftCompareFields}
                recordToFields={transactionRecordToFields}
                payloadToFields={transactionPayloadToFields}
                recordToPayload={transactionRecordToPayload}
                className="mb-6"
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Firma Bilgileri - Admin için düzenlenebilir, diğerleri için read-only */}
              {!isAdmin ? (
                // Normal kullanıcılar için read-only
                <div className="flex flex-col w-full lg:col-span-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-text-secondary text-sm font-medium pb-2">
                        {t('transaction.brokerCompany')}
                      </p>
                      <p className="text-text-main font-semibold">
                        {transaction.brokerCompany?.name || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary text-sm font-medium pb-2">
                        {t('transaction.clientCompany')}
                      </p>
                      <p className="text-text-main font-semibold">
                        {transaction.clientCompany?.name || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Admin kullanıcılar için düzenlenebilir dropdownlar
                <>
                  {/* BROKER FİRMASI - SADECE SUPER_ADMIN için */}
                  {isSuperAdmin && (
                    <div className="flex flex-col w-full lg:col-span-3">
                      <div className="flex items-center justify-between pb-2">
                        <p className="text-text-main text-sm font-medium">
                          {t("transaction.brokerCompany")} *
                          {loadingBrokers && (
                            <span className="text-xs text-blue-600 ml-2 animate-pulse">
                              {t("common.loading")}
                            </span>
                          )}
                          {!loadingBrokers && availableBrokers.length > 0 && (
                            <span className="text-xs text-gray-500 ml-2">
                              {t("transactions.form.brokersRegistered", { count: availableBrokers.length })}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Aranabilir Broker Input */}
                      <div className="relative" id="edit-broker-dropdown-container">
                        <div className="relative">
                          <input
                            type="text"
                            value={brokerSearchTerm}
                            onChange={(e) => {
                              setBrokerSearchTerm(e.target.value);
                              setShowBrokerDropdown(true);
                              if (fieldErrors.brokerCompany) {
                                setFieldErrors(prev => ({ ...prev, brokerCompany: null }));
                              }
                            }}
                            onFocus={() => setShowBrokerDropdown(true)}
                            onKeyDown={brokerKeyboard.handleKeyDown}
                            placeholder={t("placeholders.typeToSearch").toLocaleUpperCase(locale)}
                            disabled={loadingBrokers}
                            className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                              fieldErrors.brokerCompany
                                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                            } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                          />

                          {/* Clear Button */}
                          {brokerSearchTerm && (
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => {
                                setBrokerSearchTerm("");
                                setFormData((prev) => ({
                                  ...prev,
                                  brokerCompanyId: "",
                                }));
                                setShowBrokerDropdown(true);
                              }}
                              className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">
                                close
                              </span>
                            </button>
                          )}

                          {/* Dropdown Icon */}
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowBrokerDropdown(!showBrokerDropdown)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            <span className="material-symbols-outlined text-lg">
                              {showBrokerDropdown ? "expand_less" : "expand_more"}
                            </span>
                          </button>
                        </div>

                        {/* Broker Dropdown List */}
                        {showBrokerDropdown && !loadingBrokers && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors">
                            {filteredBrokers.length === 0 ? (
                              <div className="p-4 text-center text-text-secondary">
                                {availableBrokers.length === 0 ? (
                                  <>
                                    <span className="material-symbols-outlined text-4xl mb-2 text-orange-500">
                                      warning
                                    </span>
                                    <p className="text-sm">{t("transactions.form.noBrokers")}</p>
                                  </>
                                ) : (
                                  <>
                                    <span className="material-symbols-outlined text-4xl mb-2">
                                      search_off
                                    </span>
                                    <p className="text-sm">
                                      {t("header.noResultsFor", { query: brokerSearchTerm })}
                                    </p>
                                  </>
                                )}
                              </div>
                            ) : (
                              <>
                                {filteredBrokers.map((broker, index) => (
                                  <button
                                    key={broker.id}
                                    type="button"
                                    data-dropdown-id="edit-broker-dropdown"
                                    data-dropdown-index={index}
                                    onClick={() => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        brokerCompanyId: broker.id,
                                      }));
                                      setBrokerSearchTerm(broker.name);
                                      setShowBrokerDropdown(false);
                                      if (fieldErrors.brokerCompany) {
                                        setFieldErrors(prev => ({ ...prev, brokerCompany: null }));
                                      }
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                      formData.brokerCompanyId === broker.id
                                        ? "bg-blue-50 dark:bg-blue-900/20 text-primary font-medium"
                                        : index === brokerKeyboard.highlightedIndex
                                        ? "bg-blue-100 dark:bg-blue-800/30"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate text-text-main">
                                          {broker.name}
                                        </p>
                                        {broker.description && (
                                          <p className="text-xs text-text-secondary truncate mt-0.5">
                                            {broker.description}
                                          </p>
                                        )}
                                      </div>
                                      {formData.brokerCompanyId === broker.id && (
                                        <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                                          check_circle
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                ))}

                                {filteredBrokers.length === 100 && availableBrokers.length > 100 && (
                                  <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-center">
                                    <p className="text-xs text-yellow-800">
                                      {t("transactions.form.firstResults", { count: 100 })}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Error Message */}
                      {fieldErrors.brokerCompany && (
                        <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                          <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                            error
                          </span>
                          <p className="text-sm text-red-700 font-medium">
                            {fieldErrors.brokerCompany}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MÜŞTERİ FİRMASI - Tüm adminler için */}
                  <div className="flex flex-col w-full lg:col-span-3">
                    <div className="flex items-center justify-between pb-2">
                      <p className="text-text-main text-sm font-medium">
                        {t("transaction.clientCompany")} *
                        {loadingClients && (
                          <span className="text-xs text-blue-600 ml-2 animate-pulse">
                            {t("common.loading")}
                          </span>
                        )}
                        {!loadingClients && availableClients.length > 0 && (
                          <span className="text-xs text-gray-500 ml-2">
                            {t("transactions.form.companiesRegistered", { count: availableClients.length })}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* SUPER_ADMIN için uyarı: Önce broker seç */}
                    {isSuperAdmin && !formData.brokerCompanyId && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                        <p className="text-xs text-yellow-800 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">info</span>
                          {t("transactions.form.selectBrokerFirst")}
                        </p>
                      </div>
                    )}

                    {/* Aranabilir Client Input */}
                    <div className="relative" id="edit-client-dropdown-container">
                      <div className="relative">
                        <input
                          type="text"
                          value={clientSearchTerm}
                          onChange={(e) => {
                            setClientSearchTerm(e.target.value);
                            setShowClientDropdown(true);
                            if (fieldErrors.clientCompany) {
                              setFieldErrors(prev => ({ ...prev, clientCompany: null }));
                            }
                          }}
                          onFocus={() => setShowClientDropdown(true)}
                          onKeyDown={clientKeyboard.handleKeyDown}
                          placeholder={t("placeholders.typeToSearch").toLocaleUpperCase(locale)}
                          disabled={loadingClients || (isSuperAdmin && !formData.brokerCompanyId)}
                          className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                            fieldErrors.clientCompany
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                          } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                        />

                        {/* Clear Button */}
                        {clientSearchTerm && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => {
                              setClientSearchTerm("");
                              setFormData((prev) => ({
                                ...prev,
                                clientCompanyId: "",
                              }));
                              setShowClientDropdown(true);
                            }}
                            className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">
                              close
                            </span>
                          </button>
                        )}

                        {/* Dropdown Icon */}
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowClientDropdown(!showClientDropdown)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          <span className="material-symbols-outlined text-lg">
                            {showClientDropdown ? "expand_less" : "expand_more"}
                          </span>
                        </button>
                      </div>

                      {/* Client Dropdown List */}
                      {showClientDropdown && !loadingClients && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors">
                          {filteredClients.length === 0 ? (
                            <div className="p-4 text-center text-text-secondary">
                              {availableClients.length === 0 ? (
                                <>
                                  <span className="material-symbols-outlined text-4xl mb-2 text-orange-500">
                                    warning
                                  </span>
                                  <p className="text-sm">
                                    {isSuperAdmin && !formData.brokerCompanyId
                                      ? t("transactions.form.selectBrokerFirstShort")
                                      : t("transactions.form.noClients")}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-4xl mb-2">
                                    search_off
                                  </span>
                                  <p className="text-sm">
                                    {t("header.noResultsFor", { query: clientSearchTerm })}
                                  </p>
                                </>
                              )}
                            </div>
                          ) : (
                            <>
                              {filteredClients.map((client, index) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  data-dropdown-id="edit-client-dropdown"
                                  data-dropdown-index={index}
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      clientCompanyId: client.id,
                                    }));
                                    setClientSearchTerm(client.name);
                                    setShowClientDropdown(false);
                                    if (fieldErrors.clientCompany) {
                                      setFieldErrors(prev => ({ ...prev, clientCompany: null }));
                                    }
                                  }}
                                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                    formData.clientCompanyId === client.id
                                      ? "bg-blue-50 dark:bg-blue-900/20 text-primary font-medium"
                                      : index === clientKeyboard.highlightedIndex
                                      ? "bg-blue-100 dark:bg-blue-800/30"
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate text-text-main">
                                        {client.name}
                                      </p>
                                      {client.description && (
                                        <p className="text-xs text-text-secondary truncate mt-0.5">
                                          {client.description}
                                        </p>
                                      )}
                                    </div>
                                    {formData.clientCompanyId === client.id && (
                                      <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                                        check_circle
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))}

                              {filteredClients.length === 100 && availableClients.length > 100 && (
                                <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-center">
                                  <p className="text-xs text-yellow-800">
                                    {t("transactions.form.firstResults", { count: 100 })}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Error Message */}
                    {fieldErrors.clientCompany && (
                      <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                        <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                          error
                        </span>
                        <p className="text-sm text-red-700 font-medium">
                          {fieldErrors.clientCompany}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Vekalet Bilgi Paneli */}
              {transaction.clientCompany && (
                <AgreementInfoPanel
                  agreement={transaction.clientCompany.agreementId ? {
                    agreementId: transaction.clientCompany.agreementId,
                    agreementStatus: transaction.clientCompany.agreementStatus,
                    agreementStartDate: transaction.clientCompany.agreementStartDate,
                    agreementEndDate: transaction.clientCompany.agreementEndDate,
                    documentPath: transaction.clientCompany.documentPath
                  } : null}
                  clientName={transaction.clientCompany.name}
                />
              )}

              {/* Dosya No */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t('transaction.fileNo')} *
                </p>
                <input
                  type="text"
                  name="fileNo"
                  value={formData.fileNo}
                  onChange={handleChange}
                  disabled={isFieldLocked}
                  required
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.fileNo
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                  placeholder={t('placeholders.enterFileNo').toLocaleUpperCase(locale)}
                  style={{ textTransform: 'uppercase' }}
                />
                {/* Error Message */}
                {fieldErrors.fileNo && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                    <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                      error
                    </span>
                    <p className="text-sm text-red-700 font-medium">
                      {fieldErrors.fileNo}
                    </p>
                  </div>
                )}
              </label>

              {/* Gümrük - Aranabilir Dropdown */}
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-text-main text-sm font-medium">
                    {t('transaction.customsName')} *
                    {!isReadOnly && loadingCustoms && (
                      <span className="text-xs text-blue-600 ml-2 animate-pulse">
                        {t('common.loading')}
                      </span>
                    )}
                    {!isReadOnly && !loadingCustoms && availableCustoms.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        {t("transactions.form.savedCount", { count: availableCustoms.length })}
                      </span>
                    )}
                  </p>
                </div>

                {isFieldLocked ? (
                  <input
                    type="text"
                    value={transaction.customs?.customsShortName || ""}
                    disabled
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 h-12 placeholder:text-neutral p-3 text-base font-normal"
                    placeholder={t('placeholders.enterCustomsName').toLocaleUpperCase(locale)}
                    style={{ textTransform: 'uppercase' }}
                  />
                ) : (
                  <div className="relative" id="edit-customs-dropdown-container">
                    <div className="relative">
                      <input
                        type="text"
                        value={customsSearchTerm}
                        onChange={(e) => {
                          const upperValue = toUpperCase(e.target.value, locale);
                          setCustomsSearchTerm(upperValue);
                          setShowCustomsDropdown(true);
                          // Clear error when user types
                          if (fieldErrors.customsId) {
                            setFieldErrors(prev => ({ ...prev, customsId: null }));
                          }
                        }}
                        onFocus={() => setShowCustomsDropdown(true)}
                        onKeyDown={customsKeyboard.handleKeyDown}
                        placeholder={t('placeholders.selectOrType').toLocaleUpperCase(locale)}
                        className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                          fieldErrors.customsId
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                        } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal transition-colors`}
                        style={{ textTransform: 'uppercase' }}
                      />

                      {/* Clear Button */}
                      {customsSearchTerm && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setCustomsSearchTerm("");
                            setSelectedCustomsId(null);
                            setFormData((prev) => ({
                              ...prev,
                              customsId: "",
                            }));
                            setShowCustomsDropdown(true);
                          }}
                          className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">
                            close
                          </span>
                        </button>
                      )}

                      {/* Dropdown Icon */}
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowCustomsDropdown(!showCustomsDropdown)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showCustomsDropdown ? "expand_less" : "expand_more"}
                        </span>
                      </button>
                    </div>

                    {/* Customs Dropdown List */}
                    {showCustomsDropdown && !loadingCustoms && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors">
                        {filteredCustoms.length === 0 && !customsSearchTerm.trim() ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2">
                              account_balance
                            </span>
                            <p className="text-sm">
                              {t("transactions.form.noCustoms")}
                            </p>
                          </div>
                        ) : filteredCustoms.length === 0 && customsSearchTerm.trim() ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2">
                              search_off
                            </span>
                            <p className="text-sm">
                              {t("transactions.form.noCustomsMatch", { query: customsSearchTerm })}
                            </p>
                          </div>
                        ) : (
                          <>
                            {filteredCustoms.map((customs, index) => (
                              <button
                                key={customs.id}
                                type="button"
                                data-dropdown-id="edit-customs-dropdown"
                                data-dropdown-index={index}
                                onClick={() => handleCustomsSelect(customs)}
                                className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                  selectedCustomsId === customs.id
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-primary font-medium"
                                    : index === customsKeyboard.highlightedIndex
                                    ? "bg-blue-100 dark:bg-blue-800/30"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-lg">
                                      account_balance
                                    </span>
                                    <p className="font-medium text-sm truncate uppercase text-text-main">
                                      {customs.customsShortName}
                                    </p>
                                  </div>
                                  {selectedCustomsId === customs.id && (
                                    <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                                      check_circle
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}

                            {filteredCustoms.length === 50 &&
                              availableCustoms.length > 50 && (
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-700 text-center transition-colors">
                                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                                    {t("transactions.form.firstResults", { count: 50 })}
                                  </p>
                                </div>
                              )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* Error Message */}
                {fieldErrors.customsId && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                    <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                      error
                    </span>
                    <p className="text-sm text-red-700 font-medium">
                      {fieldErrors.customsId}
                    </p>
                  </div>
                )}
              </div>

              {/* Antrepo - Aranabilir Dropdown */}
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-text-main text-sm font-medium">
                    {t('transaction.customsWarehouse')} *
                    {!isFieldLocked && loadingWarehouses && (
                      <span className="text-xs text-blue-600 ml-2 animate-pulse">
                        {t('common.loading')}
                      </span>
                    )}
                    {!isFieldLocked && !loadingWarehouses && availableWarehouses.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        {t("transactions.form.savedCount", { count: availableWarehouses.length })}
                      </span>
                    )}
                  </p>
                </div>

                {isFieldLocked ? (
                  <input
                    type="text"
                    value={formData.customsWarehouse}
                    disabled
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 h-12 placeholder:text-neutral p-3 text-base font-normal"
                    placeholder={t('placeholders.enterCustomsWarehouse').toLocaleUpperCase(locale)}
                    style={{ textTransform: 'uppercase' }}
                  />
                ) : (
                  <div className="relative" id="edit-warehouse-dropdown-container">
                    <div className="relative">
                      <input
                        type="text"
                        value={warehouseSearchTerm}
                        onChange={(e) => {
                          const upperValue = toUpperCase(e.target.value, locale);
                          setWarehouseSearchTerm(upperValue);
                          setFormData((prev) => ({
                            ...prev,
                            customsWarehouse: upperValue,
                          }));
                          setShowWarehouseDropdown(true);
                          // Clear error when user types
                          if (fieldErrors.customsWarehouse) {
                            setFieldErrors(prev => ({ ...prev, customsWarehouse: null }));
                          }
                        }}
                        onFocus={() => setShowWarehouseDropdown(true)}
                        onKeyDown={warehouseKeyboard.handleKeyDown}
                        placeholder={t('placeholders.selectOrType').toLocaleUpperCase(locale)}
                        className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                          fieldErrors.customsWarehouse
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                        } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal transition-colors`}
                        style={{ textTransform: 'uppercase' }}
                      />

                      {/* Clear Button */}
                      {warehouseSearchTerm && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setWarehouseSearchTerm("");
                            setFormData((prev) => ({
                              ...prev,
                              customsWarehouse: "",
                            }));
                            setShowWarehouseDropdown(true);
                          }}
                          className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">
                            close
                          </span>
                        </button>
                      )}

                      {/* Dropdown Icon */}
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showWarehouseDropdown ? "expand_less" : "expand_more"}
                        </span>
                      </button>
                    </div>

                    {/* Warehouse Dropdown List */}
                    {showWarehouseDropdown && !loadingWarehouses && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors">
                        {/* Yeni antrepo ekleme seçeneği */}
                        {warehouseSearchTerm.trim() && !availableWarehouses.some(w => w.toUpperCase() === warehouseSearchTerm.toUpperCase()) && (
                          <button
                            type="button"
                            onClick={handleAddNewWarehouse}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border-b border-gray-200 dark:border-gray-700 bg-green-50/50 dark:bg-green-900/10"
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-lg">
                                add_circle
                              </span>
                              <div>
                                <p className="font-medium text-sm text-green-700 dark:text-green-300">
                                  {t("transactions.form.addAs", { value: toUpperCase(warehouseSearchTerm.trim(), locale) })}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  {t("transactions.form.useAsNewWarehouse")}
                                </p>
                              </div>
                            </div>
                          </button>
                        )}

                        {filteredWarehouses.length === 0 && !warehouseSearchTerm.trim() ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2">
                              warehouse
                            </span>
                            <p className="text-sm">
                              {t("transactions.form.noWarehouses")}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {t("transactions.form.addWarehouseHint")}
                            </p>
                          </div>
                        ) : filteredWarehouses.length === 0 && warehouseSearchTerm.trim() ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2">
                              search_off
                            </span>
                            <p className="text-sm">
                              {t("transactions.form.noWarehouseMatch", { query: warehouseSearchTerm })}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {t("transactions.form.addNewHint")}
                            </p>
                          </div>
                        ) : (
                          <>
                            {filteredWarehouses.map((warehouse, index) => (
                              <button
                                key={index}
                                type="button"
                                data-dropdown-id="edit-warehouse-dropdown"
                                data-dropdown-index={index}
                                onClick={() => handleWarehouseSelect(warehouse)}
                                className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                  formData.customsWarehouse === warehouse
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-primary font-medium"
                                    : index === warehouseKeyboard.highlightedIndex
                                    ? "bg-blue-100 dark:bg-blue-800/30"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-lg">
                                      warehouse
                                    </span>
                                    <p className="font-medium text-sm truncate uppercase text-text-main">
                                      {warehouse}
                                    </p>
                                  </div>
                                  {formData.customsWarehouse === warehouse && (
                                    <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                                      check_circle
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}

                            {filteredWarehouses.length === 50 &&
                              availableWarehouses.length > 50 && (
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-700 text-center transition-colors">
                                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                                    {t("transactions.form.firstResults", { count: 50 })}
                                  </p>
                                </div>
                              )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* Error Message */}
                {fieldErrors.customsWarehouse && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                    <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                      error
                    </span>
                    <p className="text-sm text-red-700 font-medium">
                      {fieldErrors.customsWarehouse}
                    </p>
                  </div>
                )}
              </div>

              {/* Kap */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t('transaction.containerAmount')} *
                </p>
                <input
                  type="number"
                  step="1"
                  min="0"
                  name="containerAmount"
                  value={formData.containerAmount}
                  onChange={handleChange}
                  disabled={isFieldLocked}
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.containerAmount
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                  placeholder={t('placeholders.enterContainerAmount').toLocaleUpperCase(locale)}
                />
                {/* Error Message */}
                {fieldErrors.containerAmount && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                    <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                      error
                    </span>
                    <p className="text-sm text-red-700 font-medium">
                      {fieldErrors.containerAmount}
                    </p>
                  </div>
                )}
              </label>

              {/* Kilo */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t('transaction.weight')} *
                </p>
                <input
                  type="text"
                  name="weight"
                  value={displayWeight || formData.weight}
                  onChange={handleWeightChange}
                  onBlur={handleWeightBlur}
                  onFocus={handleWeightFocus}
                  disabled={isFieldLocked}
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.weight
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                  placeholder={t('placeholders.enterWeight').toLocaleUpperCase(locale)}
                />
                {/* Error Message */}
                {fieldErrors.weight && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                    <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                      error
                    </span>
                    <p className="text-sm text-red-700 font-medium">
                      {fieldErrors.weight}
                    </p>
                  </div>
                )}
              </label>

              {/* Vergi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t('transaction.tax')}
                </p>
                <input
                  type="text"
                  name="tax"
                  value={displayTax || formData.tax}
                  onChange={handleTaxChange}
                  onBlur={handleTaxBlur}
                  onFocus={handleTaxFocus}
                  disabled={isFieldLocked}
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.tax
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                  placeholder={t('placeholders.enterTax').toLocaleUpperCase(locale)}
                />
                {/* Error Message */}
                {fieldErrors.tax && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                    <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                      error
                    </span>
                    <p className="text-sm text-red-700 font-medium">
                      {fieldErrors.tax}
                    </p>
                  </div>
                )}
              </label>

              {/* Teminat — evrak hem peşin vergili hem teminatlı olabilir */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t('transaction.guaranteeAmount')}
                </p>
                <input
                  type="text"
                  name="guaranteeAmount"
                  value={displayGuaranteeAmount || formData.guaranteeAmount}
                  onChange={handleGuaranteeAmountChange}
                  onBlur={handleGuaranteeAmountBlur}
                  onFocus={handleGuaranteeAmountFocus}
                  disabled={isFieldLocked}
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.guaranteeAmount
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                  placeholder={t('placeholders.enterGuaranteeAmount').toLocaleUpperCase(locale)}
                />
                {/* Error Message */}
                {fieldErrors.guaranteeAmount && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                    <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                      error
                    </span>
                    <p className="text-sm text-red-700 font-medium">
                      {fieldErrors.guaranteeAmount}
                    </p>
                  </div>
                )}
              </label>

              {/* Gönderici - Aranabilir Dropdown */}
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-text-main text-sm font-medium">
                    {t('transaction.sender')}
                    {!isFieldLocked && loadingSenders && (
                      <span className="text-xs text-blue-600 ml-2 animate-pulse">
                        {t('common.loading')}
                      </span>
                    )}
                    {!isFieldLocked && !loadingSenders && availableSenders.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        {t("transactions.form.savedCount", { count: availableSenders.length })}
                      </span>
                    )}
                  </p>
                </div>

                {isFieldLocked ? (
                  <input
                    type="text"
                    value={formData.senderName}
                    disabled
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 h-12 placeholder:text-neutral p-3 text-base font-normal"
                    placeholder={t('placeholders.enterSender').toLocaleUpperCase(locale)}
                    style={{ textTransform: 'uppercase' }}
                  />
                ) : (
                  <div className="relative" id="edit-sender-dropdown-container">
                    <div className="relative">
                      <input
                        type="text"
                        value={senderSearchTerm}
                        onChange={(e) => {
                          // Yazarken büyük harfe çevir
                          const upperValue = toUpperCase(e.target.value, locale);
                          setSenderSearchTerm(upperValue);
                          setFormData((prev) => ({
                            ...prev,
                            senderName: upperValue,
                          }));
                          setShowSenderDropdown(true);
                          // Clear error when user types
                          if (fieldErrors.senderName) {
                            setFieldErrors(prev => ({ ...prev, senderName: null }));
                          }
                        }}
                        onFocus={() => setShowSenderDropdown(true)}
                        onKeyDown={senderKeyboard.handleKeyDown}
                        placeholder={t('placeholders.selectOrType').toLocaleUpperCase(locale)}
                        className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                          fieldErrors.senderName
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                        } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal transition-colors`}
                        style={{ textTransform: 'uppercase' }}
                      />

                      {/* Clear Button */}
                      {senderSearchTerm && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setSenderSearchTerm("");
                            setFormData((prev) => ({
                              ...prev,
                              senderName: "",
                            }));
                            setShowSenderDropdown(true);
                          }}
                          className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">
                            close
                          </span>
                        </button>
                      )}

                      {/* Dropdown Icon */}
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowSenderDropdown(!showSenderDropdown)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showSenderDropdown ? "expand_less" : "expand_more"}
                        </span>
                      </button>
                    </div>

                    {/* Sender Dropdown List */}
                    {showSenderDropdown && !loadingSenders && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors">
                        {/* Yeni gönderici ekleme seçeneği */}
                        {senderSearchTerm.trim() && !availableSenders.some(s => s.toUpperCase() === senderSearchTerm.toUpperCase()) && (
                          <button
                            type="button"
                            onClick={handleAddNewSender}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border-b border-gray-200 dark:border-gray-700 bg-green-50/50 dark:bg-green-900/10"
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-lg">
                                add_circle
                              </span>
                              <div>
                                <p className="font-medium text-sm text-green-700 dark:text-green-300">
                                  {t("transactions.form.addAs", { value: toUpperCase(senderSearchTerm.trim(), locale) })}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  {t("transactions.form.useAsNewSender")}
                                </p>
                              </div>
                            </div>
                          </button>
                        )}

                        {filteredSenders.length === 0 && !senderSearchTerm.trim() ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2">
                              local_shipping
                            </span>
                            <p className="text-sm">
                              {t("transactions.form.noSenders")}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {t("transactions.form.addSenderHint")}
                            </p>
                          </div>
                        ) : filteredSenders.length === 0 && senderSearchTerm.trim() ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2">
                              search_off
                            </span>
                            <p className="text-sm">
                              {t("transactions.form.noSenderMatch", { query: senderSearchTerm })}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {t("transactions.form.addNewHint")}
                            </p>
                          </div>
                        ) : (
                          <>
                            {filteredSenders.map((sender, index) => (
                              <button
                                key={index}
                                type="button"
                                data-dropdown-id="edit-sender-dropdown"
                                data-dropdown-index={index}
                                onClick={() => handleSenderSelect(sender)}
                                className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                  formData.senderName === sender
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-primary font-medium"
                                    : index === senderKeyboard.highlightedIndex
                                    ? "bg-blue-100 dark:bg-blue-800/30"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-lg">
                                      local_shipping
                                    </span>
                                    <p className="font-medium text-sm truncate uppercase text-text-main">
                                      {sender}
                                    </p>
                                  </div>
                                  {formData.senderName === sender && (
                                    <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                                      check_circle
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}

                            {filteredSenders.length === 50 &&
                              availableSenders.length > 50 && (
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-700 text-center transition-colors">
                                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                                    {t("transactions.form.firstResults", { count: 50 })}
                                  </p>
                                </div>
                              )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* Error Message */}
                {fieldErrors.senderName && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                    <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                      error
                    </span>
                    <p className="text-sm text-red-700 font-medium">
                      {fieldErrors.senderName}
                    </p>
                  </div>
                )}
              </div>

              {/* Beyanname No */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t('transaction.declarationNumber')}
                </p>
                <input
                  type="text"
                  name="declarationNumber"
                  value={formData.declarationNumber}
                  onChange={(e) => {
                    const upperValue = toUpperCase(e.target.value, locale);
                    setFormData(prev => ({ ...prev, declarationNumber: upperValue }));
                    // Clear error when user types
                    if (fieldErrors.declarationNumber) {
                      setFieldErrors(prev => ({ ...prev, declarationNumber: null }));
                    }
                  }}
                  disabled={isFieldLocked}
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.declarationNumber
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                  placeholder={t('placeholders.enterDeclarationNumber').toLocaleUpperCase(locale)}
                  style={{ textTransform: 'uppercase' }}
                />
                {/* Error Message */}
                {fieldErrors.declarationNumber && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                    <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                      error
                    </span>
                    <p className="text-sm text-red-700 font-medium">
                      {fieldErrors.declarationNumber}
                    </p>
                  </div>
                )}
              </label>

              {/* Hat - Combobox (constants'dan alınıyor) */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t('transaction.gate')} *
                </p>
                <select
                  name="gate"
                  value={formData.gate}
                  onChange={handleChange}
                  disabled={isReadOnly || isCompletedStatus || isWithdrawnStatus}
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.gate
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                >
                  <option value="">{t('gates.select').toLocaleUpperCase(locale)}</option>
                  {GATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {getGateDisplayLabel(option)}
                    </option>
                  ))}
                </select>
                {/* Error Message */}
                {fieldErrors.gate && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                    <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                      error
                    </span>
                    <p className="text-sm text-red-700 font-medium">
                      {fieldErrors.gate}
                    </p>
                  </div>
                )}
              </label>

              {/* TARİH BİLGİLERİ BÖLÜMÜ */}
              <div className="lg:col-span-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-5 mt-2 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-blue-600 text-xl">
                    calendar_month
                  </span>
                  <h3 className="text-text-main text-base font-bold">
                    {t("transactions.form.dateInfo")}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Antrepo Varış Tarihi */}
                  <label className="flex flex-col w-full">
                    <p className="text-text-main text-sm font-medium pb-2">
                      {t('transaction.warehouseArrivalDate')} *
                    </p>
                    <input
                      type="date"
                      name="warehouseArrivalDate"
                      value={formData.warehouseArrivalDate}
                      onChange={handleDateChange}
                      disabled={isFieldLocked}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.warehouseArrivalDate
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-blue-300 dark:border-blue-700 focus:ring-blue-500 focus:border-blue-500'
                      } bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                    />
                    {/* Error Message */}
                    {fieldErrors.warehouseArrivalDate && (
                      <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                        <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                          error
                        </span>
                        <p className="text-sm text-red-700 font-medium">
                          {fieldErrors.warehouseArrivalDate}
                        </p>
                      </div>
                    )}
                  </label>

                  {/* Tescil Tarihi */}
                  <label className="flex flex-col w-full">
                    <p className="text-text-main text-sm font-medium pb-2">
                      {t('transaction.registrationDate')}
                    </p>
                    <input
                      type="date"
                      name="registrationDate"
                      value={formData.registrationDate}
                      onChange={handleDateChange}
                      disabled={isFieldLocked}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.registrationDate
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-blue-300 dark:border-blue-700 focus:ring-blue-500 focus:border-blue-500'
                      } bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                    />
                    {/* Error Message */}
                    {fieldErrors.registrationDate && (
                      <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                        <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                          error
                        </span>
                        <p className="text-sm text-red-700 font-medium">
                          {fieldErrors.registrationDate}
                        </p>
                      </div>
                    )}
                  </label>

                  {/* Kapanma Tarihi */}
                  <label className="flex flex-col w-full">
                    <p className="text-text-main text-sm font-medium pb-2">
                      {t('transaction.lineClosureDate')}
                    </p>
                    <input
                      type="date"
                      name="lineClosureDate"
                      value={formData.lineClosureDate}
                      onChange={handleDateChange}
                      disabled={isReadOnly}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.lineClosureDate
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-blue-300 dark:border-blue-700 focus:ring-blue-500 focus:border-blue-500'
                      } bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                    />
                    {/* Error Message */}
                    {fieldErrors.lineClosureDate && (
                      <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                        <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                          error
                        </span>
                        <p className="text-sm text-red-700 font-medium">
                          {fieldErrors.lineClosureDate}
                        </p>
                      </div>
                    )}
                  </label>

                  {/* Çekilme Tarihi */}
                  <label className="flex flex-col w-full">
                    <p className="text-text-main text-sm font-medium pb-2">
                      {t('transaction.withdrawalDate')}
                    </p>
                    <input
                      type="date"
                      name="withdrawalDate"
                      value={formData.withdrawalDate}
                      onChange={handleDateChange}
                      disabled={isReadOnly}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.withdrawalDate
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-blue-300 dark:border-blue-700 focus:ring-blue-500 focus:border-blue-500'
                      } bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                    />
                    {/* Error Message */}
                    {fieldErrors.withdrawalDate && (
                      <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                        <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                          error
                        </span>
                        <p className="text-sm text-red-700 font-medium">
                          {fieldErrors.withdrawalDate}
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* İthalat İşlem Süresi - INSPECTION: Hesaplanan, CP_COMPLETED/WITHDRAWN: Backend'den Gelen */}
              {(
                // INSPECTION: Hesaplanan değeri göster
                (isInspectionStatus && calculatedProcessingTime != null) ||
                // CP_COMPLETED/WITHDRAWN: Backend değerini göster
                ((isCompletedStatus || isWithdrawnStatus) && transaction.importProcessingTime != null)
              ) && (
                <div className="lg:col-span-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4 mt-2 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600 text-2xl">
                      schedule
                    </span>
                    <div>
                      <p className="text-text-secondary text-xs font-medium">
                        {t("transactions.form.importProcessingTime")}
                        {isInspectionStatus && <span className="ml-2 text-xs italic">{t("transactions.form.preview")}</span>}
                      </p>
                      <p className="text-text-main text-2xl font-bold">
                        {(() => {
                          const days = isInspectionStatus
                            ? calculatedProcessingTime
                            : transaction.importProcessingTime;
                          return days === 0 ? t("transactions.form.sameDay") : t("dashboard.courier.days", { count: days });
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Delay #1: Antrepo Varış → Tescil */}
              {(delays.arrivalToRegistration || (formData.delayReasons?.arrivalToRegistration && formData.delayReasons.arrivalToRegistration.length > 0)) && !isReadOnly && (
                <div className="flex flex-col w-full md:col-span-2 lg:col-span-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">warning</span>
                      <p className="text-text-main text-sm font-bold">
                        {t("transactions.delay.arrivalToRegistration")} * {t("transactions.delay.overFourDays")}
                      </p>
                    </div>
                    {formData.delayReasons?.arrivalToRegistration && formData.delayReasons.arrivalToRegistration.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            delayReasons: {
                              ...formData.delayReasons,
                              arrivalToRegistration: ''
                            }
                          });
                          // Clear error when field is cleared
                          if (fieldErrors.arrivalToRegistration) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.arrivalToRegistration;
                              return newErrors;
                            });
                          }
                        }}
                        className="p-1 hover:bg-yellow-200 dark:hover:bg-yellow-700/30 rounded-full transition-colors"
                        title={t("transactions.form.clearContent")}
                      >
                        <span className="material-symbols-outlined text-yellow-700 dark:text-yellow-300 text-lg">
                          close
                        </span>
                      </button>
                    )}
                  </div>
                  <textarea
                    value={formData.delayReasons.arrivalToRegistration}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        delayReasons: {
                          ...formData.delayReasons,
                          arrivalToRegistration: value
                        }
                      });
                      // Clear error when user types
                      if (fieldErrors.arrivalToRegistration) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.arrivalToRegistration;
                          return newErrors;
                        });
                      }
                    }}
                    onBlur={(e) => validateDelayReason('arrivalToRegistration', e.target.value)}
                    required
                    rows="2"
                    className={`form-textarea w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                      fieldErrors.arrivalToRegistration
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500 focus:border-yellow-500'
                    } bg-white dark:bg-gray-800 placeholder:text-neutral p-3 text-base font-normal transition-colors`}
                    placeholder={t("transactions.delay.arrivalToRegistrationPlaceholder")}
                  />
                  {/* Error Message */}
                  {fieldErrors.arrivalToRegistration && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg animate-fadeIn transition-colors">
                      <span className="material-symbols-outlined text-red-500 dark:text-red-400 text-lg flex-shrink-0">
                        error
                      </span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                        {fieldErrors.arrivalToRegistration}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Conditional Delay #2: Tescil → Kapanma */}
              {(delays.registrationToClosure || (formData.delayReasons?.registrationToClosure && formData.delayReasons.registrationToClosure.length > 0)) && !isReadOnly && (
                <div className="flex flex-col w-full md:col-span-2 lg:col-span-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg p-4 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">warning</span>
                      <p className="text-text-main text-sm font-bold">
                        {t("transactions.delay.registrationToClosure")} * {t("transactions.delay.overFourDays")}
                      </p>
                    </div>
                    {formData.delayReasons?.registrationToClosure && formData.delayReasons.registrationToClosure.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            delayReasons: {
                              ...formData.delayReasons,
                              registrationToClosure: ''
                            }
                          });
                          // Clear error when field is cleared
                          if (fieldErrors.registrationToClosure) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.registrationToClosure;
                              return newErrors;
                            });
                          }
                        }}
                        className="p-1 hover:bg-orange-200 dark:hover:bg-orange-700/30 rounded-full transition-colors"
                        title={t("transactions.form.clearContent")}
                      >
                        <span className="material-symbols-outlined text-orange-700 dark:text-orange-300 text-lg">
                          close
                        </span>
                      </button>
                    )}
                  </div>
                  <textarea
                    value={formData.delayReasons.registrationToClosure}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        delayReasons: {
                          ...formData.delayReasons,
                          registrationToClosure: value
                        }
                      });
                      // Clear error when user types
                      if (fieldErrors.registrationToClosure) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.registrationToClosure;
                          return newErrors;
                        });
                      }
                    }}
                    onBlur={(e) => validateDelayReason('registrationToClosure', e.target.value)}
                    required
                    rows="2"
                    className={`form-textarea w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                      fieldErrors.registrationToClosure
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-orange-300 dark:border-orange-700 focus:ring-orange-500 focus:border-orange-500'
                    } bg-white dark:bg-gray-800 placeholder:text-neutral p-3 text-base font-normal transition-colors`}
                    placeholder={t("transactions.delay.registrationToClosurePlaceholder")}
                  />
                  {/* Error Message */}
                  {fieldErrors.registrationToClosure && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg animate-fadeIn transition-colors">
                      <span className="material-symbols-outlined text-red-500 dark:text-red-400 text-lg flex-shrink-0">
                        error
                      </span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                        {fieldErrors.registrationToClosure}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Conditional Delay #3: Kapanma → Çekilme */}
              {(delays.closureToWithdrawal || (formData.delayReasons?.closureToWithdrawal && formData.delayReasons.closureToWithdrawal.length > 0)) && !isReadOnly && (
                <div className="flex flex-col w-full md:col-span-2 lg:col-span-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                      <p className="text-text-main text-sm font-bold">
                        {t("transactions.delay.closureToWithdrawal")} * {t("transactions.delay.overFourDays")}
                      </p>
                    </div>
                    {formData.delayReasons?.closureToWithdrawal && formData.delayReasons.closureToWithdrawal.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            delayReasons: {
                              ...formData.delayReasons,
                              closureToWithdrawal: ''
                            }
                          });
                          // Clear error when field is cleared
                          if (fieldErrors.closureToWithdrawal) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.closureToWithdrawal;
                              return newErrors;
                            });
                          }
                        }}
                        className="p-1 hover:bg-red-200 dark:hover:bg-red-700/30 rounded-full transition-colors"
                        title={t("transactions.form.clearContent")}
                      >
                        <span className="material-symbols-outlined text-red-700 dark:text-red-300 text-lg">
                          close
                        </span>
                      </button>
                    )}
                  </div>
                  <textarea
                    value={formData.delayReasons.closureToWithdrawal}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        delayReasons: {
                          ...formData.delayReasons,
                          closureToWithdrawal: value
                        }
                      });
                      // Clear error when user types
                      if (fieldErrors.closureToWithdrawal) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.closureToWithdrawal;
                          return newErrors;
                        });
                      }
                    }}
                    onBlur={(e) => validateDelayReason('closureToWithdrawal', e.target.value)}
                    required
                    rows="2"
                    className={`form-textarea w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                      fieldErrors.closureToWithdrawal
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500'
                    } bg-white dark:bg-gray-800 placeholder:text-neutral p-3 text-base font-normal transition-colors`}
                    placeholder={t("transactions.delay.closureToWithdrawalPlaceholder")}
                  />
                  {/* Error Message */}
                  {fieldErrors.closureToWithdrawal && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg animate-fadeIn transition-colors">
                      <span className="material-symbols-outlined text-red-500 dark:text-red-400 text-lg flex-shrink-0">
                        error
                      </span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                        {fieldErrors.closureToWithdrawal}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Açıklama */}
              <label className="flex flex-col w-full md:col-span-2 lg:col-span-3">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t('transaction.description')}
                </p>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  rows="3"
                  className="form-textarea w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary placeholder:text-neutral p-3 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors"
                  placeholder={t('placeholders.enterDescription')}
                />
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-3 md:gap-4 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
            <button
              type="button"
              onClick={requestClose}
              className="w-full md:w-auto px-6 py-3 text-text-secondary hover:text-text-main font-medium transition-colors"
            >
              {isReadOnly ? t('common.close') : t('common.cancel')}
            </button>
            {!isReadOnly && draftsEnabled && (
              <SaveDraftButton
                onClick={handleSaveDraftAndClose}
                disabled={loading || !isDirty}
                saving={savingDraft}
                isPilot={isDraftPilot}
                className="w-full md:w-auto px-6 py-3"
              />
            )}
            {!isReadOnly && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">save</span>
                {loading ? t('common.loading') : t('common.update')}
              </button>
            )}
        </div>
      </div>
    </div>
  );
}

/**
 * Kapanmış bir işlemi yeniden açma gerekçesi. confirmDialog ayrı bir React kökünde çizildiği için değer
 * state'e değil `onChange(value)` ile çağırana gider. Zorunlu: gerekçesiz yeniden açma sunucuda da reddedilir.
 */
function ReopenReasonField({ onChange }) {
  return (
    <div className="text-left">
      <label htmlFor="transaction-reopen-reason" className="block text-sm font-medium text-text-main mb-1">
        {t("transactions.reopen.reasonLabel")}
      </label>
      <textarea
        id="transaction-reopen-reason"
        rows={3}
        maxLength={500}
        autoFocus
        placeholder={t("transactions.reopen.reasonPlaceholder")}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-colors text-sm resize-none"
      />
    </div>
  );
}
