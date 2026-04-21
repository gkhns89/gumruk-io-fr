import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { companyService } from '../../api/companyService';
import MainLayout from '../../components/layout/MainLayout';
import AddClientModal from '../../components/common/AddClientModal';
import ViewClientModal from '../../components/common/ViewClientModal';
import EditAgreementModal from '../../components/common/EditAgreementModal';
import CreateAgreementModal from '../../components/common/CreateAgreementModal';
import { handleError, handleApiResponse } from '../../utils/errorUtils';

const ClientsPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';

  // SUPER_ADMIN: broker seçim state'leri
  const [brokers, setBrokers] = useState([]);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [brokersError, setBrokersError] = useState('');
  const [selectedBroker, setSelectedBroker] = useState(null);

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditAgreementModal, setShowEditAgreementModal] = useState(false);
  const [showCreateAgreementModal, setShowCreateAgreementModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedAgreement, setSelectedAgreement] = useState(null);

  const brokerCompanyId = isSuperAdmin ? selectedBroker?.id : user?.company?.id;

  // SUPER_ADMIN: broker listesini yükle
  useEffect(() => {
    if (!isSuperAdmin) return;
    setBrokersLoading(true);
    setBrokersError('');
    companyService.getAllBrokerCompanies()
      .then(result => {
        if (result.success) {
          setBrokers(result.data);
        } else {
          setBrokersError(result.error || 'Gümrük firmaları yüklenemedi');
        }
      })
      .catch(() => setBrokersError('Gümrük firmaları yüklenirken bir hata oluştu'))
      .finally(() => setBrokersLoading(false));
  }, [isSuperAdmin]);

  const loadClients = useCallback(async () => {
    if (!brokerCompanyId) {
      setClients([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await companyService.getClientCompanies(brokerCompanyId);
      handleApiResponse(result, () => setClients(result.data), setError, 'Müşteri firmaları yükleme');
    } catch (err) {
      handleError(err, setError, 'Müşteri firmaları yükleme', 'Müşteri firmaları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [brokerCompanyId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleClientCreated = () => {
    loadClients();
  };

  const filteredClients = clients.filter(client =>
    !searchTerm ||
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAgreementStatusBadge = (agreementStatus) => {
    const badges = {
      ACTIVE: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        border: 'border-green-300 dark:border-green-700',
        label: 'Aktif Vekalet'
      },
      PENDING: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        border: 'border-yellow-300 dark:border-yellow-700',
        label: 'Onay Bekliyor'
      },
      INACTIVE: {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-300',
        border: 'border-gray-300 dark:border-gray-600',
        label: 'Pasif Vekalet'
      }
    };
    return badges[agreementStatus] || {
      bg: 'bg-gray-50 dark:bg-gray-800',
      text: 'text-gray-500 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-600',
      label: 'Vekalet Yok'
    };
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary">
                  corporate_fare
                </span>
                Müşteri Firmaları
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {isSuperAdmin
                  ? selectedBroker
                    ? `${selectedBroker.name} — müşteri firmaları`
                    : 'Müşterilerini görüntülemek için bir gümrük firması seçin'
                  : 'Gümrük işlemlerini takip ettiğiniz müşteri firmalarınızı yönetin'}
              </p>
            </div>

            {(!isSuperAdmin || selectedBroker) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md"
              >
                <span className="material-symbols-outlined">add</span>
                Yeni Müşteri Ekle
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-6">

            {/* SUPER_ADMIN: Broker Seçimi */}
            {isSuperAdmin && (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-4 transition-colors">
                <label htmlFor="broker-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gümrük Firması Seçin
                </label>
                {brokersLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm">Yükleniyor...</span>
                  </div>
                ) : brokersError ? (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 py-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span className="text-sm">{brokersError}</span>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      business
                    </span>
                    <select
                      id="broker-select"
                      value={selectedBroker?.id ?? ''}
                      onChange={(e) => {
                        const broker = brokers.find(b => b.id === Number(e.target.value));
                        setSelectedBroker(broker || null);
                        setSearchTerm('');
                        setClients([]);
                      }}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">— Firma seçin —</option>
                      {brokers.map(broker => (
                        <option key={broker.id} value={broker.id}>
                          {broker.name}{broker.shortName ? ` (${broker.shortName})` : ''}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* SUPER_ADMIN seçim yapılmadıysa placeholder */}
            {isSuperAdmin && !selectedBroker && !brokersLoading && (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center transition-colors">
                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">
                  business
                </span>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Gümrük Firması Seçin
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Müşteri firmalarını görüntülemek için yukarıdan bir gümrük firması seçin
                </p>
              </div>
            )}

            {/* Seçim yapıldıysa veya broker kullanıcısıysa içerik */}
            {(!isSuperAdmin || selectedBroker) && (
              <>
                {/* Search */}
                <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-4 transition-colors">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Müşteri Ara
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Firma adı veya kısa adı ile ara..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors"
                    />
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center transition-colors">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {error && !loading && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
                      <p className="text-red-800 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredClients.length === 0 && (
                  <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center transition-colors">
                    <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">
                      corporate_fare
                    </span>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      {searchTerm
                        ? 'Arama kriterine uygun müşteri bulunamadı'
                        : 'Henüz müşteri firmanız bulunmuyor'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {searchTerm
                        ? 'Farklı anahtar kelimeler deneyerek arama yapabilirsiniz'
                        : 'Yeni müşteri eklemek için "Yeni Müşteri Ekle" butonuna tıklayın'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <span className="material-symbols-outlined">add</span>
                        Yeni Müşteri Ekle
                      </button>
                    )}
                  </div>
                )}

                {/* Clients Grid */}
                {!loading && !error && filteredClients.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => {
                      const agreementBadge = getAgreementStatusBadge(client.agreementStatus);
                      const hasAgreement = client.agreementId != null;

                      return (
                        <div
                          key={client.id}
                          className="bg-white dark:bg-background-dark rounded-xl shadow-sm hover:shadow-md transition-all p-6"
                        >
                          {/* Client Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-12 w-12 bg-primary/10 dark:bg-primary/20 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-primary text-2xl">
                                  corporate_fare
                                </span>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                  {client.name}
                                </h3>
                                {client.shortName && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{client.shortName}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Agreement Status */}
                          <div className="mb-4">
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${agreementBadge.bg} ${agreementBadge.text} ${agreementBadge.border}`}>
                              <span className="material-symbols-outlined text-sm">
                                {hasAgreement ? 'verified' : 'cancel'}
                              </span>
                              {agreementBadge.label}
                            </span>
                          </div>

                          {/* Description */}
                          {client.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                              {client.description}
                            </p>
                          )}

                          {/* Agreement Dates */}
                          {hasAgreement && client.agreementStartDate && (
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4 transition-colors">
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400 mb-1">Başlangıç</p>
                                  <p className="text-gray-800 dark:text-gray-200 font-semibold">
                                    {new Date(client.agreementStartDate).toLocaleDateString('tr-TR')}
                                  </p>
                                </div>
                                {client.agreementEndDate && (
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400 mb-1">Bitiş</p>
                                    <p className="text-gray-800 dark:text-gray-200 font-semibold">
                                      {new Date(client.agreementEndDate).toLocaleDateString('tr-TR')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 transition-colors">
                            <button
                              onClick={() => {
                                setSelectedClient(client);
                                setShowViewModal(true);
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 dark:bg-primary/20 rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                              title="Detayları Görüntüle"
                            >
                              <span className="material-symbols-outlined text-lg">visibility</span>
                              Detay
                            </button>
                            {!hasAgreement && (
                              <button
                                onClick={() => {
                                  setSelectedClient(client);
                                  setShowCreateAgreementModal(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                title="Vekalet Ekle"
                              >
                                <span className="material-symbols-outlined text-lg">add_circle</span>
                                Vekalet
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* Add Client Modal */}
        <AddClientModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleClientCreated}
          brokerCompanyId={brokerCompanyId}
        />

        {/* View Client Modal */}
        <ViewClientModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedClient(null);
          }}
          client={selectedClient}
          currentUser={user}
          onSuccess={() => {
            loadClients();
            setShowViewModal(false);
            setSelectedClient(null);
          }}
          onEditAgreement={(client, agreement) => {
            setShowViewModal(false);
            if (agreement) {
              setSelectedAgreement(agreement);
              setShowEditAgreementModal(true);
            } else {
              setShowCreateAgreementModal(true);
            }
          }}
        />

        {/* Edit Agreement Modal */}
        <EditAgreementModal
          isOpen={showEditAgreementModal}
          onClose={() => {
            setShowEditAgreementModal(false);
            setSelectedAgreement(null);
          }}
          agreement={selectedAgreement}
          clientInfo={selectedClient}
          onSuccess={() => {
            loadClients();
            setShowEditAgreementModal(false);
            setSelectedAgreement(null);
          }}
        />

        {/* Create Agreement Modal */}
        <CreateAgreementModal
          isOpen={showCreateAgreementModal}
          onClose={() => {
            setShowCreateAgreementModal(false);
            setSelectedClient(null);
          }}
          brokerCompanyId={brokerCompanyId}
          clientCompanyId={selectedClient?.id}
          clientCompanyName={selectedClient?.name}
          onSuccess={() => {
            loadClients();
            setShowCreateAgreementModal(false);
            setSelectedClient(null);
          }}
        />
      </div>
    </MainLayout>
  );
};

export default ClientsPage;
