import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useLinkedClients } from '../../hooks/useLinkedClients';
import { courierShipmentService } from '../../api/courierShipmentService';
import { courierService } from '../../api/courierService';
import { companyService } from '../../api/companyService';
import MainLayout from '../../components/layout/MainLayout';
import NewFeatureBadge from '../../components/common/NewFeatureBadge';
import ShipmentTabs from '../../components/courierShipments/ShipmentTabs';
import ShipmentListItem from '../../components/courierShipments/ShipmentListItem';
import ShipmentDetailModal from '../../components/courierShipments/ShipmentDetailModal';
import ShipmentFormModal from '../../components/courierShipments/ShipmentFormModal';
import ShipmentStatusFields from '../../components/courierShipments/ShipmentStatusFields';
import { BROKER_TABS, companyLabel, groupShipments } from '../../components/courierShipments/shipmentUtils';
import { FEATURE_FLAGS } from '../../utils/featureFlags';
import { confirmDialog } from '../../utils/confirmDialog';
import { showSuccess, showError } from '../../utils/toastUtils';
import { t, getCurrentLocale } from '../../locales';

const ACTION_BASE = 'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const SELECT_CLASS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-main text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors';

// Filtre seçenekleri: kayıtlı listeler + gönderilerde geçenler (sözleşmesi biten müşteri, silinen kurye); id'ye göre tekil
const mergeOptions = (...lists) => {
  const byId = new Map();
  lists.flat().forEach((option) => {
    if (option && option.id != null && !byId.has(String(option.id))) {
      byId.set(String(option.id), { id: String(option.id), label: option.label || String(option.id) });
    }
  });
  const locale = getCurrentLocale();
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, locale));
};

/**
 * Tek seferlik kurye gönderileri — gümrük firması tarafı (SUPER_ADMIN, BROKER_ADMIN, BROKER_USER).
 * Menü girişi COURIER_CLIENT_STOPS bayrağıyla açılır; backend de bayrağı kontrol eder.
 * Bildirimden gelinirse `location.state.shipmentId` gönderinin detayını açar.
 */
export default function CourierShipmentsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';
  const { isPilotFeature } = useFeatureFlags();
  const isPilot = isPilotFeature(FEATURE_FLAGS.COURIER_CLIENT_STOPS);

  // SUPER_ADMIN: broker seçimi
  const [brokers, setBrokers] = useState([]);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [brokersError, setBrokersError] = useState('');
  const [selectedBroker, setSelectedBroker] = useState(null);

  const brokerCompanyId = isSuperAdmin ? selectedBroker?.id : user?.company?.id;

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const requestRef = useRef(0);

  const [couriers, setCouriers] = useState([]);
  const [couriersLoading, setCouriersLoading] = useState(false);
  const [couriersError, setCouriersError] = useState('');

  const { clients, loading: clientsLoading } = useLinkedClients(brokerCompanyId, Boolean(brokerCompanyId));

  const [tab, setTab] = useState('today');
  const [clientFilter, setClientFilter] = useState('');
  const [courierFilter, setCourierFilter] = useState('');

  const [formState, setFormState] = useState(null); // null | { shipment: null (yeni) | gönderi (düzenle) }
  const [detail, setDetail] = useState(null); // null | { id, shipment, loading, error }
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    setBrokersLoading(true);
    setBrokersError('');
    companyService.getAllBrokerCompanies()
      .then((result) => {
        if (result.success) {
          setBrokers(result.data);
        } else {
          setBrokersError(result.error || t('management.brokersLoadError'));
        }
      })
      .finally(() => setBrokersLoading(false));
  }, [isSuperAdmin]);

  const loadShipments = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!brokerCompanyId) {
      setShipments([]);
      setLoadError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    const result = await courierShipmentService.getShipments(isSuperAdmin ? { brokerCompanyId } : {});
    if (requestId !== requestRef.current) return; // broker değişti, eski yanıt
    setShipments(result.success ? result.data : []);
    setLoadError(result.success ? '' : result.error);
    setLoading(false);
  }, [brokerCompanyId, isSuperAdmin]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  // Kurye kayıtları (form seçenekleri ve filtre)
  useEffect(() => {
    if (!brokerCompanyId) {
      setCouriers([]);
      setCouriersError('');
      return undefined;
    }
    let cancelled = false;
    setCouriersLoading(true);
    setCouriersError('');
    courierService.getCourierCompanies(brokerCompanyId)
      .then((result) => {
        if (cancelled) return;
        setCouriers(result.success ? result.data : []);
        setCouriersError(result.success ? '' : (result.error || t('api.courier.listError')));
      })
      .finally(() => {
        if (!cancelled) setCouriersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [brokerCompanyId]);

  const openDetail = useCallback(async (id, initial = null) => {
    setDetail({ id, shipment: initial, loading: true, error: '' });
    const result = await courierShipmentService.getShipment(id);
    setDetail((prev) => (prev?.id === id
      ? { id, shipment: result.success ? result.data : prev.shipment, loading: false, error: result.success ? '' : result.error }
      : prev));
  }, []);

  // Bildirimden gelindiyse gönderiyi aç; state temizlenir ki yenilemede tekrar açılmasın
  const pendingShipmentId = location.state?.shipmentId;
  useEffect(() => {
    if (!pendingShipmentId) return;
    openDetail(pendingShipmentId);
    navigate(location.pathname, { replace: true, state: null });
  }, [pendingShipmentId, openDetail, navigate, location.pathname]);

  const refreshAfterChange = (shipmentId, updated) => {
    loadShipments();
    if (detail?.id === shipmentId) openDetail(shipmentId, updated || detail.shipment);
  };

  const applyStatus = async (shipment, payload, successKey) => {
    setBusyId(shipment.id);
    const result = await courierShipmentService.changeStatus(shipment.id, payload);
    setBusyId(null);
    if (!result.success) {
      showError(result.error);
      return;
    }
    showSuccess(t(successKey));
    refreshAfterChange(shipment.id, result.data);
  };

  const handleInTransit = (shipment) =>
    applyStatus(shipment, { status: 'IN_TRANSIT' }, 'courierShipments.messages.inTransit');

  const handleComplete = async (shipment) => {
    const isPickup = shipment.direction === 'PICKUP';
    const values = { receivedBy: '', note: '' };
    const ok = await confirmDialog({
      title: isPickup ? t('courierShipments.complete.titlePickup') : t('courierShipments.complete.title'),
      message: t(isPickup ? 'courierShipments.complete.messagePickup' : 'courierShipments.complete.message', {
        client: companyLabel(shipment.clientCompany),
      }),
      confirmText: isPickup ? t('courierShipments.actions.markPickedUp') : t('courierShipments.actions.markDelivered'),
      icon: 'task_alt',
      content: (
        <ShipmentStatusFields
          receivedByLabel={isPickup ? t('courierShipments.fields.handedOverBy') : t('courierShipments.fields.receivedBy')}
          onChange={(field, value) => { values[field] = value; }}
        />
      ),
    });
    if (!ok) return;
    applyStatus(
      shipment,
      { status: 'DELIVERED', receivedBy: values.receivedBy.trim() || null, note: values.note.trim() || null },
      isPickup ? 'courierShipments.messages.pickedUp' : 'courierShipments.messages.delivered',
    );
  };

  const handleCancel = async (shipment) => {
    const values = { note: '' };
    const ok = await confirmDialog({
      title: t('courierShipments.cancel.title'),
      message: t('courierShipments.cancel.message', { client: companyLabel(shipment.clientCompany) }),
      intent: 'danger',
      confirmText: t('courierShipments.actions.cancel'),
      content: <ShipmentStatusFields onChange={(field, value) => { values[field] = value; }} />,
    });
    if (!ok) return;
    applyStatus(
      shipment,
      { status: 'CANCELLED', note: values.note.trim() || null },
      'courierShipments.messages.cancelled',
    );
  };

  const openEdit = (shipment) => {
    setDetail(null);
    setFormState({ shipment });
  };

  const renderActions = (shipment) => {
    const isOpen = shipment.status === 'PLANNED' || shipment.status === 'IN_TRANSIT';
    if (!isOpen) return null;
    const busy = busyId === shipment.id;
    const isPlanned = shipment.status === 'PLANNED';
    const isPickup = shipment.direction === 'PICKUP';

    return (
      <>
        {isPlanned && (
          <button
            type="button"
            disabled={busy}
            onClick={() => handleInTransit(shipment)}
            className={`${ACTION_BASE} bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50`}
          >
            <span className="material-symbols-outlined text-sm">local_shipping</span>
            {t('courierShipments.actions.markInTransit')}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => handleComplete(shipment)}
          className={`${ACTION_BASE} bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50`}
        >
          <span className="material-symbols-outlined text-sm">task_alt</span>
          {isPickup ? t('courierShipments.actions.markPickedUp') : t('courierShipments.actions.markDelivered')}
        </button>
        {isPlanned && (
          <button
            type="button"
            disabled={busy}
            onClick={() => openEdit(shipment)}
            className={`${ACTION_BASE} bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50`}
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            {t('common.edit')}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => handleCancel(shipment)}
          className={`${ACTION_BASE} bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50`}
        >
          <span className="material-symbols-outlined text-sm">cancel</span>
          {t('courierShipments.actions.cancel')}
        </button>
      </>
    );
  };

  const clientOptions = mergeOptions(
    clients,
    shipments.map((shipment) => shipment.clientCompany && { id: shipment.clientCompany.id, label: companyLabel(shipment.clientCompany) }),
  );
  const courierOptions = mergeOptions(
    couriers.map((courier) => ({ id: courier.id, label: courier.shortName || courier.name })),
    shipments.map((shipment) => shipment.courier && { id: shipment.courier.id, label: shipment.courier.name }),
  );

  const filtered = shipments.filter((shipment) =>
    (!clientFilter || String(shipment.clientCompany?.id) === clientFilter)
    && (!courierFilter || String(shipment.courier?.id) === courierFilter));
  const groups = groupShipments(filtered, BROKER_TABS);
  const counts = Object.fromEntries(BROKER_TABS.map((key) => [key, groups[key].length]));
  const visible = groups[tab] || [];

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Başlık */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {t('courierShipments.title')}
              {isPilot && <NewFeatureBadge />}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isSuperAdmin
                ? selectedBroker
                  ? t('courierShipments.subtitleBroker', { name: selectedBroker.name })
                  : t('courierShipments.subtitleSelectBroker')
                : t('courierShipments.subtitle')}
            </p>
          </div>
          {brokerCompanyId && (
            <button
              type="button"
              onClick={() => setFormState({ shipment: null })}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              <span>{t('courierShipments.newShipment')}</span>
            </button>
          )}
        </div>

        {/* SUPER_ADMIN: broker seçimi */}
        {isSuperAdmin && (
          <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-4 mb-6 transition-colors">
            <label htmlFor="shipment-broker-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  id="shipment-broker-select"
                  value={selectedBroker?.id ?? ''}
                  onChange={(e) => {
                    const broker = brokers.find((b) => b.id === Number(e.target.value));
                    setSelectedBroker(broker || null);
                    setShipments([]);
                    setClientFilter('');
                    setCourierFilter('');
                    setTab('today');
                  }}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-text-main transition-colors appearance-none cursor-pointer"
                >
                  <option value="">{t('management.selectCompanyOption')}</option>
                  {brokers.map((broker) => (
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

        {isSuperAdmin && !selectedBroker && !brokersLoading && (
          <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm p-12 text-center transition-colors">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">business</span>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('management.selectBroker')}</h3>
            <p className="text-gray-600 dark:text-gray-400">{t('courierShipments.selectBrokerHint')}</p>
          </div>
        )}

        {brokerCompanyId && (
          <>
            {/* Filtreler */}
            <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <label htmlFor="shipment-client-filter" className="block text-xs font-medium text-text-secondary mb-1">
                  {t('courierShipments.filters.client')}
                </label>
                <select
                  id="shipment-client-filter"
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">{t('courierShipments.filters.allClients')}</option>
                  {clientOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label htmlFor="shipment-courier-filter" className="block text-xs font-medium text-text-secondary mb-1">
                  {t('courierShipments.filters.courier')}
                </label>
                <select
                  id="shipment-courier-filter"
                  value={courierFilter}
                  onChange={(e) => setCourierFilter(e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">{t('courierShipments.filters.allCouriers')}</option>
                  {courierOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
              {(clientFilter || courierFilter) && (
                <button
                  type="button"
                  onClick={() => { setClientFilter(''); setCourierFilter(''); }}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-text-secondary hover:text-text-main rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">filter_alt_off</span>
                  {t('common.clear')}
                </button>
              )}
            </div>

            <ShipmentTabs tabs={BROKER_TABS} active={tab} counts={counts} onChange={setTab} />

            {loading && shipments.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-20" />
                ))}
              </div>
            ) : loadError ? (
              <div className="bg-white dark:bg-background-dark rounded-xl border border-red-200 dark:border-red-800/50 p-6 text-center">
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">{loadError}</p>
                <button
                  type="button"
                  onClick={loadShipments}
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  {t('courierShipments.retry')}
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-2 block">package_2</span>
                <p className="text-gray-500 dark:text-gray-400">{t(`courierShipments.empty.${tab}`)}</p>
                {(tab === 'today' || tab === 'upcoming') && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('courierShipments.emptyHint')}</p>
                )}
              </div>
            ) : (
              <ul className="space-y-3">
                {visible.map((shipment) => (
                  <ShipmentListItem
                    key={shipment.id}
                    shipment={shipment}
                    onOpen={(item) => openDetail(item.id, item)}
                    actions={renderActions(shipment)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {formState && (
        <ShipmentFormModal
          shipment={formState.shipment}
          brokerCompanyId={isSuperAdmin ? brokerCompanyId : null}
          clients={clients}
          clientsLoading={clientsLoading}
          couriers={couriers}
          couriersLoading={couriersLoading}
          couriersError={couriersError}
          onClose={() => setFormState(null)}
          onSaved={(saved) => {
            const isNew = !formState.shipment;
            setFormState(null);
            loadShipments();
            // Yeni gönderinin düştüğü sekmeyi aç (bugün / yaklaşan)
            if (isNew && saved?.plannedAt) {
              const landing = groupShipments([saved], BROKER_TABS);
              const landingTab = BROKER_TABS.find((key) => landing[key].length > 0);
              if (landingTab) setTab(landingTab);
            }
          }}
        />
      )}

      {detail && (
        <ShipmentDetailModal
          shipment={detail.shipment}
          loading={detail.loading}
          error={detail.error}
          onClose={() => setDetail(null)}
          actions={detail.shipment ? renderActions(detail.shipment) : null}
        />
      )}
    </MainLayout>
  );
}
