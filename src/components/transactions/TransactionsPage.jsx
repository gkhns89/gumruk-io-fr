import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { transactionService } from "../../api/transactionService";
import { companyService } from "../../api/companyService";
import TransactionsFullTable from "./TransactionsFullTable";
import AddTransactionModal from "./AddTransactionModal";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";

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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
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
  const canDelete = ['SUPER_ADMIN', 'BROKER_ADMIN'].includes(user?.globalRole);
  const isClientUser = user?.globalRole === 'CLIENT_USER';

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Filtre değiştiğinde ilk sayfaya dön
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

  // Pagination hesaplamaları
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Sayfa değiştirme
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Sayfayı başa scroll et
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Pagination butonları oluştur
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    // İlk sayfa butonu
    if (startPage > 1) {
      buttons.push(
        <button
          key="first"
          onClick={() => handlePageChange(1)}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(
          <span key="dots1" className="px-2">...</span>
        );
      }
    }

    // Sayfa numaraları
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 border rounded-lg transition-colors ${
            currentPage === i
              ? 'bg-primary text-white border-primary'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }

    // Son sayfa butonu
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="dots2" className="px-2">...</span>
        );
      }
      buttons.push(
        <button
          key="last"
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  return (
    <div className="relative flex min-h-screen w-full">
      {/* Sidebar */}
      <Sidebar user={user} />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <Header user={user} />
        
        {/* Page Content */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Page Header with Filters */}
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
              <span>Filtrelenmiş: <strong className="text-text-main">{filteredTransactions.length}</strong></span>
              <span>Sayfa: <strong className="text-text-main">{currentPage} / {totalPages || 1}</strong></span>
              {isClientUser && (
                <span className="text-yellow-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  Sadece Görüntüleme Modu
                </span>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <TransactionsFullTable
                transactions={currentItems}
                loading={loading}
                error={error}
                onRetry={loadData}
                onRefresh={loadData}
                canDelete={canDelete}
                isReadOnly={isClientUser}
              />
            </div>
          </div>

          {/* Pagination */}
          {!loading && filteredTransactions.length > 0 && totalPages > 1 && (
            <div className="px-6 py-4 bg-white border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-text-secondary">
                  Gösterilen: {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTransactions.length)} / {filteredTransactions.length}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Önceki Sayfa */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                    Önceki
                  </button>

                  {/* Sayfa Numaraları */}
                  <div className="flex items-center gap-2">
                    {renderPaginationButtons()}
                  </div>

                  {/* Sonraki Sayfa */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Sonraki
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

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