import React, { useState, useEffect, useRef } from "react";
import { transactionService } from "../../api/transactionService";
import { companyService } from "../../api/companyService";
import { customsService } from "../../api/customsService";
import { GATE_OPTIONS } from "../../utils/constants";
import {
  toUpperCase,
  transformFormData,
  TRANSACTION_UPPERCASE_FIELDS,
} from "../../utils/textUtils";
import { handleError, handleApiResponse, logError } from "../../utils/errorUtils";
import { showSuccess, showError } from "../../utils/toastUtils";
import { t, getCurrentLocale } from "../../locales";
import AgreementInfoPanel from '../agreements/AgreementInfoPanel';
import CreateAgreementModal from '../common/CreateAgreementModal';
import AddClientModal from '../common/AddClientModal';
import { useDropdownKeyboard } from '../../hooks/useDropdownKeyboard';

export default function AddTransactionModal({
  onClose,
  onSuccess,
  currentUser,
}) {
  // Yetki kontrolü
  const isSuperAdmin = currentUser?.globalRole === "SUPER_ADMIN";
  const locale = getCurrentLocale();

  const [formData, setFormData] = useState({
    brokerCompanyId: isSuperAdmin ? "" : currentUser?.company?.id || "",
    clientCompanyId: "",
    fileNo: "",
    recipientName: "",
    customsId: "",
    customsWarehouse: "",
    containerAmount: "",
    gate: "",
    weight: "",
    tax: "",
    senderName: "",
    warehouseArrivalDate: "",
    registrationDate: "",
    declarationNumber: "",
    lineClosureDate: "",
    importProcessingTime: "",
    withdrawalDate: "",
    description: "",
    delayReasons: {
      arrivalToRegistration: "",
      registrationToClosure: "",
      closureToWithdrawal: ""
    },
  });

  const [availableClients, setAvailableClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientInfo, setSelectedClientInfo] = useState(null);

  // Vekalet anlaşması state'leri
  const [clientAgreements, setClientAgreements] = useState({}); // { clientId: agreementData }
  const [selectedClientAgreement, setSelectedClientAgreement] = useState(null);
  const [showCreateAgreementModal, setShowCreateAgreementModal] = useState(false);

  // SUPER_ADMIN için broker listesi
  const [availableBrokers, setAvailableBrokers] = useState([]);
  const [filteredBrokers, setFilteredBrokers] = useState([]);
  const [brokerSearchTerm, setBrokerSearchTerm] = useState("");
  const [showBrokerDropdown, setShowBrokerDropdown] = useState(false);

  // Gönderici listesi state'leri
  const [availableSenders, setAvailableSenders] = useState([]);
  const [filteredSenders, setFilteredSenders] = useState([]);
  const [senderSearchTerm, setSenderSearchTerm] = useState("");
  const [showSenderDropdown, setShowSenderDropdown] = useState(false);
  const [loadingSenders, setLoadingSenders] = useState(false);

  // Gümrük listesi state'leri
  const [availableCustoms, setAvailableCustoms] = useState([]); // Now array of customs objects
  const [filteredCustoms, setFilteredCustoms] = useState([]);
  const [customsSearchTerm, setCustomsSearchTerm] = useState("");
  const [selectedCustomsId, setSelectedCustomsId] = useState(null); // Track selected customs ID
  const [showCustomsDropdown, setShowCustomsDropdown] = useState(false);
  const [loadingCustoms, setLoadingCustoms] = useState(false);

  // Antrepo listesi state'leri
  const [availableWarehouses, setAvailableWarehouses] = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);
  const [warehouseSearchTerm, setWarehouseSearchTerm] = useState("");
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingBrokers, setLoadingBrokers] = useState(false);
  const [error, setError] = useState("");

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Gecikme tespit state'i
  const [delays, setDelays] = useState({
    arrivalToRegistration: false,
    registrationToClosure: false,
    closureToWithdrawal: false,
  });

  // Yeni firma ekleme modal state
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  // Number formatlama için display state'leri
  const [displayWeight, setDisplayWeight] = useState("");
  const [displayTax, setDisplayTax] = useState("");

  // Keyboard navigation hooks for dropdowns
  const brokerKeyboard = useDropdownKeyboard(
    showBrokerDropdown,
    filteredBrokers,
    (broker) => {
      setFormData((prev) => ({ ...prev, brokerCompanyId: broker.id }));
      setBrokerSearchTerm(broker.name);
      setShowBrokerDropdown(false);
      if (fieldErrors.brokerCompany) {
        setFieldErrors((prev) => ({ ...prev, brokerCompany: null }));
      }
    },
    () => setShowBrokerDropdown(false),
    'broker-dropdown'
  );

  const clientKeyboard = useDropdownKeyboard(
    showClientDropdown,
    filteredClients,
    (client) => {
      setFormData((prev) => ({ ...prev, clientCompanyId: client.id }));
      setClientSearchTerm(client.name);
      setShowClientDropdown(false);
      if (fieldErrors.clientCompany) {
        setFieldErrors((prev) => ({ ...prev, clientCompany: null }));
      }
    },
    () => setShowClientDropdown(false),
    'client-dropdown'
  );

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
    'customs-dropdown'
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
    'warehouse-dropdown'
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
    'sender-dropdown'
  );

  // SUPER_ADMIN ise broker listesini yükle
  useEffect(() => {
    if (isSuperAdmin) {
      loadBrokerCompanies();
    } else if (currentUser?.company?.id) {
      loadClientCompanies(currentUser.company.id);
    }
    loadSenders();
    loadCustoms();
    loadWarehouses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Broker değiştiğinde client'ları yükle (SUPER_ADMIN için)
  useEffect(() => {
    if (isSuperAdmin && formData.brokerCompanyId) {
      loadClientCompanies(formData.brokerCompanyId);
      setFormData((prev) => ({
        ...prev,
        clientCompanyId: "",
        recipientName: "",
      }));
      setSelectedClientInfo(null);
      setClientSearchTerm("");
    }
  }, [formData.brokerCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Broker arama filtresi (SUPER_ADMIN için)
  useEffect(() => {
    if (brokerSearchTerm.trim() === "") {
      setFilteredBrokers(availableBrokers.slice(0, 100));
    } else {
      const searchLower = brokerSearchTerm.toLowerCase();
      const filtered = availableBrokers.filter(
        (broker) =>
          broker.name.toLowerCase().includes(searchLower) ||
          (broker.shortName &&
            broker.shortName.toLowerCase().includes(searchLower))
      );
      setFilteredBrokers(filtered.slice(0, 100));
    }
  }, [brokerSearchTerm, availableBrokers]);

  // Client arama filtresi
  useEffect(() => {
    if (!clientSearchTerm || clientSearchTerm.trim() === "") {
      setFilteredClients(availableClients.slice(0, 100));
    } else {
      const searchLower = clientSearchTerm.toLowerCase();
      const filtered = availableClients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchLower) ||
          (client.shortName &&
            client.shortName.toLowerCase().includes(searchLower))
      );
      setFilteredClients(filtered.slice(0, 100));
    }
  }, [clientSearchTerm, availableClients]);

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

  // Broker dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById("broker-dropdown-container");
      if (dropdown && !dropdown.contains(event.target)) {
        setShowBrokerDropdown(false);
      }
    };

    if (showBrokerDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBrokerDropdown]);

  // Client dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById("client-dropdown-container");
      if (dropdown && !dropdown.contains(event.target)) {
        setShowClientDropdown(false);
      }
    };

    if (showClientDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showClientDropdown]);

  // Gönderici dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById("sender-dropdown-container");
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
      const dropdown = document.getElementById("customs-dropdown-container");
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
      const dropdown = document.getElementById("warehouse-dropdown-container");
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

  // Broker değiştiğinde search term güncelle (SUPER_ADMIN için)
  useEffect(() => {
    if (isSuperAdmin && formData.brokerCompanyId) {
      const selectedBroker = availableBrokers.find(
        (b) => b.id === parseInt(formData.brokerCompanyId)
      );

      if (selectedBroker) {
        setBrokerSearchTerm(selectedBroker.name);
      }
    } else if (!formData.brokerCompanyId) {
      setBrokerSearchTerm("");
    }
  }, [formData.brokerCompanyId, availableBrokers, isSuperAdmin]);

  // Client değiştiğinde Alıcı alanını doldur
  useEffect(() => {
    if (formData.clientCompanyId) {
      const selectedClient = availableClients.find(
        (c) => c.id === parseInt(formData.clientCompanyId)
      );

      if (selectedClient) {
        setSelectedClientInfo(selectedClient);
        setClientSearchTerm(selectedClient.name);

        // Agreement bilgisini set et
        const agreement = clientAgreements[selectedClient.id];
        setSelectedClientAgreement(agreement || null);

        // Alıcı adını büyük harfe çevir
        const recipientName =
          selectedClient.shortName || selectedClient.name || "";
        setFormData((prev) => ({
          ...prev,
          recipientName: toUpperCase(recipientName, locale),
        }));
      }
    } else {
      setSelectedClientInfo(null);
      setSelectedClientAgreement(null);
      setClientSearchTerm("");
      setFormData((prev) => ({ ...prev, recipientName: "" }));
    }
  }, [formData.clientCompanyId, availableClients, clientAgreements, locale]);

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

  // Clear general error message when all field errors are resolved
  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0 && error) {
      setError("");
    }
  }, [fieldErrors]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const loadClientCompanies = async (brokerId) => {
    try {
      setLoadingClients(true);

      const result = await companyService.getClientCompanies(brokerId);

      if (result.success) {
        setAvailableClients(result.data);
        setFilteredClients(result.data.slice(0, 100));

        // Agreement bilgilerini cache'le
        const agreementsMap = {};
        result.data.forEach(client => {
          if (client.agreementId) {
            agreementsMap[client.id] = {
              agreementId: client.agreementId,
              agreementStatus: client.agreementStatus,
              agreementStartDate: client.agreementStartDate,
              agreementEndDate: client.agreementEndDate,
              documentPath: client.documentPath
            };
          }
        });
        setClientAgreements(agreementsMap);
      } else {
        setAvailableClients([]);
        setFilteredClients([]);
        setClientAgreements({});
      }
    } catch (err) {
      logError("Client listesi yükleme", err);
      setAvailableClients([]);
      setFilteredClients([]);
      setClientAgreements({});
    } finally {
      setLoadingClients(false);
    }
  };

  // Mevcut işlemlerden unique gönderici isimlerini yükle
  const loadSenders = async () => {
    try {
      setLoadingSenders(true);
      const result = await transactionService.getAllTransactions();

      if (result.success) {
        const uniqueSenders = [
          ...new Set(
            result.data
              .map((t) => t.senderName)
              .filter((name) => name && name.trim() !== "")
          ),
        ].sort((a, b) => a.localeCompare(b, "tr"));

        setAvailableSenders(uniqueSenders);
        setFilteredSenders(uniqueSenders.slice(0, 50));
      } else {
        setAvailableSenders([]);
        setFilteredSenders([]);
      }
    } catch (err) {
      logError("Gönderici listesi yükleme", err);
      setAvailableSenders([]);
      setFilteredSenders([]);
    } finally {
      setLoadingSenders(false);
    }
  };

  // Mevcut işlemlerden unique gümrük isimlerini yükle
  const loadCustoms = async () => {
    try {
      setLoadingCustoms(true);
      const result = await customsService.getActiveCustoms();

      if (result.success) {
        // result.data is array of objects: [{id, customsName, customsShortName, status}, ...]
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

  // Mevcut işlemlerden unique antrepo isimlerini yükle
  const loadWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      const result = await transactionService.getAllTransactions();

      if (result.success) {
        const uniqueWarehouses = [
          ...new Set(
            result.data
              .map((t) => t.customsWarehouse)
              .filter((name) => name && name.trim() !== "")
          ),
        ].sort((a, b) => a.localeCompare(b, "tr"));

        setAvailableWarehouses(uniqueWarehouses);
        setFilteredWarehouses(uniqueWarehouses.slice(0, 50));
      } else {
        setAvailableWarehouses([]);
        setFilteredWarehouses([]);
      }
    } catch (err) {
      logError("Antrepo listesi yükleme", err);
      setAvailableWarehouses([]);
      setFilteredWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  // Number formatlama yardımcı fonksiyonları
  const formatNumber = (value, decimals = 2) => {
    if (!value || value === "") return "";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return num.toLocaleString("tr-TR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const parseFormattedNumber = (formattedValue) => {
    if (!formattedValue || formattedValue === "") return "";
    // Türkçe formatı parse et: . binlik ayraç, , ondalık ayraç
    const cleaned = formattedValue.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? "" : num;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      setDisplayWeight(formData.weight.toString());
    }
  };

  // Vergi değeri için özel handler (formatlama + maksimum 4 ondalık basamak)
  const handleTaxChange = (e) => {
    const inputValue = e.target.value;

    // Clear error when user types
    if (fieldErrors.tax) {
      setFieldErrors(prev => ({ ...prev, tax: null }));
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
      setDisplayTax(formData.tax.toString());
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

    // Tarih boşsa validasyon yapma
    if (!value) {
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    // Gelecek tarih kontrolü
    const todayString = getTodayDateString();
    if (value > todayString) {
      const errorMessages = {
        warehouseArrivalDate: "Antrepo varış tarihi gelecekte olamaz",
        registrationDate: "Tescil tarihi gelecekte olamaz",
        lineClosureDate: "Kapanma tarihi gelecekte olamaz",
        withdrawalDate: "Çekilme tarihi gelecekte olamaz"
      };

      setFieldErrors(prev => ({
        ...prev,
        [name]: errorMessages[name] || "Tarih gelecekte olamaz"
      }));
      return;
    }

    // Tarih sıralaması kontrolü
    const newFormData = { ...formData, [name]: value };

    if (name === 'warehouseArrivalDate' && newFormData.registrationDate) {
      if (value > newFormData.registrationDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: "Antrepo varış tarihi, tescil tarihinden sonra olamaz"
        }));
        return;
      }
    }

    if (name === 'registrationDate') {
      if (newFormData.warehouseArrivalDate && value < newFormData.warehouseArrivalDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: "Tescil tarihi, antrepo varış tarihinden önce olamaz"
        }));
        return;
      }
      if (newFormData.lineClosureDate && value > newFormData.lineClosureDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: "Tescil tarihi, kapanma tarihinden sonra olamaz"
        }));
        return;
      }
    }

    if (name === 'lineClosureDate') {
      if (newFormData.registrationDate && value < newFormData.registrationDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: "Kapanma tarihi, tescil tarihinden önce olamaz"
        }));
        return;
      }
      if (newFormData.withdrawalDate && value > newFormData.withdrawalDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: "Kapanma tarihi, çekilme tarihinden sonra olamaz"
        }));
        return;
      }
    }

    if (name === 'withdrawalDate' && newFormData.lineClosureDate) {
      if (value < newFormData.lineClosureDate) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: "Çekilme tarihi, kapanma tarihinden önce olamaz"
        }));
        return;
      }
    }

    // Validasyon geçtiyse değeri kaydet
    setFormData(prev => ({ ...prev, [name]: value }));
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
        [fieldName]: "Gecikme nedeni en az 10 karakter olmalıdır"
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

    // Check broker company (only for SUPER_ADMIN)
    if (isSuperAdmin && !formData.brokerCompanyId) {
      errors.brokerCompany = "Broker firması seçimi zorunludur";
    }

    // Check client company
    if (!formData.clientCompanyId) {
      errors.clientCompany = "Müşteri firması seçimi zorunludur";
    }

    // Vekalet kontrolü
    if (formData.clientCompanyId) {
      const agreement = clientAgreements[parseInt(formData.clientCompanyId)];
      if (!agreement || agreement.agreementStatus !== 'ACTIVE') {
        errors.clientCompany = "Seçili müşteri ile aktif vekalet anlaşmanız bulunmuyor";
      }
    }

    // Check each required field - only add error if field is empty
    if (!formData.fileNo || !formData.fileNo.trim()) {
      errors.fileNo = "Dosya numarası zorunludur";
    }
    if (!formData.customsId) {
      errors.customsId = "Gümrük seçimi zorunludur";
    }
    if (!warehouseSearchTerm || !warehouseSearchTerm.trim()) {
      errors.customsWarehouse = "Antrepo zorunludur";
    }
    if (!formData.containerAmount) {
      errors.containerAmount = "Konteyner miktarı zorunludur";
    }
    if (!formData.gate) {
      errors.gate = "Hat seçimi zorunludur";
    }
    if (!formData.weight) {
      errors.weight = "Kilo zorunludur";
    }
    if (formData.tax === '' || formData.tax === null || formData.tax === undefined) {
      errors.tax = "Vergi zorunludur";
    }
    if (!senderSearchTerm || !senderSearchTerm.trim()) {
      errors.senderName = "Gönderici adı zorunludur";
    }
    if (!formData.warehouseArrivalDate) {
      errors.warehouseArrivalDate = "Antrepo varış tarihi zorunludur";
    }

    // Beyanname No ve Tescil Tarihi birbirine bağlı validasyon
    const hasDeclarationNumber = formData.declarationNumber && formData.declarationNumber.trim();
    const hasRegistrationDate = formData.registrationDate;

    if (hasDeclarationNumber && !hasRegistrationDate) {
      errors.registrationDate = "Beyanname numarası girildiğinde tescil tarihi zorunludur";
    }
    if (hasRegistrationDate && !hasDeclarationNumber) {
      errors.declarationNumber = "Tescil tarihi girildiğinde beyanname numarası zorunludur";
    }

    // Beyanname numarası 18 karakter kontrolü
    if (hasDeclarationNumber && formData.declarationNumber.trim().length !== 18) {
      errors.declarationNumber = "Beyanname numarası 18 karakter olmalıdır";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate required fields first
    if (!validateRequiredFields()) {
      setLoading(false);
      showError("Lütfen tüm zorunlu alanları doldurun");
      return;
    }

    // Check if there are any field-level validation errors
    if (Object.keys(fieldErrors).length > 0) {
      setLoading(false);
      showError("Lütfen formdaki hataları düzeltin");
      return;
    }

    try {

      // Gecikme nedenleri için minimum karakter kontrolü
      if (delays.arrivalToRegistration && formData.delayReasons?.arrivalToRegistration) {
        const reason = formData.delayReasons.arrivalToRegistration.trim();
        if (reason.length > 0 && reason.length < 10) {
          showError("Antrepo varış - Tescil gecikme nedeni en az 10 karakter olmalıdır");
          setLoading(false);
          return;
        }
      }

      if (delays.registrationToClosure && formData.delayReasons?.registrationToClosure) {
        const reason = formData.delayReasons.registrationToClosure.trim();
        if (reason.length > 0 && reason.length < 10) {
          showError("Tescil - Kapanma gecikme nedeni en az 10 karakter olmalıdır");
          setLoading(false);
          return;
        }
      }

      if (delays.closureToWithdrawal && formData.delayReasons?.closureToWithdrawal) {
        const reason = formData.delayReasons.closureToWithdrawal.trim();
        if (reason.length > 0 && reason.length < 10) {
          showError("Kapanma - Çekilme gecikme nedeni en az 10 karakter olmalıdır");
          setLoading(false);
          return;
        }
      }

      // ✅ Belirli alanları büyük harfe çevir
      const transformedData = transformFormData(
        formData,
        TRANSACTION_UPPERCASE_FIELDS,
        locale
      );

      // Boş gecikme nedenlerini temizle
      const cleanedDelayReasons = Object.fromEntries(
        Object.entries(transformedData.delayReasons || {}).filter(([, v]) => v && v.trim() !== "")
      );

      // delayReasons'ı güncelle
      transformedData.delayReasons = Object.keys(cleanedDelayReasons).length > 0
        ? cleanedDelayReasons
        : undefined;

      // Boş değerleri temizle
      const cleanedData = Object.fromEntries(
        Object.entries(transformedData).filter(([, v]) => v !== "" && v !== undefined)
      );

      // Sayısal değerleri dönüştür
      if (cleanedData.brokerCompanyId) {
        cleanedData.brokerCompanyId = parseInt(cleanedData.brokerCompanyId);
      }
      if (cleanedData.clientCompanyId) {
        cleanedData.clientCompanyId = parseInt(cleanedData.clientCompanyId);
      }
      if (cleanedData.weight) {
        cleanedData.weight = parseFloat(cleanedData.weight);
      }
      if (cleanedData.tax) {
        cleanedData.tax = parseFloat(cleanedData.tax);
      }
      if (cleanedData.importProcessingTime) {
        cleanedData.importProcessingTime = parseInt(
          cleanedData.importProcessingTime
        );
      }

      console.log("📤 İşlem gönderiliyor:", cleanedData);

      const result = await transactionService.createTransaction(cleanedData);

      if (result.success) {
        console.log("✅ İşlem başarıyla oluşturuldu");
        showSuccess('İşlem başarıyla oluşturuldu!');
        onSuccess();
      } else {
        handleApiResponse(result, null, setError, "İşlem oluşturma");
      }
    } catch (err) {
      handleError(err, setError, "İşlem oluşturma", "İşlem oluşturulurken beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      brokerCompanyId: isSuperAdmin ? "" : currentUser?.company?.id || "",
      clientCompanyId: "",
      fileNo: "",
      recipientName: "",
      customsName: "",
      customsWarehouse: "",
      containerAmount: "",
      gate: "",
      weight: "",
      tax: "",
      senderName: "",
      warehouseArrivalDate: "",
      registrationDate: "",
      declarationNumber: "",
      lineClosureDate: "",
      importProcessingTime: "",
      withdrawalDate: "",
      description: "",
      delayReasons: {
        arrivalToRegistration: "",
        registrationToClosure: "",
        closureToWithdrawal: ""
      },
    });
    setError("");
    setSelectedClientInfo(null);
    setClientSearchTerm("");
    setShowClientDropdown(false);
    setSenderSearchTerm("");
    setShowSenderDropdown(false);

    if (isSuperAdmin) {
      setBrokerSearchTerm("");
      setShowBrokerDropdown(false);
    }
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

  // ✅ Yeni gönderici ekle - BÜYÜK HARFE ÇEVİR
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

  // ✅ Hat seçeneği için görüntüleme metni (büyük harf)
  const getGateDisplayLabel = (option) => {
    return `${option.emoji} ${t(option.labelKey)}`;
  };

  // Auto-focus first enabled input when modal opens
  useEffect(() => {
    // Small delay to ensure modal animation is complete
    const timer = setTimeout(() => {
      const firstInput = document.querySelector('.fixed.inset-0 input:not([disabled])');
      if (firstInput) {
        firstInput.focus();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts: ESC to close, CTRL+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC to close modal
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // CTRL+S (or CMD+S on Mac) to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!loading) {
          handleSubmit(e);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in transition-colors duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 transition-colors duration-300">
            <div>
              <h2 className="text-2xl font-bold text-text-main">
                {t("transaction.addNew")}
              </h2>
              <p className="text-text-secondary text-sm mt-1">
                Lütfen işlem detaylarını girin ve kaydedin.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined text-text-secondary">
                close
              </span>
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Vekalet Bilgi Paneli */}
              {selectedClientInfo && (
                <AgreementInfoPanel
                  agreement={selectedClientAgreement}
                  clientName={selectedClientInfo.name}
                  onCreateAgreement={
                    currentUser?.globalRole === 'BROKER_ADMIN'
                      ? () => setShowCreateAgreementModal(true)
                      : undefined
                  }
                />
              )}

              {/* Vekalet Yoksa ve BROKER_USER ise Uyarı */}
              {selectedClientInfo &&
               !selectedClientAgreement &&
               currentUser?.globalRole === 'BROKER_USER' && (
                <div className="lg:col-span-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700 rounded-xl p-4 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-2xl">
                      warning
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                        Bu firma ile aktif vekalet anlaşmanız bulunmuyor
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        İşlem oluşturmak için lütfen yöneticinizle iletişime geçin.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ALICI - EN BAŞTA VE HER ZAMAN DISABLED */}
              <label className="flex flex-col w-full lg:col-span-3">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.recipient")} *
                  {selectedClientInfo && selectedClientInfo.shortName && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                      (Firma kısa adı otomatik dolduruldu)
                    </span>
                  )}
                </p>
                <input
                  type="text"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleChange}
                  disabled={true}
                  required
                  className="form-input w-full rounded-lg text-text-main dark:text-gray-300 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 h-12 placeholder:text-neutral dark:placeholder:text-gray-500 p-3 text-base font-normal cursor-not-allowed transition-colors"
                  placeholder={toUpperCase(t("placeholders.firstSelectClient"))}
                />
              </label>

              {/* BROKER FİRMASI - SADECE SUPER_ADMIN için görünür */}
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
                          ({availableBrokers.length} broker kayıtlı)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Aranabilir Broker Input */}
                  <div className="relative" id="broker-dropdown-container">
                    <div className="relative">
                      <input
                        type="text"
                        value={brokerSearchTerm}
                        onChange={(e) => {
                          setBrokerSearchTerm(e.target.value);
                          setShowBrokerDropdown(true);
                          // Clear error when user types
                          if (fieldErrors.brokerCompany) {
                            setFieldErrors(prev => ({ ...prev, brokerCompany: null }));
                          }
                        }}
                        onFocus={() => setShowBrokerDropdown(true)}
                        onKeyDown={brokerKeyboard.handleKeyDown}
                        placeholder={toUpperCase(
                          t("placeholders.typeToSearch")
                        )}
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
                        onClick={() =>
                          setShowBrokerDropdown(!showBrokerDropdown)
                        }
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
                                <p className="text-sm">
                                  Kayıtlı broker bulunamadı.
                                </p>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-4xl mb-2">
                                  search_off
                                </span>
                                <p className="text-sm">
                                  "{brokerSearchTerm}" için sonuç bulunamadı
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
                                data-dropdown-id="broker-dropdown"
                                data-dropdown-index={index}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    brokerCompanyId: broker.id,
                                  }));
                                  setBrokerSearchTerm(broker.name);
                                  setShowBrokerDropdown(false);
                                  // Clear error when broker is selected
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

                            {filteredBrokers.length === 100 &&
                              availableBrokers.length > 100 && (
                                <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-center">
                                  <p className="text-xs text-yellow-800">
                                    İlk 100 sonuç gösteriliyor. Daha spesifik
                                    arama yapın.
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

                  {/* Validation Error */}
                  {!formData.brokerCompanyId && (
                    <input
                      type="text"
                      required
                      value={formData.brokerCompanyId}
                      onChange={() => {}}
                      className="hidden"
                    />
                  )}
                </div>
              )}

              {/* Broker bilgisi broker kullanıcıları için hidden */}
              {!isSuperAdmin && (
                <input
                  type="hidden"
                  name="brokerCompanyId"
                  value={formData.brokerCompanyId}
                />
              )}

              {/* Müşteri Firması - Aranabilir Dropdown */}
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
                        ({availableClients.length} firma kayıtlı)
                      </span>
                    )}
                  </p>
                  {((isSuperAdmin && formData.brokerCompanyId) ||
                    !isSuperAdmin) && (
                    <button
                      type="button"
                      onClick={() => setShowNewClientModal(true)}
                      className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">
                        add
                      </span>
                      {t("company.addNew")}
                    </button>
                  )}
                </div>

                {/* SUPER_ADMIN için uyarı: Önce broker seç */}
                {isSuperAdmin && !formData.brokerCompanyId && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                    <p className="text-xs text-yellow-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        info
                      </span>
                      Önce yukarıdan broker firması seçin
                    </p>
                  </div>
                )}

                {/* Aranabilir Input */}
                <div className="relative" id="client-dropdown-container">
                  <div className="relative">
                    <input
                      type="text"
                      value={clientSearchTerm}
                      onChange={(e) => {
                        setClientSearchTerm(e.target.value);
                        setShowClientDropdown(true);
                        // Clear error when user types
                        if (fieldErrors.clientCompany) {
                          setFieldErrors(prev => ({ ...prev, clientCompany: null }));
                        }
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      onKeyDown={clientKeyboard.handleKeyDown}
                      placeholder={toUpperCase(t("placeholders.typeToSearch"))}
                      disabled={
                        loadingClients ||
                        (isSuperAdmin && !formData.brokerCompanyId)
                      }
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

                  {/* Dropdown List */}
                  {showClientDropdown && !loadingClients && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors">
                      {filteredClients.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          {availableClients.length === 0 ? (
                            <>
                              <span className="material-symbols-outlined text-4xl mb-2 text-orange-500">
                                warning
                              </span>
                              <p className="text-sm">
                                Kayıtlı firma bulunamadı.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowClientDropdown(false);
                                  setShowNewClientModal(true);
                                }}
                                className="mt-2 text-xs text-primary hover:underline"
                              >
                                Hemen yeni firma ekle →
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-4xl mb-2">
                                search_off
                              </span>
                              <p className="text-sm">
                                "{clientSearchTerm}" için sonuç bulunamadı
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          {filteredClients.map((client, index) => {
                            const agreement = clientAgreements[client.id];
                            const isActive = agreement?.agreementStatus === 'ACTIVE';
                            // ✅ Allow all clients to be selectable (removed disabled logic)

                            return (
                              <button
                                key={client.id}
                                type="button"
                                data-dropdown-id="client-dropdown"
                                data-dropdown-index={index}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    clientCompanyId: client.id,
                                  }));
                                  setClientSearchTerm(client.name);
                                  setShowClientDropdown(false);
                                  // Clear error when client is selected
                                  if (fieldErrors.clientCompany) {
                                    setFieldErrors(prev => ({ ...prev, clientCompany: null }));
                                  }
                                }}
                                className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
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

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* Agreement Badge */}
                                    {isActive ? (
                                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 rounded-full">
                                        Aktif
                                      </span>
                                    ) : agreement?.agreementStatus === 'PENDING' ? (
                                      <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 rounded-full">
                                        Onay Bekliyor
                                      </span>
                                    ) : agreement?.agreementStatus === 'INACTIVE' ? (
                                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full">
                                        Pasif
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-full">
                                        Vekalet Yok
                                      </span>
                                    )}

                                    {formData.clientCompanyId === client.id && (
                                      <span className="material-symbols-outlined text-primary text-lg">
                                        check_circle
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}

                          {filteredClients.length === 100 &&
                            availableClients.length > 100 && (
                              <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-center">
                                <p className="text-xs text-yellow-800">
                                  İlk 100 sonuç gösteriliyor. Daha spesifik
                                  arama yapın.
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

                {/* Validation Error */}
                {!formData.clientCompanyId && (
                  <input
                    type="text"
                    required
                    value={formData.clientCompanyId}
                    onChange={() => {}}
                    className="hidden"
                  />
                )}
              </div>

              {/* Seçilen Client Bilgisi */}
              {selectedClientInfo && (
                <div className="lg:col-span-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 mt-0.5">
                      info
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                        Seçili Firma: {selectedClientInfo.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dosya No */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.fileNo")} *
                </p>
                <input
                  type="text"
                  name="fileNo"
                  value={formData.fileNo}
                  onChange={(e) => {
                    handleChange(e);
                    // Clear error when user types
                    if (fieldErrors.fileNo) {
                      setFieldErrors(prev => ({ ...prev, fileNo: null }));
                    }
                  }}
                  required
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.fileNo
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors`}
                  placeholder={toUpperCase(t("placeholders.enterFileNo"))}
                  style={{ textTransform: "uppercase" }}
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
                    {t("transaction.customsName")} *
                    {loadingCustoms && (
                      <span className="text-xs text-blue-600 ml-2 animate-pulse">
                        {t("common.loading")}
                      </span>
                    )}
                    {!loadingCustoms && availableCustoms.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({availableCustoms.length} kayıtlı)
                      </span>
                    )}
                  </p>
                </div>

                <div className="relative" id="customs-dropdown-container">
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
                      placeholder={toUpperCase(t("placeholders.selectOrType"))}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.customsId
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                      } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal transition-colors`}
                      style={{ textTransform: "uppercase" }}
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
                        <div className="p-4 text-center text-gray-500">
                          <span className="material-symbols-outlined text-4xl mb-2">
                            account_balance
                          </span>
                          <p className="text-sm">
                            Henüz kayıtlı gümrük yok.
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            Yeni gümrük adı yazarak ekleyebilirsiniz.
                          </p>
                        </div>
                      ) : filteredCustoms.length === 0 && customsSearchTerm.trim() ? (
                        <div className="p-4 text-center text-gray-500">
                          <span className="material-symbols-outlined text-4xl mb-2">
                            search_off
                          </span>
                          <p className="text-sm">
                            "{customsSearchTerm}" ile eşleşen gümrük bulunamadı.
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            Yukarıdaki butona tıklayarak yeni olarak ekleyebilirsiniz.
                          </p>
                        </div>
                      ) : (
                        <>
                          {filteredCustoms.map((customs, index) => (
                            <button
                              key={customs.id}
                              type="button"
                              data-dropdown-id="customs-dropdown"
                              data-dropdown-index={index}
                              onClick={() => handleCustomsSelect(customs)}
                              className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                selectedCustomsId === customs.id
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-primary font-medium"
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
                              <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-center">
                                <p className="text-xs text-yellow-800">
                                  İlk 50 sonuç gösteriliyor. Daha spesifik arama yapın.
                                </p>
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {fieldErrors.customsName && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                      <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                        error
                      </span>
                      <p className="text-sm text-red-700 font-medium">
                        {fieldErrors.customsName}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Antrepo - Aranabilir Dropdown */}
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-text-main text-sm font-medium">
                    {t("transaction.customsWarehouse")} *
                    {loadingWarehouses && (
                      <span className="text-xs text-blue-600 ml-2 animate-pulse">
                        {t("common.loading")}
                      </span>
                    )}
                    {!loadingWarehouses && availableWarehouses.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({availableWarehouses.length} kayıtlı)
                      </span>
                    )}
                  </p>
                </div>

                <div className="relative" id="warehouse-dropdown-container">
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
                      placeholder={toUpperCase(t("placeholders.selectOrType"))}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.customsWarehouse
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                      } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal transition-colors`}
                      style={{ textTransform: "uppercase" }}
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
                            <span className="material-symbols-outlined text-green-600 text-lg">
                              add_circle
                            </span>
                            <div>
                              <p className="font-medium text-sm text-green-700">
                                "{toUpperCase(warehouseSearchTerm.trim(), locale)}" olarak ekle
                              </p>
                              <p className="text-xs text-green-600">
                                Yeni antrepo olarak kullan
                              </p>
                            </div>
                          </div>
                        </button>
                      )}

                      {filteredWarehouses.length === 0 && !warehouseSearchTerm.trim() ? (
                        <div className="p-4 text-center text-gray-500">
                          <span className="material-symbols-outlined text-4xl mb-2">
                            warehouse
                          </span>
                          <p className="text-sm">
                            Henüz kayıtlı antrepo yok.
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            Yeni antrepo adı yazarak ekleyebilirsiniz.
                          </p>
                        </div>
                      ) : filteredWarehouses.length === 0 && warehouseSearchTerm.trim() ? (
                        <div className="p-4 text-center text-gray-500">
                          <span className="material-symbols-outlined text-4xl mb-2">
                            search_off
                          </span>
                          <p className="text-sm">
                            "{warehouseSearchTerm}" ile eşleşen antrepo bulunamadı.
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            Yukarıdaki butona tıklayarak yeni olarak ekleyebilirsiniz.
                          </p>
                        </div>
                      ) : (
                        <>
                          {filteredWarehouses.map((warehouse, index) => (
                            <button
                              key={index}
                              type="button"
                              data-dropdown-id="warehouse-dropdown"
                              data-dropdown-index={index}
                              onClick={() => handleWarehouseSelect(warehouse)}
                              className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                formData.customsWarehouse === warehouse
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-primary font-medium"
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
                              <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-center">
                                <p className="text-xs text-yellow-800">
                                  İlk 50 sonuç gösteriliyor. Daha spesifik arama yapın.
                                </p>
                              </div>
                            )}
                        </>
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
              </div>

              {/* Kap */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.containerAmount")} *
                </p>
                <input
                  type="number"
                  step="1"
                  min="0"
                  name="containerAmount"
                  value={formData.containerAmount}
                  onChange={(e) => {
                    handleChange(e);
                    // Clear error when user types
                    if (fieldErrors.containerAmount) {
                      setFieldErrors(prev => ({ ...prev, containerAmount: null }));
                    }
                  }}
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.containerAmount
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors`}
                  placeholder={toUpperCase(t("placeholders.enterContainerAmount"))}
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
                  {t("transaction.weight")} *
                </p>
                <input
                  type="text"
                  name="weight"
                  value={displayWeight || formData.weight}
                  onChange={handleWeightChange}
                  onBlur={handleWeightBlur}
                  onFocus={handleWeightFocus}
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.weight
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors`}
                  placeholder={toUpperCase(t("placeholders.enterWeight"))}
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
                  {t("transaction.tax")} *
                </p>
                <input
                  type="text"
                  name="tax"
                  value={displayTax || formData.tax}
                  onChange={handleTaxChange}
                  onBlur={handleTaxBlur}
                  onFocus={handleTaxFocus}
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.tax
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors`}
                  placeholder={toUpperCase(t("placeholders.enterTax"))}
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

              {/* Gönderici - Aranabilir Dropdown */}
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-text-main text-sm font-medium">
                    {t("transaction.sender")} *
                    {loadingSenders && (
                      <span className="text-xs text-blue-600 ml-2 animate-pulse">
                        {t("common.loading")}
                      </span>
                    )}
                    {!loadingSenders && availableSenders.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({availableSenders.length} kayıtlı)
                      </span>
                    )}
                  </p>
                </div>

                <div className="relative" id="sender-dropdown-container">
                  <div className="relative">
                    <input
                      type="text"
                      value={senderSearchTerm}
                      onChange={(e) => {
                        // ✅ Yazarken de büyük harfe çevir (görsel)
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
                      placeholder={toUpperCase(t("placeholders.selectOrType"))}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.senderName
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                      } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal transition-colors`}
                      style={{ textTransform: "uppercase" }}
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
                      {senderSearchTerm.trim() &&
                        !availableSenders.some(
                          (s) =>
                            s.toUpperCase() === senderSearchTerm.toUpperCase()
                        ) && (
                          <button
                            type="button"
                            onClick={handleAddNewSender}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border-b border-gray-200 dark:border-gray-700 bg-green-50/50 dark:bg-green-900/10"
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-green-600 text-lg">
                                add_circle
                              </span>
                              <div>
                                <p className="font-medium text-sm text-green-700">
                                  "
                                  {toUpperCase(senderSearchTerm.trim(), locale)}
                                  " olarak ekle
                                </p>
                                <p className="text-xs text-green-600">
                                  Yeni gönderici olarak kullan
                                </p>
                              </div>
                            </div>
                          </button>
                        )}

                      {filteredSenders.length === 0 &&
                      !senderSearchTerm.trim() ? (
                        <div className="p-4 text-center text-gray-500">
                          <span className="material-symbols-outlined text-4xl mb-2">
                            local_shipping
                          </span>
                          <p className="text-sm">
                            Henüz kayıtlı gönderici yok.
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            Yeni gönderici adı yazarak ekleyebilirsiniz.
                          </p>
                        </div>
                      ) : filteredSenders.length === 0 &&
                        senderSearchTerm.trim() ? (
                        <div className="p-4 text-center text-gray-500">
                          <span className="material-symbols-outlined text-4xl mb-2">
                            search_off
                          </span>
                          <p className="text-sm">
                            "{senderSearchTerm}" ile eşleşen gönderici
                            bulunamadı.
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            Yukarıdaki butona tıklayarak yeni olarak
                            ekleyebilirsiniz.
                          </p>
                        </div>
                      ) : (
                        <>
                          {filteredSenders.map((sender, index) => (
                            <button
                              key={index}
                              type="button"
                              data-dropdown-id="sender-dropdown"
                              data-dropdown-index={index}
                              onClick={() => handleSenderSelect(sender)}
                              className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                formData.senderName === sender
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-primary font-medium"
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
                              <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-center">
                                <p className="text-xs text-yellow-800">
                                  İlk 50 sonuç gösteriliyor. Daha spesifik arama
                                  yapın.
                                </p>
                              </div>
                            )}
                        </>
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
              </div>

              {/* Beyanname No */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.declarationNumber")}
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
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.declarationNumber
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors`}
                  placeholder={toUpperCase(t('placeholders.enterDeclarationNumber'))}
                  style={{ textTransform: "uppercase" }}
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
                  {t("transaction.gate")} *
                </p>
                <select
                  name="gate"
                  value={formData.gate}
                  onChange={(e) => {
                    handleChange(e);
                    // Clear error when user types
                    if (fieldErrors.gate) {
                      setFieldErrors(prev => ({ ...prev, gate: null }));
                    }
                  }}
                  className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                    fieldErrors.gate
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                  } bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal transition-colors`}
                >
                  <option value="">{toUpperCase(t("gates.select"))}</option>
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
                    Tarih Bilgileri
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Antrepo Varış Tarihi */}
                  <label className="flex flex-col w-full">
                    <p className="text-text-main text-sm font-medium pb-2">
                      {t("transaction.warehouseArrivalDate")} *
                    </p>
                    <input
                      type="date"
                      name="warehouseArrivalDate"
                      value={formData.warehouseArrivalDate}
                      onChange={handleDateChange}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.warehouseArrivalDate
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-blue-300 dark:border-blue-700 focus:ring-blue-500 focus:border-blue-500'
                      } bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal transition-colors`}
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
                      {t("transaction.registrationDate")}
                    </p>
                    <input
                      type="date"
                      name="registrationDate"
                      value={formData.registrationDate}
                      onChange={handleDateChange}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.registrationDate
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-blue-300 dark:border-blue-700 focus:ring-blue-500 focus:border-blue-500'
                      } bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal transition-colors`}
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
                      {t("transaction.lineClosureDate")}
                    </p>
                    <input
                      type="date"
                      name="lineClosureDate"
                      value={formData.lineClosureDate}
                      onChange={handleDateChange}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.lineClosureDate
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-blue-300 dark:border-blue-700 focus:ring-blue-500 focus:border-blue-500'
                      } bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal transition-colors`}
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
                      {t("transaction.withdrawalDate")}
                    </p>
                    <input
                      type="date"
                      name="withdrawalDate"
                      value={formData.withdrawalDate}
                      onChange={handleDateChange}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.withdrawalDate
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-blue-300 dark:border-blue-700 focus:ring-blue-500 focus:border-blue-500'
                      } bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal transition-colors`}
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

              {/* Conditional Delay #1: Antrepo Varış → Tescil */}
              {(delays.arrivalToRegistration || formData.delayReasons.arrivalToRegistration.length > 0) && (
                <div className="flex flex-col w-full md:col-span-2 lg:col-span-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">warning</span>
                      <p className="text-text-main text-sm font-bold">
                        Antrepo Varış → Tescil Gecikme Nedeni * (4 günden fazla)
                      </p>
                    </div>
                    {formData.delayReasons.arrivalToRegistration.length > 0 && (
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
                        className="p-1 hover:bg-yellow-200 rounded-full transition-colors"
                        title="İçeriği temizle"
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
                      // Validate on change
                      validateDelayReason('arrivalToRegistration', value);
                    }}
                    onBlur={(e) => validateDelayReason('arrivalToRegistration', e.target.value)}
                    required
                    rows="2"
                    className={`form-textarea w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                      fieldErrors.arrivalToRegistration
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500 focus:border-yellow-500'
                    } bg-white dark:bg-gray-800 placeholder:text-neutral p-3 text-base font-normal transition-colors`}
                    placeholder="Lütfen antrepo varış ve tescil tarihi arasındaki gecikme nedenini açıklayın (minimum 10 karakter)"
                  />
                  {/* Error Message */}
                  {fieldErrors.arrivalToRegistration && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                      <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                        error
                      </span>
                      <p className="text-sm text-red-700 font-medium">
                        {fieldErrors.arrivalToRegistration}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Conditional Delay #2: Tescil → Kapanma */}
              {(delays.registrationToClosure || formData.delayReasons.registrationToClosure.length > 0) && (
                <div className="flex flex-col w-full md:col-span-2 lg:col-span-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg p-4 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">warning</span>
                      <p className="text-text-main text-sm font-bold">
                        Tescil → Kapanma Gecikme Nedeni * (4 günden fazla)
                      </p>
                    </div>
                    {formData.delayReasons.registrationToClosure.length > 0 && (
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
                        className="p-1 hover:bg-orange-200 rounded-full transition-colors"
                        title="İçeriği temizle"
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
                      // Validate on change
                      validateDelayReason('registrationToClosure', value);
                    }}
                    onBlur={(e) => validateDelayReason('registrationToClosure', e.target.value)}
                    required
                    rows="2"
                    className={`form-textarea w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                      fieldErrors.registrationToClosure
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-orange-300 dark:border-orange-700 focus:ring-orange-500 focus:border-orange-500'
                    } bg-white dark:bg-gray-800 placeholder:text-neutral p-3 text-base font-normal transition-colors`}
                    placeholder="Lütfen tescil ve kapanma tarihi arasındaki gecikme nedenini açıklayın (minimum 10 karakter)"
                  />
                  {/* Error Message */}
                  {fieldErrors.registrationToClosure && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                      <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                        error
                      </span>
                      <p className="text-sm text-red-700 font-medium">
                        {fieldErrors.registrationToClosure}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Conditional Delay #3: Kapanma → Çekilme */}
              {(delays.closureToWithdrawal || formData.delayReasons.closureToWithdrawal.length > 0) && (
                <div className="flex flex-col w-full md:col-span-2 lg:col-span-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                      <p className="text-text-main text-sm font-bold">
                        Kapanma → Çekilme Gecikme Nedeni * (4 günden fazla)
                      </p>
                    </div>
                    {formData.delayReasons.closureToWithdrawal.length > 0 && (
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
                        className="p-1 hover:bg-red-200 rounded-full transition-colors"
                        title="İçeriği temizle"
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
                      // Validate on change
                      validateDelayReason('closureToWithdrawal', value);
                    }}
                    onBlur={(e) => validateDelayReason('closureToWithdrawal', e.target.value)}
                    required
                    rows="2"
                    className={`form-textarea w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                      fieldErrors.closureToWithdrawal
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500'
                    } bg-white dark:bg-gray-800 placeholder:text-neutral p-3 text-base font-normal transition-colors`}
                    placeholder="Lütfen kapanma ve çekilme tarihi arasındaki gecikme nedenini açıklayın (minimum 10 karakter)"
                  />
                  {/* Error Message */}
                  {fieldErrors.closureToWithdrawal && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                      <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">
                        error
                      </span>
                      <p className="text-sm text-red-700 font-medium">
                        {fieldErrors.closureToWithdrawal}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Açıklama */}
              <label className="flex flex-col w-full md:col-span-2 lg:col-span-3">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.description")}
                </p>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="form-textarea w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary placeholder:text-neutral p-3 text-base font-normal transition-colors"
                  placeholder={t("placeholders.enterDescription")}
                />
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-3 md:gap-4 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
            <button
              type="button"
              onClick={handleClear}
              className="w-full md:w-auto px-6 py-3 bg-neutral/20 text-text-main rounded-lg hover:bg-neutral/30 transition-colors font-semibold"
            >
              {t("common.clear")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full md:w-auto px-6 py-3 text-text-secondary hover:text-text-main font-medium transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">save</span>
              {loading ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </div>
      </div>

      {/* Yeni Client Ekleme Modal */}
      <AddClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onSuccess={(newClient) => {
          // Set as selected client after creation
          // Backend returns companyId and companyName, not id and name
          if (newClient?.companyId) {
            setFormData(prev => ({ ...prev, clientCompanyId: newClient.companyId }));
            setClientSearchTerm(newClient.companyName || '');
            loadClientCompanies(formData.brokerCompanyId || currentUser?.company?.id);
          }
        }}
        brokerCompanyId={formData.brokerCompanyId ? parseInt(formData.brokerCompanyId) : currentUser?.company?.id}
      />

      {/* Vekalet Oluşturma Modalı */}
      {showCreateAgreementModal && (
        <CreateAgreementModal
          isOpen={showCreateAgreementModal}
          onClose={() => setShowCreateAgreementModal(false)}
          brokerCompanyId={formData.brokerCompanyId ? parseInt(formData.brokerCompanyId) : currentUser?.company?.id}
          clientCompanyId={formData.clientCompanyId ? parseInt(formData.clientCompanyId) : null}
          clientCompanyName={selectedClientInfo?.name}
          onSuccess={() => {
            // Agreement oluşturuldu, client listesini yeniden yükle
            const brokerId = formData.brokerCompanyId || currentUser?.company?.id;
            loadClientCompanies(brokerId);
            setShowCreateAgreementModal(false);
          }}
        />
      )}
    </>
  );
}
