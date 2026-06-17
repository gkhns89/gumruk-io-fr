import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePaymentRestriction } from "../../context/PaymentRestrictionProvider";
import { warehouseService } from "../../api/warehouseService";
import { handleError, handleApiResponse } from "../../utils/errorUtils";
import MainLayout from "../layout/MainLayout";
import WarehouseTable from "./WarehouseTable";
import AddWarehouseModal from "./AddWarehouseModal";
import EditWarehouseModal from "./EditWarehouseModal";
import DeleteWarehouseConfirmModal from "./DeleteWarehouseConfirmModal";
import TransferToTransactionModal from "./TransferToTransactionModal";
import AutoRefreshControl from "../transactions/AutoRefreshControl";
import ViewWarehouseModal from "./ViewWarehouseModal";

export default function WarehousePage() {
  const { user } = useAuth();
  const filterDrawerRef = useRef(null);
  const filterButtonRef = useRef(null);
  const pageHeaderRef = useRef(null);

  const [sidebarWide, setSidebarWide] = useState(() => {
    return localStorage.getItem("sidebarMode") === "pinned-expanded";
  });

  const [declarations, setDeclarations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const [filters, setFilters] = useState({
    status: "",
    customs: "",
    warehouse: "",
    search: "",
    declarationDateFrom: "",
    declarationDateTo: "",
    stampDateFrom: "",
    stampDateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [tableScrollHeight, setTableScrollHeight] = useState(400);
  const FOOTER_H = 56;

  const canCreate = ["SUPER_ADMIN", "BROKER_ADMIN", "BROKER_USER"].includes(user?.globalRole);
  const canDelete = ["SUPER_ADMIN", "BROKER_ADMIN"].includes(user?.globalRole);
  const isClientUser = user?.globalRole === "CLIENT_USER";
  const { isWriteBlocked, isFullReadOnly } = usePaymentRestriction();
  const isCreateBlocked = canCreate && (isWriteBlocked || isFullReadOnly);
  const isTableReadOnly = isClientUser || isFullReadOnly;

  const anyModalOpen = showAddModal || showEditModal || showDeleteModal || showTransferModal || showViewModal;

  useEffect(() => {
    const handler = (e) => setSidebarWide(e.detail.isWide);
    window.addEventListener("sidebarStateChanged", handler);
    return () => window.removeEventListener("sidebarStateChanged", handler);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // Dashboard'dan "/warehouse?edit=<id>" ile gelindiğinde ilgili antreponun düzenleme modalını aç
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && declarations.length > 0) {
      const decl = declarations.find((d) => d.id === parseInt(editId, 10));
      if (decl) {
        setSelectedDeclaration(decl);
        setShowEditModal(true);
        setSearchParams({});
      }
    }
  }, [searchParams, declarations, setSearchParams]);

  // Dashboard antrepo kartından "/warehouse?status=..." ile gelindiğinde durum filtresini uygula
  useEffect(() => {
    const status = searchParams.get("status");
    if (status) {
      setFilters((prev) => ({ ...prev, status }));
      const next = new URLSearchParams(searchParams);
      next.delete("status");
      setSearchParams(next, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideDrawer = filterDrawerRef.current?.contains(event.target);
      const onButton = filterButtonRef.current?.contains(event.target);
      if (!insideDrawer && !onButton) setShowFilters(false);
    };
    if (showFilters) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  useEffect(() => {
    const calculate = () => {
      const el = document.getElementById("main-scroll-area");
      if (!el || !pageHeaderRef.current) return;
      setTableScrollHeight(Math.max(200, el.clientHeight - pageHeaderRef.current.offsetHeight - FOOTER_H - 88));
    };
    if (!pageHeaderRef.current) return;
    const ro = new ResizeObserver(calculate);
    ro.observe(pageHeaderRef.current);
    calculate();
    window.addEventListener("resize", calculate);
    return () => { ro.disconnect(); window.removeEventListener("resize", calculate); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await warehouseService.getAll();
      if (result.success) {
        setDeclarations(result.data);
      } else {
        handleApiResponse(result, null, setError, "loading warehouse declarations");
      }
    } catch (err) {
      handleError(err, setError, "loading warehouse declarations", "Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const filteredDeclarations = useMemo(() => {
    let result = [...declarations];

    if (filters.status) {
      result = result.filter((d) => d.status === filters.status);
    }
    if (filters.customs) {
      const q = filters.customs.toLowerCase();
      result = result.filter((d) =>
        d.customs?.customsShortName?.toLowerCase().includes(q) ||
        d.customs?.customsFullName?.toLowerCase().includes(q)
      );
    }
    if (filters.warehouse) {
      const q = filters.warehouse.toLowerCase();
      result = result.filter((d) => d.warehouse?.toLowerCase().includes(q));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((d) =>
        d.fileNo?.toLowerCase().includes(q) ||
        d.declarationNo?.toLowerCase().includes(q) ||
        d.recipientName?.toLowerCase().includes(q) ||
        d.senderName?.toLowerCase().includes(q) ||
        d.carrierName?.toLowerCase().includes(q)
      );
    }
    if (filters.declarationDateFrom) {
      result = result.filter((d) => d.declarationDate && new Date(d.declarationDate) >= new Date(filters.declarationDateFrom));
    }
    if (filters.declarationDateTo) {
      result = result.filter((d) => d.declarationDate && new Date(d.declarationDate) <= new Date(filters.declarationDateTo));
    }
    if (filters.stampDateFrom) {
      result = result.filter((d) => d.stampPaymentDate && new Date(d.stampPaymentDate) >= new Date(filters.stampDateFrom));
    }
    if (filters.stampDateTo) {
      result = result.filter((d) => d.stampPaymentDate && new Date(d.stampPaymentDate) <= new Date(filters.stampDateTo));
    }

    return result.sort((a, b) => {
      // TESCIL_EDILDI first, KAPANDI last
      if (a.status === b.status) {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return a.status === "KAPANDI" ? 1 : -1;
    });
  }, [declarations, filters]);

  const totalPages = Math.ceil(filteredDeclarations.length / itemsPerPage);
  const indexOfFirst = (currentPage - 1) * itemsPerPage;
  const indexOfLast = indexOfFirst + itemsPerPage;
  const currentItems = filteredDeclarations.slice(indexOfFirst, indexOfLast);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    document.getElementById("main-scroll-area")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () =>
    setFilters({
      status: "",
      customs: "",
      warehouse: "",
      search: "",
      declarationDateFrom: "",
      declarationDateTo: "",
      stampDateFrom: "",
      stampDateTo: "",
    });

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status) count++;
    if (filters.customs) count++;
    if (filters.warehouse) count++;
    if (filters.search) count++;
    if (filters.declarationDateFrom || filters.declarationDateTo) count++;
    if (filters.stampDateFrom || filters.stampDateTo) count++;
    return count;
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;
  const handleTableScroll = (scrollTop) => setIsScrolled(scrollTop > 10);

  const handleAddSuccess = () => {
    setShowAddModal(false);
    loadData();
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedDeclaration(null);
    loadData();
  };

  const handleDeleteSuccess = () => {
    setShowDeleteModal(false);
    setSelectedDeclaration(null);
    loadData();
  };

  const handleTransferSuccess = () => {
    setShowTransferModal(false);
    setSelectedDeclaration(null);
    loadData();
  };

  const handleEdit = (decl) => {
    setSelectedDeclaration(decl);
    setShowEditModal(true);
  };

  const handleDelete = (decl) => {
    setSelectedDeclaration(decl);
    setShowDeleteModal(true);
  };

  const handleTransfer = (decl) => {
    setSelectedDeclaration(decl);
    setShowTransferModal(true);
  };

  const handleRowClick = (decl) => {
    setSelectedDeclaration(decl);
    setShowViewModal(true);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);

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
          className={`px-3 py-2 border rounded-lg transition-colors ${currentPage === i ? "bg-primary text-white border-primary" : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-text-main"}`}
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

  const inputFilterClass = "w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all";

  return (
    <MainLayout hasFooter={true}>
      <div className="flex flex-col pb-24">
        {/* Sticky Page Header */}
        <div
          ref={pageHeaderRef}
          className={`sticky top-0 z-30 px-4 md:px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-all duration-300 ease-in-out ${isScrolled ? "py-2 shadow-md" : "py-4 shadow-none"}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div>
              <h1 className={`font-bold text-text-main transition-all duration-300 ${isScrolled ? "text-base md:text-lg" : "text-2xl md:text-3xl"}`}>
                Antrepo Takip
              </h1>
              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${isScrolled ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
                <p className="text-text-secondary text-sm mt-1 overflow-hidden">
                  {isClientUser ? "Antrepo kayıtlarınızı görüntüleyin" : "Antrepo beyanname süreçlerini yönetin"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Filter Toggle */}
              <div className="relative">
                <button
                  ref={filterButtonRef}
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center justify-center bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-all duration-300 ${isScrolled ? "p-2 gap-0" : "gap-2 px-3 sm:px-4 py-2.5"}`}
                  title="Filtreler"
                >
                  <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                  {!isScrolled && <span className="whitespace-nowrap text-text-main text-sm hidden md:inline">Filtreler</span>}
                  {hasActiveFilters && (
                    <span className={`bg-primary text-white font-medium transition-all duration-300 ${isScrolled ? "absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] rounded-full" : "px-2 py-0.5 text-xs rounded-full"}`}>
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </button>
              </div>

              {/* Auto-Refresh */}
              <AutoRefreshControl
                onRefresh={loadData}
                loading={loading}
                isModalOpen={anyModalOpen}
                isFilterOpen={showFilters}
                onOpen={() => setShowFilters(false)}
                isScrolled={isScrolled}
              />

              {/* Add Button */}
              {canCreate && (
                <button
                  onClick={() => !isCreateBlocked && setShowAddModal(true)}
                  disabled={isCreateBlocked}
                  className={`flex items-center justify-center bg-primary text-white rounded-lg font-semibold shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${isCreateBlocked ? "" : "hover:bg-primary/90"} ${isScrolled ? "p-2 gap-0" : "gap-2 px-3 sm:px-4 py-2.5"}`}
                  title={isCreateBlocked ? "Ödeme gecikmesi nedeniyle yeni kayıt eklenemiyor" : "Yeni Antrepo Kaydı"}
                >
                  <span className="material-symbols-outlined text-[20px]">{isCreateBlocked ? "lock" : "add"}</span>
                  {!isScrolled && <span className="whitespace-nowrap text-sm hidden md:inline">Yeni Kayıt</span>}
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
                    <h3 className="text-sm font-semibold text-text-main">Filtreler</h3>
                    {hasActiveFilters && (
                      <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full font-medium">{getActiveFiltersCount()}</span>
                    )}
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      Filtreleri Temizle
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* General Search */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Genel Arama</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">search</span>
                    <input
                      type="text"
                      placeholder="Dosya No, Beyanname No, Alıcı, Gönderici, Nakliyeci..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange("search", e.target.value)}
                      className={inputFilterClass}
                    />
                    {filters.search && (
                      <button onClick={() => handleFilterChange("search", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main transition-colors">
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status, Customs, Warehouse */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Status */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Durum</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">flag</span>
                      <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange("status", e.target.value)}
                        style={{ backgroundImage: "none", WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 cursor-pointer transition-all"
                      >
                        <option value="">Tüm Durumlar</option>
                        <option value="TESCIL_EDILDI">Tescil Edildi</option>
                        <option value="KAPANDI">Kapandı</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  {/* Customs */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Gümrük</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">location_city</span>
                      <input
                        type="text"
                        placeholder="Gümrük ara..."
                        value={filters.customs}
                        onChange={(e) => handleFilterChange("customs", e.target.value)}
                        className={inputFilterClass}
                      />
                      {filters.customs && (
                        <button onClick={() => handleFilterChange("customs", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main transition-colors">
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Warehouse Name */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Antrepo</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">warehouse</span>
                      <input
                        type="text"
                        placeholder="Antrepo ara..."
                        value={filters.warehouse}
                        onChange={(e) => handleFilterChange("warehouse", e.target.value)}
                        className={inputFilterClass}
                      />
                      {filters.warehouse && (
                        <button onClick={() => handleFilterChange("warehouse", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main transition-colors">
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date Filters — Collapsible */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setShowDateFilters(!showDateFilters)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">calendar_month</span>
                      <h4 className="text-xs font-semibold text-text-main">Tarih Filtreleri</h4>
                      {(filters.declarationDateFrom || filters.declarationDateTo || filters.stampDateFrom || filters.stampDateTo) && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">Aktif</span>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-text-secondary text-lg">{showDateFilters ? "expand_less" : "expand_more"}</span>
                  </button>

                  {showDateFilters && (
                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slideDown">
                      {/* Beyan Tarihi */}
                      <div className="bg-white dark:bg-background-dark rounded-lg p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center justify-center h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">assignment</span>
                          </div>
                          <h3 className="text-sm font-semibold text-text-main">Beyan Tarihi</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">Başlangıç</label>
                            <input type="date" value={filters.declarationDateFrom} onChange={(e) => handleFilterChange("declarationDateFrom", e.target.value)} className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">Bitiş</label>
                            <input type="date" value={filters.declarationDateTo} onChange={(e) => handleFilterChange("declarationDateTo", e.target.value)} className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors" />
                          </div>
                        </div>
                      </div>

                      {/* Pul Tarihi */}
                      <div className="bg-white dark:bg-background-dark rounded-lg p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center justify-center h-8 w-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">local_post_office</span>
                          </div>
                          <h3 className="text-sm font-semibold text-text-main">Pul Tarihi</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">Başlangıç</label>
                            <input type="date" value={filters.stampDateFrom} onChange={(e) => handleFilterChange("stampDateFrom", e.target.value)} className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">Bitiş</label>
                            <input type="date" value={filters.stampDateTo} onChange={(e) => handleFilterChange("stampDateTo", e.target.value)} className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-800 text-text-main dark:text-gray-100 transition-colors" />
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
            <WarehouseTable
              declarations={currentItems}
              loading={loading}
              error={error}
              onRetry={loadData}
              onRefresh={loadData}
              canDelete={canDelete}
              canWrite={!isClientUser}
              userRole={user?.globalRole}
              isReadOnly={isTableReadOnly}
              onRowClick={handleRowClick}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTransfer={handleTransfer}
              scrollHeight={tableScrollHeight}
              onScroll={handleTableScroll}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddWarehouseModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
          currentUser={user}
        />
      )}

      {showEditModal && selectedDeclaration && (
        <EditWarehouseModal
          declaration={selectedDeclaration}
          onClose={() => { setShowEditModal(false); setSelectedDeclaration(null); }}
          onSuccess={handleEditSuccess}
          currentUser={user}
        />
      )}

      {showDeleteModal && selectedDeclaration && (
        <DeleteWarehouseConfirmModal
          declaration={selectedDeclaration}
          onClose={() => { setShowDeleteModal(false); setSelectedDeclaration(null); }}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {showTransferModal && selectedDeclaration && (
        <TransferToTransactionModal
          declaration={selectedDeclaration}
          onClose={() => { setShowTransferModal(false); setSelectedDeclaration(null); }}
          onSuccess={handleTransferSuccess}
        />
      )}

      {showViewModal && selectedDeclaration && (
        <ViewWarehouseModal
          declaration={selectedDeclaration}
          onClose={() => { setShowViewModal(false); setSelectedDeclaration(null); }}
          onEdit={(decl) => { setSelectedDeclaration(decl); setShowEditModal(true); }}
          onTransfer={(decl) => { setSelectedDeclaration(decl); setShowTransferModal(true); }}
          canEdit={
            canCreate && !isWriteBlocked && !isFullReadOnly &&
            (!selectedDeclaration || selectedDeclaration.status !== "KAPANDI" ||
              ["SUPER_ADMIN", "BROKER_ADMIN"].includes(user?.globalRole))
          }
          canTransfer={canCreate && !isWriteBlocked && !isFullReadOnly}
        />
      )}

      {/* Fixed Footer */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-gray-200 dark:border-gray-700 shadow-lg z-30 transition-[left,colors] duration-300 ease-in-out ${sidebarWide ? "lg:left-64" : "lg:left-20"}`}>
        <div className="px-4 md:px-6 py-3">
          {!loading && filteredDeclarations.length > 0 ? (
            <div className="flex items-center justify-between gap-4">
              {/* Left */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">warehouse</span>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Toplam: <strong className="font-bold">{declarations.length}</strong>
                  </span>
                </div>
                {hasActiveFilters && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base">filter_alt</span>
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                      Filtrelenmiş: <strong className="font-bold">{filteredDeclarations.length}</strong>
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

              {/* Center */}
              <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-base">description</span>
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  Gösterilen: <strong className="font-bold">{indexOfFirst + 1}-{Math.min(indexOfLast, filteredDeclarations.length)}</strong> / <strong className="font-bold">{filteredDeclarations.length}</strong>
                </span>
              </div>

              {/* Right: Pagination */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || totalPages <= 1}
                  className="px-2.5 md:px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs text-text-main"
                >
                  <span className="material-symbols-outlined text-base text-text-secondary">chevron_left</span>
                  <span className="hidden xl:inline">Önceki</span>
                </button>

                {totalPages > 1 ? (
                  <>
                    <div className="hidden md:flex items-center gap-1.5">{renderPaginationButtons()}</div>
                    <div className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors">
                      <span className="text-xs font-medium text-text-main">{currentPage} / {totalPages}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300"><strong>1 / 1</strong></span>
                  </div>
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className="px-2.5 md:px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs text-text-main"
                >
                  <span className="hidden xl:inline">Sonraki</span>
                  <span className="material-symbols-outlined text-base text-text-secondary">chevron_right</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-base">warehouse</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
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
