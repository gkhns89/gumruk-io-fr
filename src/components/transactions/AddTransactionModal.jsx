import React, { useState, useEffect } from "react";
import { transactionService } from "../../api/transactionService";
import { companyService } from "../../api/companyService";

export default function AddTransactionModal({ onClose, onSuccess, currentUser }) {
  // Yetki kontrolü
  const isSuperAdmin = currentUser?.globalRole === 'SUPER_ADMIN';

  const [formData, setFormData] = useState({
    brokerCompanyId: isSuperAdmin ? "" : (currentUser?.company?.id || ""),
    clientCompanyId: "",
    fileNo: "",
    recipientName: "",
    customsWarehouse: "",
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
  
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingBrokers, setLoadingBrokers] = useState(false);
  const [error, setError] = useState("");
  
  // Yeni firma ekleme modal state
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    description: "",
  });
  const [savingNewClient, setSavingNewClient] = useState(false);

  // SUPER_ADMIN ise broker listesini yükle
  useEffect(() => {
    if (isSuperAdmin) {
      loadBrokerCompanies();
    } else if (currentUser?.company?.id) {
      // Broker kullanıcısı ise direkt client'ları yükle
      loadClientCompanies(currentUser.company.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Broker değiştiğinde client'ları yükle (SUPER_ADMIN için)
  useEffect(() => {
    if (isSuperAdmin && formData.brokerCompanyId) {
      loadClientCompanies(formData.brokerCompanyId);
      // Client seçimini sıfırla
      setFormData(prev => ({ ...prev, clientCompanyId: "", recipientName: "" }));
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
      const filtered = availableBrokers.filter(broker =>
        broker.name.toLowerCase().includes(searchLower) ||
        (broker.description && broker.description.toLowerCase().includes(searchLower))
      );
      setFilteredBrokers(filtered.slice(0, 100));
    }
  }, [brokerSearchTerm, availableBrokers]);

  // Client arama filtresi
  useEffect(() => {
    if (clientSearchTerm.trim() === "") {
      // Arama boşsa ilk 100 kaydı göster (performance)
      setFilteredClients(availableClients.slice(0, 100));
    } else {
      // Arama varsa tüm kayıtlarda filtrele
      const searchLower = clientSearchTerm.toLowerCase();
      const filtered = availableClients.filter(client =>
        client.name.toLowerCase().includes(searchLower) ||
        (client.description && client.description.toLowerCase().includes(searchLower))
      );
      setFilteredClients(filtered.slice(0, 100)); // Max 100 sonuç göster
    }
  }, [clientSearchTerm, availableClients]);

  // Broker dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('broker-dropdown-container');
      if (dropdown && !dropdown.contains(event.target)) {
        setShowBrokerDropdown(false);
      }
    };

    if (showBrokerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBrokerDropdown]);

  // Client dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('client-dropdown-container');
      if (dropdown && !dropdown.contains(event.target)) {
        setShowClientDropdown(false);
      }
    };

    if (showClientDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClientDropdown]);

  // Broker değiştiğinde search term güncelle (SUPER_ADMIN için)
  useEffect(() => {
    if (isSuperAdmin && formData.brokerCompanyId) {
      const selectedBroker = availableBrokers.find(
        b => b.id === parseInt(formData.brokerCompanyId)
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
    console.log("🔄 Client değişti:", formData.clientCompanyId);
    if (formData.clientCompanyId) {
      const selectedClient = availableClients.find(
        c => c.id === parseInt(formData.clientCompanyId)
      );
      
      console.log("📋 Seçilen client:", selectedClient);
      
      if (selectedClient) {
        setSelectedClientInfo(selectedClient);
        setClientSearchTerm(selectedClient.name);
        // Firma açıklamasını Alıcı alanına otomatik doldur
        setFormData(prev => ({
          ...prev,
          recipientName: selectedClient.description || selectedClient.name || ""
        }));
      }
    } else {
      setSelectedClientInfo(null);
      setClientSearchTerm("");
      setFormData(prev => ({ ...prev, recipientName: "" }));
    }
  }, [formData.clientCompanyId, availableClients]);

  const loadBrokerCompanies = async () => {
    try {
      setLoadingBrokers(true);
      console.log("📡 Broker'lar yükleniyor (SUPER_ADMIN)...");
      
      const result = await companyService.getAllCompanies();
      
      console.log("✅ Broker API yanıtı:", result);
      
      if (result.success) {
        const brokers = result.data.filter(c => c.companyType === 'CUSTOMS_BROKER');
        setAvailableBrokers(brokers);
        setFilteredBrokers(brokers.slice(0, 100));
        console.log(`✅ ${brokers.length} broker yüklendi`);
      } else {
        console.error("❌ Broker yükleme hatası:", result.error);
        setAvailableBrokers([]);
        setFilteredBrokers([]);
      }
    } catch (err) {
      console.error("💥 Broker listesi yükleme hatası:", err);
      setAvailableBrokers([]);
      setFilteredBrokers([]);
    } finally {
      setLoadingBrokers(false);
    }
  };

  const loadClientCompanies = async (brokerId) => {
    try {
      setLoadingClients(true);
      console.log("📡 Client'lar yükleniyor, Broker ID:", brokerId);
      
      const result = await companyService.getClientCompanies(brokerId);
      
      console.log("✅ Client API yanıtı:", result);
      
      if (result.success) {
        setAvailableClients(result.data);
        setFilteredClients(result.data.slice(0, 100)); // İlk 100 kaydı göster
        console.log(`✅ ${result.data.length} client yüklendi`);
      } else {
        console.error("❌ Client yükleme hatası:", result.error);
        setAvailableClients([]);
        setFilteredClients([]);
      }
    } catch (err) {
      console.error("💥 Client listesi yükleme hatası:", err);
      setAvailableClients([]);
      setFilteredClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`📝 Form değişikliği: ${name} = ${value}`);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Boş değerleri temizle
      const cleanedData = Object.fromEntries(
        Object.entries(formData).filter(([, v]) => v !== "")
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
        cleanedData.importProcessingTime = parseInt(cleanedData.importProcessingTime);
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
      brokerCompanyId: isSuperAdmin ? "" : (currentUser?.company?.id || ""),
      clientCompanyId: "",
      fileNo: "",
      recipientName: "",
      customsWarehouse: "",
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
      console.log("📤 Yeni client oluşturuluyor:", {
        ...newClientForm,
        parentBrokerId: formData.brokerCompanyId || currentUser?.company?.id
      });

      const result = await companyService.createClientCompany({
        name: newClientForm.name,
        description: newClientForm.description,
        parentBrokerId: parseInt(formData.brokerCompanyId || currentUser?.company?.id)
      });

      if (result.success) {
        console.log("✅ Yeni client oluşturuldu:", result.data);
        
        // Client listesini yenile
        await loadClientCompanies(formData.brokerCompanyId || currentUser?.company?.id);
        
        // Yeni client'ı otomatik seç
        setFormData(prev => ({
          ...prev,
          clientCompanyId: result.data.companyId
        }));
        
        // Arama inputunu güncelle
        setClientSearchTerm(newClientForm.name);
        
        // Modal'ı kapat ve formu temizle
        setShowNewClientModal(false);
        setNewClientForm({ name: "", description: "" });
      } else {
        console.error("❌ Client oluşturma hatası:", result.error);
        alert(result.error || "Client oluşturulamadı");
      }
    } catch (err) {
      console.error("💥 Client oluşturma hatası:", err);
      alert("Client oluşturulurken beklenmeyen bir hata oluştu.");
    } finally {
      setSavingNewClient(false);
    }
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
                Yeni İşlem Ekle
              </h2>
              <p className="text-text-secondary text-sm mt-1">
                Lütfen işlem detaylarını girin ve kaydedin.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-text-secondary">close</span>
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
                  Alıcı Firma *
                  {selectedClientInfo && selectedClientInfo.description && (
                    <span className="text-xs text-blue-600 ml-2">(Müşteri firması açıklamasından otomatik)</span>
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
                  placeholder="Önce müşteri firması seçin"
                />
              </label>

              {/* BROKER FİRMASI - SADECE SUPER_ADMIN için görünür */}
              {isSuperAdmin && (
                <div className="flex flex-col w-full lg:col-span-3">
                  <div className="flex items-center justify-between pb-2">
                    <p className="text-text-main text-sm font-medium">
                      Broker Firması * 
                      {loadingBrokers && (
                        <span className="text-xs text-blue-600 ml-2 animate-pulse">Yükleniyor...</span>
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
                        placeholder="Broker adı yazarak arayın..."
                        disabled={loadingBrokers}
                        className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal disabled:bg-gray-100"
                      />
                      
                      {/* Clear Button */}
                      {brokerSearchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setBrokerSearchTerm("");
                            setFormData(prev => ({ ...prev, brokerCompanyId: "" }));
                            setShowBrokerDropdown(true);
                          }}
                          className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      )}

                      {/* Dropdown Icon */}
                      <button
                        type="button"
                        onClick={() => setShowBrokerDropdown(!showBrokerDropdown)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showBrokerDropdown ? 'expand_less' : 'expand_more'}
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
                                <span className="material-symbols-outlined text-4xl mb-2 text-orange-500">warning</span>
                                <p className="text-sm">Kayıtlı broker bulunamadı.</p>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                                <p className="text-sm">"{brokerSearchTerm}" için sonuç bulunamadı</p>
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
                                  setFormData(prev => ({ ...prev, brokerCompanyId: broker.id }));
                                  setBrokerSearchTerm(broker.name);
                                  setShowBrokerDropdown(false);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                  formData.brokerCompanyId === broker.id ? 'bg-blue-50 text-primary font-medium' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{broker.name}</p>
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
                            
                            {filteredBrokers.length === 100 && availableBrokers.length > 100 && (
                              <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-center">
                                <p className="text-xs text-yellow-800">
                                  İlk 100 sonuç gösteriliyor. Daha spesifik arama yapın.
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
                <input type="hidden" name="brokerCompanyId" value={formData.brokerCompanyId} />
              )}

              {/* Müşteri Firması - Aranabilir Dropdown */}
              <div className="flex flex-col w-full lg:col-span-3">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-text-main text-sm font-medium">
                    Müşteri Firması * 
                    {loadingClients && (
                      <span className="text-xs text-blue-600 ml-2 animate-pulse">Yükleniyor...</span>
                    )}
                    {!loadingClients && availableClients.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({availableClients.length} firma kayıtlı)
                      </span>
                    )}
                  </p>
                  {((isSuperAdmin && formData.brokerCompanyId) || !isSuperAdmin) && (
                    <button
                      type="button"
                      onClick={() => setShowNewClientModal(true)}
                      className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Yeni Firma Ekle
                    </button>
                  )}
                </div>

                {/* SUPER_ADMIN için uyarı: Önce broker seç */}
                {isSuperAdmin && !formData.brokerCompanyId && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                    <p className="text-xs text-yellow-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">info</span>
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
                      placeholder="Firma adı yazarak arayın..."
                      disabled={loadingClients || (isSuperAdmin && !formData.brokerCompanyId)}
                      className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal disabled:bg-gray-100"
                    />
                    
                    {/* Clear Button */}
                    {clientSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearchTerm("");
                          setFormData(prev => ({ ...prev, clientCompanyId: "" }));
                          setShowClientDropdown(true);
                        }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}

                    {/* Dropdown Icon */}
                    <button
                      type="button"
                      onClick={() => setShowClientDropdown(!showClientDropdown)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showClientDropdown ? 'expand_less' : 'expand_more'}
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
                              <span className="material-symbols-outlined text-4xl mb-2 text-orange-500">warning</span>
                              <p className="text-sm">Kayıtlı firma bulunamadı.</p>
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
                              <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                              <p className="text-sm">"{clientSearchTerm}" için sonuç bulunamadı</p>
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
                                setFormData(prev => ({ ...prev, clientCompanyId: client.id }));
                                setClientSearchTerm(client.name);
                                setShowClientDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                formData.clientCompanyId === client.id ? 'bg-blue-50 text-primary font-medium' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{client.name}</p>
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
                          
                          {/* Daha fazla kayıt varsa bilgi */}
                          {filteredClients.length === 100 && availableClients.length > 100 && (
                            <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-center">
                              <p className="text-xs text-yellow-800">
                                İlk 100 sonuç gösteriliyor. Daha spesifik arama yapın.
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
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-blue-600 mt-0.5">info</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">
                        Seçili Firma: {selectedClientInfo.name}
                      </p>
                      {selectedClientInfo.description && (
                        <p className="text-xs text-blue-700 mt-1">
                          📋 Firma açıklaması "Alıcı" alanına otomatik dolduruldu: {selectedClientInfo.description}
                        </p>
                      )}
                      {!selectedClientInfo.description && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ Bu firmaya ait açıklama bulunamadı
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Dosya No */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Dosya No *</p>
                <input
                  type="text"
                  name="fileNo"
                  value={formData.fileNo}
                  onChange={handleChange}
                  required
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder="Dosya No girin"
                />
              </label>

              {/* Gümrük */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Gümrük</p>
                <input
                  type="text"
                  name="customsWarehouse"
                  value={formData.customsWarehouse}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder="Gümrük seçin"
                />
              </label>

              {/* Hat */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Hat</p>
                <input
                  type="text"
                  name="gate"
                  value={formData.gate}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder="Hat bilgisini girin"
                />
              </label>

              {/* Kilo */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Kilo (Kg)</p>
                <input
                  type="number"
                  step="0.01"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder="Kilo girin"
                />
              </label>

              {/* Vergi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Vergi (TL)</p>
                <input
                  type="number"
                  step="0.01"
                  name="tax"
                  value={formData.tax}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder="Vergi tutarını girin"
                />
              </label>

              {/* Gönderici */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Gönderici</p>
                <input
                  type="text"
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder="Gönderici adını girin"
                />
              </label>

              {/* Antrepo Varış Tarihi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Antrepo Varış Tarihi</p>
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
                <p className="text-text-main text-sm font-medium pb-2">Tescil Tarihi</p>
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
                <p className="text-text-main text-sm font-medium pb-2">Beyanname No</p>
                <input
                  type="text"
                  name="declarationNumber"
                  value={formData.declarationNumber}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder="Beyanname No girin"
                />
              </label>

              {/* Kapanma Tarihi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Kapanma Tarihi</p>
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
                <p className="text-text-main text-sm font-medium pb-2">İthalat İşlem Süresi (Gün)</p>
                <input
                  type="number"
                  name="importProcessingTime"
                  value={formData.importProcessingTime}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                  placeholder="Süre (gün)"
                />
              </label>

              {/* Çekilme Tarihi */}
              <label className="flex flex-col w-full">
                <p className="text-text-main text-sm font-medium pb-2">Çekilme Tarihi</p>
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
                  Açıklama
                </p>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="form-textarea w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary placeholder:text-neutral p-3 text-base font-normal"
                  placeholder="Ek açıklamalarınızı buraya yazın..."
                />
              </label>

              {/* Gecikme Nedeni */}
              <label className="flex flex-col w-full md:col-span-2 lg:col-span-3">
                <p className="text-text-main text-sm font-medium pb-2">Gecikme Nedeni</p>
                <textarea
                  name="delayReason"
                  value={formData.delayReason}
                  onChange={handleChange}
                  rows="3"
                  className="form-textarea w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary placeholder:text-neutral p-3 text-base font-normal"
                  placeholder="Olası gecikme nedenlerini belirtin..."
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
              Formu Temizle
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-text-secondary hover:text-text-main font-medium transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">save</span>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
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
                  <h3 className="text-xl font-bold text-text-main">Yeni Müşteri Firması Ekle</h3>
                  <p className="text-text-secondary text-sm mt-1">
                    {currentUser?.company?.name || 'Broker Firması'}
                  </p>
                </div>
                <button
                  onClick={() => setShowNewClientModal(false)}
                  className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-text-secondary">close</span>
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleNewClientSubmit} className="p-6">
                <div className="space-y-4">
                  <label className="flex flex-col w-full">
                    <p className="text-text-main text-sm font-medium pb-2">Firma Adı *</p>
                    <input
                      type="text"
                      value={newClientForm.name}
                      onChange={(e) => setNewClientForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="form-input w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary h-12 placeholder:text-neutral p-3 text-base font-normal"
                      placeholder="Firma adını girin"
                    />
                  </label>

                  <label className="flex flex-col w-full">
                    <p className="text-text-main text-sm font-medium pb-2">Açıklama</p>
                    <textarea
                      value={newClientForm.description}
                      onChange={(e) => setNewClientForm(prev => ({ ...prev, description: e.target.value }))}
                      rows="3"
                      className="form-textarea w-full rounded-lg text-text-main focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 bg-white focus:border-primary placeholder:text-neutral p-3 text-base font-normal"
                      placeholder="Firma hakkında açıklama girin (opsiyonel)"
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
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={savingNewClient}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined">add</span>
                    {savingNewClient ? 'Ekleniyor...' : 'Firma Ekle'}
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