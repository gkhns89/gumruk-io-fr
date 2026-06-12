import { useState, useEffect, useCallback } from 'react';
import { cargoService } from '../../api/cargoService';
import { companyService } from '../../api/companyService';
import { shipsGoService } from '../../api/shipsGoService';
import { confirmDialog } from '../../utils/confirmDialog';
import { CARGO_STATUS, VEHICLE_TYPES, CURRENCY_OPTIONS, PAYMENT_STATUS_OPTIONS, DOCUMENT_DELIVERY_TYPES, getVehicleType } from '../../utils/constants';
import { showSuccess, showError } from '../../utils/toastUtils';
import { handleError, handleApiResponse } from '../../utils/errorUtils';
import AgreementInfoPanel from '../agreements/AgreementInfoPanel';
import TagInput from '../common/TagInput';
import { t } from '../../locales';
import { toUpperCase, transformFormData, CARGO_UPPERCASE_FIELDS } from '../../utils/textUtils';
import { useDropdownKeyboard } from '../../hooks/useDropdownKeyboard';

export default function EditCargoModal({ cargo, onClose, onSuccess, isReadOnly, currentUser }) {
  const isAdmin = ['SUPER_ADMIN', 'BROKER_ADMIN'].includes(currentUser?.globalRole);

  // Admins can edit vehicle type and client company
  const canEditVehicleType = isAdmin && !isReadOnly;
  const canEditClientCompany = isAdmin && !isReadOnly;

  // ===== ShipsGo override tracking =====
  // Server keeps the authoritative list in cargo.shipsGoManuallyOverriddenFields;
  // we mirror it locally so the "ShipsGo'ya bırak" reset button can update the
  // UI immediately when the user releases a field.
  const [overrideList, setOverrideList] = useState(cargo.shipsGoManuallyOverriddenFields || []);
  const shipsGoActive = !!cargo.shipsGoEnabled && !!cargo.shipsGoTrackingId;
  const isFieldOverridden = (fieldName) => overrideList.includes(fieldName);

  // ===== ShipsGo request history (banner state) =====
  const [requestHistory, setRequestHistory] = useState([]);
  const [reRequestNotes, setReRequestNotes] = useState('');
  const [reRequesting, setReRequesting] = useState(false);

  const loadRequests = useCallback(async () => {
    const res = await shipsGoService.listCargoRequests(cargo.id);
    if (res.success) setRequestHistory(res.data?.requests || []);
  }, [cargo.id]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // The newest request always wins (rejection vs. pending vs. approved).
  const latestRequest = requestHistory[0] || null;

  const handleCancelMyRequest = async (requestId) => {
    const ok = await confirmDialog({
      title: 'ShipsGo talebini iptal et',
      message: 'Bekleyen ShipsGo entegrasyon talebinizi iptal etmek istiyor musunuz?',
      intent: 'warning',
      confirmText: 'Talebi iptal et',
    });
    if (!ok) return;
    const res = await shipsGoService.cancelRequest(requestId);
    if (res.success) {
      showSuccess('Talep iptal edildi');
      loadRequests();
    } else {
      showError(res.error);
    }
  };

  const handleReRequest = async () => {
    setReRequesting(true);
    const res = await shipsGoService.requestEnable(cargo.id, { notes: reRequestNotes.trim() || null });
    setReRequesting(false);
    if (res.success) {
      showSuccess('Yeni talep gönderildi');
      setReRequestNotes('');
      loadRequests();
      onSuccess?.();
    } else {
      showError(res.error);
    }
  };

  // Direct enable for BROKER_ADMIN / SUPER_ADMIN — the "modal-side" twin of
  // the table's ShipsGo'yu Aç cell. No credit cost; the user can fetch the
  // tracking data afterwards from the cargo list.
  const [enablingNow, setEnablingNow] = useState(false);
  const handleEnableNow = async () => {
    const ok = await confirmDialog({
      title: 'ShipsGo entegrasyonunu aç',
      message: 'Bu yük için ShipsGo entegrasyonu aktive edilecek.',
      details: [
        'Bu adımda kredi tüketilmez.',
        'Açıldıktan sonra tablodan "Bilgileri Getir" ile veriler çekilebilir (1 kredi).',
      ],
      intent: 'primary',
      icon: 'travel_explore',
      confirmText: 'ShipsGo\'yu aç',
    });
    if (!ok) return;
    setEnablingNow(true);
    const res = await shipsGoService.enable(cargo.id);
    setEnablingNow(false);
    if (res.success) {
      showSuccess('ShipsGo entegrasyonu açıldı');
      onSuccess?.();
      onClose?.();
    } else {
      showError(res.error || 'ShipsGo açılamadı');
    }
  };

  const handleResetOverride = async (fieldName) => {
    const labels = {
      estimatedArrivalDate: 'Tahmini Varış Tarihi',
      cargoArrivalDate: 'Gerçek Varış Tarihi',
    };
    const label = labels[fieldName] || fieldName;
    const ok = await confirmDialog({
      title: `${label} alanını ShipsGo'ya bırak`,
      message: `${label} alanını yeniden ShipsGo kontrolüne vermek istiyor musunuz?`,
      details: [
        'Bir sonraki güncellemede alan ShipsGo değeriyle değişir',
        'Manuel kilit kaldırılır',
      ],
      intent: 'primary',
      icon: 'restart_alt',
      confirmText: 'ShipsGo\'ya bırak',
    });
    if (!ok) return;
    const res = await shipsGoService.resetOverride(cargo.id, fieldName);
    if (res.success) {
      setOverrideList(prev => prev.filter(f => f !== fieldName));
      showSuccess(`${labels[fieldName] || fieldName} ShipsGo kontrolüne bırakıldı`);
      // Tell the parent to re-read so the just-resynced value shows up.
      onSuccess?.();
    } else {
      showError(res.error || 'İşlem başarısız');
    }
  };

  const [formData, setFormData] = useState({
    status: cargo.status || "TRACKING",
    vehicleType: cargo.vehicleType || "",
    clientCompanyId: cargo.clientCompany?.id || "",
    senderCompany: cargo.senderCompany || "",
    containerCount: cargo.containerCount || "",
    weightKg: cargo.weightKg || "",
    lokalAmount: cargo.lokalAmount || "",
    lokalCurrency: cargo.lokalCurrency || "TRY",
    depositoAmount: cargo.depositoAmount || "",
    depositoCurrency: cargo.depositoCurrency || "TRY",
    ordinoAmount: cargo.ordinoAmount || "",
    ordinoCurrency: cargo.ordinoCurrency || "TRY",
    paymentStatus: cargo.paymentStatus || "NO_PAYMENT",
    carrierName: cargo.carrierName || "",
    billOfLading: cargo.billOfLading || "",
    licensePlate: cargo.licensePlate || "",
    consignmentNumber: cargo.consignmentNumber || "",
    containerNumbers: cargo.containerNumbers || [],
    transportInfo: cargo.transportInfo || "",
    documentDeliveryType: cargo.documentDeliveryType || null,
    documentReceiver: cargo.documentReceiver || "",
    documentDeliveryDate: cargo.documentDeliveryDate || "",
    estimatedArrivalDate: cargo.estimatedArrivalDate || "",
    cargoArrivalDate: cargo.cargoArrivalDate || "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  // Client company selection
  const [availableClients, setAvailableClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState(cargo.clientCompany?.name || "");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientInfo, setSelectedClientInfo] = useState(cargo.clientCompany || null);

  // Agreement info from cargo
  const [agreementInfo, setAgreementInfo] = useState(null);
  const [clientAgreements, setClientAgreements] = useState({});

  // Sender company autocomplete states
  const [availableSenders, setAvailableSenders] = useState([]);
  const [filteredSenders, setFilteredSenders] = useState([]);
  const [senderSearchTerm, setSenderSearchTerm] = useState(cargo.senderCompany || "");
  const [showSenderDropdown, setShowSenderDropdown] = useState(false);
  const [loadingSenders, setLoadingSenders] = useState(false);

  // Carrier name autocomplete states
  const [availableCarriers, setAvailableCarriers] = useState([]);
  const [filteredCarriers, setFilteredCarriers] = useState([]);
  const [carrierSearchTerm, setCarrierSearchTerm] = useState(cargo.carrierName || "");
  const [showCarrierDropdown, setShowCarrierDropdown] = useState(false);
  const [loadingCarriers, setLoadingCarriers] = useState(false);

  // Vehicle type change confirmation
  const [pendingVehicleType, setPendingVehicleType] = useState(null);
  const [showVehicleTypeConfirmModal, setShowVehicleTypeConfirmModal] = useState(false);

  // Load clients if admin
  useEffect(() => {
    if (canEditClientCompany && cargo.brokerCompany?.id) {
      loadClients(cargo.brokerCompany.id);
    }
  }, [canEditClientCompany, cargo.brokerCompany?.id]);

  // Load senders and carriers on mount
  useEffect(() => {
    if (!isReadOnly) {
      loadSendersAndCarriers();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract agreement info
  useEffect(() => {
    if (cargo.agreement) {
      setAgreementInfo(cargo.agreement);
    }
  }, [cargo]);

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
        setAgreementInfo(agreement || null);
      }
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
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadSendersAndCarriers = async () => {
    try {
      setLoadingSenders(true);
      setLoadingCarriers(true);
      const result = await cargoService.getAllCargo();

      if (result.success) {
        const uniqueSenders = [
          ...new Set(
            result.data
              .map((c) => c.senderCompany)
              .filter((name) => name && name.trim() !== "")
          ),
        ].sort((a, b) => a.localeCompare(b, "tr"));

        const uniqueCarriers = [
          ...new Set(
            result.data
              .map((c) => c.carrierName)
              .filter((name) => name && name.trim() !== "")
          ),
        ].sort((a, b) => a.localeCompare(b, "tr"));

        setAvailableSenders(uniqueSenders);
        setFilteredSenders(uniqueSenders.slice(0, 50));
        setAvailableCarriers(uniqueCarriers);
        setFilteredCarriers(uniqueCarriers.slice(0, 50));
      } else {
        setAvailableSenders([]);
        setFilteredSenders([]);
        setAvailableCarriers([]);
        setFilteredCarriers([]);
      }
    } catch (err) {
      console.error("Error loading senders and carriers:", err);
      setAvailableSenders([]);
      setFilteredSenders([]);
      setAvailableCarriers([]);
      setFilteredCarriers([]);
    } finally {
      setLoadingSenders(false);
      setLoadingCarriers(false);
    }
  };

  // Keyboard navigation for client dropdown
  const clientKeyboard = useDropdownKeyboard(
    showClientDropdown,
    filteredClients,
    (client) => {
      setFormData(prev => ({ ...prev, clientCompanyId: client.id }));
      setClientSearchTerm(client.shortName || client.name);
      setSelectedClientInfo(client);
      setShowClientDropdown(false);
    },
    () => setShowClientDropdown(false),
    'client-dropdown'
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

  const vehicleTypeInfo = getVehicleType(formData.vehicleType);

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
      // Clear all vehicle-specific fields
      licensePlate: "",
      consignmentNumber: "",
      billOfLading: "",
      containerNumbers: [],
    }));

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
    const uppercaseFields = ['licensePlate', 'consignmentNumber', 'billOfLading', 'documentReceiver', 'senderCompany', 'carrierName'];
    const finalValue = type === 'checkbox' ? checked : (uppercaseFields.includes(name) ? toUpperCase(value) : value);

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isReadOnly) {
      showError('Bu kaydı düzenleme yetkiniz yok');
      return;
    }

    setLoading(true);

    try {
      // Transform uppercase fields
      const transformedData = transformFormData(formData, CARGO_UPPERCASE_FIELDS);

      const dataToSend = {
        ...transformedData,
        containerCount: transformedData.containerCount ? parseInt(transformedData.containerCount) : null,
        weightKg: transformedData.weightKg ? parseFloat(transformedData.weightKg) : null,
        costsAmount: transformedData.costsAmount ? parseFloat(transformedData.costsAmount) : null,
        // Include vehicleType and clientCompanyId if admin edited them
        ...(canEditVehicleType && { vehicleType: transformedData.vehicleType }),
        ...(canEditClientCompany && { clientCompanyId: transformedData.clientCompanyId }),
      };

      const result = await cargoService.updateCargo(cargo.id, dataToSend);

      if (result.success) {
        showSuccess('Yük kaydı başarıyla güncellendi!');
        onSuccess();
      } else {
        handleApiResponse(result, null, (err) => showError(err), 'cargo update');
      }
    } catch (err) {
      handleError(err, (err) => showError(err), 'cargo update', 'Yük kaydı güncellenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col animate-zoom-in transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">
              {isReadOnly ? 'visibility' : 'edit'}
            </span>
            <h2 className="text-2xl font-bold text-text-main">
              {isReadOnly ? 'Yük Detayları' : 'Yük Düzenle'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-background-dark transition-colors duration-300">
          {/* ShipsGo request status banner */}
          <ShipsGoRequestBanner
            latest={latestRequest}
            currentUserId={currentUser?.id}
            shipsGoEnabled={!!cargo.shipsGoEnabled}
            shipsGoTrackingId={cargo.shipsGoTrackingId}
            vehicleType={cargo.vehicleType}
            cargoStatus={cargo.status}
            isAdmin={isAdmin}
            isReadOnly={!!isReadOnly}
            onCancel={handleCancelMyRequest}
            reRequestNotes={reRequestNotes}
            setReRequestNotes={setReRequestNotes}
            onReRequest={handleReRequest}
            reRequesting={reRequesting}
            onEnableNow={handleEnableNow}
            enablingNow={enablingNow}
          />

          {/* Draft warning */}
          {cargo.isDraft && (
            <div className="mb-4 rounded-xl border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">draft</span>
                Bu kayıt taslak durumunda
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                Tüm zorunlu alanları doldurup kaydettiğinizde aktif yük olarak işaretlenecek.
              </p>
            </div>
          )}

          {/* Vehicle Type */}
          <div className="mb-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-text-main">
                Araç Tipi {!canEditVehicleType && '(Değiştirilemez)'}
              </p>
            </div>
            {canEditVehicleType ? (
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
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-3xl text-primary">{vehicleTypeInfo?.icon}</span>
                  <span className="text-lg font-semibold text-text-main">{vehicleTypeInfo?.displayName}</span>
                </div>
              </div>
            )}
          </div>

          {/* Agreement Info Panel */}
          {agreementInfo && selectedClientInfo && (
            <div className="mb-6">
              <AgreementInfoPanel
                agreement={agreementInfo}
                clientName={selectedClientInfo.name}
              />
            </div>
          )}

          {/* Buyer Company */}
          <div className="mb-6">
            <p className="text-sm font-medium text-text-main pb-2">
              Alıcı Firma {!canEditClientCompany && '(Değiştirilemez)'}
              {loadingClients && (
                <span className="text-xs text-blue-600 ml-2 animate-pulse">
                  Yükleniyor...
                </span>
              )}
            </p>
            {canEditClientCompany ? (
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearchTerm}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => setShowClientDropdown(false), 200);
                    }}
                    onKeyDown={clientKeyboard.handleKeyDown}
                    placeholder={toUpperCase(t("placeholders.typeToSearch"))}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border-neutral/30 dark:border-gray-600 focus:border-primary bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal transition-colors"
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
            ) : (
              <input
                type="text"
                value={cargo.clientCompany?.name || ''}
                disabled
                className="form-input w-full rounded-lg text-text-main dark:text-gray-100 bg-gray-100 dark:bg-gray-700 border border-neutral/30 dark:border-gray-600 h-12 p-3 text-base font-normal cursor-not-allowed transition-colors"
              />
            )}
            {!canEditClientCompany && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Alıcı firma sadece yöneticiler tarafından değiştirilebilir
              </p>
            )}
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-main pb-2">
              Durum
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={isReadOnly}
              className="form-select w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {CARGO_STATUS.map(status => (
                <option key={status.value} value={status.value}>
                  {status.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Sender - Searchable Dropdown */}
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between pb-2">
                <p className="text-text-main text-sm font-medium">
                  Gönderici Firma
                  {loadingSenders && (
                    <span className="text-xs text-blue-600 ml-2 animate-pulse">Yükleniyor...</span>
                  )}
                  {!loadingSenders && availableSenders.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">({availableSenders.length} kayıtlı)</span>
                  )}
                </p>
              </div>
              {isReadOnly ? (
                <input
                  type="text"
                  value={formData.senderCompany}
                  disabled
                  className="form-input w-full rounded-lg text-text-main dark:text-gray-100 bg-gray-100 dark:bg-gray-700 border border-neutral/30 dark:border-gray-600 h-12 p-3 text-base font-normal cursor-not-allowed transition-colors"
                />
              ) : (
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
                      onBlur={() => { setTimeout(() => setShowSenderDropdown(false), 200); }}
                      onKeyDown={senderKeyboard.handleKeyDown}
                      placeholder={toUpperCase(t("placeholders.selectOrType"))}
                      className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal transition-colors"
                      style={{ textTransform: "uppercase" }}
                    />
                    {senderSearchTerm && (
                      <button type="button" tabIndex={-1}
                        onClick={() => { setSenderSearchTerm(""); setFormData(prev => ({ ...prev, senderCompany: "" })); setShowSenderDropdown(true); }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowSenderDropdown(!showSenderDropdown)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      <span className="material-symbols-outlined text-lg">{showSenderDropdown ? "expand_less" : "expand_more"}</span>
                    </button>
                  </div>
                  {showSenderDropdown && !loadingSenders && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors">
                      {filteredSenders.length > 0 ? (
                        filteredSenders.map((sender, index) => (
                          <button key={sender} type="button"
                            data-dropdown-id="sender-dropdown" data-dropdown-index={index}
                            onClick={() => { setSenderSearchTerm(sender); setFormData(prev => ({ ...prev, senderCompany: sender })); setShowSenderDropdown(false); }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${formData.senderCompany === sender ? "bg-blue-50 dark:bg-blue-900/20 text-primary font-medium" : index === senderKeyboard.highlightedIndex ? "bg-gray-100 dark:bg-gray-700" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-lg">local_shipping</span>
                                <p className="font-medium text-sm text-text-main">{sender}</p>
                              </div>
                              {formData.senderCompany === sender && (
                                <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">check_circle</span>
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
              )}
            </div>

            {/* Carrier - Searchable Dropdown */}
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between pb-2">
                <p className="text-text-main text-sm font-medium">
                  Nakliyeci
                  {loadingCarriers && (
                    <span className="text-xs text-blue-600 ml-2 animate-pulse">Yükleniyor...</span>
                  )}
                  {!loadingCarriers && availableCarriers.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">({availableCarriers.length} kayıtlı)</span>
                  )}
                </p>
              </div>
              {isReadOnly ? (
                <input
                  type="text"
                  value={formData.carrierName}
                  disabled
                  className="form-input w-full rounded-lg text-text-main dark:text-gray-100 bg-gray-100 dark:bg-gray-700 border border-neutral/30 dark:border-gray-600 h-12 p-3 text-base font-normal cursor-not-allowed transition-colors"
                />
              ) : (
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
                      onBlur={() => { setTimeout(() => setShowCarrierDropdown(false), 200); }}
                      onKeyDown={carrierKeyboard.handleKeyDown}
                      placeholder={toUpperCase(t("placeholders.selectOrType"))}
                      className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 border-neutral/30 dark:border-gray-600 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 pr-20 text-base font-normal transition-colors"
                      style={{ textTransform: "uppercase" }}
                    />
                    {carrierSearchTerm && (
                      <button type="button" tabIndex={-1}
                        onClick={() => { setCarrierSearchTerm(""); setFormData(prev => ({ ...prev, carrierName: "" })); setShowCarrierDropdown(true); }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowCarrierDropdown(!showCarrierDropdown)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      <span className="material-symbols-outlined text-lg">{showCarrierDropdown ? "expand_less" : "expand_more"}</span>
                    </button>
                  </div>
                  {showCarrierDropdown && !loadingCarriers && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-colors">
                      {filteredCarriers.length > 0 ? (
                        filteredCarriers.map((carrier, index) => (
                          <button key={carrier} type="button"
                            data-dropdown-id="carrier-dropdown" data-dropdown-index={index}
                            onClick={() => { setCarrierSearchTerm(carrier); setFormData(prev => ({ ...prev, carrierName: carrier })); setShowCarrierDropdown(false); }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${formData.carrierName === carrier ? "bg-blue-50 dark:bg-blue-900/20 text-primary font-medium" : index === carrierKeyboard.highlightedIndex ? "bg-gray-100 dark:bg-gray-700" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-lg">local_shipping</span>
                                <p className="font-medium text-sm text-text-main">{carrier}</p>
                              </div>
                              {formData.carrierName === carrier && (
                                <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">check_circle</span>
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
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main pb-2">
                Kap Sayısı
              </label>
              <input
                type="number"
                name="containerCount"
                value={formData.containerCount}
                onChange={handleChange}
                disabled={isReadOnly}
                min="0"
                placeholder={toUpperCase(t("placeholders.enterContainerCount"))}
                className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main pb-2">
                Ağırlık (kg)
              </label>
              <input
                type="number"
                name="weightKg"
                value={formData.weightKg}
                onChange={handleChange}
                disabled={isReadOnly}
                step="0.01"
                min="0"
                placeholder={toUpperCase(t("placeholders.enterWeight"))}
                className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              />
            </div>

            {/* Costs Section - Lokal, Depozito, Ordino */}
            <div className="col-span-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
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
                    disabled={isReadOnly}
                    step="0.01"
                    min="0"
                    placeholder={t("placeholders.enterLokalAmount")}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-10 placeholder:text-neutral p-2 text-sm font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                  />
                  <select
                    name="lokalCurrency"
                    value={formData.lokalCurrency}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-10 p-2 text-sm font-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {CURRENCY_OPTIONS.map(currency => (
                      <option key={currency.value} value={currency.value}>
                        {currency.symbol} {currency.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Depozito Masrafı */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-main">Depozito Masrafı</label>
                  <input
                    type="number"
                    name="depositoAmount"
                    value={formData.depositoAmount}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    step="0.01"
                    min="0"
                    placeholder={t("placeholders.enterDepositoAmount")}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-10 placeholder:text-neutral p-2 text-sm font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                  />
                  <select
                    name="depositoCurrency"
                    value={formData.depositoCurrency}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-10 p-2 text-sm font-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {CURRENCY_OPTIONS.map(currency => (
                      <option key={currency.value} value={currency.value}>
                        {currency.symbol} {currency.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ordino Masrafı */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-main">Ordino Masrafı</label>
                  <input
                    type="number"
                    name="ordinoAmount"
                    value={formData.ordinoAmount}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    step="0.01"
                    min="0"
                    placeholder={t("placeholders.enterOrdinoAmount")}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-10 placeholder:text-neutral p-2 text-sm font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                  />
                  <select
                    name="ordinoCurrency"
                    value={formData.ordinoCurrency}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-10 p-2 text-sm font-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {CURRENCY_OPTIONS.map(currency => (
                      <option key={currency.value} value={currency.value}>
                        {currency.symbol} {currency.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle-specific fields */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            <h3 className="text-sm font-medium text-text-main mb-3">
              {vehicleTypeInfo?.displayName} Bilgileri
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {vehicleTypeInfo?.fields.includes("licensePlate") && (
                <div>
                  <label className="block text-sm font-medium text-text-main pb-2">
                    Plaka
                  </label>
                  <input
                    type="text"
                    name="licensePlate"
                    value={formData.licensePlate}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    placeholder={toUpperCase(t("placeholders.enterLicensePlate"))}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
              )}

              {vehicleTypeInfo?.fields.includes("consignmentNumber") && (
                <div>
                  <label className="block text-sm font-medium text-text-main pb-2">
                    Konşimento
                  </label>
                  <input
                    type="text"
                    name="consignmentNumber"
                    value={formData.consignmentNumber}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    placeholder={toUpperCase(t("placeholders.enterConsignmentNumber"))}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
              )}

              {vehicleTypeInfo?.fields.includes("billOfLading") && (
                <div>
                  <label className="block text-sm font-medium text-text-main pb-2">
                    B/L
                  </label>
                  <input
                    type="text"
                    name="billOfLading"
                    value={formData.billOfLading}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    placeholder={toUpperCase(t("placeholders.enterBillOfLading"))}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
              )}

              {vehicleTypeInfo?.fields.includes("containerNumbers") && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-text-main pb-2">
                    Konteyner Numaraları <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">
                      (Enter ile ekleyin)
                    </span>
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
                    disabled={isReadOnly}
                  />
                </div>
              )}
            </div>
          </div>

          {/* === TAKVİM & TAKİP === */}
          <div className="mb-5 border border-blue-200 dark:border-blue-800/60 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800/60">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">calendar_month</span>
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Takvim & Takip</h3>
              <span className="ml-auto text-xs text-blue-500 dark:text-blue-400">ETA ve nakliye notları</span>
            </div>
            <div className="p-4 grid grid-cols-1 gap-4">
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-text-main pb-2">
                  <span>Tahmini Varış Tarihi (ETA)</span>
                  <ShipsGoFieldBadge
                    shipsGoActive={shipsGoActive}
                    overridden={isFieldOverridden('estimatedArrivalDate')}
                    canManage={isAdmin && !isReadOnly}
                    onReset={() => handleResetOverride('estimatedArrivalDate')}
                  />
                </label>
                <input
                  type="date"
                  name="estimatedArrivalDate"
                  value={formData.estimatedArrivalDate}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                />
                {cargo.initialEstimatedArrivalDate && cargo.initialEstimatedArrivalDate !== formData.estimatedArrivalDate && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-blue-600 dark:text-blue-400">
                    <span className="material-symbols-outlined text-sm">info</span>
                    <span>İlk ETA: {new Date(cargo.initialEstimatedArrivalDate).toLocaleDateString('tr-TR')} — gecikme hesabı bu tarihe göre yapılır</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main pb-2">
                  Taşıma Bilgileri
                </label>
                <textarea
                  name="transportInfo"
                  value={formData.transportInfo}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  rows="3"
                  placeholder={toUpperCase(t("placeholders.enterTransportInfo"))}
                  className="form-textarea w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* === ÖDEME DURUMU === */}
          <div className="mb-5 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-lg">payments</span>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ödeme Durumu</h3>
            </div>
            <div className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {PAYMENT_STATUS_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.paymentStatus === option.value
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="paymentStatus"
                      value={option.value}
                      checked={formData.paymentStatus === option.value}
                      onChange={(e) => !isReadOnly && setFormData(prev => ({
                        ...prev,
                        paymentStatus: e.target.value
                      }))}
                      disabled={isReadOnly}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-text-main">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* === VARIŞ İŞLEMLERİ === */}
          <div className="mb-5 border border-amber-200 dark:border-amber-700/60 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/60">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">directions_boat</span>
              <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">Varış İşlemleri</h3>
              <span className="ml-auto text-xs text-amber-600 dark:text-amber-400">Varış tarihi → VARIŞ YAPTI</span>
            </div>
            <div className="p-4">
              <label className="flex items-center justify-between text-sm font-medium text-text-main pb-2">
                <span>Varış Tarihi</span>
                <ShipsGoFieldBadge
                  shipsGoActive={shipsGoActive}
                  overridden={isFieldOverridden('cargoArrivalDate')}
                  canManage={isAdmin && !isReadOnly}
                  onReset={() => handleResetOverride('cargoArrivalDate')}
                />
              </label>
              <input
                type="date"
                name="cargoArrivalDate"
                value={formData.cargoArrivalDate}
                onChange={handleChange}
                disabled={isReadOnly || !!cargo.cargoArrivalDate}
                className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-amber-500 border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              />
              {formData.cargoArrivalDate && !cargo.cargoArrivalDate && cargo.status === 'TRACKING' && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-sm">info</span>
                  <span>Kaydedildiğinde yük <strong>VARIŞ YAPTI</strong> olarak işaretlenecek</span>
                </div>
              )}
              {cargo.cargoArrivalDate && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Varış tarihi kaydedilmiş, değiştirilemez</span>
                </div>
              )}
            </div>
          </div>

          {/* === YÜK İŞLEMİNİ TAMAMLAMA === */}
          <div className="mb-5 border border-emerald-200 dark:border-emerald-700/60 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-700/60">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">task_alt</span>
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Yük İşlemini Tamamlama</h3>
              <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400">Evrak tipi + tarih → TAMAMLANDI</span>
            </div>
            <div className="p-4 space-y-4">

              {/* Evrak Teslim Tipi Seçimi */}
              <div>
                <label className="block text-sm font-medium text-text-main pb-2">Evrak Teslim Tipi</label>
                <div className="grid grid-cols-3 gap-2">
                  {DOCUMENT_DELIVERY_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        documentDeliveryType: prev.documentDeliveryType === type.value ? null : type.value,
                        documentReceiver: !type.requiresPersonName ? "" : prev.documentReceiver,
                      }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
                        formData.documentDeliveryType === type.value
                          ? `border-2 ${type.cardClass}`
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span className={`material-symbols-outlined text-lg ${formData.documentDeliveryType === type.value ? type.iconClass : 'text-gray-400 dark:text-gray-500'}`}>
                        {type.icon}
                      </span>
                      <span className={`text-xs font-medium leading-tight ${formData.documentDeliveryType === type.value ? type.iconClass : 'text-text-secondary'}`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Şahıs Adı - yalnızca requiresPersonName=true tiplerinde */}
              {formData.documentDeliveryType && DOCUMENT_DELIVERY_TYPES.find(t => t.value === formData.documentDeliveryType)?.requiresPersonName && (
                <div>
                  <label className="block text-sm font-medium text-text-main pb-2">
                    Evrakları Teslim Alan
                  </label>
                  <input
                    type="text"
                    name="documentReceiver"
                    value={formData.documentReceiver}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    placeholder={toUpperCase(t("placeholders.enterDocumentReceiver"))}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-emerald-500 border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
              )}

              {/* Dosya Teslim Tarihi */}
              <div>
                <label className="block text-sm font-medium text-text-main pb-2">
                  Dosya Teslim Tarihi
                </label>
                <input
                  type="date"
                  name="documentDeliveryDate"
                  value={formData.documentDeliveryDate}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-emerald-500 border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                />
              </div>

              {cargo.status === 'ARRIVED' && formData.documentDeliveryType && formData.documentDeliveryDate && !cargo.documentDeliveryDate && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Kaydedildiğinde yük <strong>TAMAMLANDI</strong> olarak işaretlenecek</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 transition-colors">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isReadOnly ? 'Kapat' : 'İptal'}
          </button>
          {!isReadOnly && (
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Güncelleniyor...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  <span>Güncelle</span>
                </>
              )}
            </button>
          )}
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
    </div>
  );
}

/**
 * Compact inline indicator next to ShipsGo-managed cargo fields.
 *
 * Three states:
 *  - ShipsGo not active: badge hidden (nothing to communicate).
 *  - Active & user has manually overridden the field: 🔒 pill with a
 *    one-click "↺ ShipsGo'ya bırak" reset button (BROKER_ADMIN /
 *    SUPER_ADMIN only). Clicking it confirms, calls /reset-override,
 *    and removes the field from the local override list so the badge
 *    updates immediately.
 *  - Active & ShipsGo currently owns the field: a small "ShipsGo
 *    güncelliyor" tag — same shape so the label height does not jump
 *    between rows.
 *
 * Lives in the same file as EditCargoModal because it is single-use and
 * needs the modal's local state shape; promoting it to a shared
 * component would just couple them through props.
 */
/**
 * In-modal banner reflecting the latest ShipsGo enable-request on the cargo.
 * Three states matter:
 *  - PENDING (the request is sitting in some BROKER_ADMIN's queue): blue
 *    info banner. The original requester sees a "Talebi iptal et" button.
 *  - REJECTED: red banner quoting the admin's reason. A "Tekrar Talep Et"
 *    affordance lets the user file a fresh request (with a fresh note).
 *  - APPROVED but ShipsGo isn't actually active anymore (rare; admin
 *    disabled afterwards): green hint nudging the user to re-request.
 *  - APPROVED and ShipsGo still active, or CANCELLED, or nothing: no banner.
 */
function ShipsGoRequestBanner({
  latest, currentUserId, shipsGoEnabled, shipsGoTrackingId,
  vehicleType, cargoStatus, isAdmin, isReadOnly,
  onCancel, reRequestNotes, setReRequestNotes, onReRequest, reRequesting,
  onEnableNow, enablingNow,
}) {
  const supportsShipsGo = vehicleType === 'SHIP' || vehicleType === 'AIRPLANE';
  const isCompleted = cargoStatus === 'COMPLETED';
  const noActiveRequest = !latest || latest.status === 'CANCELLED';

  // "ShipsGo is off, nothing pending, can still be turned on" — show a
  // call-to-action so the user has a way to enable from inside the modal
  // (mirrors the table cell). Skipped for read-only viewers and for cargo
  // already wired up (active or with a tracking ID waiting on fetch).
  if (supportsShipsGo && !isCompleted && !isReadOnly && !shipsGoEnabled
      && !shipsGoTrackingId && noActiveRequest) {
    if (isAdmin) {
      return (
        <div className="mb-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-semibold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-text-secondary">travel_explore</span>
                ShipsGo entegrasyonu bu yük için kapalı
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Açtığınızda kredi tüketilmez. Açtıktan sonra tablodan "Bilgileri Getir" ile veriler çekilebilir (1 kredi).
              </p>
            </div>
            <button
              type="button"
              onClick={onEnableNow}
              disabled={enablingNow}
              className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold disabled:opacity-50 whitespace-nowrap"
            >
              {enablingNow ? 'Açılıyor...' : 'ShipsGo\'yu Aç'}
            </button>
          </div>
        </div>
      );
    }
    // BROKER_USER → request flow with optional note.
    return (
      <div className="mb-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 p-4">
        <p className="text-sm font-semibold text-text-main flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-text-secondary">travel_explore</span>
          ShipsGo entegrasyonu bu yük için kapalı
        </p>
        <p className="text-xs text-text-secondary mt-1">
          Açma yetkisi yöneticinizde — talep gönderebilirsiniz.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            maxLength={500}
            value={reRequestNotes}
            onChange={(e) => setReRequestNotes(e.target.value)}
            placeholder="Talep notu (opsiyonel)"
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={onReRequest}
            disabled={reRequesting}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold disabled:opacity-50 whitespace-nowrap"
          >
            {reRequesting ? 'Gönderiliyor...' : 'Talep Gönder'}
          </button>
        </div>
      </div>
    );
  }

  // No request at all → no banner. CANCELLED also stays quiet (the user
  // intentionally walked away from it). Both branches dropped here so the
  // demo doesn't show stale banners for cargos that never had a request.
  if (!latest) return null;
  if (latest.status === 'CANCELLED') return null;
  const isOwner = latest.requestedByEmail && currentUserId
    ? false
    : latest.requestedByEmail && currentUserId === latest.requestedByEmail
    ? true
    : false;
  // The list is ordered newest-first server-side. We render the most recent
  // status as the banner; older history (cancelled, previously rejected, etc.)
  // intentionally doesn't surface here to avoid noise.

  if (latest.status === 'PENDING') {
    return (
      <div className="mb-4 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">schedule</span>
              ShipsGo entegrasyon talebiniz yöneticinizin onayını bekliyor
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Talep tarihi: {new Date(latest.requestedAt).toLocaleString('tr-TR')}
              {latest.notes && <> · "{latest.notes}"</>}
            </p>
          </div>
          <button
            onClick={() => onCancel(latest.id)}
            className="px-3 py-1.5 text-xs border border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            Talebi iptal et
          </button>
        </div>
        {/* unused but kept linked: isOwner is a placeholder if we later want
            to show the cancel button only to the original requester */}
        <span className="hidden">{String(isOwner)}</span>
      </div>
    );
  }

  if (latest.status === 'REJECTED') {
    return (
      <div className="mb-4 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">cancel</span>
          ShipsGo entegrasyon talebiniz reddedildi
        </p>
        {latest.rejectionReason && (
          <p className="text-xs text-red-700 dark:text-red-400 mt-1 italic">
            Gerekçe: "{latest.rejectionReason}"
          </p>
        )}
        {latest.reviewedByEmail && (
          <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
            {latest.reviewedByEmail} tarafından · {new Date(latest.reviewedAt).toLocaleString('tr-TR')}
          </p>
        )}
        <p className="text-xs text-red-700 dark:text-red-400 mt-2">
          Bilgileri elle girmeye devam edebilir veya yeniden talep gönderebilirsiniz.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            maxLength={500}
            value={reRequestNotes}
            onChange={(e) => setReRequestNotes(e.target.value)}
            placeholder="Yeni talebe iletmek istediğiniz not (opsiyonel)"
            className="flex-1 rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button
            onClick={onReRequest}
            disabled={reRequesting}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 whitespace-nowrap"
          >
            {reRequesting ? 'Gönderiliyor...' : 'Tekrar Talep Et'}
          </button>
        </div>
      </div>
    );
  }

  if (latest.status === 'APPROVED' && !shipsGoEnabled) {
    return (
      <div className="mb-4 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          ShipsGo talebiniz onaylandı ama bu yük için entegrasyon kapalı
        </p>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
          Yeniden açmak için yeni bir talep gönderebilirsiniz.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            maxLength={500}
            value={reRequestNotes}
            onChange={(e) => setReRequestNotes(e.target.value)}
            placeholder="Talep notu (opsiyonel)"
            className="flex-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-700 text-text-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={onReRequest}
            disabled={reRequesting}
            className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold disabled:opacity-50 whitespace-nowrap"
          >
            {reRequesting ? 'Gönderiliyor...' : 'Tekrar Talep Et'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function ShipsGoFieldBadge({ shipsGoActive, overridden, canManage, onReset }) {
  if (!shipsGoActive) return null;
  if (overridden) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[11px] font-medium"
        title="Manuel olarak girildi — ShipsGo bu alanı güncellemiyor"
      >
        <span className="material-symbols-outlined text-sm">lock</span>
        Manuel
        {canManage && (
          <button
            type="button"
            onClick={onReset}
            className="ml-1 inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity"
            title="Alanı tekrar ShipsGo kontrolüne bırak"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            ShipsGo'ya bırak
          </button>
        )}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium"
      title="Bu alan ShipsGo tarafından güncelleniyor — değiştirirseniz manuel kontrole alınır"
    >
      <span className="material-symbols-outlined text-sm">travel_explore</span>
      ShipsGo güncelliyor
    </span>
  );
}
