import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { courierShipmentService } from '../api/courierShipmentService';
import MainLayout from '../components/layout/MainLayout';
import NewFeatureBadge from '../components/common/NewFeatureBadge';
import ShipmentTabs from '../components/courierShipments/ShipmentTabs';
import ShipmentListItem from '../components/courierShipments/ShipmentListItem';
import ShipmentDetailModal from '../components/courierShipments/ShipmentDetailModal';
import ShipmentDateWindow from '../components/courierShipments/ShipmentDateWindow';
import {
  CLIENT_TABS, HISTORY_WINDOWS, WINDOWED_TABS, groupShipments, isWithinHistoryWindow,
} from '../components/courierShipments/shipmentUtils';
import { FEATURE_FLAGS } from '../utils/featureFlags';
import { t } from '../locales';

/**
 * Müşterinin kurye gönderileri (CLIENT_USER) — salt okunur: iç notlar ve işlem düğmeleri yok.
 * Bildirimden gelinirse `location.state.shipmentId` gönderinin detayını açar.
 *
 * `/courier-shipments/my` yalnızca `status` alır, tarih penceresi yok: liste tek istekte gelir ve
 * tamamlanan / iptal sekmeleri tarayıcıda HISTORY_WINDOWS ile (30 → 90 gün → tümü) kısaltılır.
 */
export default function MyShipmentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPilotFeature } = useFeatureFlags();
  const isPilot = isPilotFeature(FEATURE_FLAGS.COURIER_CLIENT_STOPS);

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState(null); // null: yoldaki varsa "Yolda", yoksa "Yaklaşan"
  const [windowIndex, setWindowIndex] = useState(0);
  const windowDays = HISTORY_WINDOWS[windowIndex];
  const [detail, setDetail] = useState(null);

  const loadShipments = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const result = await courierShipmentService.getMyShipments();
    setShipments(result.success ? result.data : []);
    setLoadError(result.success ? '' : result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const openDetail = useCallback(async (id, initial = null) => {
    setDetail({ id, shipment: initial, loading: true, error: '' });
    const result = await courierShipmentService.getMyShipment(id);
    setDetail((prev) => (prev?.id === id
      ? { id, shipment: result.success ? result.data : prev.shipment, loading: false, error: result.success ? '' : result.error }
      : prev));
  }, []);

  const pendingShipmentId = location.state?.shipmentId;
  useEffect(() => {
    if (!pendingShipmentId) return;
    openDetail(pendingShipmentId);
    navigate(location.pathname, { replace: true, state: null });
  }, [pendingShipmentId, openDetail, navigate, location.pathname]);

  const now = new Date();
  const inWindow = shipments.filter((shipment) => isWithinHistoryWindow(shipment, windowDays, now));
  const groups = groupShipments(inWindow, CLIENT_TABS, now);
  const counts = Object.fromEntries(CLIENT_TABS.map((key) => [key, groups[key].length]));
  const activeTab = tab ?? (groups.inTransit.length > 0 ? 'inTransit' : 'upcoming');
  const visible = groups[activeTab] || [];
  // Sayfa tüm listeyi zaten tuttuğu için düğme yalnızca bu sekmede gerçekten gizli gönderi varken çıkar
  const hiddenInTab = WINDOWED_TABS.includes(activeTab)
    && groupShipments(shipments, CLIENT_TABS, now)[activeTab].length > visible.length;

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {t('myShipments.title')}
            {isPilot && <NewFeatureBadge />}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('myShipments.subtitle')}</p>
        </div>

        <ShipmentTabs tabs={CLIENT_TABS} active={activeTab} counts={counts} onChange={setTab} />

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
            <p className="text-gray-500 dark:text-gray-400">{t(`myShipments.empty.${activeTab}`)}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((shipment) => (
              <ShipmentListItem
                key={shipment.id}
                shipment={shipment}
                audience="client"
                onOpen={(item) => openDetail(item.id, item)}
              />
            ))}
          </ul>
        )}

        {/* Tarih penceresi — yalnızca pencerenin kestiği sekmelerde */}
        {!loading && !loadError && WINDOWED_TABS.includes(activeTab) && (
          <ShipmentDateWindow
            windowDays={windowDays}
            canShowOlder={hiddenInTab && windowIndex < HISTORY_WINDOWS.length - 1}
            onShowOlder={() => setWindowIndex((index) => Math.min(index + 1, HISTORY_WINDOWS.length - 1))}
          />
        )}
      </div>

      {detail && (
        <ShipmentDetailModal
          shipment={detail.shipment}
          loading={detail.loading}
          error={detail.error}
          audience="client"
          onClose={() => setDetail(null)}
        />
      )}
    </MainLayout>
  );
}
