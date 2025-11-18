import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { transactionService } from "../../api/transactionService";
import { companyService } from "../../api/companyService";
import TransactionsFullTable from "./TransactionsFullTable";
import AddTransactionModal from "./AddTransactionModal";

export default function TransactionsPage() {
  const { user } = useAuth();
  
  // State
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Firma listeleri
  const [brokerCompanies, setBrokerCompanies] = useState([]);
  const [clientCompanies, setClientCompanies] = useState([]);
  
  // Filtreler
  const [filters, setFilters] = useState({
    status: "",
    clientId: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  });

  // Yetki kontrolü
  const canCreate = ['SUPER_ADMIN', 'BROKER_ADMIN', 'BROKER_USER'].includes(user?.globalRole);
  const canEdit = ['SUPER_ADMIN', 'BROKER_ADMIN', 'BROKER_USER'].includes(user?.globalRole);
  const canDelete = ['SUPER_ADMIN', 'BROKER_ADMIN'].includes(user?.globalRole);
  const isClientUser = user?.globalRole === 'CLIENT_USER';

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyFilters();
  }, [filters, transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Veri yükleme
  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      // İşlemleri getir
      const result = await transactionService.getAllTransactions();
      
      if (result.success) {
        setTransactions(result.data);
      } else {
        setError(result.error);
      }

      // Firma listelerini getir (sadece broker ve admin için)
      if (user?.globalRole !== 'CLIENT_USER') {
        const companiesResult = await companyService.getMyCompanies();
        if (companiesResult.success) {
          const brokers = companiesResult.data.filter(c => c.companyType === 'CUSTOMS_BROKER');
          const clients = companiesResult.data.filter(c => c.companyType === 'CLIENT');
          
          setBrokerCompanies(brokers);
          setClientCompanies(clients);
        }
      }
    } catch (err) {
      console.error("Veri yükleme hatası:", err);
      setError("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Filtreleme
  const applyFilters = () => {
    let result = [...transactions];

    // Durum filtresi
    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }

    // Müşteri filtresi
    if (filters.clientId) {
      result = result.filter(t => t.clientCompany?.id === parseInt(filters.clientId));
    }

    // Arama filtresi
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(t => 
        t.fileNo?.toLowerCase().includes(searchLower) ||
        t.declarationNumber?.toLowerCase().includes(searchLower) ||
        t.recipientName?.toLowerCase().includes(searchLower) ||
        t.senderName?.toLowerCase().includes(searchLower)
      );
    }

    // Tarih filtresi
    if (filters.dateFrom) {
      result = result.filter(t => {
        if (!t.warehouseArrivalDate) return false;
        return new Date(t.warehouseArrivalDate) >= new Date(filters.dateFrom);
      });
    }

    if (filters.dateTo) {
      result = result.filter(t => {
        if (!t.warehouseArrivalDate) return false;
        return new Date(t.warehouseArrivalDate) <= new Date(filters.dateTo);
      });
    }

    setFilteredTransactions(result);
  };

  // Filtre değiştirme
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setFilters({
      status: "",
      clientId: "",
      search: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  // Modal işlemleri
  const handleAddSuccess = () => {
    setShowAddModal(false);
    loadData();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-main">İşlem Takip</h1>
            <p className="text-text-secondary text-sm mt-1">
              {isClientUser 
                ? "Gümrük işlemlerinizi görüntüleyin" 
                : "Gümrük işlemlerinizi yönetin"}
            </p>
          </div>

          {/* Yeni İşlem Butonu - Sadece yetkili kullanıcılar için */}
          {canCreate && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              <span className="material-symbols-outlined">add</span>
              Yeni İşlem Ekle
            </button>
          )}
        </div>

        {/* Filtreler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Arama */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Dosya No, Beyanname No, Alıcı/Gönderici Ara..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Durum */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          >
            <option value="">Tüm Durumlar</option>
            <option value="PENDING">Bekliyor</option>
            <option value="IN_PROGRESS">İşlemde</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="CANCELLED">İptal</option>
          </select>

          {/* Müşteri Filtresi - Sadece broker kullanıcıları için */}
          {!isClientUser && (
            <select
              value={filters.clientId}
              onChange={(e) => handleFilterChange('clientId', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              <option value="">Tüm Müşteriler</option>
              {clientCompanies.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          )}

          {/* Temizle Butonu */}
          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-text-secondary font-medium"
          >
            Filtreleri Temizle
          </button>
        </div>

        {/* Tarih Filtreleri */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>

        {/* İstatistikler */}
        <div className="flex items-center gap-6 mt-4 text-sm text-text-secondary">
          <span>Toplam: <strong className="text-text-main">{transactions.length}</strong></span>
          <span>Gösterilen: <strong className="text-text-main">{filteredTransactions.length}</strong></span>
          {isClientUser && (
            <span className="text-yellow-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">visibility</span>
              Sadece Görüntüleme Modu
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <TransactionsFullTable
          transactions={filteredTransactions}
          loading={loading}
          error={error}
          onRetry={loadData}
          onRefresh={loadData}
          canEdit={canEdit}
          canDelete={canDelete}
          isReadOnly={isClientUser}
        />
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
          brokerCompanies={brokerCompanies}
          currentUser={user}
        />
      )}
    </div>
  );
}