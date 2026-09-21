import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyService } from '../../../api/companyService';
import { useAuth } from '../../../hooks/useAuth';
import { useCourierStrip } from '../../../hooks/useCourierStrip';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';
import { FEATURE_FLAGS } from '../../../utils/featureFlags';
import NewFeatureBadge from '../../common/NewFeatureBadge';
import StripBand from './StripBand';
import StripDrawer from './StripDrawer';
import { t } from '../../../locales';

/**
 * Ana ekranın en üstündeki kurye şeridi (21.09.2026) — eski "Kurye Takip" kartının ve müşteri
 * "Gönderilerim" kartının yerini alır. Kartlar ızgarada bir hücre kaplıyordu; şerit tam genişlikte
 * tek satır, ayrıntılar aşağı açılan bir pencerede.
 *
 * **Çekmece iter değil örter:** `absolute` konumlu ve `top-full`; altındaki kartlar yerinde kalır.
 * Uygulamada pencere kaydırılmaz (`#main-scroll-area` kaydırılır), bu yüzden `fixed` ya da portal
 * gerekmiyor: çekmece şeritle birlikte kayar ve doğru yerde durur.
 *
 * **Erişilebilirlik:** şerit bir `button`; `aria-expanded` / `aria-controls` çekmeceyi gösterir.
 * Açılınca odak panele geçer, kapanınca (Esc, ikinci tıklama) şeride döner; odak dışarı çıkarsa ya
 * da dışarı tıklanırsa çekmece kapanır.
 *
 * **Bayrak:** canlı kısımlar `COURIER_LIVE_TRACKING` arkasında. Bayrak kapalıyken şerit sıradaki
 * kalkışı (müşteride sıradaki gönderiyi) gösteren bir kalkış şeridi olarak çalışır ve çekmecede
 * harita sütunu hiç çizilmez — pilot dışındaki firma hiçbir şey kaybetmez.
 */
export default function CourierStrip() {
  const { user } = useAuth();
  const { hasFeature, isPilotFeature } = useFeatureFlags();
  const navigate = useNavigate();

  const role = user?.globalRole;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isBrokerStaff = ['SUPER_ADMIN', 'BROKER_ADMIN', 'BROKER_USER'].includes(role);
  const isClient = role === 'CLIENT_USER';
  // Müşteri şeridi tek seferlik gönderilere dayanıyor; o bayrak kapalıysa gösterilecek bir şey yok.
  const clientVisible = isClient && hasFeature(FEATURE_FLAGS.COURIER_CLIENT_STOPS);
  const visible = isBrokerStaff || clientVisible;

  const liveEnabled = hasFeature(FEATURE_FLAGS.COURIER_LIVE_TRACKING);
  const isPilot = isPilotFeature(FEATURE_FLAGS.COURIER_LIVE_TRACKING);
  const audience = isClient ? 'client' : 'broker';

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [brokers, setBrokers] = useState([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState('');

  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();

  const strip = useCourierStrip({
    audience,
    brokerCompanyId: isSuperAdmin && selectedBrokerId ? Number(selectedBrokerId) : null,
    needsBroker: isSuperAdmin,
    liveEnabled,
    enabled: visible,
  });

  const { current, isSpotlight, liveItems, loading } = strip;

  // Haritanın gönderisi: kullanıcı bir satır seçene kadar şeridin gösterdiği gönderi. Böylece
  // çekmece açıldığında harita "şeritte gördüğün araç"ı gösterir.
  useEffect(() => {
    if (liveItems.length === 0) {
      setSelectedId(null);
      setSelectionLocked(false);
      return;
    }
    const stillThere = liveItems.some((item) => item.shipmentId === selectedId);
    if (selectionLocked && stillThere) return;
    const fallback = current?.kind === 'live' ? current.shipmentId : liveItems[0].shipmentId;
    if (fallback !== selectedId) setSelectedId(fallback);
    if (!stillThere) setSelectionLocked(false);
  }, [liveItems, current, selectedId, selectionLocked]);

  // SUPER_ADMIN firma listesi yalnızca çekmece ilk açıldığında istenir: ana ekran açılışında
  // herkese bir istek daha çıkarmanın anlamı yok.
  useEffect(() => {
    if (!open || !isSuperAdmin || brokers.length > 0) return;
    companyService.getAllBrokerCompanies().then((result) => {
      if (result.success) setBrokers(result.data || []);
    });
  }, [open, isSuperAdmin, brokers.length]);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  // Dışarı tıklama, Esc ve odağın dışarı çıkması — üçü de çekmeceyi kapatır.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close(true);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  // Açılınca odak panele: klavyeyle gezen kullanıcı içeriğin başına düşsün.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const onFocusOut = (event) => {
    if (!open) return;
    if (!containerRef.current?.contains(event.relatedTarget)) close();
  };

  const openShipment = (shipmentId) => {
    close();
    navigate(isClient ? '/my-shipments' : '/management/courier-shipments', { state: { shipmentId } });
  };

  if (!visible) return null;

  let emptyText = t('dashboard.courierStrip.empty');
  if (isSuperAdmin && !selectedBrokerId) emptyText = t('dashboard.courier.selectBrokerHint');
  else if (isClient) emptyText = t('dashboard.courierStrip.emptyClient');

  const brokerPicker = isSuperAdmin ? (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
        {t('dashboard.courier.brokerCompany')}
      </p>
      <select
        value={selectedBrokerId}
        onChange={(event) => setSelectedBrokerId(event.target.value)}
        className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{t('dashboard.courier.selectBroker')}</option>
        {brokers.map((broker) => (
          <option key={broker.id} value={broker.id}>{broker.name}</option>
        ))}
      </select>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="relative mb-6" onBlur={onFocusOut}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="courier-strip w-full flex items-center gap-3 rounded-xl border border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-3 py-2.5 sm:px-4 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="block min-w-0 flex-1">
          <StripBand item={current} isSpotlight={isSpotlight} loading={loading} emptyText={emptyText} />
        </span>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          {isPilot && <NewFeatureBadge className="hidden sm:inline-flex" />}
          <span
            className={`courier-strip__chevron material-symbols-outlined text-blue-600 dark:text-blue-400 ${open ? 'courier-strip__chevron--open' : ''}`}
          >
            expand_more
          </span>
        </span>
      </button>

      {open && (
        <StripDrawer
          id={panelId}
          panelRef={panelRef}
          audience={audience}
          liveEnabled={liveEnabled}
          liveItems={liveItems}
          departures={strip.departures}
          planned={strip.planned}
          untracked={strip.untracked}
          completed={strip.completed}
          upcomingDeparture={strip.upcomingDeparture}
          totalActiveCouriers={strip.totalActiveCouriers}
          selectedId={selectedId}
          onSelect={(shipmentId) => {
            setSelectedId(shipmentId);
            setSelectionLocked(true);
          }}
          onOpenShipment={openShipment}
          brokerPicker={brokerPicker}
        />
      )}
    </div>
  );
}
