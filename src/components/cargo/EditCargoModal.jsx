import { useState, useEffect } from 'react';
import { cargoService } from '../../api/cargoService';
import { companyService } from '../../api/companyService';
import { CARGO_STATUS, VEHICLE_TYPES, CURRENCY_OPTIONS, getVehicleType } from '../../utils/constants';
import { showSuccess, showError } from '../../utils/toastUtils';
import { handleError, handleApiResponse } from '../../utils/errorUtils';
import AgreementInfoPanel from '../agreements/AgreementInfoPanel';
import { t, getCurrentLocale } from '../../locales';
import { toUpperCase, transformFormData, CARGO_UPPERCASE_FIELDS } from '../../utils/textUtils';
import { useDropdownKeyboard } from '../../hooks/useDropdownKeyboard';

export default function EditCargoModal({ cargo, onClose, onSuccess, isReadOnly, currentUser }) {
  const isAdmin = ['SUPER_ADMIN', 'BROKER_ADMIN'].includes(currentUser?.globalRole);
  const isBrokerUser = currentUser?.globalRole === 'BROKER_USER';
  const locale = getCurrentLocale();

  // Admins can edit vehicle type and client company
  const canEditVehicleType = isAdmin && !isReadOnly;
  const canEditClientCompany = isAdmin && !isReadOnly;

  const [formData, setFormData] = useState({
    status: cargo.status || "TRACKING",
    vehicleType: cargo.vehicleType || "",
    clientCompanyId: cargo.clientCompany?.id || "",
    senderCompany: cargo.senderCompany || "",
    containerCount: cargo.containerCount || "",
    weightKg: cargo.weightKg || "",
    costsAmount: cargo.costsAmount || "",
    costsCurrency: cargo.costsCurrency || "TRY",
    paymentReceived: cargo.paymentReceived || false,
    carrierName: cargo.carrierName || "",
    billOfLading: cargo.billOfLading || "",
    licensePlate: cargo.licensePlate || "",
    consignmentNumber: cargo.consignmentNumber || "",
    containerNumber: cargo.containerNumber || "",
    transportInfo: cargo.transportInfo || "",
    documentReceiver: cargo.documentReceiver || "",
    documentDeliveryDate: cargo.documentDeliveryDate || "",
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

  // Vehicle type change confirmation
  const [pendingVehicleType, setPendingVehicleType] = useState(null);
  const [showVehicleTypeConfirmModal, setShowVehicleTypeConfirmModal] = useState(false);

  // Load clients if admin
  useEffect(() => {
    if (canEditClientCompany && cargo.brokerCompany?.id) {
      loadClients(cargo.brokerCompany.id);
    }
  }, [canEditClientCompany, cargo.brokerCompany?.id]);

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
        setClientSearchTerm(selectedClient.name);

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

  // Keyboard navigation for client dropdown
  const clientKeyboard = useDropdownKeyboard(
    showClientDropdown,
    filteredClients,
    (client) => {
      setFormData(prev => ({ ...prev, clientCompanyId: client.id }));
      setClientSearchTerm(client.name);
      setSelectedClientInfo(client);
      setShowClientDropdown(false);
    },
    () => setShowClientDropdown(false),
    'client-dropdown'
  );

  const vehicleTypeInfo = getVehicleType(formData.vehicleType);

  // Check if current vehicle type has any data
  const hasVehicleTypeData = () => {
    return !!(
      formData.licensePlate ||
      formData.consignmentNumber ||
      formData.billOfLading ||
      formData.containerNumber
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
      containerNumber: "",
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
    const uppercaseFields = ['licensePlate', 'consignmentNumber', 'billOfLading', 'containerNumber', 'documentReceiver', 'senderCompany', 'carrierName'];
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
        className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-zoom-in transition-colors duration-300"
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
                            setClientSearchTerm(client.name);
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
                                <p className="font-medium text-sm text-text-main truncate">{client.name}</p>
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
            <div>
              <label className="block text-sm font-medium text-text-main pb-2">
                Gönderici Firma
              </label>
              <input
                type="text"
                name="senderCompany"
                value={formData.senderCompany}
                onChange={handleChange}
                disabled={isReadOnly}
                placeholder={toUpperCase(t("placeholders.selectOrType"))}
                className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                style={{ textTransform: "uppercase" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main pb-2">
                Nakliyeci
              </label>
              <input
                type="text"
                name="carrierName"
                value={formData.carrierName}
                onChange={handleChange}
                disabled={isReadOnly}
                placeholder={toUpperCase(t("placeholders.selectOrType"))}
                className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                style={{ textTransform: "uppercase" }}
              />
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

            <div>
              <label className="block text-sm font-medium text-text-main pb-2">
                Masraflar
              </label>
              <input
                type="number"
                name="costsAmount"
                value={formData.costsAmount}
                onChange={handleChange}
                disabled={isReadOnly}
                step="0.01"
                min="0"
                placeholder={toUpperCase(t("placeholders.enterCostsAmount"))}
                className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main pb-2">
                Para Birimi
              </label>
              <select
                name="costsCurrency"
                value={formData.costsCurrency}
                onChange={handleChange}
                disabled={isReadOnly}
                className="form-select w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {CURRENCY_OPTIONS.map(currency => (
                  <option key={currency.value} value={currency.value}>
                    {currency.symbol} {currency.label}
                  </option>
                ))}
              </select>
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

              {vehicleTypeInfo?.fields.includes("containerNumber") && (
                <div>
                  <label className="block text-sm font-medium text-text-main pb-2">
                    Konteyner No
                  </label>
                  <input
                    type="text"
                    name="containerNumber"
                    value={formData.containerNumber}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    placeholder={toUpperCase(t("placeholders.enterContainerNumber"))}
                    className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-2 gap-4 mb-6">
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
                className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                style={{ textTransform: "uppercase" }}
              />
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
                disabled={isReadOnly}
                className="form-input w-full rounded-lg text-text-main dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-primary border border-neutral/30 dark:border-gray-600 bg-white dark:bg-gray-800 h-12 placeholder:text-neutral p-3 text-base font-normal transition-colors disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="mb-6">
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

          {/* Payment Received Toggle */}
          <div className="mb-6 flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            <label className="text-sm font-medium text-text-main">
              Ödeme Alındı mı?
            </label>
            <button
              type="button"
              onClick={() => !isReadOnly && setFormData(prev => ({ ...prev, paymentReceived: !prev.paymentReceived }))}
              disabled={isReadOnly}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.paymentReceived ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
              } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.paymentReceived ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
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
                Araç tipini değiştirdiğinizde <strong>{VEHICLE_TYPES.find(t => t.value === formData.vehicleType)?.displayName}</strong> için girilen tüm bilgiler silinecektir.
              </p>
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
