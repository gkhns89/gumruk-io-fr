import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { courierService } from '../api/courierService';
import { courierShipmentService } from '../api/courierShipmentService';
import {
  FRESH_READING_WINDOW_MS,
  baselineItem,
  toDepartureItem,
  toLiveItem,
  toPlannedItem,
  toTransitItem,
} from '../components/dashboard/courierStrip/stripModel';

/** Ajanda (kalkışlar / planlı gönderiler) bu aralıkla tazelenir; canlı veri ayrı yoklanır. */
const AGENDA_REFRESH_MS = 5 * 60 * 1000;

/** Ajandanın "kalkış saati geçti mi" kontrolü ve tazeleme kararı bu aralıkla verilir. */
const AGENDA_TICK_MS = 30 * 1000;

/** Kalkış saati geçtikten sonra sunucuya sormadan önce beklenen süre (sunucu yeni sırayı hesaplasın). */
const AFTER_DEPARTURE_GRACE_MS = 3000;

/**
 * Ana ekran kurye şeridinin verisi ve dönüşüm kuralı (21.09.2026).
 *
 * İki ayrı kaynak, iki ayrı ritim:
 *  - **Ajanda** (gümrük firmasında sıradaki kalkışlar, müşteride kendi gönderileri): 5 dakikada bir,
 *    ayrıca en yakın kalkış saati geçince bir kez daha. Bu veri saatlerce değişmez.
 *  - **Canlı takip özeti**: aralığı **sunucu söyler** (`pollIntervalSeconds`, 20 sn).
 *    `useShipmentTracking` ile aynı kurallar: sekme arkadayken durur, sekmeye dönülünce hemen okur,
 *    liste boşsa (ya da bayrak kapalıysa) hiç yoklanmaz.
 *
 * **N+1 yok:** yoldaki gönderi sayısı ne olursa olsun tek bir özet ucu okunur. Gönderi başına takip
 * ucu yalnızca çekmecede **seçilen tek** gönderi için açılır (`useShipmentTracking`).
 *
 * **Dönüşüm kuralı:** şerit normalde "varışı en önce olan"ı gösterir. Canlı izlenen bir gönderiden
 * **taze** bir okuma geldiğinde ({@link FRESH_READING_WINDOW_MS} boyunca) ona geçer, sonra geri döner.
 * Yanıp sönmeyi engelleyen şey: geçiş yalnızca `lastGpsAt` **değiştiğinde** tetiklenir (tur başına en
 * çok bir kez), aynı konumu getiren yoklamalar hiçbir durum değişikliği yaratmaz.
 *
 * @param {Object} options
 * @param {'broker'|'client'} options.audience
 * @param {number|null} options.brokerCompanyId - yalnızca SUPER_ADMIN seçer
 * @param {boolean} options.needsBroker - SUPER_ADMIN: firma seçilmeden hiçbir şey okunmaz
 * @param {boolean} options.liveEnabled - COURIER_LIVE_TRACKING bayrağı
 * @param {boolean} options.enabled - şerit hiç gösterilmiyorsa false
 */
export function useCourierStrip({
  audience,
  brokerCompanyId = null,
  needsBroker = false,
  liveEnabled = false,
  enabled = true,
}) {
  const [agenda, setAgenda] = useState(null);
  const [live, setLive] = useState({ items: [], pollIntervalSeconds: 0 });
  const [loading, setLoading] = useState(true);
  const [spotlightKey, setSpotlightKey] = useState(null);

  const isBroker = audience === 'broker';
  // SUPER_ADMIN firma seçmeden hiçbir şey okunmaz (eski kurye kartının davranışı).
  const canRead = enabled && (!needsBroker || Boolean(brokerCompanyId));

  // ==================== AJANDA ====================

  const readAgenda = useCallback(async () => {
    if (!canRead) return;
    const result = isBroker
      ? await courierService.getNextDepartures(brokerCompanyId)
      : await courierShipmentService.getMySummary();
    if (result.success) setAgenda(result.data);
  }, [canRead, isBroker, brokerCompanyId]);

  useEffect(() => {
    if (!canRead) {
      setAgenda(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    readAgenda().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canRead, readAgenda]);

  // Kalkış saatleri sabit değil: saat geçince sunucudaki sıra kayar. Saniyede bir sorgulamak yerine
  // yarım dakikada bir "tazelemek gerekiyor mu" diye bakılır.
  const lastAgendaAtRef = useRef(0);
  const nextDepartureAtRef = useRef(null);
  useEffect(() => {
    if (!canRead) return undefined;
    lastAgendaAtRef.current = Date.now();
    const timer = setInterval(() => {
      if (document.hidden) return;
      const now = Date.now();
      const due = now - lastAgendaAtRef.current >= AGENDA_REFRESH_MS;
      const departed = nextDepartureAtRef.current !== null
        && now >= nextDepartureAtRef.current + AFTER_DEPARTURE_GRACE_MS;
      if (due || departed) {
        lastAgendaAtRef.current = now;
        readAgenda();
      }
    }, AGENDA_TICK_MS);
    return () => clearInterval(timer);
  }, [canRead, readAgenda]);

  // ==================== CANLI TAKİP ÖZETİ ====================

  const liveTimerRef = useRef(null);
  useEffect(() => {
    if (!canRead || !liveEnabled) {
      setLive({ items: [], pollIntervalSeconds: 0 });
      return undefined;
    }
    let cancelled = false;
    const clearTimer = () => {
      if (liveTimerRef.current) {
        clearTimeout(liveTimerRef.current);
        liveTimerRef.current = null;
      }
    };

    const tick = async () => {
      clearTimer();
      if (cancelled || document.hidden) return;
      const result = isBroker
        ? await courierShipmentService.getTrackingSummary(brokerCompanyId)
        : await courierShipmentService.getMyTrackingSummary();
      if (cancelled) return;
      const data = result.success ? result.data : { items: [], pollIntervalSeconds: 0 };
      setLive(data);
      // Aralığı sunucu söyler; yolda takipli gönderi kalmayınca 0 gelir ve yoklama durur.
      // Liste boşken de belirli aralıklarla bir kez daha bakılır: yeni bir gönderi yola çıkabilir.
      const seconds = data.pollIntervalSeconds > 0 ? data.pollIntervalSeconds : 60;
      liveTimerRef.current = setTimeout(tick, seconds * 1000);
    };

    const onVisibility = () => {
      if (!document.hidden) tick();
    };

    tick();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [canRead, liveEnabled, isBroker, brokerCompanyId]);

  // ==================== ÖĞELER ====================

  const liveItems = useMemo(() => live.items.map(toLiveItem), [live.items]);

  const departures = useMemo(() => {
    if (!isBroker || !agenda?.nextDepartures?.length) return [];
    return agenda.nextDepartures.map((d, i) => toDepartureItem(d, agenda.calculatedAt, i));
  }, [isBroker, agenda]);

  const planned = useMemo(() => {
    if (isBroker) return [];
    return (agenda?.upcoming || []).map(toPlannedItem);
  }, [isBroker, agenda]);

  // Yoldaki gönderilerden canlı takibi olmayanlar (araç eşleşmemiş, varış noktası koordinatsız,
  // bayrak kapalı): konumları yok ama yoldalar — şeritte ve listede yerlerini alırlar.
  const untracked = useMemo(() => {
    if (isBroker) return [];
    const tracked = new Set(liveItems.map((item) => item.shipmentId));
    return (agenda?.inTransit || [])
      .filter((shipment) => !tracked.has(shipment.id))
      .map(toTransitItem);
  }, [isBroker, agenda, liveItems]);

  const baseline = useMemo(
    () => baselineItem({ live: liveItems, transit: untracked, departures, planned }),
    [liveItems, untracked, departures, planned],
  );

  // Ajandanın bir sonraki kalkış anı — yalnızca tazeleme kararı için; render'a girmez.
  const nextDepartureAt = useMemo(() => {
    const times = departures.map((d) => d.departsAt).filter((value) => typeof value === 'number');
    return times.length > 0 ? Math.min(...times) : null;
  }, [departures]);
  nextDepartureAtRef.current = nextDepartureAt;

  // ==================== DÖNÜŞÜM (canlı okuma öne çıkar) ====================

  // Gönderi başına en son görülen ölçüm anı. Ref: değişmesi tek başına render gerektirmez.
  const seenGpsRef = useRef(new Map());
  const spotlightTimerRef = useRef(null);

  useEffect(() => {
    const seen = seenGpsRef.current;
    let freshest = null;
    liveItems.forEach((item) => {
      if (item.lastGpsAt === null) return;
      const previous = seen.get(item.shipmentId);
      seen.set(item.shipmentId, item.lastGpsAt);
      // İlk görüşte öne çıkarma yok: ana ekran açılır açılmaz şerit zıplamasın.
      if (previous === undefined || item.lastGpsAt <= previous) return;
      if (!freshest || item.lastGpsAt > freshest.lastGpsAt) freshest = item;
    });
    // Artık yolda olmayan gönderilerin izi bırakılmaz.
    const alive = new Set(liveItems.map((item) => item.shipmentId));
    Array.from(seen.keys()).forEach((id) => {
      if (!alive.has(id)) seen.delete(id);
    });

    if (!freshest) return undefined;
    setSpotlightKey(freshest.key);
    if (spotlightTimerRef.current) clearTimeout(spotlightTimerRef.current);
    spotlightTimerRef.current = setTimeout(() => setSpotlightKey(null), FRESH_READING_WINDOW_MS);
    return undefined;
  }, [liveItems]);

  useEffect(() => () => {
    if (spotlightTimerRef.current) clearTimeout(spotlightTimerRef.current);
  }, []);

  const spotlight = spotlightKey ? liveItems.find((item) => item.key === spotlightKey) : null;
  const current = spotlight || baseline;

  return {
    loading,
    current,
    // "Canlı" rozeti yalnızca görünüm gerçekten değiştiğinde çıkar: tek gönderi varken zaten o
    // gösteriliyordur, her okumada rozet yakıp söndürmenin anlamı yok.
    isSpotlight: Boolean(spotlight) && spotlight.key !== baseline?.key,
    liveItems,
    departures,
    planned,
    untracked,
    completed: isBroker ? [] : (agenda?.recentlyCompleted || []),
    totalActiveCouriers: agenda?.totalActiveCouriers || 0,
    upcomingDeparture: isBroker && agenda?.upcomingDeparture
      ? toDepartureItem(agenda.upcomingDeparture, agenda.calculatedAt, 'next')
      : null,
    refresh: readAgenda,
  };
}

export default useCourierStrip;
