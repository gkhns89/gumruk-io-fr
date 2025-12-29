import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { companyService } from '../../api/companyService';
import MainLayout from '../../components/layout/MainLayout';
import AddClientModal from '../../components/common/AddClientModal';

const ClientsPage = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await companyService.getClientCompanies(user?.company?.id);

      if (result.success) {
        setClients(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Müşteri firmaları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [user?.company?.id]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleClientCreated = () => {
    loadClients(); // Reload clients list after successful creation
  };

  const filteredClients = clients.filter(client =>
    !searchTerm ||
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAgreementStatusBadge = (agreementStatus) => {
    const badges = {
      ACTIVE: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
        label: 'Aktif Vekalet'
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
        label: 'Pasif Vekalet'
      }
    };
    return badges[agreementStatus] || {
      bg: 'bg-gray-50',
      text: 'text-gray-500',
      border: 'border-gray-200',
      label: 'Vekalet Yok'
    };
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary">
                  corporate_fare
                </span>
                Müşteri Firmaları
              </h1>
              <p className="text-gray-600 mt-2">
                Gümrük işlemlerini takip ettiğiniz müşteri firmalarınızı yönetin
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md"
            >
              <span className="material-symbols-outlined">add</span>
              Yeni Müşteri Ekle
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-6">
            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm p-4">
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
                  placeholder="Firma adı veya kısa adı ile ara..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
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
            {!loading && !error && filteredClients.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">
                  corporate_fare
                </span>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {searchTerm
                    ? 'Arama kriterine uygun müşteri bulunamadı'
                    : 'Henüz müşteri firmanız bulunmuyor'}
                </h3>
                <p className="text-gray-600 mb-6">
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
                      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
                    >
                      {/* Client Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-12 w-12 bg-primary/10 rounded-full">
                            <span className="material-symbols-outlined text-primary text-2xl">
                              corporate_fare
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {client.name}
                            </h3>
                            {client.shortName && (
                              <p className="text-sm text-gray-500">{client.shortName}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Agreement Status */}
                      <div className="mb-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full border ${agreementBadge.bg} ${agreementBadge.text} ${agreementBadge.border}`}>
                          <span className="material-symbols-outlined text-sm">
                            {hasAgreement ? 'verified' : 'cancel'}
                          </span>
                          {agreementBadge.label}
                        </span>
                      </div>

                      {/* Description */}
                      {client.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {client.description}
                        </p>
                      )}

                      {/* Agreement Dates */}
                      {hasAgreement && client.agreementStartDate && (
                        <div className="border-t border-gray-100 pt-4 mt-4">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-gray-500 mb-1">Başlangıç</p>
                              <p className="text-gray-800 font-semibold">
                                {new Date(client.agreementStartDate).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                            {client.agreementEndDate && (
                              <div>
                                <p className="text-gray-500 mb-1">Bitiş</p>
                                <p className="text-gray-800 font-semibold">
                                  {new Date(client.agreementEndDate).toLocaleDateString('tr-TR')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                        <button
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                          title="Detayları Görüntüle"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                          Detay
                        </button>
                        {!hasAgreement && (
                          <button
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
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

          </div>
        </div>

        {/* Add Client Modal - Using common component */}
        <AddClientModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleClientCreated}
          brokerCompanyId={user?.company?.id}
        />
      </div>
    </MainLayout>
  );
};

export default ClientsPage;
