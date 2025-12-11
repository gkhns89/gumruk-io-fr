import React, { useState, useEffect } from "react";
import { transactionService } from "../../api/transactionService";
import { companyService } from "../../api/companyService";
import { GATE_OPTIONS } from "../../utils/constants";
import {
  toUpperCase,
  transformFormData,
  TRANSACTION_UPPERCASE_FIELDS,
} from "../../utils/textUtils";
import { t, getCurrentLocale } from "../../locales";

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
    delayReason: "",
  });

  const [availableClients, setAvailableClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientInfo, setSelectedClientInfo] = useState(null);

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
  const [availableCustoms, setAvailableCustoms] = useState([]);
  const [filteredCustoms, setFilteredCustoms] = useState([]);
  const [customsSearchTerm, setCustomsSearchTerm] = useState("");
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

  // Yeni firma ekleme modal state
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    shortName: "",
    description: "",
  });
  const [savingNewClient, setSavingNewClient] = useState(false);

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
    if (clientSearchTerm.trim() === "") {
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
        customs.toLowerCase().includes(searchLower)
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
      setClientSearchTerm("");
      setFormData((prev) => ({ ...prev, recipientName: "" }));
    }
  }, [formData.clientCompanyId, availableClients, locale]);

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
      console.error("Broker listesi yükleme hatası:", err);
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
      } else {
        setAvailableClients([]);
        setFilteredClients([]);
      }
    } catch (err) {
      console.error("Client listesi yükleme hatası:", err);
      setAvailableClients([]);
      setFilteredClients([]);
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
      console.error("Gönderici listesi yükleme hatası:", err);
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
      const result = await transactionService.getAllTransactions();

      if (result.success) {
        const uniqueCustoms = [
          ...new Set(
            result.data
              .map((t) => t.customsName)
              .filter((name) => name && name.trim() !== "")
          ),
        ].sort((a, b) => a.localeCompare(b, "tr"));

        setAvailableCustoms(uniqueCustoms);
        setFilteredCustoms(uniqueCustoms.slice(0, 50));
      } else {
        setAvailableCustoms([]);
        setFilteredCustoms([]);
      }
    } catch (err) {
      console.error("Gümrük listesi yükleme hatası:", err);
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
      console.error("Antrepo listesi yükleme hatası:", err);
      setAvailableWarehouses([]);
      setFilteredWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Vergi değeri için özel validasyon (maksimum 4 ondalık basamak)
  const handleTaxChange = (e) => {
    const value = e.target.value;

    // Boş değere izin ver
    if (value === '') {
      setFormData(prev => ({ ...prev, tax: '' }));
      return;
    }

    // Değeri kontrol et - maksimum 4 ondalık basamak
    const parts = value.split('.');
    if (parts.length === 2 && parts[1].length > 4) {
      // 4 haneden fazla ondalık varsa, 4 haneye kısalt
      const truncatedValue = `${parts[0]}.${parts[1].substring(0, 4)}`;
      setFormData(prev => ({ ...prev, tax: truncatedValue }));
    } else {
      setFormData(prev => ({ ...prev, tax: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // ✅ Belirli alanları büyük harfe çevir
      const transformedData = transformFormData(
        formData,
        TRANSACTION_UPPERCASE_FIELDS,
        locale
      );

      // Boş değerleri temizle
      const cleanedData = Object.fromEntries(
        Object.entries(transformedData).filter(([, v]) => v !== "")
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
        onSuccess();
      } else {
        console.error("❌ İşlem oluşturma hatası:", result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error("💥 İşlem oluşturma hatası:", err);
      setError("İşlem oluşturulurken beklenmeyen bir hata oluştu.");
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
      delayReason: "",
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

  // Yeni client ekleme
  const handleNewClientSubmit = async (e) => {
    e.preventDefault();
    setSavingNewClient(true);

    try {
      const result = await companyService.createClientCompany({
        name: toUpperCase(newClientForm.name, locale),
        shortName: toUpperCase(newClientForm.shortName, locale),
        description: newClientForm.description,
        parentBrokerId: parseInt(
          formData.brokerCompanyId || currentUser?.company?.id
        ),
      });

      if (result.success) {
        await loadClientCompanies(
          formData.brokerCompanyId || currentUser?.company?.id
        );

        setFormData((prev) => ({
          ...prev,
          clientCompanyId: result.data.companyId,
        }));

        setClientSearchTerm(newClientForm.name);
        setShowNewClientModal(false);
        setNewClientForm({ name: "", shortName: "", description: "" });
      } else {
        alert(result.error || "Client oluşturulamadı");
      }
    } catch (err) {
      console.error("Client oluşturma hatası:", err);
      alert("Client oluşturulurken beklenmeyen bir hata oluştu.");
    } finally {
      setSavingNewClient(false);
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
  const handleCustomsSelect = (customsName) => {
    setFormData((prev) => ({
      ...prev,
      customsName: customsName,
    }));
    setCustomsSearchTerm(customsName);
    setShowCustomsDropdown(false);
  };

  // Yeni gümrük ekle - BÜYÜK HARFE ÇEVİR
  const handleAddNewCustoms = () => {
    if (customsSearchTerm.trim()) {
      const upperCaseCustoms = toUpperCase(customsSearchTerm.trim(), locale);
      setFormData((prev) => ({
        ...prev,
        customsName: upperCaseCustoms,
      }));
      setCustomsSearchTerm(upperCaseCustoms);
      setShowCustomsDropdown(false);
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5">
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
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-text-secondary">
                close
              </span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* ALICI - EN BAŞTA VE HER ZAMAN DISABLED */}
              <label className="flex flex-col w-full lg:col-span-3">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.recipient")} *
                  {selectedClientInfo && selectedClientInfo.shortName && (
                    <span className="text-xs text-blue-600 ml-2">
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
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-gray-100 h-12 placeholder:text-neutral p-3 text-base font-normal cursor-not-allowed"
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
                        }}
                        onFocus={() => setShowBrokerDropdown(true)}
                        placeholder={toUpperCase(
                          t("placeholders.typeToSearch")
                        )}
                        disabled={loadingBrokers}
                        className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal disabled:bg-gray-100"
                      />

                      {/* Clear Button */}
                      {brokerSearchTerm && (
                        <button
                          type="button"
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
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredBrokers.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
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
                            {filteredBrokers.map((broker) => (
                              <button
                                key={broker.id}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    brokerCompanyId: broker.id,
                                  }));
                                  setBrokerSearchTerm(broker.name);
                                  setShowBrokerDropdown(false);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                  formData.brokerCompanyId === broker.id
                                    ? "bg-blue-50 text-primary font-medium"
                                    : ""
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {broker.name}
                                    </p>
                                    {broker.description && (
                                      <p className="text-xs text-gray-500 truncate mt-0.5">
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
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder={toUpperCase(t("placeholders.typeToSearch"))}
                      disabled={
                        loadingClients ||
                        (isSuperAdmin && !formData.brokerCompanyId)
                      }
                      className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal disabled:bg-gray-100"
                    />

                    {/* Clear Button */}
                    {clientSearchTerm && (
                      <button
                        type="button"
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
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
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
                          {filteredClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  clientCompanyId: client.id,
                                }));
                                setClientSearchTerm(client.name);
                                setShowClientDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                formData.clientCompanyId === client.id
                                  ? "bg-blue-50 text-primary font-medium"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {client.name}
                                  </p>
                                  {client.description && (
                                    <p className="text-xs text-gray-500 truncate mt-0.5">
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
                <div className="lg:col-span-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600 mt-0.5">
                      info
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">
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
                  onChange={handleChange}
                  required
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder={toUpperCase(t("placeholders.enterFileNo"))}
                  style={{ textTransform: "uppercase" }}
                />
              </label>
           
              {/* Gümrük - Aranabilir Dropdown */}
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-text-main text-sm font-medium">
                    {t("transaction.customsName")}
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
                        setFormData((prev) => ({
                          ...prev,
                          customsName: upperValue,
                        }));
                        setShowCustomsDropdown(true);
                      }}
                      onFocus={() => setShowCustomsDropdown(true)}
                      placeholder={toUpperCase(t("placeholders.selectOrType"))}
                      className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal"
                      style={{ textTransform: "uppercase" }}
                    />

                    {/* Clear Button */}
                    {customsSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomsSearchTerm("");
                          setFormData((prev) => ({
                            ...prev,
                            customsName: "",
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
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {/* Yeni gümrük ekleme seçeneği */}
                      {customsSearchTerm.trim() && !availableCustoms.some(c => c.toUpperCase() === customsSearchTerm.toUpperCase()) && (
                        <button
                          type="button"
                          onClick={handleAddNewCustoms}
                          className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-gray-200 bg-green-50/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-600 text-lg">
                              add_circle
                            </span>
                            <div>
                              <p className="font-medium text-sm text-green-700">
                                "{toUpperCase(customsSearchTerm.trim(), locale)}" olarak ekle
                              </p>
                              <p className="text-xs text-green-600">
                                Yeni gümrük olarak kullan
                              </p>
                            </div>
                          </div>
                        </button>
                      )}

                      {filteredCustoms.length === 0 && !customsSearchTerm.trim() ? (
                        <div className="p-4 text-center text-gray-500">
                          <span className="material-symbols-outlined text-4xl mb-2">
                            account_balance
                          </span>
                          <p className="text-sm">
                            Henüz kayıtlı gümrük yok.
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
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
                          <p className="text-xs text-gray-400 mt-1">
                            Yukarıdaki butona tıklayarak yeni olarak ekleyebilirsiniz.
                          </p>
                        </div>
                      ) : (
                        <>
                          {filteredCustoms.map((customs, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleCustomsSelect(customs)}
                              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                formData.customsName === customs
                                  ? "bg-blue-50 text-primary font-medium"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-gray-400 text-lg">
                                    account_balance
                                  </span>
                                  <p className="font-medium text-sm truncate uppercase">
                                    {customs}
                                  </p>
                                </div>
                                {formData.customsName === customs && (
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
                </div>
              </div>
           
              {/* Antrepo - Aranabilir Dropdown */}
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-text-main text-sm font-medium">
                    {t("transaction.customsWarehouse")}
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
                      }}
                      onFocus={() => setShowWarehouseDropdown(true)}
                      placeholder={toUpperCase(t("placeholders.selectOrType"))}
                      className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal"
                      style={{ textTransform: "uppercase" }}
                    />

                    {/* Clear Button */}
                    {warehouseSearchTerm && (
                      <button
                        type="button"
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
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {/* Yeni antrepo ekleme seçeneği */}
                      {warehouseSearchTerm.trim() && !availableWarehouses.some(w => w.toUpperCase() === warehouseSearchTerm.toUpperCase()) && (
                        <button
                          type="button"
                          onClick={handleAddNewWarehouse}
                          className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-gray-200 bg-green-50/50"
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
                          <p className="text-xs text-gray-400 mt-1">
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
                          <p className="text-xs text-gray-400 mt-1">
                            Yukarıdaki butona tıklayarak yeni olarak ekleyebilirsiniz.
                          </p>
                        </div>
                      ) : (
                        <>
                          {filteredWarehouses.map((warehouse, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleWarehouseSelect(warehouse)}
                              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                formData.customsWarehouse === warehouse
                                  ? "bg-blue-50 text-primary font-medium"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-gray-400 text-lg">
                                    warehouse
                                  </span>
                                  <p className="font-medium text-sm truncate uppercase">
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
                </div>
              </div>

              {/* Kap */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.containerAmount")}
                </p>
                <input
                  type="number"
                  step="1"
                  name="containerAmount"
                  value={formData.containerAmount}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder={toUpperCase(t("placeholders.enterContainerAmount"))}
                />
              </label>

              {/* Kilo */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.weight")}
                </p>
                <input
                  type="number"
                  step="0.01"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder={toUpperCase(t("placeholders.enterWeight"))}
                />
              </label>

              {/* Vergi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.tax")}
                </p>
                <input
                  type="number"
                  step="1"
                  name="tax"
                  value={formData.tax}
                  onChange={handleTaxChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder={toUpperCase(t("placeholders.enterTax"))}
                />
              </label>

              {/* Gönderici - Aranabilir Dropdown */}
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-text-main text-sm font-medium">
                    {t("transaction.sender")}
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
                      }}
                      onFocus={() => setShowSenderDropdown(true)}
                      placeholder={toUpperCase(t("placeholders.selectOrType"))}
                      className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal"
                      style={{ textTransform: "uppercase" }}
                    />

                    {/* Clear Button */}
                    {senderSearchTerm && (
                      <button
                        type="button"
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
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {/* Yeni gönderici ekleme seçeneği */}
                      {senderSearchTerm.trim() &&
                        !availableSenders.some(
                          (s) =>
                            s.toUpperCase() === senderSearchTerm.toUpperCase()
                        ) && (
                          <button
                            type="button"
                            onClick={handleAddNewSender}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-gray-200 bg-green-50/50"
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
                          <p className="text-xs text-gray-400 mt-1">
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
                          <p className="text-xs text-gray-400 mt-1">
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
                              onClick={() => handleSenderSelect(sender)}
                              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                formData.senderName === sender
                                  ? "bg-blue-50 text-primary font-medium"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-gray-400 text-lg">
                                    local_shipping
                                  </span>
                                  <p className="font-medium text-sm truncate uppercase">
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
                </div>
              </div>

              {/* Antrepo Varış Tarihi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.warehouseArrivalDate")}
                </p>
                <input
                  type="date"
                  name="warehouseArrivalDate"
                  value={formData.warehouseArrivalDate}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 p-3 text-base font-normal"
                />
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
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 p-3 text-base font-normal"
                />
              </label>

              {/* Beyanname No */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.declarationNumber")}
                </p>
                <input
                  type="text"
                  name="declarationNumber"
                  value={formData.declarationNumber}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal uppercase"
                  placeholder="Beyanname No girin"
                  style={{ textTransform: "uppercase" }}
                />
              </label>

              {/* Hat - Combobox (constants'dan alınıyor) */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.gate")}
                </p>
                <select
                  name="gate"
                  value={formData.gate}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 p-3 text-base font-normal"
                >
                  <option value="">{toUpperCase(t("gates.select"))}</option>
                  {GATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {getGateDisplayLabel(option)}
                    </option>
                  ))}
                </select>
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
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 p-3 text-base font-normal"
                />
              </label>

              {/* İthalat İşlem Süresi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.importProcessingTime")}
                </p>
                <input
                  type="number"
                  name="importProcessingTime"
                  value={formData.importProcessingTime}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder={toUpperCase(
                    t("placeholders.enterImportProcessingTime")
                  )}
                />
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
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 p-3 text-base font-normal"
                />
              </label>

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
                  className="form-textarea w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary placeholder:text-neutral p-3 text-base font-normal"
                  placeholder={t("placeholders.enterDescription")}
                />
              </label>

              {/* Gecikme Nedeni */}
              <label className="flex flex-col w-full md:col-span-2 lg:col-span-3">
                <p className="text-text-main text-sm font-medium pb-2">
                  {t("transaction.delayReason")}
                </p>
                <textarea
                  name="delayReason"
                  value={formData.delayReason}
                  onChange={handleChange}
                  rows="3"
                  className="form-textarea w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary placeholder:text-neutral p-3 text-base font-normal"
                  placeholder={t("placeholders.enterDelayReason")}
                />
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleClear}
              className="px-6 py-3 bg-neutral/20 text-text-main rounded-lg hover:bg-neutral/30 transition-colors font-semibold"
            >
              {t("common.clear")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-text-secondary hover:text-text-main font-medium transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">save</span>
              {loading ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </div>
      </div>

      {/* Yeni Client Ekleme Modal */}
      {showNewClientModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => setShowNewClientModal(false)}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-text-main">
                    {t("company.addNew")}
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    {currentUser?.company?.name || "Broker Firması"}
                  </p>
                </div>
                <button
                  onClick={() => setShowNewClientModal(false)}
                  className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-text-secondary">
                    close
                  </span>
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleNewClientSubmit} className="p-6">
                <div className="space-y-4">
                  <label className="flex flex-col w-full">
                    <p className="text-text-main text-sm font-medium pb-2">
                      {t("company.name")} *
                    </p>
                    <input
                      type="text"
                      value={newClientForm.name}
                      onChange={(e) =>
                        setNewClientForm((prev) => ({
                          ...prev,
                          name: toUpperCase(e.target.value, locale),
                        }))
                      }
                      required
                      className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal uppercase"
                      placeholder={t("placeholders.enterName")}
                      style={{ textTransform: "uppercase" }}
                    />
                  </label>

                  <label className="flex flex-col w-full">
                    <p className="text-text-main text-sm font-medium pb-2">
                      {t("company.shortName")} *
                    </p>
                    <input
                      type="text"
                      value={newClientForm.shortName}
                      onChange={(e) =>
                        setNewClientForm((prev) => ({
                          ...prev,
                          shortName: toUpperCase(e.target.value, locale),
                        }))
                      }
                      required
                      className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal uppercase"
                      placeholder="Firma kısa adını girin"
                      style={{ textTransform: "uppercase" }}
                    />
                  </label>

                  <label className="flex flex-col w-full">
                    <p className="text-text-main text-sm font-medium pb-2">
                      {t("company.description")}
                    </p>
                    <textarea
                      value={newClientForm.description}
                      onChange={(e) =>
                        setNewClientForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows="3"
                      className="form-textarea w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary placeholder:text-neutral p-3 text-base font-normal"
                      placeholder={t("placeholders.enterDescription")}
                    />
                  </label>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowNewClientModal(false)}
                    className="px-6 py-3 text-text-secondary hover:text-text-main font-medium transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={savingNewClient}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined">add</span>
                    {savingNewClient ? t("common.loading") : t("common.add")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
