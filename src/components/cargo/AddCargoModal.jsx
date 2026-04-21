import { useState, useEffect, useRef } from 'react';
import { cargoService } from '../../api/cargoService';
import { companyService } from '../../api/companyService';
import { VEHICLE_TYPES, CURRENCY_OPTIONS, PAYMENT_STATUS_OPTIONS } from '../../utils/constants';
import { handleError, handleApiResponse } from '../../utils/errorUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { useDropdownKeyboard } from '../../hooks/useDropdownKeyboard';
import AgreementInfoPanel from '../agreements/AgreementInfoPanel';
import AddClientModal from '../common/AddClientModal';
import TagInput from '../common/TagInput';
import { t, getCurrentLocale } from '../../locales';
import { toUpperCase, transformFormData, CARGO_UPPERCASE_FIELDS } from '../../utils/textUtils';

export default function AddCargoModal({ onClose, onSuccess, currentUser }) {
  const isSuperAdmin = currentUser?.globalRole === "SUPER_ADMIN";
  const modalRef = useRef(null);
  const locale = getCurrentLocale();

  const [formData, setFormData] = useState({
    brokerCompanyId: isSuperAdmin ? "" : currentUser?.company?.id || "",
    clientCompanyId: "",
    vehicleType: "",
    senderCompany: "",
    containerCount: "",
    weightKg: "",
    lokalAmount: "",
    lokalCurrency: "TRY",
    depositoAmount: "",
    depositoCurrency: "TRY",
    ordinoAmount: "",
    ordinoCurrency: "TRY",
    paymentStatus: "NO_PAYMENT",
    carrierName: "",
    billOfLading: "",
    licensePlate: "",
    consignmentNumber: "",
    containerNumbers: [],
    transportInfo: "",
    documentReceiver: "",
    documentDeliveryDate: "",
    estimatedArrivalDate: "",
    cargoArrivalDate: "",
  });

  const [availableClients, setAvailableClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientInfo, setSelectedClientInfo] = useState(null);

  // Vekalet anlaşması state'leri
  const [clientAgreements, setClientAgreements] = useState({}); // { clientId: agreementData }
  const [selectedClientAgreement, setSelectedClientAgreement] = useState(null);

  const [availableBrokers, setAvailableBrokers] = useState([]);
  const [filteredBrokers, setFilteredBrokers] = useState([]);
  const [brokerSearchTerm, setBrokerSearchTerm] = useState("");
  const [showBrokerDropdown, setShowBrokerDropdown] = useState(false);

  // Sender company autocomplete states
  const [availableSenders, setAvailableSenders] = useState([]);
  const [filteredSenders, setFilteredSenders] = useState([]);
  const [senderSearchTerm, setSenderSearchTerm] = useState("");
  const [showSenderDropdown, setShowSenderDropdown] = useState(false);
  const [loadingSenders, setLoadingSenders] = useState(false);

  // Carrier name autocomplete states
  const [availableCarriers, setAvailableCarriers] = useState([]);
  const [filteredCarriers, setFilteredCarriers] = useState([]);
  const [carrierSearchTerm, setCarrierSearchTerm] = useState("");
  const [showCarrierDropdown, setShowCarrierDropdown] = useState(false);
  const [loadingCarriers, setLoadingCarriers] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingBrokers, setLoadingBrokers] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Vehicle type change confirmation
  const [pendingVehicleType, setPendingVehicleType] = useState(null);
  const [showVehicleTypeConfirmModal, setShowVehicleTypeConfirmModal] = useState(false);

  const [showNewClientModal, setShowNewClientModal] = useState(false);

  // Load brokers (SUPER_ADMIN only)
  useEffect(() => {
    if (isSuperAdmin) {
      loadBrokers();
    }
  }, [isSuperAdmin]);

  // Load clients when broker is selected
  useEffect(() => {
    if (formData.brokerCompanyId) {
      loadClients(formData.brokerCompanyId);
    }
  }, [formData.brokerCompanyId]);

  // Load senders and carriers on mount
  useEffect(() => {
    loadSenders();
    loadCarriers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update selected client info and agreement when clientCompanyId changes
  useEffect(() => {
    if (formData.clientCompanyId && availableClients.length > 0) {
      const selectedClient = availableClients.find(
        (client) => client.id === formData.clientCompanyId
      );
      if (selectedClient) {
        setSelectedClientInfo(selectedClient);
        setClientSearchTerm(selectedClient.shortName || selectedClient.name);

        // Agreement bilgisini set et
        const agreement = clientAgreements[selectedClient.id];
        setSelectedClientAgreement(agreement || null);
      }
    } else {
      setSelectedClientInfo(null);
      setSelectedClientAgreement(null);
      setClientSearchTerm("");
    }
  }, [formData.clientCompanyId, availableClients, clientAgreements]);

  // Filter clients
  useEffect(() => {
    if (!clientSearchTerm) {
      setFilteredClients(availableClients.slice(0, 50));
    } else {
      const filtered = availableClients.filter(client =>
        client.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
      );
      setFilteredClients(filtered.slice(0, 50));
    }
  }, [clientSearchTerm, availableClients]);

  // Filter brokers
  useEffect(() => {
    if (!brokerSearchTerm) {
      setFilteredBrokers(availableBrokers.slice(0, 50));
    } else {
      const filtered = availableBrokers.filter(broker =>
        broker.name.toLowerCase().includes(brokerSearchTerm.toLowerCase())
      );
      setFilteredBrokers(filtered.slice(0, 50));
    }
  }, [brokerSearchTerm, availableBrokers]);

  // Filter senders
  useEffect(() => {
    if (!senderSearchTerm) {
      setFilteredSenders(availableSenders.slice(0, 50));
    } else {
      const filtered = availableSenders.filter(sender =>
        sender.toLowerCase().includes(senderSearchTerm.toLowerCase())
      );
      setFilteredSenders(filtered.slice(0, 50));
    }
  }, [senderSearchTerm, availableSenders]);

  // Filter carriers
  useEffect(() => {
    if (!carrierSearchTerm) {
      setFilteredCarriers(availableCarriers.slice(0, 50));
    } else {
      const filtered = availableCarriers.filter(carrier =>
        carrier.toLowerCase().includes(carrierSearchTerm.toLowerCase())
      );
      setFilteredCarriers(filtered.slice(0, 50));
    }
  }, [carrierSearchTerm, availableCarriers]);

  // Calculate ETA delay warnings

  const loadBrokers = async () => {
    setLoadingBrokers(true);
    try {
      const result = await companyService.getAllCompanies();
      if (result.success) {
        const brokers = result.data.filter(c => c.companyType === 'CUSTOMS_BROKER');
        setAvailableBrokers(brokers);
      }
    } catch (err) {
      console.error('Error loading brokers:', err);
    } finally {
      setLoadingBrokers(false);
    }
  };

  const loadClients = async (brokerId) => {
    setLoadingClients(true);
    setAvailableClients([]);
    setClientAgreements({});
    try {
      const result = await companyService.getClientCompanies(brokerId);
      if (result.success) {
        setAvailableClients(result.data || []);

        // Agreement bilgilerini map'e aktar
        const agreementsMap = {};
        (result.data || []).forEach((client) => {
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
        console.error('Failed to load clients:', result.error);
        setAvailableClients([]);
        setClientAgreements({});
      }
    } catch (err) {
      console.error('Error loading clients:', err);
      setAvailableClients([]);
      setClientAgreements({});
    } finally {
      setLoadingClients(false);
    }
  };

  const loadSenders = async () => {
    try {
      setLoadingSenders(true);
      const result = await cargoService.getAllCargo();

      if (result.success) {
        const uniqueSenders = [
          ...new Set(
            result.data
              .map((c) => c.senderCompany)
              .filter((name) => name && name.trim() !== "")
          ),
        ].sort((a, b) => a.localeCompare(b, "tr"));

        setAvailableSenders(uniqueSenders);
        setFilteredSenders(uniqueSenders.slice(0, 50));
      }
    } catch (err) {
      console.error("Error loading senders:", err);
    } finally {
      setLoadingSenders(false);
    }
  };

  const loadCarriers = async () => {
    try {
      setLoadingCarriers(true);
      const result = await cargoService.getAllCargo();

      if (result.success) {
        const uniqueCarriers = [
          ...new Set(
            result.data
              .map((c) => c.carrierName)
              .filter((name) => name && name.trim() !== "")
          ),
        ].sort((a, b) => a.localeCompare(b, "tr"));

        setAvailableCarriers(uniqueCarriers);
        setFilteredCarriers(uniqueCarriers.slice(0, 50));
      }
    } catch (err) {
      console.error("Error loading carriers:", err);
    } finally {
      setLoadingCarriers(false);
    }
  };

  // Keyboard navigation for dropdowns
  const clientKeyboard = useDropdownKeyboard(
    showClientDropdown,
    filteredClients,
    (client) => {
      setFormData(prev => ({ ...prev, clientCompanyId: client.id }));
      setClientSearchTerm(client.shortName || client.name);
      setSelectedClientInfo(client);
      setShowClientDropdown(false);
      if (fieldErrors.clientCompanyId) {
        setFieldErrors(prev => ({ ...prev, clientCompanyId: null }));
      }
    },
    () => setShowClientDropdown(false),
    'client-dropdown'
  );

  const brokerKeyboard = useDropdownKeyboard(
    showBrokerDropdown,
    filteredBrokers,
    (broker) => {
      setFormData(prev => ({ ...prev, brokerCompanyId: broker.id }));
      setBrokerSearchTerm(broker.name);
      setShowBrokerDropdown(false);
      if (fieldErrors.brokerCompanyId) {
        setFieldErrors(prev => ({ ...prev, brokerCompanyId: null }));
      }
    },
    () => setShowBrokerDropdown(false),
    'broker-dropdown'
  );

  const senderKeyboard = useDropdownKeyboard(
    showSenderDropdown,
    filteredSenders,
    (sender) => {
      setSenderSearchTerm(sender);
      setFormData(prev => ({ ...prev, senderCompany: sender }));
      setShowSenderDropdown(false);
    },
    () => setShowSenderDropdown(false),
    'sender-dropdown'
  );

  const carrierKeyboard = useDropdownKeyboard(
    showCarrierDropdown,
    filteredCarriers,
    (carrier) => {
      setCarrierSearchTerm(carrier);
      setFormData(prev => ({ ...prev, carrierName: carrier }));
      setShowCarrierDropdown(false);
    },
    () => setShowCarrierDropdown(false),
    'carrier-dropdown'
  );

  // Check if current vehicle type has any data
  const hasVehicleTypeData = () => {
    return !!(
      formData.licensePlate ||
      formData.consignmentNumber ||
      formData.billOfLading ||
      (formData.containerNumbers && formData.containerNumbers.length > 0)
    );
  };

  // Handle vehicle type change request
  const handleVehicleTypeChangeRequest = (newVehicleType) => {
    // If same type, do nothing
    if (formData.vehicleType === newVehicleType) {
      return;
    }

    // If no vehicle type selected yet, just set it
    if (!formData.vehicleType) {
      confirmVehicleTypeChange(newVehicleType);
      return;
    }

    // If there's data in current vehicle type fields, show confirmation
    if (hasVehicleTypeData()) {
      setPendingVehicleType(newVehicleType);
      setShowVehicleTypeConfirmModal(true);
    } else {
      // No data, just change
      confirmVehicleTypeChange(newVehicleType);
    }
  };

  // Actually change vehicle type and clear fields
  const confirmVehicleTypeChange = (newVehicleType) => {
    setFormData(prev => ({
      ...prev,
      vehicleType: newVehicleType,
      // Clear all vehicle-specific fields when changing type
      licensePlate: "",
      consignmentNumber: "",
      billOfLading: "",
      containerNumbers: [],
    }));

    // Clear vehicle type and vehicle-specific field errors
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.vehicleType;
      delete newErrors.licensePlate;
      delete newErrors.consignmentNumber;
      delete newErrors.billOfLading;
      delete newErrors.containerNumbers;
      return newErrors;
    });

    // Close confirmation modal if open
    setShowVehicleTypeConfirmModal(false);
    setPendingVehicleType(null);
  };

  // Cancel vehicle type change
  const cancelVehicleTypeChange = () => {
    setShowVehicleTypeConfirmModal(false);
    setPendingVehicleType(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Uppercase transformation for specific fields
    const uppercaseFields = ['licensePlate', 'consignmentNumber', 'billOfLading', 'containerNumber', 'documentReceiver'];
    const finalValue = type === 'checkbox' ? checked : (uppercaseFields.includes(name) ? toUpperCase(value) : value);

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));

    // Clear field error
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Broker validation for SUPER_ADMIN
    if (isSuperAdmin && !formData.brokerCompanyId) {
      errors.brokerCompanyId = "Gümrük firması seçilmelidir";
    }

    if (!formData.vehicleType) {
      errors.vehicleType = "Araç tipi seçilmelidir";
    }

    if (!formData.clientCompanyId) {
      errors.clientCompanyId = "Alıcı firma seçilmelidir";
    }

    // Vehicle-specific validations
    if (formData.vehicleType === "AIRPLANE") {
      if (!formData.consignmentNumber || formData.consignmentNumber.trim() === "") {
        errors.consignmentNumber = "Uçak için konşimento gereklidir";
      }
    }

    if (formData.vehicleType === "SHIP") {
      if (!formData.billOfLading || formData.billOfLading.trim() === "") {
        errors.billOfLading = "Gemi için B/L gereklidir";
      }
      if (!formData.containerNumbers || formData.containerNumbers.length === 0) {
        errors.containerNumbers = "Gemi için en az bir konteyner numarası gereklidir";
      }
    }

    if (formData.vehicleType === "TRUCK") {
      if (!formData.licensePlate || formData.licensePlate.trim() === "") {
        errors.licensePlate = "Kamyon için plaka gereklidir";
      }
    }

    // Document fields validation (both required together)
    const hasReceiver = formData.documentReceiver && formData.documentReceiver.trim();
    const hasDate = formData.documentDeliveryDate;
    if (hasReceiver && !hasDate) {
      errors.documentDeliveryDate = "Evrak alan girildiğinde tarih de girilmelidir";
    }
    if (hasDate && !hasReceiver) {
      errors.documentReceiver = "Teslim tarihi girildiğinde evrak alan da girilmelidir";
    }

    // Numeric field validations
    if (formData.containerCount && parseInt(formData.containerCount) < 0) {
      errors.containerCount = "Kap sayısı negatif olamaz";
    }

    if (formData.weightKg && parseFloat(formData.weightKg) < 0) {
      errors.weightKg = "Ağırlık negatif olamaz";
    }

    if (formData.lokalAmount && parseFloat(formData.lokalAmount) < 0) {
      errors.lokalAmount = "Lokal masraf negatif olamaz";
    }
    if (formData.depositoAmount && parseFloat(formData.depositoAmount) < 0) {
      errors.depositoAmount = "Depozito masrafı negatif olamaz";
    }
    if (formData.ordinoAmount && parseFloat(formData.ordinoAmount) < 0) {
      errors.ordinoAmount = "Ordino masrafı negatif olamaz";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    await submitCargo();
  };

  const submitCargo = async () => {
    setLoading(true);
    setError("");

    try {
      // Transform uppercase fields
      const transformedData = transformFormData(formData, CARGO_UPPERCASE_FIELDS);

      // Prepare data
      const dataToSend = {
        ...transformedData,
        containerCount: transformedData.containerCount ? parseInt(transformedData.containerCount) : null,
        weightKg: transformedData.weightKg ? parseFloat(transformedData.weightKg) : null,
        lokalAmount: transformedData.lokalAmount ? parseFloat(transformedData.lokalAmount) : null,
        depositoAmount: transformedData.depositoAmount ? parseFloat(transformedData.depositoAmount) : null,
        ordinoAmount: transformedData.ordinoAmount ? parseFloat(transformedData.ordinoAmount) : null,
      };

      const result = await cargoService.createCargo(dataToSend);

      if (result.success) {
        showSuccess('Yük kaydı başarıyla oluşturuldu!');
        onSuccess();
      } else {
        handleApiResponse(result, null, setError, 'cargo creation');
      }
    } catch (err) {
      handleError(err, setError, 'cargo creation', 'Yük kaydı oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Get visible fields based on vehicle type
  const getVisibleFields = () => {
    const vehicleType = VEHICLE_TYPES.find(t => t.value === formData.vehicleType);
    return vehicleType?.fields || [];
  };

  const visibleFields = getVisibleFields();

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 transition-colors duration-300">
          <div>
            <h2 className="text-2xl font-bold text-text-main">Yeni Yük Ekle</h2>
            <p className="text-text-secondary text-sm mt-1">
              Lütfen yük detaylarını girin ve kaydedin.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {error && (
              <div className="lg:col-span-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Broker Selection (SUPER_ADMIN only) */}
            {isSuperAdmin && (
              <div className="flex flex-col w-full lg:col-span-3">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-text-main text-sm font-medium">
                    Gümrük Firması <span className="text-red-500">*</span>
                    {loadingBrokers && (
                      <span className="text-xs text-blue-600 ml-2 animate-pulse">
                        Yükleniyor...
                      </span>
                    )}
                  </p>
                </div>
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={brokerSearchTerm}
                      onChange={(e) => {
                        setBrokerSearchTerm(e.target.value);
                        setShowBrokerDropdown(true);
                      }}
                      onFocus={() => setShowBrokerDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowBrokerDropdown(false), 200);
                      }}
                      onKeyDown={brokerKeyboard.handleKeyDown}
                      placeholder={toUpperCase(t("placeholders.typeToSearch"))}
                      disabled={loadingBrokers}
                      className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                        fieldErrors.brokerCompanyId
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                      } bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                    />

                    {/* Clear Button */}
                    {brokerSearchTerm && !loadingBrokers && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          setBrokerSearchTerm("");
                          setFormData(prev => ({ ...prev, brokerCompanyId: "" }));
                          setShowBrokerDropdown(true);
                        }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}

                    {/* Dropdown Icon */}
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowBrokerDropdown(!showBrokerDropdown)}
                      disabled={loadingBrokers}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showBrokerDropdown ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                  </div>

                  {/* Broker Dropdown List */}
                  {showBrokerDropdown && !loadingBrokers && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors">
                      {filteredBrokers.length > 0 ? (
                        filteredBrokers.map((broker, index) => (
                          <button
                            key={broker.id}
                            type="button"
                            data-dropdown-id="broker-dropdown"
                            data-dropdown-index={index}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, brokerCompanyId: broker.id }));
                              setBrokerSearchTerm(broker.name);
                              setShowBrokerDropdown(false);
                              if (fieldErrors.brokerCompanyId) {
                                setFieldErrors(prev => ({ ...prev, brokerCompanyId: null }));
                              }
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                              formData.brokerCompanyId === broker.id
                                ? "bg-blue-50 dark:bg-blue-900/20 text-primary font-medium"
                                : index === brokerKeyboard.highlightedIndex
                                ? "bg-gray-100 dark:bg-gray-700"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-lg">
                                  business
                                </span>
                                <p className="font-medium text-sm text-text-main">{broker.name}</p>
                              </div>
                              {formData.brokerCompanyId === broker.id && (
                                <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                                  check_circle
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-text-secondary text-sm">
                          Firma bulunamadı
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {fieldErrors.brokerCompanyId && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.brokerCompanyId}</p>
                )}
              </div>
            )}

            {/* Agreement Info Panel */}
            {selectedClientInfo && (
              <AgreementInfoPanel
                agreement={selectedClientAgreement}
                clientName={selectedClientInfo.name}
              />
            )}

            {/* Client Selection */}
            <div className="flex flex-col w-full lg:col-span-3">
              <div className="flex items-center justify-between pb-2">
                <p className="text-text-main text-sm font-medium">
                  Alıcı Firma <span className="text-red-500">*</span>
                  {loadingClients && (
                    <span className="text-xs text-blue-600 ml-2 animate-pulse">
                      Yükleniyor...
                    </span>
                  )}
                </p>
                {formData.brokerCompanyId && (
                  <button
                    type="button"
                    onClick={() => setShowNewClientModal(true)}
                    className="text-xs text-primary hover:text-primary/80 dark:text-primary-light dark:hover:text-primary font-medium flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Yeni Firma Ekle
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearchTerm}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      setShowClientDropdown(true);
                      if (fieldErrors.clientCompanyId) {
                        setFieldErrors(prev => ({ ...prev, clientCompanyId: null }));
                      }
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => setShowClientDropdown(false), 200);
                    }}
                    onKeyDown={clientKeyboard.handleKeyDown}
                    placeholder={toUpperCase(t("placeholders.typeToSearch"))}
                    disabled={!formData.brokerCompanyId}
                    className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 ${
                      fieldErrors.clientCompanyId
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary'
                    } ${
                      !formData.brokerCompanyId
                        ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800'
                    } h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal disabled:bg-gray-100 dark:disabled:bg-gray-700 transition-colors`}
                  />

                  {/* Clear Button */}
                  {clientSearchTerm && !loadingClients && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        setClientSearchTerm("");
                        setFormData(prev => ({ ...prev, clientCompanyId: "" }));
                        setSelectedClientInfo(null);
                        setShowClientDropdown(true);
                      }}
                      className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  )}

                  {/* Dropdown Icon */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowClientDropdown(!showClientDropdown)}
                    disabled={!formData.brokerCompanyId}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showClientDropdown ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                </div>

                {/* Client Dropdown List */}
                {showClientDropdown && !loadingClients && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors">
                    {filteredClients.length > 0 ? (
                      filteredClients.map((client, index) => (
                        <button
                          key={client.id}
                          type="button"
                          data-dropdown-id="client-dropdown"
                          data-dropdown-index={index}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, clientCompanyId: client.id }));
                            setClientSearchTerm(client.shortName || client.name);
                            setSelectedClientInfo(client);
                            setShowClientDropdown(false);
                            if (fieldErrors.clientCompanyId) {
                              setFieldErrors(prev => ({ ...prev, clientCompanyId: null }));
                            }
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                            formData.clientCompanyId === client.id
                              ? "bg-blue-50 dark:bg-blue-900/20 text-primary font-medium"
                              : index === clientKeyboard.highlightedIndex
                              ? "bg-gray-100 dark:bg-gray-700"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-lg flex-shrink-0">
                                business
                              </span>
                              <div className="flex flex-col min-w-0 flex-1">
                                <p className="font-medium text-sm text-text-main truncate">{client.shortName || client.name}</p>
                                {client.agreementId && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="material-symbols-outlined text-xs text-green-600 dark:text-green-400">
                                      check_circle
                                    </span>
                                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                      {client.agreementStatus === 'ACTIVE' ? 'Aktif Vekalet' : 'Vekalet Var'}
                                    </span>
                                  </div>
                                )}
                                {!client.agreementId && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="material-symbols-outlined text-xs text-orange-500 dark:text-orange-400">
                                      warning
                                    </span>
                                    <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">
                                      Vekalet Yok
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {formData.clientCompanyId === client.id && (
                              <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                                check_circle
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-text-secondary text-sm">
                        Müşteri bulunamadı
                      </div>
                    )}
                  </div>
                )}
              </div>
              {fieldErrors.clientCompanyId && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.clientCompanyId}</p>
              )}
            </div>

            {/* Vehicle Type Selection */}
            <div className="flex flex-col w-full lg:col-span-3">
              <div className="flex items-center justify-between pb-2">
                <p className="text-text-main text-sm font-medium">
                  Araç Tipi <span className="text-red-500">*</span>
                </p>
                <p className="text-xs text-text-secondary">Lütfen bir araç tipi seçin</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
              {VEHICLE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleVehicleTypeChangeRequest(type.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    formData.vehicleType === type.value
                      ? "border-primary bg-primary/10 dark:bg-primary/20"
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                  }`}
                >
                  <span className={`material-symbols-outlined text-3xl ${
                    formData.vehicleType === type.value ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
                  }`}>{type.icon}</span>
                  <span className={`text-sm font-medium ${
                    formData.vehicleType === type.value ? 'text-text-main' : 'text-text-secondary'
                  }`}>{type.displayName}</span>
                </button>
              ))}
              </div>
              {fieldErrors.vehicleType && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.vehicleType}</p>
              )}
            </div>

            {/* Vehicle-specific fields */}
            {formData.vehicleType && (
              <div className="lg:col-span-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
                <h3 className="text-sm font-medium text-text-main mb-3">
                  {VEHICLE_TYPES.find(t => t.value === formData.vehicleType)?.displayName} Bilgileri
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {visibleFields.includes("licensePlate") && (
                    <div>
                      <label className="block text-sm font-medium text-text-main pb-2">
                        Plaka <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="licensePlate"
                        value={formData.licensePlate}
                        onChange={handleChange}
                        placeholder={toUpperCase(t("placeholders.enterLicensePlate"))}
                        className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors ${
                          fieldErrors.licensePlate ? 'border-red-500' : 'border-neutral/30 dark:border-gray-600'
                        }`}
                        style={{ textTransform: "uppercase" }}
                      />
                      {fieldErrors.licensePlate && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.licensePlate}</p>
                      )}
                    </div>
                  )}

                  {visibleFields.includes("consignmentNumber") && (
                    <div>
                      <label className="block text-sm font-medium text-text-main pb-2">
                        Konşimento <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="consignmentNumber"
                        value={formData.consignmentNumber}
                        onChange={handleChange}
                        placeholder={toUpperCase(t("placeholders.enterConsignmentNumber"))}
                        className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors ${
                          fieldErrors.consignmentNumber ? 'border-red-500' : 'border-neutral/30 dark:border-gray-600'
                        }`}
                        style={{ textTransform: "uppercase" }}
                      />
                      {fieldErrors.consignmentNumber && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.consignmentNumber}</p>
                      )}
                    </div>
                  )}

                  {visibleFields.includes("billOfLading") && (
                    <div>
                      <label className="block text-sm font-medium text-text-main pb-2">
                        B/L <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="billOfLading"
                        value={formData.billOfLading}
                        onChange={handleChange}
                        placeholder={toUpperCase(t("placeholders.enterBillOfLading"))}
                        className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors ${
                          fieldErrors.billOfLading ? 'border-red-500' : 'border-neutral/30 dark:border-gray-600'
                        }`}
                        style={{ textTransform: "uppercase" }}
                      />
                      {fieldErrors.billOfLading && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.billOfLading}</p>
                      )}
                    </div>
                  )}

                  {visibleFields.includes("containerNumbers") && (
                    <div>
                      <label className="block text-sm font-medium text-text-main pb-2">
                        Konteyner Numaraları <span className="text-red-500">*</span>
                        <span className="text-xs text-gray-500 ml-2">(Enter ile ekleyin)</span>
                      </label>
                      <TagInput
                        value={formData.containerNumbers}
                        onChange={(newContainers) => setFormData(prev => ({
                          ...prev,
                          containerNumbers: newContainers
                        }))}
                        placeholder={toUpperCase(t("placeholders.enterContainerNumber"))}
                        uppercase={true}
                        maxLength={50}
                      />
                      {fieldErrors.containerNumbers && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.containerNumbers}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sender - Searchable Dropdown */}
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between pb-2">
                <p className="text-text-main text-sm font-medium">
                  Gönderici Firma
                  {loadingSenders && (
                    <span className="text-xs text-blue-600 ml-2 animate-pulse">
                      Yükleniyor...
                    </span>
                  )}
                  {!loadingSenders && availableSenders.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({availableSenders.length} kayıtlı)
                    </span>
                  )}
                </p>
              </div>

              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={senderSearchTerm}
                    onChange={(e) => {
                      const upperValue = toUpperCase(e.target.value);
                      setSenderSearchTerm(upperValue);
                      setFormData(prev => ({ ...prev, senderCompany: upperValue }));
                      setShowSenderDropdown(true);
                    }}
                    onFocus={() => setShowSenderDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => setShowSenderDropdown(false), 200);
                    }}
                    onKeyDown={senderKeyboard.handleKeyDown}
                    placeholder={toUpperCase(t("placeholders.selectOrType"))}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal transition-colors"
                    style={{ textTransform: "uppercase" }}
                  />

                  {/* Clear Button */}
                  {senderSearchTerm && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        setSenderSearchTerm("");
                        setFormData(prev => ({ ...prev, senderCompany: "" }));
                        setShowSenderDropdown(true);
                      }}
                      className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
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
                    {filteredSenders.length > 0 ? (
                      filteredSenders.map((sender, index) => (
                        <button
                          key={sender}
                          type="button"
                          data-dropdown-id="sender-dropdown"
                          data-dropdown-index={index}
                          onClick={() => {
                            setSenderSearchTerm(sender);
                            setFormData(prev => ({ ...prev, senderCompany: sender }));
                            setShowSenderDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                            formData.senderCompany === sender
                              ? "bg-blue-50 dark:bg-blue-900/20 text-primary font-medium"
                              : index === senderKeyboard.highlightedIndex
                              ? "bg-gray-100 dark:bg-gray-700"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-lg">
                                local_shipping
                              </span>
                              <p className="font-medium text-sm text-text-main">{sender}</p>
                            </div>
                            {formData.senderCompany === sender && (
                              <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                                check_circle
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-text-secondary text-sm">
                        {senderSearchTerm ? 'Bulunamadı (yazarak yeni ekleyebilirsiniz)' : 'Kayıtlı gönderici yok'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Carrier - Searchable Dropdown */}
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between pb-2">
                <p className="text-text-main text-sm font-medium">
                  Nakliyeci
                  {loadingCarriers && (
                    <span className="text-xs text-blue-600 ml-2 animate-pulse">
                      Yükleniyor...
                    </span>
                  )}
                  {!loadingCarriers && availableCarriers.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({availableCarriers.length} kayıtlı)
                    </span>
                  )}
                </p>
              </div>

              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={carrierSearchTerm}
                    onChange={(e) => {
                      const upperValue = toUpperCase(e.target.value);
                      setCarrierSearchTerm(upperValue);
                      setFormData(prev => ({ ...prev, carrierName: upperValue }));
                      setShowCarrierDropdown(true);
                    }}
                    onFocus={() => setShowCarrierDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => setShowCarrierDropdown(false), 200);
                    }}
                    onKeyDown={carrierKeyboard.handleKeyDown}
                    placeholder={toUpperCase(t("placeholders.selectOrType"))}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal transition-colors"
                    style={{ textTransform: "uppercase" }}
                  />

                  {/* Clear Button */}
                  {carrierSearchTerm && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        setCarrierSearchTerm("");
                        setFormData(prev => ({ ...prev, carrierName: "" }));
                        setShowCarrierDropdown(true);
                      }}
                      className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  )}

                  {/* Dropdown Icon */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCarrierDropdown(!showCarrierDropdown)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showCarrierDropdown ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                </div>

                {/* Carrier Dropdown List */}
                {showCarrierDropdown && !loadingCarriers && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors">
                    {filteredCarriers.length > 0 ? (
                      filteredCarriers.map((carrier, index) => (
                        <button
                          key={carrier}
                          type="button"
                          data-dropdown-id="carrier-dropdown"
                          data-dropdown-index={index}
                          onClick={() => {
                            setCarrierSearchTerm(carrier);
                            setFormData(prev => ({ ...prev, carrierName: carrier }));
                            setShowCarrierDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                            formData.carrierName === carrier
                              ? "bg-blue-50 dark:bg-blue-900/20 text-primary font-medium"
                              : index === carrierKeyboard.highlightedIndex
                              ? "bg-gray-100 dark:bg-gray-700"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-lg">
                                local_shipping
                              </span>
                              <p className="font-medium text-sm text-text-main">{carrier}</p>
                            </div>
                            {formData.carrierName === carrier && (
                              <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                                check_circle
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-text-secondary text-sm">
                        {carrierSearchTerm ? 'Bulunamadı (yazarak yeni ekleyebilirsiniz)' : 'Kayıtlı nakliyeci yok'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Container Count */}
            <label className="flex flex-col w-full">
              <p className="text-text-main text-sm font-medium pb-2">Kap Sayısı</p>
              <input
                type="number"
                name="containerCount"
                value={formData.containerCount}
                onChange={handleChange}
                min="0"
                placeholder={toUpperCase(t("placeholders.enterContainerCount"))}
                className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors ${
                  fieldErrors.containerCount ? 'border-red-500' : 'border-neutral/30 dark:border-gray-600'
                }`}
              />
              {fieldErrors.containerCount && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.containerCount}</p>
              )}
            </label>

            {/* Weight */}
            <label className="flex flex-col w-full">
              <p className="text-text-main text-sm font-medium pb-2">Ağırlık (kg)</p>
              <input
                type="number"
                name="weightKg"
                value={formData.weightKg}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder={toUpperCase(t("placeholders.enterWeight"))}
                className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors ${
                  fieldErrors.weightKg ? 'border-red-500' : 'border-neutral/30 dark:border-gray-600'
                }`}
              />
              {fieldErrors.weightKg && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.weightKg}</p>
              )}
            </label>

            {/* Costs Section - Lokal, Depozito, Ordino */}
            <div className="lg:col-span-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-base font-semibold text-text-main mb-4">Masraflar</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Lokal Masrafı */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-main">Lokal Masrafı</label>
                  <input
                    type="number"
                    name="lokalAmount"
                    value={formData.lokalAmount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder={t("placeholders.enterLokalAmount")}
                    className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border bg-white dark:bg-gray-800 h-10 placeholder:text-neutral p-2 text-sm font-normal transition-colors ${
                      fieldErrors.lokalAmount ? 'border-red-500' : 'border-neutral/30 dark:border-gray-600'
                    }`}
                  />
                  <select
                    name="lokalCurrency"
                    value={formData.lokalCurrency}
                    onChange={handleChange}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-10 p-2 text-sm font-normal transition-colors"
                  >
                    {CURRENCY_OPTIONS.map(currency => (
                      <option key={currency.value} value={currency.value}>
                        {currency.symbol} {currency.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.lokalAmount && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.lokalAmount}</p>
                  )}
                </div>

                {/* Depozito Masrafı */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-main">Depozito Masrafı</label>
                  <input
                    type="number"
                    name="depositoAmount"
                    value={formData.depositoAmount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder={t("placeholders.enterDepositoAmount")}
                    className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border bg-white dark:bg-gray-800 h-10 placeholder:text-neutral p-2 text-sm font-normal transition-colors ${
                      fieldErrors.depositoAmount ? 'border-red-500' : 'border-neutral/30 dark:border-gray-600'
                    }`}
                  />
                  <select
                    name="depositoCurrency"
                    value={formData.depositoCurrency}
                    onChange={handleChange}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-10 p-2 text-sm font-normal transition-colors"
                  >
                    {CURRENCY_OPTIONS.map(currency => (
                      <option key={currency.value} value={currency.value}>
                        {currency.symbol} {currency.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.depositoAmount && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.depositoAmount}</p>
                  )}
                </div>

                {/* Ordino Masrafı */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-main">Ordino Masrafı</label>
                  <input
                    type="number"
                    name="ordinoAmount"
                    value={formData.ordinoAmount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder={t("placeholders.enterOrdinoAmount")}
                    className={`form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border bg-white dark:bg-gray-800 h-10 placeholder:text-neutral p-2 text-sm font-normal transition-colors ${
                      fieldErrors.ordinoAmount ? 'border-red-500' : 'border-neutral/30 dark:border-gray-600'
                    }`}
                  />
                  <select
                    name="ordinoCurrency"
                    value={formData.ordinoCurrency}
                    onChange={handleChange}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-10 p-2 text-sm font-normal transition-colors"
                  >
                    {CURRENCY_OPTIONS.map(currency => (
                      <option key={currency.value} value={currency.value}>
                        {currency.symbol} {currency.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.ordinoAmount && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.ordinoAmount}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Document Fields */}
            <div className="lg:col-span-3 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-main pb-2">
                  Evrakları Teslim Alan
                </label>
                <input
                  type="text"
                  name="documentReceiver"
                  value={formData.documentReceiver}
                  onChange={handleChange}
                  placeholder={toUpperCase(t("placeholders.enterDocumentReceiver"))}
                  className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors"
                  style={{ textTransform: "uppercase" }}
                />
                {fieldErrors.documentReceiver && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.documentReceiver}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main pb-2">
                  Dosya Teslim Tarihi
                </label>
                <input
                  type="date"
                  name="documentDeliveryDate"
                  value={formData.documentDeliveryDate}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors"
                />
                {fieldErrors.documentDeliveryDate && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.documentDeliveryDate}</p>
                )}
              </div>

              {/* ETA Field */}
              <div>
                <label className="block text-sm font-medium text-text-main pb-2">
                  Tahmini Varış Tarihi (ETA)
                </label>
                <input
                  type="date"
                  name="estimatedArrivalDate"
                  value={formData.estimatedArrivalDate}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors"
                />
              </div>

              {/* Varış Tarihi */}
              <div>
                <label className="block text-sm font-medium text-text-main pb-2">
                  Varış Tarihi
                  <span className="ml-2 text-xs font-normal text-text-secondary">
                    (girilince durum TAMAMLANDI olur)
                  </span>
                </label>
                <input
                  type="date"
                  name="cargoArrivalDate"
                  value={formData.cargoArrivalDate}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors"
                />
                {formData.cargoArrivalDate && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>Kaydedildiğinde yük TAMAMLANDI olarak işaretlenecek</span>
                  </div>
                )}
              </div>
            </div>

            {/* Transport Info */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-text-main pb-2">
                Taşıma Bilgileri
              </label>
              <textarea
                name="transportInfo"
                value={formData.transportInfo}
                onChange={handleChange}
                rows="3"
                placeholder={toUpperCase(t("placeholders.enterTransportInfo"))}
                className="form-textarea w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 placeholder:text-neutral p-3 text-base font-normal transition-colors"
              />
            </div>

            {/* Payment Status Radio Buttons */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-text-main pb-2">
                Ödeme Durumu
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                {PAYMENT_STATUS_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="paymentStatus"
                      value={option.value}
                      checked={formData.paymentStatus === option.value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        paymentStatus: e.target.value
                      }))}
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm text-text-main">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 transition-colors">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">save</span>
                <span>Kaydet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Vehicle Type Change Confirmation Modal */}
      {showVehicleTypeConfirmModal && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4 animate-fade-in"
          onClick={cancelVehicleTypeChange}
        >
          <div
            className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-zoom-in transition-colors duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/10">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-3xl">
                  warning
                </span>
                <div>
                  <h3 className="text-xl font-bold text-text-main">Araç Tipi Değişikliği</h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Girilen veriler silinecektir
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-text-main text-sm">
                Araç tipini değiştirdiğinizde <strong>{VEHICLE_TYPES.find(t => t.value === formData.vehicleType)?.displayName}</strong> için girilen aşağıdaki alanlar silinecektir:
              </p>
              <div className="mt-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <ul className="list-disc list-inside text-sm text-text-main space-y-1">
                  {formData.vehicleType === 'SHIP' && (
                    <>
                      <li>B/L Numarası{formData.billOfLading && `: ${formData.billOfLading}`}</li>
                      <li>Konteyner Numaraları{formData.containerNumbers?.length > 0 && ` (${formData.containerNumbers.length} adet)`}</li>
                    </>
                  )}
                  {formData.vehicleType === 'TRUCK' && (
                    <li>Plaka{formData.licensePlate && `: ${formData.licensePlate}`}</li>
                  )}
                  {formData.vehicleType === 'AIRPLANE' && (
                    <li>Konşimento Numarası{formData.consignmentNumber && `: ${formData.consignmentNumber}`}</li>
                  )}
                </ul>
              </div>
              <p className="text-text-secondary text-sm mt-3">
                Devam etmek istediğinize emin misiniz?
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                type="button"
                onClick={cancelVehicleTypeChange}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => confirmVehicleTypeChange(pendingVehicleType)}
                className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <span className="material-symbols-outlined text-lg">check</span>
                <span>Devam Et</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Client Modal */}
      <AddClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onSuccess={(newClient) => {
          setShowNewClientModal(false);
          loadClients(formData.brokerCompanyId);
          setFormData(prev => ({ ...prev, clientCompanyId: newClient.id }));
          setClientSearchTerm(newClient.shortName || newClient.name);
        }}
        brokerCompanyId={formData.brokerCompanyId}
      />
    </div>
  );
}
