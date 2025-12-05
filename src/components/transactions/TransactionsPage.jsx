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
    setCurrentPage(1);
  }, [filters, transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await transactionService.getAllTransactions();
      
      if (result.success) {
        setTransactions(result.data);
      } else {
        setError(result.error);
      }

      if (user?.globalRole !== 'CLIENT_USER') {
        const companiesResult = await companyService.getMyCompanies();
        if (companiesResult.success) {
          const clients = companiesResult.data.filter(c => c.companyType === 'CLIENT');
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

  const applyFilters = () => {
    let result = [...transactions];

    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }

    if (filters.clientId) {
      result = result.filter(t => t.clientCompany?.id === parseInt(filters.clientId));
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(t => 
        t.fileNo?.toLowerCase().includes(searchLower) ||
        t.declarationNumber?.toLowerCase().includes(searchLower) ||
        t.recipientName?.toLowerCase().includes(searchLower) ||
        t.senderName?.toLowerCase().includes(searchLower)
      );
    }

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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      clientId: "",
      search: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    loadData();
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

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
    <div className="flex min-h-screen w-full overflow-hidden">
      {/* Sidebar - Sabit genişlik */}
      <Sidebar user={user} />
      
      {/* Main Content - Overflow kontrolü */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header user={user} />
        
        {/* Page Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
          {/* Page Header with Filters - Sabit */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-text-main">İşlem Takip</h1>
                <p className="text-text-secondary text-sm mt-1">
                  {isClientUser 
                    ? "Gümrük işlemlerinizi görüntüleyin" 
                    : "Gümrük işlemlerinizi yönetin"}
                </p>
              </div>

              {canCreate && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold flex-shrink-0"
                >
                  <span className="material-symbols-outlined">add</span>
                  Yeni İşlem Ekle
                </button>
              )}
            </div>

            {/* Filtreler */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <input
                  type="text"
                  placeholder="Dosya No, Beyanname No, Alıcı/Gönderici Ara..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>

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

          {/* Table Container - Sadece bu alan scroll olacak */}
          <div className="flex-1 overflow-hidden p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
              {/* Tablo - Yatay scroll sadece burada */}
              <div className="flex-1 overflow-auto">
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
          </div>

          {/* Pagination - Sabit */}
          {!loading && filteredTransactions.length > 0 && totalPages > 1 && (
            <div className="px-6 py-4 bg-white border-t border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-text-secondary">
                  Gösterilen: {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTransactions.length)} / {filteredTransactions.length}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                    Önceki
                  </button>

                  <div className="flex items-center gap-2">
                    {renderPaginationButtons()}
                  </div>

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
          currentUser={user}
        />
      )}
    </div>
  );
}