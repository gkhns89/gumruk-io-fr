import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { companyService } from '../../api/companyService';
import { sectorService } from '../../api/sectorService';
import MainLayout from '../../components/layout/MainLayout';
import AddClientModal from '../../components/common/AddClientModal';
import ClientAccountModal from '../../components/common/ClientAccountModal';
import ViewClientModal from '../../components/common/ViewClientModal';
import EditAgreementModal from '../../components/common/EditAgreementModal';
import CreateAgreementModal from '../../components/common/CreateAgreementModal';
import ImageUploadField from '../../components/common/ImageUploadField';
import Pagination from '../../components/common/Pagination';
import { handleError, handleApiResponse } from '../../utils/errorUtils';

const PAGE_SIZE = 10;

const ClientsPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';
  // Giriş hesabı açmak backend'de de yalnızca bu iki role açık
  const canManageAccounts = isSuperAdmin || user?.globalRole === 'BROKER_ADMIN';

  // SUPER_ADMIN: broker seçim state'leri
  const [brokers, setBrokers] = useState([]);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [brokersError, setBrokersError] = useState('');
  const [selectedBroker, setSelectedBroker] = useState(null);

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [sectors, setSectors] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditAgreementModal, setShowEditAgreementModal] = useState(false);
  const [showCreateAgreementModal, setShowCreateAgreementModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [logoBust, setLogoBust] = useState(0);
  const [page, setPage] = useState(1);

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

  // Sektör filtresi seçenekleri — katalog listeden bağımsız, tam liste gelsin
  useEffect(() => {
    sectorService.getSectors().then(result => {
      if (result.success) setSectors(result.data);
    });
  }, []);

  const handleClientCreated = () => {
    loadClients();
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm ||
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.shortName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSector = !sectorFilter ||
      client.sectors?.some(sector => String(sector.id) === sectorFilter);

    return matchesSearch && matchesSector;
  });

  // Arama/filtre/firma değişince ilk sayfaya dön
  useEffect(() => { setPage(1); }, [searchTerm, sectorFilter, brokerCompanyId]);

  const pagedClients = filteredClients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
                {/* Search + sektör filtresi */}
                <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-4 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
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

                    <div>
                      <label htmlFor="sector-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sektör
                      </label>
                      <select
                        id="sector-filter"
                        value={sectorFilter}
                        onChange={(e) => setSectorFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors cursor-pointer"
                      >
                        <option value="">Tüm sektörler</option>
                        {sectors.map(sector => (
                          <option key={sector.id} value={String(sector.id)}>
                            {sector.name}
                          </option>
                        ))}
                      </select>
                    </div>
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
                      {searchTerm || sectorFilter
                        ? 'Arama kriterine uygun müşteri bulunamadı'
                        : 'Henüz müşteri firmanız bulunmuyor'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {searchTerm || sectorFilter
                        ? 'Farklı anahtar kelimeler veya sektör seçerek arama yapabilirsiniz'
                        : 'Yeni müşteri eklemek için "Yeni Müşteri Ekle" butonuna tıklayın'}
                    </p>
                    {!searchTerm && !sectorFilter && (
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

                {/* Clients Table */}
                {!loading && !error && filteredClients.length > 0 && (
                  <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-main uppercase tracking-wider">Müşteri Firma</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Vekalet Durumu</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Giriş Hesabı</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Başlangıç</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Bitiş</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-background-dark divide-y divide-gray-200 dark:divide-gray-700">
                          {pagedClients.map((client) => {
                            const agreementBadge = getAgreementStatusBadge(client.agreementStatus);
                            const hasAgreement = client.agreementId != null;
                            const needsDocument = (client.agreementStatus === 'ACTIVE' || client.agreementStatus === 'PENDING')
                              && client.documentExists === false;

                            return (
                              <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <ImageUploadField
                                      compact
                                      shape="circle"
                                      size={40}
                                      currentUrl={client.logoUrl}
                                      bustKey={`client-${client.id}-${logoBust}`}
                                      uploadFn={(file) => companyService.uploadCompanyLogo(client.id, file)}
                                      onUploaded={() => { setLogoBust((n) => n + 1); loadClients(); }}
                                      fallback={
                                        <div className="flex items-center justify-center h-full w-full bg-primary/10 dark:bg-primary/20">
                                          <span className="material-symbols-outlined text-primary text-xl">corporate_fare</span>
                                        </div>
                                      }
                                    />
                                    <div className="min-w-0 max-w-[40ch]">
                                      <div className="text-sm font-medium text-text-main truncate" title={client.name}>
                                        {client.name}
                                      </div>
                                      {client.shortName && (
                                        <div className="text-sm text-text-secondary truncate" title={client.shortName}>
                                          {client.shortName}
                                        </div>
                                      )}
                                      {client.sectors?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {client.sectors.map(sector => (
                                            <span
                                              key={sector.id}
                                              className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full bg-primary/10 dark:bg-primary/20 text-primary"
                                            >
                                              {sector.name}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${agreementBadge.bg} ${agreementBadge.text} ${agreementBadge.border}`}>
                                      <span className="material-symbols-outlined text-sm">{hasAgreement ? 'verified' : 'cancel'}</span>
                                      {agreementBadge.label}
                                    </span>
                                    {needsDocument && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                                        title="Vekalet dosyası sunucuda bulunamadı — belgenin yeniden yüklenmesi gerekiyor"
                                      >
                                        <span className="material-symbols-outlined text-sm">error</span>
                                        Belge eksik
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {client.account ? (
                                    <div className="min-w-0 max-w-[28ch]">
                                      <div className="text-sm text-text-main truncate" title={client.account.email}>
                                        {client.account.email}
                                      </div>
                                      {!client.account.isActive && (
                                        <span className="inline-flex mt-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                          Pasif
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
                                      <span className="material-symbols-outlined text-base">person_off</span>
                                      Hesap yok
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                  {client.agreementStartDate ? new Date(client.agreementStartDate).toLocaleDateString('tr-TR') : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                  {client.agreementEndDate ? new Date(client.agreementEndDate).toLocaleDateString('tr-TR') : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => { setSelectedClient(client); setShowViewModal(true); }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-primary bg-primary/10 dark:bg-primary/20 rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                                      title="Detayları Görüntüle"
                                    >
                                      <span className="material-symbols-outlined text-lg">visibility</span>
                                      Detay
                                    </button>
                                    {canManageAccounts && (
                                      <button
                                        onClick={() => { setSelectedClient(client); setShowAccountModal(true); }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                        title={client.account ? 'Giriş hesabını düzenle' : 'Giriş hesabı oluştur'}
                                      >
                                        <span className="material-symbols-outlined text-lg">
                                          {client.account ? 'manage_accounts' : 'person_add'}
                                        </span>
                                        {client.account ? 'Hesap' : 'Hesap Aç'}
                                      </button>
                                    )}
                                    {!hasAgreement && (
                                      <button
                                        onClick={() => { setSelectedClient(client); setShowCreateAgreementModal(true); }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                        title="Vekalet Ekle"
                                      >
                                        <span className="material-symbols-outlined text-lg">add_circle</span>
                                        Vekalet
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      currentPage={page}
                      pageSize={PAGE_SIZE}
                      totalItems={filteredClients.length}
                      onPageChange={setPage}
                    />
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

        {/* Client Login Account Modal */}
        <ClientAccountModal
          isOpen={showAccountModal}
          onClose={() => {
            setShowAccountModal(false);
            setSelectedClient(null);
          }}
          client={selectedClient}
          onSuccess={loadClients}
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
