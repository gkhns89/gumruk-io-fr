import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePaymentRestriction } from '../../context/PaymentRestrictionProvider';
import { agencyAgreementService } from '../../api/agencyAgreementService';
import { companyService } from '../../api/companyService';
import CreateAgreementModal from '../../components/common/CreateAgreementModal';
import EditAgreementModal from '../../components/common/EditAgreementModal';
import MainLayout from '../../components/layout/MainLayout';
import Pagination from '../../components/common/Pagination';
import { handleError, handleApiResponse } from '../../utils/errorUtils';
import { showSuccess, showError } from '../../utils/toastUtils';

const PAGE_SIZE = 10;

const AgreementsPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';
  const { isWriteBlocked, isFullReadOnly } = usePaymentRestriction();
  const isAddBlocked = !isSuperAdmin && (isWriteBlocked || isFullReadOnly);

  // SUPER_ADMIN: broker seçim state'leri
  const [brokers, setBrokers] = useState([]);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [brokersError, setBrokersError] = useState('');
  const [selectedBroker, setSelectedBroker] = useState(null);

  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedAgreement, setSelectedAgreement] = useState(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [scanning, setScanning] = useState(false);
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

  const loadAgreements = useCallback(async () => {
    if (!brokerCompanyId) {
      setAgreements([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await agencyAgreementService.getBrokerAgreements(brokerCompanyId);
      handleApiResponse(result, () => setAgreements(result.data), setError, 'Anlaşmalar yükleme');
      if (!result.success) setAgreements([]);
    } catch (err) {
      handleError(err, setError, 'Anlaşmalar yükleme', 'Anlaşmalar yüklenirken bir hata oluştu');
      setAgreements([]);
    } finally {
      setLoading(false);
    }
  }, [brokerCompanyId]);

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  // Kayıp belge taraması (SUPER_ADMIN): dosyası diskte olmayan vekalet yollarını temizler
  const handleReconcile = async () => {
    setScanning(true);
    const result = await agencyAgreementService.reconcileDocuments();
    setScanning(false);
    if (result.success) {
      if (result.clearedCount > 0) {
        showSuccess(`${result.clearedCount} vekaletin kayıp belge kaydı temizlendi. İlgili firmalar belgeyi yeniden yükleyebilir.`);
      } else {
        showSuccess('Tüm vekalet belgeleri yerinde — temizlenecek kayıt bulunamadı.');
      }
      loadAgreements();
    } else {
      showError(result.error || 'Belge taraması yapılamadı');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      ACTIVE: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', border: 'border-green-300 dark:border-green-700', label: 'Aktif' },
      PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700', label: 'Onay Bekliyor' },
      INACTIVE: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', label: 'Pasif' },
      SUSPENDED: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', label: 'Askıda' },
      TERMINATED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', border: 'border-red-300 dark:border-red-700', label: 'Sonlandırıldı' }
    };
    return badges[status] || badges.INACTIVE;
  };

  const filteredAgreements = agreements.filter(agreement => {
    const matchesStatus = statusFilter === 'ALL' || agreement.status === statusFilter;
    const matchesSearch = !searchTerm ||
      agreement.clientCompany?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filtre/arama/firma değişince ilk sayfaya dön
  useEffect(() => { setPage(1); }, [statusFilter, searchTerm, brokerCompanyId]);

  const pagedAgreements = filteredAgreements.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary">verified</span>
                Vekalet Yönetimi
              </h1>
              <p className="text-text-secondary mt-2">
                {isSuperAdmin
                  ? selectedBroker
                    ? `${selectedBroker.name} — vekalet anlaşmaları`
                    : 'Vekalet anlaşmalarını görüntülemek için bir gümrük firması seçin'
                  : 'Müşteri firmalarınızla olan vekalet anlaşmalarınızı yönetin'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isSuperAdmin && (
                <button
                  onClick={handleReconcile}
                  disabled={scanning}
                  className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Tüm vekaletleri tarar; dosyası sunucuda bulunamayan kayıtların belge yolunu temizler"
                >
                  <span className={`material-symbols-outlined ${scanning ? 'animate-spin' : ''}`}>
                    {scanning ? 'progress_activity' : 'fact_check'}
                  </span>
                  {scanning ? 'Taranıyor...' : 'Eksik Belgeleri Tara'}
                </button>
              )}
              {(!isSuperAdmin || selectedBroker) && (
                <button
                  onClick={() => !isAddBlocked && setShowCreateModal(true)}
                  disabled={isAddBlocked}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isAddBlocked ? 'Ödeme gecikmesi nedeniyle yeni kayıt eklenemiyor' : 'Yeni vekalet ekle'}
                >
                  <span className="material-symbols-outlined">{isAddBlocked ? 'lock' : 'add'}</span>
                  Yeni Vekalet Ekle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-6">

            {/* SUPER_ADMIN: Broker Seçimi */}
            {isSuperAdmin && (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors">
                <label htmlFor="broker-select" className="block text-sm font-medium text-text-main mb-2">
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
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">business</span>
                    <select
                      id="broker-select"
                      value={selectedBroker?.id ?? ''}
                      onChange={(e) => {
                        const broker = brokers.find(b => b.id === Number(e.target.value));
                        setSelectedBroker(broker || null);
                        setAgreements([]);
                        setSearchTerm('');
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
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                  </div>
                )}
              </div>
            )}

            {/* SUPER_ADMIN seçim yapılmadıysa placeholder */}
            {isSuperAdmin && !selectedBroker && !brokersLoading && (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700 transition-colors">
                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">business</span>
                <h3 className="text-xl font-semibold text-text-main mb-2">Gümrük Firması Seçin</h3>
                <p className="text-text-secondary">
                  Vekalet anlaşmalarını görüntülemek için yukarıdan bir gümrük firması seçin
                </p>
              </div>
            )}

            {/* Seçim yapıldıysa veya broker kullanıcısıysa içerik */}
            {(!isSuperAdmin || selectedBroker) && (
              <>
                {/* Filters */}
                <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-main mb-2">Durum Filtresi</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors"
                      >
                        <option value="ALL">Tümü</option>
                        <option value="ACTIVE">Aktif</option>
                        <option value="PENDING">Onay Bekliyor</option>
                        <option value="INACTIVE">Pasif</option>
                        <option value="SUSPENDED">Askıda</option>
                        <option value="TERMINATED">Sonlandırıldı</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-main mb-2">Müşteri Ara</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">search</span>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Müşteri adı ile ara..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="text-text-secondary">Yükleniyor...</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {error && !loading && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
                      <p className="text-red-800 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredAgreements.length === 0 && (
                  <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700 transition-colors">
                    <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-500 mb-4 block">verified</span>
                    <h3 className="text-xl font-semibold text-text-main mb-2">
                      {searchTerm || statusFilter !== 'ALL'
                        ? 'Filtre kriterlerine uygun anlaşma bulunamadı'
                        : 'Henüz vekalet anlaşması bulunmuyor'}
                    </h3>
                    <p className="text-text-secondary mb-6">
                      {searchTerm || statusFilter !== 'ALL'
                        ? 'Farklı filtreler deneyerek arama yapabilirsiniz'
                        : 'Müşterileriniz ile vekalet anlaşması oluşturmak için "Yeni Vekalet Ekle" butonuna tıklayın'}
                    </p>
                    {!searchTerm && statusFilter === 'ALL' && !isAddBlocked && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <span className="material-symbols-outlined">add</span>
                        Yeni Vekalet Ekle
                      </button>
                    )}
                  </div>
                )}

                {/* Agreements Table */}
                {!loading && !error && filteredAgreements.length > 0 && (
                  <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-main uppercase tracking-wider">Müşteri Firma</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Durum</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Başlangıç</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Bitiş</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Kalan Süre</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-background-dark divide-y divide-gray-200 dark:divide-gray-700">
                          {pagedAgreements.map((agreement) => {
                            const badge = getStatusBadge(agreement.status);
                            const needsDocument = (agreement.status === 'ACTIVE' || agreement.status === 'PENDING')
                              && agreement.documentExists === false;
                            let remainingDays = null;
                            if (agreement.status === 'ACTIVE' && agreement.endDate) {
                              const today = new Date();
                              const endDate = new Date(agreement.endDate);
                              remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                            }
                            return (
                              <tr key={agreement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span className="material-symbols-outlined text-primary mr-3 flex-shrink-0">corporate_fare</span>
                                    <div className="min-w-0 max-w-[40ch]">
                                      <div className="text-sm font-medium text-text-main truncate" title={agreement.clientCompany?.name}>
                                        {agreement.clientCompany?.name}
                                      </div>
                                      {agreement.clientCompany?.shortName && (
                                        <div className="text-sm text-text-secondary truncate" title={agreement.clientCompany.shortName}>
                                          {agreement.clientCompany.shortName}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                                      {badge.label}
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                  {agreement.startDate ? new Date(agreement.startDate).toLocaleDateString('tr-TR') : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                  {agreement.endDate ? new Date(agreement.endDate).toLocaleDateString('tr-TR') : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {remainingDays !== null ? (
                                    <span className={`text-sm font-semibold ${remainingDays < 30 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                      {remainingDays} gün{remainingDays < 30 && ' ⚠️'}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-text-secondary">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => { setSelectedAgreement(agreement); setShowEditModal(true); }}
                                    className="text-primary hover:text-primary/80 transition-colors"
                                    title="Vekaleti Düzenle"
                                  >
                                    <span className="material-symbols-outlined">edit</span>
                                  </button>
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
                      totalItems={filteredAgreements.length}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* Create Agreement Modal */}
        {showCreateModal && (
          <CreateAgreementModal
            isOpen={showCreateModal}
            onClose={() => { setShowCreateModal(false); setSelectedClient(null); }}
            brokerCompanyId={brokerCompanyId}
            clientCompanyId={selectedClient?.id}
            clientCompanyName={selectedClient?.name}
            showClientSelector={true}
            onSuccess={() => { setShowCreateModal(false); setSelectedClient(null); loadAgreements(); }}
          />
        )}

        {/* Edit Agreement Modal */}
        {showEditModal && selectedAgreement && (
          <EditAgreementModal
            isOpen={showEditModal}
            onClose={() => { setShowEditModal(false); setSelectedAgreement(null); }}
            agreement={{
              agreementId: selectedAgreement.id,
              agreementStatus: selectedAgreement.status,
              agreementStartDate: selectedAgreement.startDate,
              agreementEndDate: selectedAgreement.endDate,
              documentPath: selectedAgreement.documentPath,
              notes: selectedAgreement.notes
            }}
            clientInfo={{ name: selectedAgreement.clientCompany?.name }}
            onSuccess={() => { setShowEditModal(false); setSelectedAgreement(null); loadAgreements(); }}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default AgreementsPage;
