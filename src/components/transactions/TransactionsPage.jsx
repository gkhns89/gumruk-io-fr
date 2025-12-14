import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { transactionService } from "../../api/transactionService";
import { companyService } from "../../api/companyService";
import MainLayout from "../layout/MainLayout";
import TransactionsFullTable from "./TransactionsFullTable";
import AddTransactionModal from "./AddTransactionModal";
import EditTransactionModal from "./EditTransactionModal";

export default function TransactionsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ... mevcut state'ler aynı kalacak ...
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [clientCompanies, setClientCompanies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [filters, setFilters] = useState({
    status: "",
    clientId: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  });

  const canCreate = ['SUPER_ADMIN', 'BROKER_ADMIN', 'BROKER_USER'].includes(user?.globalRole);
  const canDelete = ['SUPER_ADMIN', 'BROKER_ADMIN'].includes(user?.globalRole);
  const isClientUser = user?.globalRole === 'CLIENT_USER';

  // ... mevcut useEffect ve fonksiyonlar aynı kalacak ...
  
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [filters, transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  // URL'den edit parametresini kontrol et ve işlemi aç
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && transactions.length > 0) {
      const transaction = transactions.find(t => t.id === parseInt(editId));
      if (transaction) {
        setSelectedTransaction(transaction);
        setShowEditModal(true);
        // URL'den parametreyi temizle
        setSearchParams({});
      }
    }
  }, [searchParams, transactions, setSearchParams]);

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
    setFilters({ status: "", clientId: "", search: "", dateFrom: "", dateTo: "" });
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    loadData();
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedTransaction(null);
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
        <button key="first" onClick={() => handlePageChange(1)} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">1</button>
      );
      if (startPage > 2) buttons.push(<span key="dots1" className="px-2">...</span>);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 border rounded-lg transition-colors ${currentPage === i ? 'bg-primary text-white border-primary' : 'border-gray-300 hover:bg-gray-50'}`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) buttons.push(<span key="dots2" className="px-2">...</span>);
      buttons.push(
        <button key="last" onClick={() => handlePageChange(totalPages)} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">{totalPages}</button>
      );
    }

    return buttons;
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Page Header with Filters */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-text-main">İşlem Takip</h1>
              <p className="text-text-secondary text-sm mt-1">
                {isClientUser ? "Gümrük işlemlerinizi görüntüleyin" : "Gümrük işlemlerinizi yönetin"}
              </p>
            </div>

            {canCreate && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold flex-shrink-0 w-full sm:w-auto"
              >
                <span className="material-symbols-outlined">add</span>
                <span className="whitespace-nowrap">Yeni İşlem Ekle</span>
              </button>
            )}
          </div>

          {/* Filtreler */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <input
                type="text"
                placeholder="Dosya No, Beyanname No, Alıcı/Gönderici Ara..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm md:text-base"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm md:text-base"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm md:text-base"
              >
                <option value="">Tüm Müşteriler</option>
                {clientCompanies.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-text-secondary font-medium text-sm md:text-base"
            >
              Filtreleri Temizle
            </button>
          </div>

          {/* Tarih Filtreleri - Mobilde gizlenebilir */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Başlangıç Tarihi</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Bitiş Tarihi</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          {/* İstatistikler */}
          <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-4 text-xs md:text-sm text-text-secondary">
            <span>Toplam: <strong className="text-text-main">{transactions.length}</strong></span>
            <span>Filtrelenmiş: <strong className="text-text-main">{filteredTransactions.length}</strong></span>
            <span>Sayfa: <strong className="text-text-main">{currentPage} / {totalPages || 1}</strong></span>
            {isClientUser && (
              <span className="text-yellow-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">visibility</span>
                Sadece Görüntüleme
              </span>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
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

        {/* Pagination */}
        {!loading && filteredTransactions.length > 0 && totalPages > 1 && (
          <div className="px-4 md:px-6 py-4 bg-white border-t border-gray-200 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-text-secondary">
                Gösterilen: {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTransactions.length)} / {filteredTransactions.length}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                  <span className="hidden sm:inline">Önceki</span>
                </button>

                <div className="hidden sm:flex items-center gap-2">
                  {renderPaginationButtons()}
                </div>

                <span className="sm:hidden text-sm text-text-main font-medium">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                >
                  <span className="hidden sm:inline">Sonraki</span>
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
          currentUser={user}
        />
      )}

      {showEditModal && selectedTransaction && (
        <EditTransactionModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTransaction(null);
          }}
          onSuccess={handleEditSuccess}
          isReadOnly={isClientUser}
        />
      )}
    </MainLayout>
  );
}