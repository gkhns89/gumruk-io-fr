import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePaymentRestriction } from '../../context/PaymentRestrictionProvider';
import { cargoService } from '../../api/cargoService';
import { CARGO_STATUS, VEHICLE_TYPES } from '../../utils/constants';
import { handleError } from '../../utils/errorUtils';
import MainLayout from '../layout/MainLayout';
import CargoTrackingTable from './CargoTrackingTable';
import AddCargoModal from './AddCargoModal';
import EditCargoModal from './EditCargoModal';
import DeleteCargoConfirmModal from './DeleteCargoConfirmModal';

export default function CargoTrackingPage() {
  const { user } = useAuth();

  // Sidebar state for footer positioning
  const [sidebarWide, setSidebarWide] = useState(() => {
    return localStorage.getItem('sidebarMode') === 'pinned-expanded';
  });

  const [cargo, setCargo] = useState([]);
  const [filteredCargo, setFilteredCargo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCargo, setSelectedCargo] = useState(null);

  // Vehicle type quick filter
  const [selectedVehicleType, setSelectedVehicleType] = useState("");

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    clientSearch: "",
    search: "",
  });

  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Permissions
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

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [filters, cargo, selectedVehicleType]);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await cargoService.getAllCargo();

      if (result.success) {
        setCargo(result.data);
      } else {
        setError(result.error || 'Veriler yüklenemedi');
      }
    } catch (err) {
      handleError(err, setError, 'cargo loading', 'Yük verileri yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...cargo];

    // Vehicle type filter
    if (selectedVehicleType) {
      filtered = filtered.filter(c => c.vehicleType === selectedVehicleType);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    // Client search
    if (filters.clientSearch) {
      filtered = filtered.filter(c =>
        c.clientCompany?.name?.toLowerCase().includes(filters.clientSearch.toLowerCase())
      );
    }

    // General search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c =>
        c.senderCompany?.toLowerCase().includes(searchLower) ||
        c.carrierName?.toLowerCase().includes(searchLower) ||
        c.licensePlate?.toLowerCase().includes(searchLower) ||
        c.billOfLading?.toLowerCase().includes(searchLower) ||
        c.consignmentNumber?.toLowerCase().includes(searchLower) ||
        c.containerNumber?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredCargo(filtered);
  };

  // Custom sorting: Status priority (TRACKING → ARRIVED → COMPLETED), then by date DESC
  const sortedCargo = useMemo(() => {
    return [...filteredCargo].sort((a, b) => {
      const statusA = CARGO_STATUS.find(s => s.value === a.status)?.sortOrder || 999;
      const statusB = CARGO_STATUS.find(s => s.value === b.status)?.sortOrder || 999;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      // Within same status, newest first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [filteredCargo]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCargo = sortedCargo.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedCargo.length / itemsPerPage);

  const [isScrolled, setIsScrolled] = useState(false);
  const pageHeaderRef = useRef(null);
  const [pageHeaderHeight, setPageHeaderHeight] = useState(80);
  const [tableScrollHeight, setTableScrollHeight] = useState(() => window.innerHeight - 200);
  const FOOTER_H = 56;

  useEffect(() => {
    const calculate = () => {
      const el = document.getElementById("main-scroll-area");
      if (!el || !pageHeaderRef.current) return;
      const ph = pageHeaderRef.current.offsetHeight;
      setPageHeaderHeight(ph);
      setTableScrollHeight(Math.max(200, el.clientHeight - ph - FOOTER_H));
    };
    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.getElementById("main-scroll-area");
      if (!el || !pageHeaderRef.current) return;
      const ph = pageHeaderRef.current.offsetHeight;
      setPageHeaderHeight(ph);
      setTableScrollHeight(Math.max(200, el.clientHeight - ph - FOOTER_H));
    }, 350);
    return () => clearTimeout(timer);
  }, [isScrolled]);

  const handleTableScroll = (scrollTop) => setIsScrolled(scrollTop > 10);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    document.getElementById("main-scroll-area")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      clientSearch: "",
      search: "",
    });
    setSelectedVehicleType("");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.clientSearch) count++;
    if (filters.search) count++;
    if (selectedVehicleType) count++;
    return count;
  }, [filters, selectedVehicleType]);

  const handleRowClick = (cargoItem) => {
    setSelectedCargo(cargoItem);
    setShowEditModal(true);
  };

  const handleEditClick = (cargoItem) => {
    setSelectedCargo(cargoItem);
    setShowEditModal(true);
  };

  const handleDeleteClick = (cargoItem) => {
    setSelectedCargo(cargoItem);
    setShowDeleteModal(true);
  };

  const handleModalSuccess = () => {
    loadData();
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedCargo(null);
  };

  // Render pagination buttons with ellipsis
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

  return (
    <MainLayout hasFooter={true}>
      <div className="flex flex-col pb-24">
        {/* Page Header — sticky, scroll edince minimal/ikon hale gelir */}
        <div
          ref={pageHeaderRef}
          className={`
            sticky top-0 z-20
            px-4 md:px-6 border-b border-gray-200 dark:border-gray-700
            bg-white dark:bg-background-dark flex-shrink-0
            transition-all duration-300 ease-in-out
            ${isScrolled ? "py-2 shadow-md" : "py-4 shadow-none"}
          `}
        >
          {/* Başlık + Butonlar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div>
              <h1 className={`font-bold text-text-main dark:text-gray-100 transition-all duration-300 ${isScrolled ? "text-base md:text-lg" : "text-2xl md:text-3xl"}`}>
                Yük Takip
              </h1>
              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${isScrolled ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
                <p className="text-text-secondary dark:text-gray-400 text-sm mt-1 overflow-hidden">
                  {isClientUser ? 'Firmanıza ait yük kayıtlarını görüntüleyin' : 'Yük kayıtlarını görüntüleyin ve yönetin'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`relative flex items-center justify-center bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-all duration-300 ${
                  isScrolled ? "p-2 gap-0" : "gap-2 px-3 sm:px-4 py-2.5"
                }`}
                title="Filtrele"
              >
                <span className="material-symbols-outlined text-primary text-[20px]">filter_list</span>
                {!isScrolled && <span className="text-sm text-text-main dark:text-gray-300 hidden md:inline">Filtrele</span>}
                {activeFilterCount > 0 && (
                  <span className={`bg-primary text-white font-medium transition-all duration-300 ${
                    isScrolled
                      ? "absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] rounded-full"
                      : "px-2 py-0.5 text-xs rounded-full"
                  }`}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Refresh */}
              <button
                onClick={loadData}
                disabled={loading}
                className={`flex items-center justify-center bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 disabled:opacity-50 ${
                  isScrolled ? "p-2" : "px-3 sm:px-4 py-2.5"
                }`}
                title="Yenile"
              >
                <span className={`material-symbols-outlined text-primary text-[20px] ${loading ? 'animate-spin' : ''}`}>
                  refresh
                </span>
              </button>

              {/* Add Button */}
              {canCreate && (
                <button
                  onClick={() => !isCreateBlocked && setShowAddModal(true)}
                  disabled={isCreateBlocked}
                  className={`flex items-center justify-center bg-primary text-white rounded-lg font-semibold shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCreateBlocked ? '' : 'hover:bg-primary/90'
                  } ${isScrolled ? "p-2 gap-0" : "gap-2 px-3 sm:px-4 py-2.5"}`}
                  title={isCreateBlocked ? "Ödeme gecikmesi nedeniyle yeni kayıt eklenemiyor" : "Yeni Yük Ekle"}
                >
                  <span className="material-symbols-outlined text-[20px]">{isCreateBlocked ? 'lock' : 'add'}</span>
                  {!isScrolled && <span className="text-sm hidden md:inline">Yeni Yük Ekle</span>}
                </button>
              )}
            </div>
          </div>

          {/* Araç Tipi Hızlı Filtreleri — scroll'da kaybolur */}
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${isScrolled ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
            <div className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 pt-3">
                <button
                  onClick={() => setSelectedVehicleType("")}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedVehicleType === ""
                      ? "bg-primary text-white"
                      : "bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-text-main dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  Tümü
                </button>
                {VEHICLE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedVehicleType(type.value)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedVehicleType === type.value
                        ? "bg-primary text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-text-main dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-base ${selectedVehicleType === type.value ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {type.icon}
                    </span>
                    {type.displayName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">

        {/* Filter Drawer */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-4 animate-slide-in-top border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-main dark:text-gray-100">Filtreler</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary font-medium"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-text-main dark:text-gray-300 mb-2">
                  Durum
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">Tümü</option>
                  {CARGO_STATUS.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Search */}
              {!isClientUser && (
                <div>
                  <label className="block text-sm font-medium text-text-main dark:text-gray-300 mb-2">
                    Müşteri Ara
                  </label>
                  <input
                    type="text"
                    value={filters.clientSearch}
                    onChange={(e) => handleFilterChange('clientSearch', e.target.value)}
                    placeholder="Müşteri adı..."
                    className="form-input w-full"
                  />
                </div>
              )}

              {/* General Search */}
              <div>
                <label className="block text-sm font-medium text-text-main dark:text-gray-300 mb-2">
                  Genel Arama
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Plaka, B/L, konşimento..."
                  className="form-input w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
          <CargoTrackingTable
            cargo={currentCargo}
            loading={loading}
            error={error}
            onRetry={loadData}
            onRefresh={loadData}
            canDelete={canDelete}
            isReadOnly={isTableReadOnly}
            onRowClick={handleRowClick}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            selectedVehicleType={selectedVehicleType}
            scrollHeight={tableScrollHeight}
            onScroll={handleTableScroll}
          />
        </div>
        </div>

        {/* Fixed Footer with Statistics and Pagination */}
        <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-gray-200 dark:border-gray-700 shadow-lg z-30 transition-[left,colors] duration-300 ease-in-out ${sidebarWide ? 'lg:left-64' : 'lg:left-20'}`}>
          <div className="px-4 md:px-6 py-3">
            {!loading && sortedCargo.length > 0 ? (
              <div className="flex items-center justify-between gap-4">
                {/* Left: Info Section */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">local_shipping</span>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Toplam: <strong className="font-bold">{cargo.length}</strong>
                    </span>
                  </div>

                  {activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base">filter_alt</span>
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">
                        Filtrelenmiş: <strong className="font-bold">{sortedCargo.length}</strong>
                      </span>
                    </div>
                  )}

                  {isClientUser && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors">
                      <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">visibility</span>
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Görüntüleme</span>
                    </div>
                  )}
                </div>

                {/* Center: Display Info */}
                <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-base">description</span>
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    Gösterilen: <strong className="font-bold">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, sortedCargo.length)}</strong> / <strong className="font-bold">{sortedCargo.length}</strong>
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
                    <span className="hidden xl:inline">Önceki</span>
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
                    <span className="hidden xl:inline">Sonraki</span>
                    <span className="material-symbols-outlined text-base text-text-secondary dark:text-gray-400">chevron_right</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-base">local_shipping</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {loading ? "Yükleniyor..." : "Veri yok"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddCargoModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleModalSuccess}
          currentUser={user}
        />
      )}

      {showEditModal && selectedCargo && (
        <EditCargoModal
          cargo={selectedCargo}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCargo(null);
          }}
          onSuccess={handleModalSuccess}
          isReadOnly={isTableReadOnly}
          currentUser={user}
        />
      )}

      {showDeleteModal && selectedCargo && (
        <DeleteCargoConfirmModal
          cargo={selectedCargo}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCargo(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </MainLayout>
  );
}
