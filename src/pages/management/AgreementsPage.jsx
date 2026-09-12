import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePaymentRestriction } from '../../hooks/usePaymentRestriction';
import { agencyAgreementService } from '../../api/agencyAgreementService';
import { companyService } from '../../api/companyService';
import CreateAgreementModal from '../../components/common/CreateAgreementModal';
import EditAgreementModal from '../../components/common/EditAgreementModal';
import MainLayout from '../../components/layout/MainLayout';
import Pagination from '../../components/common/Pagination';
import { handleError, handleApiResponse } from '../../utils/errorUtils';
import { showSuccess, showError } from '../../utils/toastUtils';
import { t, getCurrentLocale } from '../../locales';

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
          setBrokersError(result.error || t('management.brokersLoadError'));
        }
      })
      .catch(() => setBrokersError(t('management.brokersLoadErrorUnexpected')))
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
      handleError(err, setError, 'Anlaşmalar yükleme', t('agreements.page.loadError'));
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
        showSuccess(t('agreements.page.scanCleared', { count: result.clearedCount }));
      } else {
        showSuccess(t('agreements.page.scanNothing'));
      }
      loadAgreements();
    } else {
      showError(result.error || t('agreements.page.scanError'));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      ACTIVE: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', border: 'border-green-300 dark:border-green-700', label: t('agreements.status.ACTIVE') },
      PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700', label: t('agreements.status.PENDING') },
      INACTIVE: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', label: t('agreements.status.INACTIVE') },
      SUSPENDED: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', label: t('agreements.status.SUSPENDED') },
      TERMINATED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', border: 'border-red-300 dark:border-red-700', label: t('agreements.status.TERMINATED') }
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
                {t('nav.agreements')}
              </h1>
              <p className="text-text-secondary mt-2">
                {isSuperAdmin
                  ? selectedBroker
                    ? t('agreements.page.subtitleBroker', { name: selectedBroker.name })
                    : t('agreements.page.subtitleSelectBroker')
                  : t('agreements.page.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isSuperAdmin && (
                <button
                  onClick={handleReconcile}
                  disabled={scanning}
                  className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('agreements.page.scanHint')}
                >
                  <span className={`material-symbols-outlined ${scanning ? 'animate-spin' : ''}`}>
                    {scanning ? 'progress_activity' : 'fact_check'}
                  </span>
                  {scanning ? t('agreements.page.scanning') : t('agreements.page.scanMissing')}
                </button>
              )}
              {(!isSuperAdmin || selectedBroker) && (
                <button
                  onClick={() => !isAddBlocked && setShowCreateModal(true)}
                  disabled={isAddBlocked}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isAddBlocked ? t('payment.restrictionWarning') : t('agreements.page.addHint')}
                >
                  <span className="material-symbols-outlined">{isAddBlocked ? 'lock' : 'add'}</span>
                  {t('agreements.page.add')}
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
                  {t('management.selectBroker')}
                </label>
                {brokersLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm">{t('common.loading')}</span>
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
                      <option value="">{t('management.selectCompanyOption')}</option>
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
                <h3 className="text-xl font-semibold text-text-main mb-2">{t('management.selectBroker')}</h3>
                <p className="text-text-secondary">
                  {t('agreements.page.selectBrokerHint')}
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
                      <label className="block text-sm font-medium text-text-main mb-2">{t('management.statusFilter')}</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors"
                      >
                        <option value="ALL">{t('management.all')}</option>
                        <option value="ACTIVE">{t('agreements.status.ACTIVE')}</option>
                        <option value="PENDING">{t('agreements.status.PENDING')}</option>
                        <option value="INACTIVE">{t('agreements.status.INACTIVE')}</option>
                        <option value="SUSPENDED">{t('agreements.status.SUSPENDED')}</option>
                        <option value="TERMINATED">{t('agreements.status.TERMINATED')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-main mb-2">{t('management.clientSearch')}</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">search</span>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder={t('agreements.page.searchPlaceholder')}
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
                      <p className="text-text-secondary">{t('common.loading')}</p>
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
                        ? t('agreements.page.emptyFiltered')
                        : t('agreements.page.empty')}
                    </h3>
                    <p className="text-text-secondary mb-6">
                      {searchTerm || statusFilter !== 'ALL'
                        ? t('management.filterEmptyHint')
                        : t('agreements.page.emptyHint')}
                    </p>
                    {!searchTerm && statusFilter === 'ALL' && !isAddBlocked && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <span className="material-symbols-outlined">add</span>
                        {t('agreements.page.add')}
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-main uppercase tracking-wider">{t('management.clientCompany')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('management.status')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('agreements.common.start')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('agreements.common.end')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('agreements.common.remaining')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">{t('management.actions')}</th>
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
                                        title={t('agreements.common.documentMissingHint')}
                                      >
                                        <span className="material-symbols-outlined text-sm">error</span>
                                        {t('agreements.common.documentMissing')}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                  {agreement.startDate ? new Date(agreement.startDate).toLocaleDateString(getCurrentLocale()) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                  {agreement.endDate ? new Date(agreement.endDate).toLocaleDateString(getCurrentLocale()) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {remainingDays !== null ? (
                                    <span className={`text-sm font-semibold ${remainingDays < 30 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                      {t('agreements.common.daysLeft', { count: remainingDays })}{remainingDays < 30 && ' ⚠️'}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-text-secondary">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => { setSelectedAgreement(agreement); setShowEditModal(true); }}
                                    className="text-primary hover:text-primary/80 transition-colors"
                                    title={t('agreements.page.editHint')}
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
