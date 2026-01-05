import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { transactionService } from "../../api/transactionService";
import { handleError, handleApiResponse } from '../../utils/errorUtils';
import MainLayout from "../layout/MainLayout";
import TransactionsFullTable from "./TransactionsFullTable";
import AddTransactionModal from "./AddTransactionModal";
import EditTransactionModal from "./EditTransactionModal";
import TransactionDetailModal from "../common/TransactionDetailModal";

export default function TransactionsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterDrawerRef = useRef(null);
  const filterButtonRef = useRef(null);

  // Sidebar genişliği state'i
  const [sidebarWide, setSidebarWide] = useState(() => {
    return localStorage.getItem('sidebarMode') === 'pinned-expanded';
  });

  // ... mevcut state'ler aynı kalacak ...
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailTransaction, setSelectedDetailTransaction] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [filters, setFilters] = useState({
    status: "",
    clientSearch: "",
    search: "",
    dateFrom: "",
    dateTo: "",
    registrationDateFrom: "",
    registrationDateTo: "",
    closureDateFrom: "",
    closureDateTo: "",
    withdrawalDateFrom: "",
    withdrawalDateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showDateFilters, setShowDateFilters] = useState(false);

  const canCreate = ['SUPER_ADMIN', 'BROKER_ADMIN', 'BROKER_USER'].includes(user?.globalRole);
  const canDelete = ['SUPER_ADMIN', 'BROKER_ADMIN'].includes(user?.globalRole);
  const isClientUser = user?.globalRole === 'CLIENT_USER';

  // Sidebar değişikliklerini dinle
  useEffect(() => {
    const handleSidebarChange = (event) => {
      setSidebarWide(event.detail.isWide);
    };

    window.addEventListener('sidebarStateChanged', handleSidebarChange);

    return () => {
      window.removeEventListener('sidebarStateChanged', handleSidebarChange);
    };
  }, []);

  // ... mevcut useEffect ve fonksiyonlar aynı kalacak ...

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [filters, transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside to close filter drawer
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInsideDrawer = filterDrawerRef.current && filterDrawerRef.current.contains(event.target);
      const isClickOnButton = filterButtonRef.current && filterButtonRef.current.contains(event.target);

      if (!isClickInsideDrawer && !isClickOnButton) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

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
        handleApiResponse(result, null, setError, 'loading transactions');
      }
    } catch (err) {
      handleError(err, setError, 'loading transactions', 'Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...transactions];

    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }

    if (filters.clientSearch) {
      const searchLower = filters.clientSearch.toLowerCase();
      result = result.filter(t =>
        t.clientCompany?.name?.toLowerCase().includes(searchLower)
      );
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

    // Antrepo varış tarihi filtreleri
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

    // Tescil tarihi filtreleri
    if (filters.registrationDateFrom) {
      result = result.filter(t => {
        if (!t.registrationDate) return false;
        return new Date(t.registrationDate) >= new Date(filters.registrationDateFrom);
      });
    }

    if (filters.registrationDateTo) {
      result = result.filter(t => {
        if (!t.registrationDate) return false;
        return new Date(t.registrationDate) <= new Date(filters.registrationDateTo);
      });
    }

    // Kapanma tarihi filtreleri
    if (filters.closureDateFrom) {
      result = result.filter(t => {
        if (!t.lineClosureDate) return false;
        return new Date(t.lineClosureDate) >= new Date(filters.closureDateFrom);
      });
    }

    if (filters.closureDateTo) {
      result = result.filter(t => {
        if (!t.lineClosureDate) return false;
        return new Date(t.lineClosureDate) <= new Date(filters.closureDateTo);
      });
    }

    // Çekilme tarihi filtreleri
    if (filters.withdrawalDateFrom) {
      result = result.filter(t => {
        if (!t.withdrawalDate) return false;
        return new Date(t.withdrawalDate) >= new Date(filters.withdrawalDateFrom);
      });
    }

    if (filters.withdrawalDateTo) {
      result = result.filter(t => {
        if (!t.withdrawalDate) return false;
        return new Date(t.withdrawalDate) <= new Date(filters.withdrawalDateTo);
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
      clientSearch: "",
      search: "",
      dateFrom: "",
      dateTo: "",
      registrationDateFrom: "",
      registrationDateTo: "",
      closureDateFrom: "",
      closureDateTo: "",
      withdrawalDateFrom: "",
      withdrawalDateTo: "",
    });
  };

  // Aktif filtre sayısını hesapla
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status) count++;
    if (filters.clientSearch) count++;
    if (filters.search) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.registrationDateFrom || filters.registrationDateTo) count++;
    if (filters.closureDateFrom || filters.closureDateTo) count++;
    if (filters.withdrawalDateFrom || filters.withdrawalDateTo) count++;
    return count;
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;

  const handleAddSuccess = () => {
    setShowAddModal(false);
    loadData();
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedTransaction(null);
    loadData();
  };

  const handleRowClick = (transaction) => {
    setSelectedDetailTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDetailTransaction(null);
  };

  const handleDetailModalEdit = (transaction) => {
    // Detail modal'ı kapat
    setShowDetailModal(false);
    setSelectedDetailTransaction(null);

    // Edit modal'ı aç
    setSelectedTransaction(transaction);
    setShowEditModal(true);
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
    <MainLayout hasFooter={true}>
      <div className="flex flex-col">
        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-text-main">İşlem Takip</h1>
              <p className="text-text-secondary text-sm mt-1">
                {isClientUser ? "Gümrük işlemlerinizi görüntüleyin" : "Gümrük işlemlerinizi yönetin"}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto">
              {/* Filter Toggle Button */}
              <button
                ref={filterButtonRef}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-semibold flex-1 sm:flex-initial"
              >
                <span className="material-symbols-outlined text-primary">tune</span>
                <span className="whitespace-nowrap text-text-main">Filtreler</span>
                {hasActiveFilters && (
                  <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full font-medium">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>

              {canCreate && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold flex-1 sm:flex-initial shadow-sm"
                >
                  <span className="material-symbols-outlined">add</span>
                  <span className="whitespace-nowrap">Yeni İşlem</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Drawer */}
          {showFilters && (
            <div ref={filterDrawerRef} className="mt-4 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden animate-slide-in-top">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">filter_alt</span>
                    <h3 className="text-sm font-semibold text-text-main">Filtreler</h3>
                    {hasActiveFilters && (
                      <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full font-medium">
                        {getActiveFiltersCount()}
                      </span>
                    )}
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      Filtreleri Temizle
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Search Input - Full width */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Genel Arama
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Dosya No, Beyanname No, Alıcı/Gönderici..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white transition-all"
                    />
                    {filters.search && (
                      <button
                        onClick={() => handleFilterChange('search', '')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status and Client Search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Durum
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
                        flag
                      </span>
                      <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        style={{
                          backgroundImage: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          appearance: 'none'
                        }}
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white cursor-pointer transition-all"
                      >
                        <option value="">Tüm Durumlar</option>
                        <option value="PENDING">Bekliyor</option>
                        <option value="REGISTERED">Tescil Edildi</option>
                        <option value="INSPECTION">Muayene Sürecinde</option>
                        <option value="CP_COMPLETED">Gümrük İşlemleri Tamamlandı</option>
                        <option value="WITHDRAWN">Çekildi</option>
                        <option value="CANCELLED">İptal</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Client Search - Only for non-client users */}
                  {!isClientUser && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        Müşteri
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
                          business
                        </span>
                        <input
                          type="text"
                          placeholder="Müşteri ara..."
                          value={filters.clientSearch}
                          onChange={(e) => handleFilterChange('clientSearch', e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white transition-all"
                        />
                        {filters.clientSearch && (
                          <button
                            onClick={() => handleFilterChange('clientSearch', '')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Filters - Collapsible */}
                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setShowDateFilters(!showDateFilters)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">calendar_month</span>
                      <h4 className="text-xs font-semibold text-text-main">Tarih Filtreleri</h4>
                      {(filters.dateFrom || filters.dateTo || filters.registrationDateFrom || filters.registrationDateTo ||
                        filters.closureDateFrom || filters.closureDateTo || filters.withdrawalDateFrom || filters.withdrawalDateTo) && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                          Aktif
                        </span>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-text-secondary group-hover:text-text-main text-lg">
                      {showDateFilters ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {showDateFilters && (
                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slideDown">
                  {/* Antrepo Varış Tarihi */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center h-8 w-8 bg-blue-100 rounded-lg">
                        <span className="material-symbols-outlined text-blue-600 text-base">warehouse</span>
                      </div>
                      <h3 className="text-sm font-semibold text-text-main">Antrepo Varış Tarihi</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Başlangıç</label>
                        <input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Bitiş</label>
                        <input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tescil Tarihi */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center h-8 w-8 bg-amber-100 rounded-lg">
                        <span className="material-symbols-outlined text-amber-600 text-base">assignment</span>
                      </div>
                      <h3 className="text-sm font-semibold text-text-main">Tescil Tarihi</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Başlangıç</label>
                        <input
                          type="date"
                          value={filters.registrationDateFrom}
                          onChange={(e) => handleFilterChange('registrationDateFrom', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Bitiş</label>
                        <input
                          type="date"
                          value={filters.registrationDateTo}
                          onChange={(e) => handleFilterChange('registrationDateTo', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hat Kapanma Tarihi */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center h-8 w-8 bg-orange-100 rounded-lg">
                        <span className="material-symbols-outlined text-orange-600 text-base">lock</span>
                      </div>
                      <h3 className="text-sm font-semibold text-text-main">Hat Kapanma Tarihi</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Başlangıç</label>
                        <input
                          type="date"
                          value={filters.closureDateFrom}
                          onChange={(e) => handleFilterChange('closureDateFrom', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Bitiş</label>
                        <input
                          type="date"
                          value={filters.closureDateTo}
                          onChange={(e) => handleFilterChange('closureDateTo', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Çekilme Tarihi */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center h-8 w-8 bg-emerald-100 rounded-lg">
                        <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                      </div>
                      <h3 className="text-sm font-semibold text-text-main">Çekilme Tarihi</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Başlangıç</label>
                        <input
                          type="date"
                          value={filters.withdrawalDateFrom}
                          onChange={(e) => handleFilterChange('withdrawalDateFrom', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Bitiş</label>
                        <input
                          type="date"
                          value={filters.withdrawalDateTo}
                          onChange={(e) => handleFilterChange('withdrawalDateTo', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table Container */}
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <TransactionsFullTable
              transactions={currentItems}
              loading={loading}
              error={error}
              onRetry={loadData}
              onRefresh={loadData}
              canDelete={canDelete}
              isReadOnly={isClientUser}
              onRowClick={handleRowClick}
            />
          </div>
        </div>

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

      {/* Detail Modal */}
      {showDetailModal && selectedDetailTransaction && (
        <TransactionDetailModal
          transaction={selectedDetailTransaction}
          onClose={handleCloseDetailModal}
          onEdit={handleDetailModalEdit}
        />
      )}

      {/* Fixed Footer with Statistics and Pagination */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30 transition-[left] duration-300 ease-in-out ${sidebarWide ? 'lg:left-64' : 'lg:left-20'}`}>
        <div className="px-4 md:px-6 py-3">
          {!loading && filteredTransactions.length > 0 ? (
            <div className="flex items-center justify-between gap-4">
              {/* Left: Info Section */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                  <span className="material-symbols-outlined text-blue-600 text-base">inventory</span>
                  <span className="text-xs font-medium text-blue-700">
                    Toplam: <strong className="font-bold">{transactions.length}</strong>
                  </span>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                    <span className="material-symbols-outlined text-green-600 text-base">filter_alt</span>
                    <span className="text-xs font-medium text-green-700">
                      Filtrelenmiş: <strong className="font-bold">{filteredTransactions.length}</strong>
                    </span>
                  </div>
                )}

                {isClientUser && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="material-symbols-outlined text-amber-600 text-base">visibility</span>
                    <span className="text-xs font-medium text-amber-700">Görüntüleme</span>
                  </div>
                )}
              </div>

              {/* Center: Display Info */}
              <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-purple-50 rounded-lg border border-purple-200">
                <span className="material-symbols-outlined text-purple-600 text-base">description</span>
                <span className="text-xs font-medium text-purple-700">
                  Gösterilen: <strong className="font-bold">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTransactions.length)}</strong> / <strong className="font-bold">{filteredTransactions.length}</strong>
                </span>
              </div>

              {/* Right: Navigation/Pagination */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || totalPages <= 1}
                  className="px-2.5 md:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                  <span className="hidden xl:inline">Önceki</span>
                </button>

                {totalPages > 1 ? (
                  <>
                    <div className="hidden md:flex items-center gap-1.5">
                      {renderPaginationButtons()}
                    </div>

                    <div className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                      <span className="text-xs font-medium text-text-main">
                        {currentPage} / {totalPages}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                    <span className="material-symbols-outlined text-gray-600 text-sm">article</span>
                    <span className="text-xs font-medium text-gray-700">
                      <strong className="font-bold">1 / 1</strong>
                    </span>
                  </div>
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className="px-2.5 md:px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                >
                  <span className="hidden xl:inline">Sonraki</span>
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                <span className="material-symbols-outlined text-gray-600 text-base">inventory</span>
                <span className="text-xs font-medium text-gray-700">
                  {loading ? "Yükleniyor..." : "Veri yok"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}