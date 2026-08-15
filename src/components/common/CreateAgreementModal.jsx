import React, { useState, useEffect } from 'react';
import { agencyAgreementService } from '../../api/agencyAgreementService';
import { companyService } from '../../api/companyService';
import { configService } from '../../api/configService';
import { handleError, handleApiResponse, logError } from '../../utils/errorUtils';
import { showSuccess, showError } from '../../utils/toastUtils';

const CreateAgreementModal = ({
  isOpen,
  onClose,
  brokerCompanyId,
  clientCompanyId,
  clientCompanyName,
  onSuccess,
  showClientSelector = false // Yeni prop: AgreementsPage'den çağrılınca true
}) => {
  // Mode: 'wizard' veya 'quick'
  const [mode, setMode] = useState(null);

  // Wizard mode için step (1: Tarihler, 2: Belge Yükle, 3: Aktifleştir)
  const [wizardStep, setWizardStep] = useState(1);
  const [createdAgreementId, setCreatedAgreementId] = useState(null);

  // Firma seçimi için state (showClientSelector true ise)
  const [availableClients, setAvailableClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(clientCompanyId || null);
  const [selectedClientName, setSelectedClientName] = useState(clientCompanyName || '');
  const [loadingClients, setLoadingClients] = useState(false);

  // Dosya yükleme konfigürasyonu
  const [uploadConfig, setUploadConfig] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    notes: '',
    document: null
  });

  const [loading, setLoading] = useState(false);

  // Firma listesini yükle (sadece showClientSelector true ise)
  useEffect(() => {
    if (showClientSelector && isOpen && brokerCompanyId) {
      loadAvailableClients();
    }
  }, [showClientSelector, isOpen, brokerCompanyId]);

  // Dosya yükleme konfigürasyonunu yükle
  useEffect(() => {
    if (isOpen) {
      loadUploadConfig();
    }
  }, [isOpen]);

  const loadAvailableClients = async () => {
    setLoadingClients(true);
    try {
      const result = await companyService.getClientCompanies(brokerCompanyId);
      if (result.success) {
        // Sadece aktif vekaleti OLMAYAN firmaları göster
        const clientsWithoutAgreement = result.data.filter(
          client => !client.agreementId || client.agreementStatus !== 'ACTIVE'
        );
        setAvailableClients(clientsWithoutAgreement);
      }
    } catch (err) {
      logError('Müşteri firmaları yükleme', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadUploadConfig = async () => {
    const result = await configService.getFileUploadConfig();
    setUploadConfig(result.data);
  };

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setFormData(prev => ({ ...prev, document: null }));
      return;
    }

    // Dosya validasyonu (uploadConfig yüklenmişse)
    if (uploadConfig) {
      const validation = configService.validateFile(file, uploadConfig);
      if (!validation.valid) {
        showError(validation.error);
        e.target.value = ''; // Input'u temizle
        return;
      }
    }

    setFormData(prev => ({ ...prev, document: file }));
  };

  // Dosya yükleme kısıtlamalarını göster
  const renderUploadConstraints = () => {
    if (!uploadConfig) return null;

    return (
      <p className="mt-2 text-xs text-text-secondary">
        Maksimum dosya boyutu: <strong>{uploadConfig.maxFileSizeMB} MB</strong> |
        İzin verilen formatlar: <strong>{uploadConfig.allowedFormats}</strong>
      </p>
    );
  };

  // Mode seçimi ekranı
  if (!mode) {
    const canProceed = !showClientSelector || selectedClientId;

    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-2xl w-full p-8 transition-colors duration-300" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-main">
              Vekalet Anlaşması Oluştur
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>

          {/* Firma Seçici (sadece showClientSelector true ise) */}
          {showClientSelector && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-main mb-2">
                Müşteri Firma Seçin *
              </label>
              {loadingClients ? (
                <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg text-center transition-colors">
                  <p className="text-sm text-text-secondary">Firmalar yükleniyor...</p>
                </div>
              ) : availableClients.length === 0 ? (
                <div className="p-4 border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg transition-colors">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    Aktif vekaleti olmayan müşteri firmanız bulunmuyor.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedClientId || ''}
                  onChange={(e) => {
                    const clientId = parseInt(e.target.value);
                    setSelectedClientId(clientId);
                    const client = availableClients.find(c => c.id === clientId);
                    setSelectedClientName(client?.name || '');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">-- Firma Seçiniz --</option>
                  {availableClients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.shortName && `(${client.shortName})`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <p className="text-text-secondary mb-6">
            {showClientSelector ? (
              selectedClientName ? (
                <>
                  <strong>{selectedClientName}</strong> için vekalet anlaşması oluşturma yöntemini seçin:
                </>
              ) : (
                'Vekalet anlaşması oluşturma yöntemini seçin:'
              )
            ) : (
              <>
                <strong>{selectedClientName || clientCompanyName}</strong> için vekalet anlaşması oluşturma yöntemini seçin:
              </>
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hızlı Oluştur */}
            <button
              onClick={() => {
                if (!canProceed) {
                  showError('Lütfen önce bir müşteri firma seçin');
                  return;
                }
                setMode('quick');
              }}
              disabled={!canProceed}
              className={`p-6 border-2 rounded-xl transition-all text-left group ${
                canProceed
                  ? 'border-blue-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60'
              }`}
            >
              <span className={`material-symbols-outlined text-4xl mb-3 transition-transform ${
                canProceed ? 'text-blue-600 group-hover:scale-110' : 'text-gray-400'
              }`}>
                bolt
              </span>
              <h3 className={`text-lg font-bold mb-2 ${canProceed ? 'text-text-main' : 'text-text-secondary'}`}>
                Hızlı Oluştur
              </h3>
              <p className={`text-sm ${canProceed ? 'text-text-secondary' : 'text-gray-400 dark:text-gray-500'}`}>
                Tek adımda tüm bilgileri girin ve anlaşmayı hemen aktifleştirin.
              </p>
            </button>

            {/* Adım Adım */}
            <button
              onClick={() => {
                if (!canProceed) {
                  showError('Lütfen önce bir müşteri firma seçin');
                  return;
                }
                setMode('wizard');
              }}
              disabled={!canProceed}
              className={`p-6 border-2 rounded-xl transition-all text-left group ${
                canProceed
                  ? 'border-green-200 hover:border-green-500 hover:bg-green-50 cursor-pointer'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60'
              }`}
            >
              <span className={`material-symbols-outlined text-4xl mb-3 transition-transform ${
                canProceed ? 'text-green-600 group-hover:scale-110' : 'text-gray-400'
              }`}>
                checklist
              </span>
              <h3 className={`text-lg font-bold mb-2 ${canProceed ? 'text-text-main' : 'text-text-secondary'}`}>
                Adım Adım
              </h3>
              <p className={`text-sm ${canProceed ? 'text-text-secondary' : 'text-gray-400 dark:text-gray-500'}`}>
                Anlaşmayı oluşturun, belge yükleyin, sonra aktifleştirin.
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Hızlı Oluşturma Modu
  if (mode === 'quick') {
    const handleQuickCreate = async (e) => {
      e.preventDefault();

      if (!formData.document) {
        showError('Vekalet belgesi seçmelisiniz');
        return;
      }

      if (!formData.startDate || !formData.endDate) {
        showError('Başlangıç ve bitiş tarihleri zorunludur');
        return;
      }

      setLoading(true);

      try {
        const formDataToSend = new FormData();
        formDataToSend.append('document', formData.document);
        formDataToSend.append('brokerCompanyId', brokerCompanyId);
        formDataToSend.append('clientCompanyId', showClientSelector ? selectedClientId : clientCompanyId);
        formDataToSend.append('startDate', formData.startDate);
        formDataToSend.append('endDate', formData.endDate);
        if (formData.notes) {
          formDataToSend.append('notes', formData.notes);
        }

        const result = await agencyAgreementService.createAndActivateAgreement(formDataToSend);

        if (result.success) {
          showSuccess(result.message || 'Vekalet başarıyla oluşturuldu!');
          onSuccess();
          onClose();
        } else {
          handleApiResponse(result, null, null, 'Vekaletname oluşturma (quick mode)');
        }
      } catch (err) {
        handleError(err, null, 'Vekaletname oluşturma (quick mode)', 'Beklenmeyen bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between transition-colors duration-300">
            <div>
              <h2 className="text-2xl font-bold text-text-main">
                Hızlı Vekalet Oluştur
              </h2>
              <p className="text-sm text-text-secondary mt-1">{showClientSelector ? selectedClientName : clientCompanyName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>

          <form onSubmit={handleQuickCreate} className="p-6">
            <div className="space-y-4">
              {/* Başlangıç Tarihi */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Başlangıç Tarihi *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Bitiş Tarihi */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Bitiş Tarihi *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Vekalet Belgesi */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Vekalet Belgesi *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {formData.document && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ {formData.document.name}
                  </p>
                )}
                {renderUploadConstraints()}
              </div>

              {/* Notlar */}
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Notlar (İsteğe Bağlı)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Anlaşma ile ilgili notlarınız..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Geri
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Oluşturuluyor...' : 'Oluştur ve Aktifleştir'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Wizard Modu - Step 1: Anlaşma Oluştur (INACTIVE)
  if (mode === 'wizard' && wizardStep === 1) {
    const handleCreateAgreement = async (e) => {
      e.preventDefault();

      setLoading(true);

      try {
        const result = await agencyAgreementService.createAgreement({
          brokerCompanyId,
          clientCompanyId: showClientSelector ? selectedClientId : clientCompanyId,
          notes: formData.notes || undefined
        });

        if (result.success) {
          setCreatedAgreementId(result.data.agreementId);
          setWizardStep(2);
        } else {
          handleApiResponse(result, null, null, 'Vekaletname oluşturma (step 1)');
        }
      } catch (err) {
        handleError(err, null, 'Vekaletname oluşturma (step 1)', 'Beklenmeyen bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-2xl w-full transition-colors duration-300" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-text-main">
                Adım 1/3: Anlaşma Bilgileri
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-2">
              <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            </div>
          </div>

          <form onSubmit={handleCreateAgreement} className="p-6">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg transition-colors">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Müşteri:</strong> {showClientSelector ? selectedClientName : clientCompanyName}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                İlk adımda anlaşma taslağı oluşturulacak (INACTIVE durumunda)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Notlar (İsteğe Bağlı)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Anlaşma ile ilgili notlarınız..."
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Geri
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Oluşturuluyor...' : 'Devam Et'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Wizard Modu - Step 2: Belge Yükle (INACTIVE → PENDING)
  if (mode === 'wizard' && wizardStep === 2) {
    const handleUploadDocument = async (e) => {
      e.preventDefault();

      if (!formData.document) {
        showError('Lütfen bir belge seçin');
        return;
      }

      setLoading(true);

      try {
        const result = await agencyAgreementService.uploadDocument(
          createdAgreementId,
          formData.document
        );

        if (result.success) {
          setWizardStep(3);
        } else {
          handleApiResponse(result, null, null, 'Vekaletname belgesi yükleme');
        }
      } catch (err) {
        handleError(err, null, 'Vekaletname belgesi yükleme', 'Beklenmeyen bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-2xl w-full transition-colors duration-300" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-text-main">
                Adım 2/3: Vekalet Belgesi Yükle
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-2">
              <div className="flex-1 h-2 bg-green-600 rounded-full"></div>
              <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            </div>
          </div>

          <form onSubmit={handleUploadDocument} className="p-6">
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg transition-colors">
              <p className="text-sm text-green-800 dark:text-green-300">
                ✓ Anlaşma oluşturuldu (INACTIVE)
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Agreement ID: {createdAgreementId}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Vekalet Belgesi *
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {formData.document && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  {formData.document.name}
                </p>
              )}
              {renderUploadConstraints()}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Geri
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Yükleniyor...' : 'Devam Et'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Wizard Modu - Step 3: Aktifleştir (PENDING → ACTIVE)
  if (mode === 'wizard' && wizardStep === 3) {
    const handleActivate = async (e) => {
      e.preventDefault();

      if (!formData.startDate || !formData.endDate) {
        showError('Başlangıç ve bitiş tarihleri zorunludur');
        return;
      }

      setLoading(true);

      try {
        const result = await agencyAgreementService.activateAgreement(
          createdAgreementId,
          {
            startDate: formData.startDate,
            endDate: formData.endDate,
            notes: formData.notes || undefined
          }
        );

        if (result.success) {
          showSuccess(result.message || 'Vekalet başarıyla aktifleştirildi!');
          onSuccess();
          onClose();
        } else {
          handleApiResponse(result, null, null, 'Vekaletname oluşturma (wizard complete)');
        }
      } catch (err) {
        handleError(err, null, 'Vekaletname oluşturma (wizard complete)', 'Beklenmeyen bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-background-dark rounded-2xl shadow-2xl max-w-2xl w-full transition-colors duration-300" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-text-main">
                Adım 3/3: Anlaşmayı Aktifleştir
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-2">
              <div className="flex-1 h-2 bg-green-600 rounded-full"></div>
              <div className="flex-1 h-2 bg-green-600 rounded-full"></div>
              <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            </div>
          </div>

          <form onSubmit={handleActivate} className="p-6">
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg transition-colors">
              <p className="text-sm text-green-800 dark:text-green-300">
                ✓ Vekalet belgesi yüklendi (PENDING)
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Son adım: Başlangıç ve bitiş tarihlerini belirleyin
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Başlangıç Tarihi *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Bitiş Tarihi *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-text-main rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Geri
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Aktifleştiriliyor...' : 'Aktifleştir ve Bitir'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return null;
};

export default CreateAgreementModal;
