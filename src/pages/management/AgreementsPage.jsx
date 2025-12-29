import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { agencyAgreementService } from '../../api/agencyAgreementService';
import CreateAgreementModal from '../../components/common/CreateAgreementModal';
import EditAgreementModal from '../../components/common/EditAgreementModal';
import MainLayout from '../../components/layout/MainLayout';

const AgreementsPage = () => {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedAgreement, setSelectedAgreement] = useState(null);

  // Filtreler
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAgreements();
  }, []);

  const loadAgreements = async () => {
    setLoading(true);
    setError('');

    try {
      if (!user?.company?.id) {
        setError('Kullanıcı firma bilgisi bulunamadı');
        setAgreements([]);
        return;
      }

      const result = await agencyAgreementService.getBrokerAgreements(user.company.id);

      if (result.success) {
        setAgreements(result.data);
      } else {
        setError(result.error);
        setAgreements([]);
      }
    } catch (err) {
      console.error('Anlaşmalar yüklenirken hata:', err);
      setError('Anlaşmalar yüklenirken bir hata oluştu');
      setAgreements([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      ACTIVE: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
        label: 'Aktif'
      },
      PENDING: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        label: 'Onay Bekliyor'
      },
      INACTIVE: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
        label: 'Pasif'
      },
      SUSPENDED: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
        label: 'Askıda'
      },
      TERMINATED: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        label: 'Sonlandırıldı'
      }
    };
    return badges[status] || badges.INACTIVE;
  };

  const filteredAgreements = agreements.filter(agreement => {
    const matchesStatus = statusFilter === 'ALL' || agreement.status === statusFilter;
    const matchesSearch = !searchTerm ||
      agreement.clientCompany?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary">
                  verified
                </span>
                Vekalet Yönetimi
              </h1>
              <p className="text-gray-600 mt-2">
                Müşteri firmalarınızla olan vekalet anlaşmalarınızı yönetin
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md"
            >
              <span className="material-symbols-outlined">add</span>
              Yeni Vekalet Ekle
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Durum Filtresi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durum Filtresi
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="ALL">Tümü</option>
                    <option value="ACTIVE">Aktif</option>
                    <option value="PENDING">Onay Bekliyor</option>
                    <option value="INACTIVE">Pasif</option>
                    <option value="SUSPENDED">Askıda</option>
                    <option value="TERMINATED">Sonlandırıldı</option>
                  </select>
                </div>

                {/* Arama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      placeholder="Müşteri adı ile ara..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-gray-600">Yükleniyor...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-600">error</span>
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredAgreements.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">
                  verified
                </span>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {searchTerm || statusFilter !== 'ALL'
                    ? 'Filtre kriterlerine uygun anlaşma bulunamadı'
                    : 'Henüz vekalet anlaşmanız bulunmuyor'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter !== 'ALL'
                    ? 'Farklı filtreler deneyerek arama yapabilirsiniz'
                    : 'Müşterileriniz ile vekalet anlaşması oluşturmak için "Yeni Vekalet Ekle" butonuna tıklayın'}
                </p>
                {!searchTerm && statusFilter === 'ALL' && (
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
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Müşteri Firma
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Başlangıç
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bitiş
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kalan Süre
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAgreements.map((agreement) => {
                        const badge = getStatusBadge(agreement.status);
                        let remainingDays = null;

                        if (agreement.status === 'ACTIVE' && agreement.endDate) {
                          const today = new Date();
                          const endDate = new Date(agreement.endDate);
                          remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                        }

                        return (
                          <tr key={agreement.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="material-symbols-outlined text-primary mr-3">
                                  corporate_fare
                                </span>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {agreement.clientCompany?.name}
                                  </div>
                                  {agreement.clientCompany?.shortName && (
                                    <div className="text-sm text-gray-500">
                                      {agreement.clientCompany.shortName}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {agreement.startDate
                                ? new Date(agreement.startDate).toLocaleDateString('tr-TR')
                                : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {agreement.endDate
                                ? new Date(agreement.endDate).toLocaleDateString('tr-TR')
                                : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {remainingDays !== null ? (
                                <span className={`text-sm font-semibold ${
                                  remainingDays < 30 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {remainingDays} gün
                                  {remainingDays < 30 && ' ⚠️'}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  setSelectedAgreement(agreement);
                                  setShowEditModal(true);
                                }}
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
              </div>
            )}

          </div>
        </div>

        {/* Create Agreement Modal */}
        {showCreateModal && (
          <CreateAgreementModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setSelectedClient(null);
            }}
            brokerCompanyId={user?.company?.id}
            clientCompanyId={selectedClient?.id}
            clientCompanyName={selectedClient?.name}
            showClientSelector={true}
            onSuccess={() => {
              setShowCreateModal(false);
              setSelectedClient(null);
              loadAgreements();
            }}
          />
        )}

        {/* Edit Agreement Modal */}
        {showEditModal && selectedAgreement && (
          <EditAgreementModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedAgreement(null);
            }}
            agreement={{
              agreementId: selectedAgreement.id,
              agreementStatus: selectedAgreement.status,
              agreementStartDate: selectedAgreement.startDate,
              agreementEndDate: selectedAgreement.endDate,
              documentPath: selectedAgreement.documentPath,
              notes: selectedAgreement.notes
            }}
            clientInfo={{
              name: selectedAgreement.clientCompany?.name
            }}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedAgreement(null);
              loadAgreements();
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default AgreementsPage;
