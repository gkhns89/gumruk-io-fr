import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePaymentRestriction } from "../../hooks/usePaymentRestriction";
import { useSearchParams } from "react-router-dom";
import { transactionService } from "../../api/transactionService";
import { handleError, handleApiResponse } from '../../utils/errorUtils';
import MainLayout from "../layout/MainLayout";
import TransactionsFullTable from "./TransactionsFullTable";
import AddTransactionModal from "./AddTransactionModal";
import EditTransactionModal from "./EditTransactionModal";
import TransactionDetailModal from "../common/TransactionDetailModal";
import AutoRefreshControl from "./AutoRefreshControl";
import { t } from "../../locales";

// Kapanmış (Çekildi/İptal) işlemler için ilk yükleme penceresi. Açık işlemler
// her zaman gelir; kapanmışlardan yalnızca seçilen dönem içindekiler çekilir,
// böylece binlerce geçmiş kaydı olan brokerlarda sayfa hızlı açılır.
// 0 = pencere yok (tüm geçmiş).
const CLOSED_WINDOW_OPTIONS = [
  { value: 15, get label() { return t("transactions.page.lastDays", { days: 15 }); } },
  { value: 30, get label() { return t("transactions.page.lastDays", { days: 30 }); } },
  { value: 90, get label() { return t("transactions.page.lastDays", { days: 90 }); } },
  { value: 0, get label() { return t("transactions.page.allTime"); } },
];
const CLOSED_WINDOW_DEFAULT = 30;
const CLOSED_WINDOW_STORAGE_KEY = "transactionsClosedWindowDays";

const readStoredClosedWindow = () => {
  const stored = parseInt(localStorage.getItem(CLOSED_WINDOW_STORAGE_KEY), 10);
  return CLOSED_WINDOW_OPTIONS.some(o => o.value === stored) ? stored : CLOSED_WINDOW_DEFAULT;
};

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
  const [itemsPerPage] = useState(20);
  const [filters, setFilters] = useState({
    status: "",
    delay: "",
    clientSearch: "",
    customsOffice: "",
    warehouse: "",
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

  // Kapanmış işlem penceresi — değişince veri yeniden çekilir
  const [closedWindowDays, setClosedWindowDays] = useState(readStoredClosedWindow);
  const isClosedWindowed = closedWindowDays > 0;

  const handleClosedWindowChange = (days) => {
    setClosedWindowDays(days);
    localStorage.setItem(CLOSED_WINDOW_STORAGE_KEY, String(days));
  };

  const canCreate = ['SUPER_ADMIN', 'BROKER_ADMIN', 'BROKER_USER'].includes(user?.globalRole);
  const canDelete = ['SUPER_ADMIN', 'BROKER_ADMIN'].includes(user?.globalRole);
  const isClientUser = user?.globalRole === 'CLIENT_USER';
  const { isWriteBlocked, isFullReadOnly } = usePaymentRestriction();
  const isCreateBlocked = canCreate && (isWriteBlocked || isFullReadOnly);
  const isTableReadOnly = isClientUser || isFullReadOnly;

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
      const transaction = transactions.find(tx => tx.id === parseInt(editId));
      if (transaction) {
        setSelectedTransaction(transaction);
        setShowEditModal(true);
        // URL'den parametreyi temizle
        setSearchParams({});
      }
    }
  }, [searchParams, transactions, setSearchParams]);

  // Dashboard kartlarından gelen filtreleri uygula (?status=... veya ?delay=TG|GG)
  useEffect(() => {
    const status = searchParams.get('status');
    const delay = searchParams.get('delay');
    if (status || delay) {
      setFilters(prev => ({
        ...prev,
        ...(status ? { status } : {}),
        ...(delay ? { delay } : {}),
      }));
      const next = new URLSearchParams(searchParams);
      next.delete('status');
      next.delete('delay');
      setSearchParams(next, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await transactionService.getAllTransactions({
        withdrawnWithinDays: closedWindowDays > 0 ? closedWindowDays : null,
      });

      if (result.success) {
        setTransactions(result.data);
      } else {
        handleApiResponse(result, null, setError, 'loading transactions');
      }
    } catch (err) {
      handleError(err, setError, 'loading transactions', t("transactions.page.loadError"));
    } finally {
      setLoading(false);
    }
  }, [closedWindowDays]);

  // İlk yükleme + kapanmış işlem penceresi değişince yeniden çeker
  // (loadData closedWindowDays üzerine kapanıyor).
  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyFilters = () => {
    let result = [...transactions];

    if (filters.status) {
      result = result.filter(tx => tx.status === filters.status);
    }

    // Gecikme filtresi: TG (tescil→kapanma) / GG (genel) / ANY (herhangi)
    if (filters.delay === "TG") {
      result = result.filter(tx => tx.systemDelayFlags?.includes("TG"));
    } else if (filters.delay === "GG") {
      result = result.filter(tx => tx.systemDelayFlags?.includes("GG"));
    } else if (filters.delay === "ANY") {
      result = result.filter(tx => !!tx.systemDelayFlags);
    }

    if (filters.clientSearch) {
      const searchLower = filters.clientSearch.toLowerCase();
      result = result.filter(tx =>
        tx.clientCompany?.name?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.customsOffice) {
      const customsLower = filters.customsOffice.toLowerCase();
      result = result.filter(tx =>
        tx.customs?.customsShortName?.toLowerCase().includes(customsLower)
      );
    }

    if (filters.warehouse) {
      const warehouseLower = filters.warehouse.toLowerCase();
      result = result.filter(tx =>
        tx.customsWarehouse?.toLowerCase().includes(warehouseLower)
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(tx =>
        tx.fileNo?.toLowerCase().includes(searchLower) ||
        tx.declarationNumber?.toLowerCase().includes(searchLower) ||
        tx.recipientName?.toLowerCase().includes(searchLower) ||
        tx.senderName?.toLowerCase().includes(searchLower) ||
        // Antrepodan aktarılan kayıtlar kaynak beyanname/dosya no ile de bulunsun
        tx.warehouseDeclarationNo?.toLowerCase().includes(searchLower) ||
        tx.warehouseFileNo?.toLowerCase().includes(searchLower)
      );
    }

    // Antrepo varış tarihi filtreleri
    if (filters.dateFrom) {
      result = result.filter(tx => {
        if (!tx.warehouseArrivalDate) return false;
        return new Date(tx.warehouseArrivalDate) >= new Date(filters.dateFrom);
      });
    }

    if (filters.dateTo) {
      result = result.filter(tx => {
        if (!tx.warehouseArrivalDate) return false;
        return new Date(tx.warehouseArrivalDate) <= new Date(filters.dateTo);
      });
    }

    // Tescil tarihi filtreleri
    if (filters.registrationDateFrom) {
      result = result.filter(tx => {
        if (!tx.registrationDate) return false;
        return new Date(tx.registrationDate) >= new Date(filters.registrationDateFrom);
      });
    }

    if (filters.registrationDateTo) {
      result = result.filter(tx => {
        if (!tx.registrationDate) return false;
        return new Date(tx.registrationDate) <= new Date(filters.registrationDateTo);
      });
    }

    // Kapanma tarihi filtreleri
    if (filters.closureDateFrom) {
      result = result.filter(tx => {
        if (!tx.lineClosureDate) return false;
        return new Date(tx.lineClosureDate) >= new Date(filters.closureDateFrom);
      });
    }

    if (filters.closureDateTo) {
      result = result.filter(tx => {
        if (!tx.lineClosureDate) return false;
        return new Date(tx.lineClosureDate) <= new Date(filters.closureDateTo);
      });
    }

    // Çekilme tarihi filtreleri
    if (filters.withdrawalDateFrom) {
      result = result.filter(tx => {
        if (!tx.withdrawalDate) return false;
        return new Date(tx.withdrawalDate) >= new Date(filters.withdrawalDateFrom);
      });
    }

    if (filters.withdrawalDateTo) {
      result = result.filter(tx => {
        if (!tx.withdrawalDate) return false;
        return new Date(tx.withdrawalDate) <= new Date(filters.withdrawalDateTo);
      });
    }

    setFilteredTransactions(result);
  };

  // Sort transactions: 4 levels - Active, Closed, Withdrawn, Cancelled
  const sortedTransactions = useMemo(() => {
    if (!filteredTransactions) return [];

    return [...filteredTransactions].sort((a, b) => {
      // Priority levels: 1 = Active, 2 = Closed, 3 = Withdrawn, 4 = Cancelled
      const getPriority = (status) => {
        if (status === "CANCELLED") return 4; // Last: Cancelled — takip edilecek bir işi kalmadı
        if (status === "WITHDRAWN") return 3; // Withdrawn
        if (status === "CP_COMPLETED") return 2; // Middle: Closed
        return 1; // First: Active transactions (PENDING, REGISTERED, INSPECTION)
      };

      const priorityA = getPriority(a.status);
      const priorityB = getPriority(b.status);

      // Sort by priority first
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Within same priority level, sort by date (newest first)
      const dateA = new Date(a.createdAt || a.warehouseArrivalDate || 0);
      const dateB = new Date(b.createdAt || b.warehouseArrivalDate || 0);
      return dateB - dateA; // Descending order (newest first)
    });
  }, [filteredTransactions]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    document.getElementById("main-scroll-area")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      delay: "",
      clientSearch: "",
      customsOffice: "",
      warehouse: "",
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
    if (filters.delay) count++;
    if (filters.clientSearch) count++;
    if (filters.customsOffice) count++;
    if (filters.warehouse) count++;
    if (filters.search) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.registrationDateFrom || filters.registrationDateTo) count++;
    if (filters.closureDateFrom || filters.closureDateTo) count++;
    if (filters.withdrawalDateFrom || filters.withdrawalDateTo) count++;
    return count;
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;

  // Pencere dışında kalan bir tarih aralığı seçilirse kullanıcı boş sonuç
  // görür; bunu sessizce yaşamak yerine uyarı gösterip "Tümü"nü öneriyoruz.
  const dateFilterPredatesClosedWindow = useMemo(() => {
    if (!isClosedWindowed) return false;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - closedWindowDays);
    return [
      filters.dateFrom,
      filters.registrationDateFrom,
      filters.closureDateFrom,
      filters.withdrawalDateFrom,
    ].some(value => value && new Date(value) < cutoff);
  }, [filters, isClosedWindowed, closedWindowDays]);

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
        <button key="first" onClick={() => handlePageChange(1)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-text-main">1</button>
      );
      if (startPage > 2) buttons.push(<span key="dots1" className="px-2 text-text-secondary">...</span>);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 border rounded-lg transition-colors ${currentPage === i ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-text-main'}`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) buttons.push(<span key="dots2" className="px-2 text-text-secondary">...</span>);
      buttons.push(
        <button key="last" onClick={() => handlePageChange(totalPages)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-text-main">{totalPages}</button>
      );
    }

    return buttons;
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const pageHeaderRef = useRef(null);
  const [tableScrollHeight, setTableScrollHeight] = useState(() => window.innerHeight - 200);
  const FOOTER_H = 56; // fixed pagination footer height

  useEffect(() => {
    const calculate = () => {
      const el = document.getElementById("main-scroll-area");
      if (!el || !pageHeaderRef.current) return;
      const ph = pageHeaderRef.current.offsetHeight;
      // 88 = p-6 top (24) + p-6 bottom (24) + pb-24 excess over footer (96-56=40)
      setTableScrollHeight(Math.max(200, el.clientHeight - ph - FOOTER_H - 88));
    };
    if (!pageHeaderRef.current) return;
    const ro = new ResizeObserver(calculate);
    ro.observe(pageHeaderRef.current);
    calculate();
    window.addEventListener("resize", calculate);
    return () => { ro.disconnect(); window.removeEventListener("resize", calculate); };
  }, []);

  // isScrolled artık tablo container'ının scroll'una göre güncellenir
  const handleTableScroll = (scrollTop) => setIsScrolled(scrollTop > 10);

  return (
    <MainLayout hasFooter={true}>
      <div className="flex flex-col pb-24">
        {/* Page Header — sticky, scroll edince minimal/ikon hale gelir */}
        <div
          ref={pageHeaderRef}
          className={`
            sticky top-0 z-30
            px-4 md:px-6 border-b border-gray-200 dark:border-gray-700
            bg-white dark:bg-background-dark flex-shrink-0
            transition-all duration-300 ease-in-out
            ${isScrolled ? "py-2 shadow-md" : "py-4 shadow-none"}
          `}
        >
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div>
              <h1 className={`font-bold text-text-main transition-all duration-300 ${isScrolled ? "text-base md:text-lg" : "text-2xl md:text-3xl"}`}>
                {t("nav.transactionTracking")}
              </h1>
              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${isScrolled ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
                <p className="text-text-secondary text-sm mt-1 overflow-hidden">
                  {isClientUser ? t("transactions.page.subtitleView") : t("transactions.page.subtitleManage")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Kapanmış işlem penceresi — değişince yeniden çeker.
                  Scroll edilince gizlenir; dar ekranlarda Filtreler
                  panelindeki kopyası kullanılır. */}
              {!isScrolled && (
                <div
                  className="hidden lg:flex items-center gap-2 pl-3 pr-2 py-[7px] bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
                  title={t("transactions.page.closedWindowHint")}
                >
                  <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                  <span className="text-sm font-medium text-text-main dark:text-gray-300 whitespace-nowrap">
                    {t("transactions.page.closedShort")}
                  </span>
                  <select
                    value={closedWindowDays}
                    onChange={(e) => handleClosedWindowChange(parseInt(e.target.value, 10))}
                    className="text-sm font-medium bg-transparent text-text-main dark:text-gray-200 cursor-pointer focus:outline-none"
                  >
                    {CLOSED_WINDOW_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-white dark:bg-gray-800">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filter Toggle Button */}
              <button
                ref={filterButtonRef}
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-all duration-300 ${
                  isScrolled ? "p-2 gap-0" : "gap-2 px-3 sm:px-4 py-2.5"
                }`}
                title={t("transactions.page.filters")}
              >
                <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                {!isScrolled && <span className="whitespace-nowrap text-text-main text-sm hidden md:inline">{t("transactions.page.filters")}</span>}
                {hasActiveFilters && (
                  <span className={`bg-primary text-white font-medium transition-all duration-300 ${
                    isScrolled
                      ? "absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] rounded-full"
                      : "px-2 py-0.5 text-xs rounded-full"
                  }`}>
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>

              {/* Auto-Refresh Control */}
              <AutoRefreshControl
                onRefresh={loadData}
                loading={loading}
                isModalOpen={showAddModal || showEditModal || showDetailModal}
                isFilterOpen={showFilters}
                onOpen={() => setShowFilters(false)}
                isScrolled={isScrolled}
              />

              {canCreate && (
                <button
                  onClick={() => !isCreateBlocked && setShowAddModal(true)}
                  disabled={isCreateBlocked}
                  className={`flex items-center justify-center bg-primary text-white rounded-lg font-semibold shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCreateBlocked ? '' : 'hover:bg-primary/90'
                  } ${isScrolled ? "p-2 gap-0" : "gap-2 px-3 sm:px-4 py-2.5"}`}
                  title={isCreateBlocked ? t("payment.restrictionWarning") : t("transaction.addNew")}
                >
                  <span className="material-symbols-outlined text-[20px]">{isCreateBlocked ? 'lock' : 'add'}</span>
                  {!isScrolled && <span className="whitespace-nowrap text-sm hidden md:inline">{t("transactions.page.newTransaction")}</span>}
                </button>
              )}
            </div>
          </div>

          {/* Filter Drawer */}
          {showFilters && (
            <div ref={filterDrawerRef} className="mt-4 bg-white dark:bg-background-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-slide-in-top transition-colors duration-300">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 transition-colors duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">filter_alt</span>
                    <h3 className="text-sm font-semibold text-text-main">{t("transactions.page.filters")}</h3>
                    {hasActiveFilters && (
                      <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full font-medium">
                        {getActiveFiltersCount()}
                      </span>
                    )}
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      {t("transactions.filters.clear")}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Search Input - Full width */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    {t("transactions.filters.generalSearch")}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder={t("transactions.filters.searchPlaceholder")}
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:bg-gray-800 dark:text-gray-100 text-sm bg-white transition-all"
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

                {/* Status, Customs, Warehouse and Client Search */}
                <div className={`grid grid-cols-1 gap-3 ${isClientUser ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      {t("dashboard.recent.columns.status")}
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
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 cursor-pointer transition-all"
                      >
                        <option value="">{t("transactions.filters.allStatuses")}</option>
                        <option value="PENDING">{t("transactions.filters.statusPending")}</option>
                        <option value="REGISTERED">{t("transactions.filters.statusRegistered")}</option>
                        <option value="INSPECTION">{t("status.inspection")}</option>
                        <option value="CP_COMPLETED">{t("transactions.filters.statusCompleted")}</option>
                        <option value="WITHDRAWN">{t("status.withdrawn")}</option>
                        <option value="CANCELLED">{t("transactions.filters.statusCancelled")}</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg pointer-events-none">
                        expand_more
                      </span>
                    </div>
                    {isClosedWindowed && (filters.status === 'WITHDRAWN' || filters.status === 'CANCELLED') && (
                      <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                        {t("transactions.filters.closedStatusHint", { days: closedWindowDays })}
                      </p>
                    )}
                  </div>

                  {/* Delay Filter */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      {t("transactions.filters.delay")}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
                        warning
                      </span>
                      <select
                        value={filters.delay}
                        onChange={(e) => handleFilterChange('delay', e.target.value)}
                        style={{
                          backgroundImage: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          appearance: 'none'
                        }}
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 cursor-pointer transition-all"
                      >
                        <option value="">{t("transactions.filters.allRecords")}</option>
                        <option value="ANY">{t("transactions.filters.allDelays")}</option>
                        <option value="TG">{t("transactions.filters.importDelay")}</option>
                        <option value="GG">{t("transactions.filters.generalDelay")}</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Customs Filter */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      {t("transaction.customsName")}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
                        location_city
                      </span>
                      <input
                        type="text"
                        placeholder={t("transactions.filters.searchCustoms")}
                        value={filters.customsOffice}
                        onChange={(e) => handleFilterChange('customsOffice', e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all"
                      />
                      {filters.customsOffice && (
                        <button
                          onClick={() => handleFilterChange('customsOffice', '')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Warehouse Filter */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      {t("transaction.customsWarehouse")}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
                        warehouse
                      </span>
                      <input
                        type="text"
                        placeholder={t("transactions.filters.searchWarehouse")}
                        value={filters.warehouse}
                        onChange={(e) => handleFilterChange('warehouse', e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all"
                      />
                      {filters.warehouse && (
                        <button
                          onClick={() => handleFilterChange('warehouse', '')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Client Search - Only for non-client users */}
                  {!isClientUser && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        {t("transactions.common.client")}
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
                          business
                        </span>
                        <input
                          type="text"
                          placeholder={t("transactions.filters.searchClient")}
                          value={filters.clientSearch}
                          onChange={(e) => handleFilterChange('clientSearch', e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all"
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

                {/* Kapanmış işlem penceresi — lg altında header'daki kopya
                    gizli olduğu için burada gösterilir. */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 lg:hidden">
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    {t("transactions.filters.closedTransactions")}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
                      history
                    </span>
                    <select
                      value={closedWindowDays}
                      onChange={(e) => handleClosedWindowChange(parseInt(e.target.value, 10))}
                      style={{
                        backgroundImage: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none'
                      }}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 cursor-pointer transition-all"
                    >
                      {CLOSED_WINDOW_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg pointer-events-none">
                      expand_more
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-text-secondary">
                    {t("transactions.filters.closedWindowNote")}
                  </p>
                </div>

                {/* Date Filters - Collapsible */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setShowDateFilters(!showDateFilters)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">calendar_month</span>
                      <h4 className="text-xs font-semibold text-text-main">{t("transactions.filters.dateFilters")}</h4>
                      {(filters.dateFrom || filters.dateTo || filters.registrationDateFrom || filters.registrationDateTo ||
                        filters.closureDateFrom || filters.closureDateTo || filters.withdrawalDateFrom || filters.withdrawalDateTo) && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                          {t("transactions.common.active")}
                        </span>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-text-secondary group-hover:text-text-main text-lg">
                      {showDateFilters ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {showDateFilters && dateFilterPredatesClosedWindow && (
                    <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">info</span>
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        {t("transactions.filters.dateRangeBeyondWindow", { days: closedWindowDays })}{" "}
                        {t("transactions.filters.seeOlderBefore")} <strong>{t("transactions.page.closedShort")}</strong> {t("transactions.filters.seeOlderMiddle")} <strong>{t("transactions.page.allTime")}</strong>{t("transactions.filters.seeOlderAfter")}
                      </p>
                    </div>
                  )}

                  {showDateFilters && (
                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slideDown">
                  {/* Antrepo Varış Tarihi */}
                  <div className="bg-white dark:bg-background-dark rounded-lg p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">warehouse</span>
                      </div>
                      <h3 className="text-sm font-semibold text-text-main">{t("transaction.warehouseArrivalDate")}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">{t("transactions.filters.from")}</label>
                        <input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">{t("transactions.filters.to")}</label>
                        <input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tescil Tarihi */}
                  <div className="bg-white dark:bg-background-dark rounded-lg p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center h-8 w-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">assignment</span>
                      </div>
                      <h3 className="text-sm font-semibold text-text-main">{t("transaction.registrationDate")}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">{t("transactions.filters.from")}</label>
                        <input
                          type="date"
                          value={filters.registrationDateFrom}
                          onChange={(e) => handleFilterChange('registrationDateFrom', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">{t("transactions.filters.to")}</label>
                        <input
                          type="date"
                          value={filters.registrationDateTo}
                          onChange={(e) => handleFilterChange('registrationDateTo', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hat Kapanma Tarihi */}
                  <div className="bg-white dark:bg-background-dark rounded-lg p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center h-8 w-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-base">lock</span>
                      </div>
                      <h3 className="text-sm font-semibold text-text-main">{t("transactions.common.lineClosureDateLong")}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">{t("transactions.filters.from")}</label>
                        <input
                          type="date"
                          value={filters.closureDateFrom}
                          onChange={(e) => handleFilterChange('closureDateFrom', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">{t("transactions.filters.to")}</label>
                        <input
                          type="date"
                          value={filters.closureDateTo}
                          onChange={(e) => handleFilterChange('closureDateTo', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Çekilme Tarihi */}
                  <div className="bg-white dark:bg-background-dark rounded-lg p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center h-8 w-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base">check_circle</span>
                      </div>
                      <h3 className="text-sm font-semibold text-text-main">{t("transaction.withdrawalDate")}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">{t("transactions.filters.from")}</label>
                        <input
                          type="date"
                          value={filters.withdrawalDateFrom}
                          onChange={(e) => handleFilterChange('withdrawalDateFrom', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">{t("transactions.filters.to")}</label>
                        <input
                          type="date"
                          value={filters.withdrawalDateTo}
                          onChange={(e) => handleFilterChange('withdrawalDateTo', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors"
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
          <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
            <TransactionsFullTable
              transactions={currentItems}
              loading={loading}
              error={error}
              onRetry={loadData}
              onRefresh={loadData}
              canDelete={canDelete}
              isReadOnly={isTableReadOnly}
              onRowClick={handleRowClick}
              scrollHeight={tableScrollHeight}
              onScroll={handleTableScroll}
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
          isReadOnly={isTableReadOnly}
          currentUser={user}
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
      <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-gray-200 dark:border-gray-700 shadow-lg z-30 transition-[left,colors] duration-300 ease-in-out ${sidebarWide ? 'lg:left-64' : 'lg:left-20'}`}>
        <div className="px-4 md:px-6 py-3">
          {!loading && filteredTransactions.length > 0 ? (
            <div className="flex items-center justify-between gap-4">
              {/* Left: Info Section */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">inventory</span>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    {t("transactions.common.total")}: <strong className="font-bold">{transactions.length}</strong>
                  </span>
                </div>

                {/* Yüklenen verinin kapsamı — "Toplam" sayısının neden tüm
                    geçmişi kapsamadığını görünür kılar. */}
                {isClosedWindowed && (
                  <div
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                    title={t("transactions.page.closedWindowLoadedHint")}
                  >
                    <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-base">history</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {t("transactions.page.closedShort")}: <strong className="font-bold">{t("transactions.page.lastDaysLower", { days: closedWindowDays })}</strong>
                    </span>
                  </div>
                )}

                {hasActiveFilters && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base">filter_alt</span>
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                      {t("transactions.page.filtered")} <strong className="font-bold">{filteredTransactions.length}</strong>
                    </span>
                  </div>
                )}

                {isClientUser && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">visibility</span>
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{t("transactions.page.viewOnly")}</span>
                  </div>
                )}
              </div>

              {/* Center: Display Info */}
              <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-base">description</span>
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  {t("transactions.page.shown")} <strong className="font-bold">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTransactions.length)}</strong> / <strong className="font-bold">{filteredTransactions.length}</strong>
                </span>
              </div>

              {/* Right: Navigation/Pagination */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || totalPages <= 1}
                  className="px-2.5 md:px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs text-text-main"
                >
                  <span className="material-symbols-outlined text-base text-text-secondary dark:text-gray-400">chevron_left</span>
                  <span className="hidden xl:inline">{t("transactions.page.previous")}</span>
                </button>

                {totalPages > 1 ? (
                  <>
                    <div className="hidden md:flex items-center gap-1.5">
                      {renderPaginationButtons()}
                    </div>

                    <div className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors">
                      <span className="text-xs font-medium text-text-main">
                        {currentPage} / {totalPages}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-sm">article</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      <strong className="font-bold">1 / 1</strong>
                    </span>
                  </div>
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className="px-2.5 md:px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs text-text-main"
                >
                  <span className="hidden xl:inline">{t("transactions.page.next")}</span>
                  <span className="material-symbols-outlined text-base text-text-secondary dark:text-gray-400">chevron_right</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-base">inventory</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {loading ? t("common.loading") : t("transactions.page.noData")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}