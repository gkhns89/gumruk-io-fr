import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { courierService } from '../../api/courierService';
import { companyService } from '../../api/companyService';
import MainLayout from '../../components/layout/MainLayout';
import AddCourierModal from '../../components/couriers/AddCourierModal';
import EditCourierModal from '../../components/couriers/EditCourierModal';
import DeleteCourierModal from '../../components/couriers/DeleteCourierModal';
import NewFeatureBadge from '../../components/common/NewFeatureBadge';
import { FEATURE_FLAGS } from '../../utils/featureFlags';
import { getCourierType, getCourierVehicleType, isInHouseCourier } from '../../utils/constants';
import { t } from '../../locales';

export default function CouriersManagementPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';
  const isBrokerAdmin = user?.globalRole === 'BROKER_ADMIN';
  const canManageCouriers = isSuperAdmin || isBrokerAdmin;

  // Firma içi sevkiyat — FEATURE_FLAGS.COURIER_CLIENT_STOPS (backend oluşturmada ayrıca kontrol ediyor)
  const { hasFeature, isPilotFeature } = useFeatureFlags();
  const inHouseEnabled = hasFeature(FEATURE_FLAGS.COURIER_CLIENT_STOPS);
  const inHousePilot = isPilotFeature(FEATURE_FLAGS.COURIER_CLIENT_STOPS);

  // SUPER_ADMIN: broker seçim state'leri
  const [brokers, setBrokers] = useState([]);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [brokersError, setBrokersError] = useState('');
  const [selectedBroker, setSelectedBroker] = useState(null);

  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'EXTERNAL' | 'IN_HOUSE'

  // Modals
  const [addCourierType, setAddCourierType] = useState(null); // null | 'EXTERNAL' | 'IN_HOUSE'
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState(null);

  const brokerCompanyId = isSuperAdmin ? selectedBroker?.id : user?.company?.id;

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
          setBrokersError(result.error || t('management.brokersLoadError'));
        }
      })
      .catch(() => setBrokersError(t('management.brokersLoadErrorUnexpected')))
      .finally(() => setBrokersLoading(false));
  }, [isSuperAdmin]);

  const loadCouriers = useCallback(async () => {
    if (!brokerCompanyId) {
      setCouriers([]);
      return;
    }

    setLoading(true);
    try {
      const result = await courierService.getCourierCompanies(brokerCompanyId);
      setCouriers(result.success ? (result.data || []) : []);
    } catch (err) {
      console.error('Error loading couriers:', err);
      setCouriers([]);
    } finally {
      setLoading(false);
    }
  }, [brokerCompanyId]);

  useEffect(() => {
    loadCouriers();
  }, [loadCouriers]);

  if (!canManageCouriers) {
    return (
      <MainLayout>
        <div className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{t('management.noAccess')}</p>
        </div>
      </MainLayout>
    );
  }

  // Tip rozeti ve filtre: bayrak açıksa ya da (bayrak sonradan kapansa bile) firma içi kayıt varsa
  const showCourierTypes = inHouseEnabled || couriers.some(isInHouseCourier);
  const visibleCouriers = showCourierTypes && typeFilter !== 'ALL'
    ? couriers.filter(courier => (isInHouseCourier(courier) ? 'IN_HOUSE' : 'EXTERNAL') === typeFilter)
    : couriers;

  const filterOptions = [
    ['ALL', t('management.all')],
    ['EXTERNAL', t('couriers.page.filterExternal')],
    ['IN_HOUSE', t('couriers.types.inHouse')],
  ];

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {t('nav.couriers')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isSuperAdmin
                ? selectedBroker
                  ? t('couriers.page.subtitleBroker', { name: selectedBroker.name })
                  : t('couriers.page.subtitleSelectBroker')
                : inHouseEnabled ? t('couriers.page.subtitleWithInHouse') : t('couriers.page.subtitle')}
            </p>
          </div>
          {(!isSuperAdmin || selectedBroker) && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                onClick={() => setAddCourierType('EXTERNAL')}
              >
                <span className="material-symbols-outlined text-xl">add</span>
                <span>{t('couriers.page.add')}</span>
              </button>
              {inHouseEnabled && (
                <button
                  className="flex items-center gap-2 px-4 py-2 border border-primary text-primary bg-white dark:bg-background-dark rounded-lg hover:bg-primary/10 transition-colors"
                  onClick={() => setAddCourierType('IN_HOUSE')}
                >
                  <span className="material-symbols-outlined text-xl">local_shipping</span>
                  <span>{t('couriers.inHouse.add')}</span>
                  {inHousePilot && <NewFeatureBadge />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* SUPER_ADMIN: Broker Seçimi */}
        {isSuperAdmin && (
          <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-4 mb-6 transition-colors">
            <label htmlFor="broker-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('management.selectBroker')}
            </label>
            {brokersLoading ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">{t('common.loading')}</span>
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
                    setCouriers([]);
                    setTypeFilter('ALL');
                  }}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors appearance-none cursor-pointer"
                >
                  <option value="">{t('management.selectCompanyOption')}</option>
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
          <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center transition-colors">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">
              business
            </span>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {t('management.selectBroker')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('couriers.page.selectBrokerHint')}
            </p>
          </div>
        )}

        {/* İçerik: seçim yapıldıysa veya broker kullanıcısıysa */}
        {(!isSuperAdmin || selectedBroker) && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-48" />
                ))}
              </div>
            ) : couriers.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">
                  two_wheeler
                </span>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {inHouseEnabled ? t('couriers.page.emptyWithInHouse') : t('couriers.page.empty')}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    onClick={() => setAddCourierType('EXTERNAL')}
                  >
                    {t('couriers.page.addFirst')}
                  </button>
                  {inHouseEnabled && (
                    <button
                      className="flex items-center gap-2 px-4 py-2 border border-primary text-primary bg-white dark:bg-background-dark rounded-lg hover:bg-primary/10 transition-colors"
                      onClick={() => setAddCourierType('IN_HOUSE')}
                    >
                      {t('couriers.inHouse.addFirst')}
                      {inHousePilot && <NewFeatureBadge />}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {showCourierTypes
                      ? t('couriers.page.foundRecords', { count: visibleCouriers.length })
                      : t('couriers.page.found', { count: couriers.length })}
                  </div>
                  {showCourierTypes && (
                    <div className="inline-flex self-start rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                      {filterOptions.map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={typeFilter === value}
                          onClick={() => setTypeFilter(value)}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                            typeFilter === value
                              ? 'bg-primary text-white'
                              : 'bg-white dark:bg-gray-800 text-text-main hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {visibleCouriers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    {t('couriers.page.filterEmpty')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleCouriers.map(courier => {
                      const inHouse = isInHouseCourier(courier);
                      const typeOption = getCourierType(inHouse ? 'IN_HOUSE' : 'EXTERNAL');
                      const vehicleType = inHouse ? getCourierVehicleType(courier.vehicleType) : null;
                      // Bilinmeyen araç tipi ham değeriyle gösterilir
                      const vehicleLabel = vehicleType?.label || courier.vehicleType;

                      return (
                        <div
                          key={courier.id}
                          className="bg-white dark:bg-background-dark rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start justify-between gap-2 mb-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {inHouse && (
                                <div
                                  className="flex-shrink-0 h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"
                                  title={vehicleLabel || undefined}
                                >
                                  <span className="material-symbols-outlined text-violet-700 dark:text-violet-300">
                                    {vehicleType?.icon || 'local_shipping'}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                  {courier.shortName || courier.name}
                                </h3>
                                {!inHouse && courier.shortName && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{courier.name}</p>
                                )}
                                {inHouse && vehicleLabel && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{vehicleLabel}</p>
                                )}
                                {showCourierTypes && (
                                  <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-xs font-semibold rounded-full ${typeOption.badgeClass}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{typeOption.icon}</span>
                                    {typeOption.label}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              courier.active
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                            }`}>
                              {courier.active ? t('transactions.common.active') : t('management.inactive')}
                            </span>
                          </div>

                          <div className="mb-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-gray-600">schedule</span>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('couriers.common.departureCount', { count: courier.schedules?.length || 0 })}
                              </p>
                            </div>
                            {inHouse && courier.vehiclePlate && (
                              <div className="flex items-center gap-2" title={t('couriers.inHouse.plate')}>
                                <span className="material-symbols-outlined text-sm text-gray-600">tag</span>
                                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{courier.vehiclePlate}</p>
                              </div>
                            )}
                            {inHouse && courier.driverName && (
                              <div className="flex items-center gap-2" title={t('couriers.inHouse.driverName')}>
                                <span className="material-symbols-outlined text-sm text-gray-600">person</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{courier.driverName}</p>
                              </div>
                            )}
                            {courier.contactPhone && (
                              <div className="flex items-center gap-2" title={inHouse ? t('couriers.inHouse.driverPhone') : undefined}>
                                <span className="material-symbols-outlined text-sm text-gray-600">phone</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{courier.contactPhone}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => { setSelectedCourier(courier); setShowEditModal(true); }}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              <span className="text-sm font-medium">{t('common.edit')}</span>
                            </button>
                            <button
                              onClick={() => { setSelectedCourier(courier); setShowDeleteModal(true); }}
                              className="flex items-center justify-center px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {addCourierType && (
        <AddCourierModal
          courierType={addCourierType}
          onClose={() => setAddCourierType(null)}
          onSuccess={() => { setAddCourierType(null); loadCouriers(); }}
          brokerCompanyId={brokerCompanyId}
        />
      )}

      {showEditModal && selectedCourier && (
        <EditCourierModal
          courier={selectedCourier}
          brokerCompanyId={brokerCompanyId}
          onClose={() => { setShowEditModal(false); setSelectedCourier(null); }}
          onSuccess={() => { setShowEditModal(false); setSelectedCourier(null); loadCouriers(); }}
        />
      )}

      {showDeleteModal && selectedCourier && (
        <DeleteCourierModal
          courier={selectedCourier}
          onClose={() => { setShowDeleteModal(false); setSelectedCourier(null); }}
          onSuccess={() => { setShowDeleteModal(false); setSelectedCourier(null); loadCouriers(); }}
        />
      )}
    </MainLayout>
  );
}
