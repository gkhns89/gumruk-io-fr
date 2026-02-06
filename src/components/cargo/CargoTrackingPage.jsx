import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
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

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-main dark:text-gray-100">Yük Takip</h1>
            <p className="text-text-secondary dark:text-gray-400 mt-1">
              {isClientUser
                ? 'Firmanıza ait yük kayıtlarını görüntüleyin'
                : 'Yük kayıtlarını görüntüleyin ve yönetin'
              }
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-text-main dark:text-gray-300"
            >
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">filter_list</span>
              <span>Filtrele</span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>

            {/* Add Button */}
            {canCreate && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span>Yeni Yük Ekle</span>
              </button>
            )}
          </div>
        </div>

        {/* Vehicle Type Quick Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedVehicleType("")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedVehicleType === ""
                ? "bg-primary text-white"
                : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-text-main dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Tümü
          </button>

          {VEHICLE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedVehicleType(type.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                selectedVehicleType === type.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-text-main dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <span className={`material-symbols-outlined text-lg ${
                selectedVehicleType === type.value ? 'text-white' : 'text-gray-600 dark:text-gray-400'
              }`}>{type.icon}</span>
              {type.displayName}
            </button>
          ))}
        </div>

        {/* Filter Drawer */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4 animate-slide-in-top border border-gray-200 dark:border-gray-700">
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

            <div className="grid grid-cols-3 gap-4">
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
        <CargoTrackingTable
          cargo={currentCargo}
          loading={loading}
          error={error}
          onRetry={loadData}
          onRefresh={loadData}
          canDelete={canDelete}
          isReadOnly={isClientUser}
          onRowClick={handleRowClick}
          selectedVehicleType={selectedVehicleType}
        />

        {/* Pagination Footer */}
        {!loading && sortedCargo.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              {/* Statistics */}
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-text-secondary dark:text-gray-400">
                    Toplam: <strong className="text-text-main dark:text-gray-300">{cargo.length}</strong>
                  </span>
                </div>
                {activeFilterCount > 0 && (
                  <div className="px-3 py-1 bg-primary/10 rounded-lg">
                    <span className="text-sm text-primary">
                      Filtrelenmiş: <strong>{sortedCargo.length}</strong>
                    </span>
                  </div>
                )}
                <div className="text-sm text-text-secondary dark:text-gray-400">
                  Gösterilen: {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, sortedCargo.length)}
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>

                  {/* Page Numbers */}
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`px-3 py-1 rounded-lg transition-colors ${
                            currentPage === pageNumber
                              ? 'bg-primary text-white'
                              : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (
                      pageNumber === currentPage - 2 ||
                      pageNumber === currentPage + 2
                    ) {
                      return <span key={pageNumber}>...</span>;
                    }
                    return null;
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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
          isReadOnly={isClientUser}
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
