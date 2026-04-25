import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePaymentRestriction } from '../../context/PaymentRestrictionProvider';
import { employeeService } from '../../api/employeeService';
import { companyService } from '../../api/companyService';
import MainLayout from '../../components/layout/MainLayout';
import AddEmployeeModal from '../../components/employees/AddEmployeeModal';
import ViewEmployeeModal from '../../components/employees/ViewEmployeeModal';
import EditEmployeeModal from '../../components/employees/EditEmployeeModal';
import DeleteEmployeeModal from '../../components/employees/DeleteEmployeeModal';
import { handleError, handleApiResponse } from '../../utils/errorUtils';

const EmployeesPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';
  const isBrokerAdmin = user?.globalRole === 'BROKER_ADMIN';
  const canManageEmployees = isSuperAdmin || isBrokerAdmin;

  // SUPER_ADMIN: broker seçim state'leri
  const [brokers, setBrokers] = useState([]);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [brokersError, setBrokersError] = useState('');
  const [selectedBroker, setSelectedBroker] = useState(null);

  // Core data
  const [employees, setEmployees] = useState([]);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const effectiveCompanyId = isSuperAdmin ? selectedBroker?.id : user?.company?.id;

  // SUPER_ADMIN: broker listesini yükle
  useEffect(() => {
    if (!isSuperAdmin) return;
    setBrokersLoading(true);
    setBrokersError('');
    companyService.getAllBrokerCompanies()
      .then(result => {
        if (result.success) {
          setBrokers(result.data);
        } else {
          setBrokersError(result.error || 'Gümrük firmaları yüklenemedi');
        }
      })
      .catch(() => setBrokersError('Gümrük firmaları yüklenirken bir hata oluştu'))
      .finally(() => setBrokersLoading(false));
  }, [isSuperAdmin]);

  // Load employees and limits
  const loadEmployees = useCallback(async () => {
    if (!effectiveCompanyId) {
      setEmployees([]);
      setLimits(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [employeesResult, limitsResult] = await Promise.all([
        employeeService.getEmployees(effectiveCompanyId),
        employeeService.getEmployeeLimits(effectiveCompanyId)
      ]);

      handleApiResponse(
        employeesResult,
        () => setEmployees(employeesResult.data),
        setError,
        'Çalışanlar yükleme'
      );

      if (limitsResult.success) {
        setLimits(limitsResult.data);
      }
    } catch (err) {
      handleError(err, setError, 'Çalışanlar yükleme', 'Çalışanlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Get role badge styling
  const getRoleBadge = (role) => {
    const badges = {
      BROKER_ADMIN: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-800 dark:text-purple-300',
        border: 'border-purple-300 dark:border-purple-700',
        label: 'Broker Yöneticisi'
      },
      BROKER_USER: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-700',
        label: 'Broker Kullanıcısı'
      }
    };
    return badges[role] || {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-800 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
      label: role
    };
  };

  const getStatusBadge = (isActive) => {
    return isActive ? {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700',
      label: 'Aktif'
    } : {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
      label: 'Beklemede'
    };
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesRole = roleFilter === 'ALL' || employee.globalRole === roleFilter;
    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && employee.isActive) ||
      (statusFilter === 'PENDING' && !employee.isActive);
    const matchesSearch = !searchTerm ||
      employee.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  const canAddEmployee = limits && (limits.canAddUser !== false) && (limits.remainingUserQuota > 0);
  const { isWriteBlocked, isFullReadOnly } = usePaymentRestriction();
  const isAddBlocked = !isSuperAdmin && (isWriteBlocked || isFullReadOnly);

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark flex-shrink-0 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary">badge</span>
                Çalışan Yönetimi
              </h1>
              <p className="text-text-secondary mt-2">
                {isSuperAdmin
                  ? selectedBroker
                    ? `${selectedBroker.name} — çalışanlar`
                    : 'Çalışanları görüntülemek için bir gümrük firması seçin'
                  : 'Broker firması çalışanlarınızı yönetin'}
              </p>
              {limits && (
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold">{limits.currentBrokerUsers || 0}</span> /
                  <span className="font-semibold"> {limits.maxBrokerUsers || 0}</span> broker kullanıcı
                  {!canAddEmployee && (
                    <span className="ml-2 text-red-600 font-semibold">• Limit doldu!</span>
                  )}
                </p>
              )}
            </div>

            {(!isSuperAdmin || selectedBroker) && (
              <button
                onClick={() => setShowAddModal(true)}
                disabled={!canAddEmployee || isAddBlocked}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                title={isAddBlocked ? 'Ödeme gecikmesi nedeniyle yeni kayıt eklenemiyor' : !canAddEmployee ? 'Çalışan limiti doldu' : 'Yeni çalışan ekle'}
              >
                <span className="material-symbols-outlined">{isAddBlocked ? 'lock' : 'person_add'}</span>
                Yeni Çalışan Ekle
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-6">

            {/* SUPER_ADMIN: Broker Seçimi */}
            {isSuperAdmin && (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors">
                <label htmlFor="broker-select" className="block text-sm font-medium text-text-main mb-2">
                  Gümrük Firması Seçin
                </label>
                {brokersLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm">Yükleniyor...</span>
                  </div>
                ) : brokersError ? (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 py-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span className="text-sm">{brokersError}</span>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      business
                    </span>
                    <select
                      id="broker-select"
                      value={selectedBroker?.id ?? ''}
                      onChange={(e) => {
                        const broker = brokers.find(b => b.id === Number(e.target.value));
                        setSelectedBroker(broker || null);
                        setEmployees([]);
                        setLimits(null);
                      }}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">— Firma seçin —</option>
                      {brokers.map(broker => (
                        <option key={broker.id} value={broker.id}>
                          {broker.name}{broker.shortName ? ` (${broker.shortName})` : ''}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* SUPER_ADMIN seçim yapılmadıysa placeholder */}
            {isSuperAdmin && !selectedBroker && !brokersLoading && (
              <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700 transition-colors">
                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">
                  business
                </span>
                <h3 className="text-xl font-semibold text-text-main mb-2">Gümrük Firması Seçin</h3>
                <p className="text-text-secondary">
                  Çalışanları görüntülemek için yukarıdan bir gümrük firması seçin
                </p>
              </div>
            )}

            {/* Seçim yapıldıysa veya broker kullanıcısıysa içerik */}
            {(!isSuperAdmin || selectedBroker) && (
              <>
                {/* Filters */}
                <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-main mb-2">Çalışan Ara</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">search</span>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="İsim veya email ile ara..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-main mb-2">Rol Filtresi</label>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors"
                      >
                        <option value="ALL">Tümü</option>
                        <option value="BROKER_ADMIN">Broker Yöneticisi</option>
                        <option value="BROKER_USER">Broker Kullanıcısı</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-main mb-2">Durum Filtresi</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors"
                      >
                        <option value="ALL">Tümü</option>
                        <option value="ACTIVE">Aktif</option>
                        <option value="PENDING">Beklemede</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="text-text-secondary">Yükleniyor...</p>
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
                {!loading && !error && filteredEmployees.length === 0 && (
                  <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700 transition-colors">
                    <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4 block">badge</span>
                    <h3 className="text-xl font-semibold text-text-main mb-2">
                      {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                        ? 'Filtre kriterlerine uygun çalışan bulunamadı'
                        : 'Henüz çalışan kaydınız bulunmuyor'}
                    </h3>
                    <p className="text-text-secondary mb-6">
                      {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                        ? 'Farklı filtreler deneyerek arama yapabilirsiniz'
                        : 'Yeni çalışan eklemek için "Yeni Çalışan Ekle" butonuna tıklayın'}
                    </p>
                    {!searchTerm && roleFilter === 'ALL' && statusFilter === 'ALL' && canAddEmployee && !isAddBlocked && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <span className="material-symbols-outlined">person_add</span>
                        Yeni Çalışan Ekle
                      </button>
                    )}
                  </div>
                )}

                {/* Employees Table */}
                {!loading && !error && filteredEmployees.length > 0 && (
                  <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-main uppercase tracking-wider">Çalışan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kayıt Tarihi</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-background-dark divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredEmployees.map((employee) => {
                            const roleBadge = getRoleBadge(employee.globalRole);
                            const statusBadge = getStatusBadge(employee.isActive);
                            const isSelf = employee.id === user?.id;
                            return (
                              <tr
                                key={employee.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                onClick={() => {
                                  const selection = window.getSelection();
                                  if (selection && selection.toString().length > 0) return;
                                  setSelectedEmployee(employee);
                                  setShowViewModal(true);
                                }}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                                      <span className="material-symbols-outlined text-primary">person</span>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-text-main">
                                        {employee.username}
                                        {isSelf && <span className="ml-2 text-xs text-gray-500">(Siz)</span>}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-text-secondary">{employee.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                                      {roleBadge.label}
                                    </span>
                                    {employee.isPaymentResponsible && (
                                      <span
                                        className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700"
                                        title="Ödeme sorumlusu"
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>account_balance</span>
                                        Ödeme Sorumlusu
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                                    {statusBadge.label}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                  {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('tr-TR') : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedEmployee(employee); setShowViewModal(true); }}
                                      className="text-blue-600 hover:text-blue-800 transition-colors"
                                      title="Detayları Görüntüle"
                                    >
                                      <span className="material-symbols-outlined">visibility</span>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedEmployee(employee); setShowEditModal(true); }}
                                      className="text-primary hover:text-primary/80 transition-colors"
                                      title="Düzenle"
                                    >
                                      <span className="material-symbols-outlined">edit</span>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedEmployee(employee); setShowDeleteModal(true); }}
                                      disabled={isSelf}
                                      className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={isSelf ? 'Kendinizi silemezsiniz' : 'Sil'}
                                    >
                                      <span className="material-symbols-outlined">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* Add Employee Modal */}
        {showAddModal && (
          <AddEmployeeModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => { setShowAddModal(false); loadEmployees(); }}
            brokerCompanyId={effectiveCompanyId}
            currentLimits={limits}
          />
        )}

        {/* View Employee Modal */}
        {showViewModal && selectedEmployee && (
          <ViewEmployeeModal
            onClose={() => { setShowViewModal(false); setSelectedEmployee(null); }}
            employee={selectedEmployee}
            onEdit={(employee) => {
              setShowViewModal(false);
              setSelectedEmployee(employee);
              setShowEditModal(true);
            }}
          />
        )}

        {/* Edit Employee Modal */}
        {showEditModal && selectedEmployee && (
          <EditEmployeeModal
            onClose={() => { setShowEditModal(false); setSelectedEmployee(null); }}
            employee={selectedEmployee}
            currentUser={user}
            onSuccess={() => { setShowEditModal(false); setSelectedEmployee(null); loadEmployees(); }}
          />
        )}

        {/* Delete Employee Modal */}
        {showDeleteModal && selectedEmployee && (
          <DeleteEmployeeModal
            onClose={() => { setShowDeleteModal(false); setSelectedEmployee(null); }}
            employee={selectedEmployee}
            currentUser={user}
            onSuccess={() => { setShowDeleteModal(false); setSelectedEmployee(null); loadEmployees(); }}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default EmployeesPage;
