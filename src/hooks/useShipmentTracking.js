import { useCallback, useEffect, useRef, useState } from 'react';
import { courierShipmentService } from '../api/courierShipmentService';
import { getTrackingStatus } from '../utils/constants';

/**
 * Bir kurye gönderisinin canlı takibini yoklar (todo 19, faz 2).
 *
 * Kurallar:
 * - Aralığı sunucu söyler (`pollIntervalSeconds`); istemci kendi kafasına göre sıklaştırmaz.
 *   Sunucu sağlayıcıyı zaten kendi turunda soruyor, daha sık okumak aynı konumu getirir.
 * - Oturum bitince (`ENDED`), hiç yokken (`NONE`) ya da sunucu aralığı 0 verince yoklama **temelli**
 *   durur. Sunucu araç adrese ulaştığında müşteriye 0 gönderir (faz 3, karar 1): ekran varış anının
 *   fotoğrafında donar, tarayıcı bir daha sormaz — sekmeye geri dönülse bile.
 * - Sekme arkadayken (`document.hidden`) yoklama durur, sekmeye dönülünce hemen bir kez okur:
 *   arka planda açık duran bir sekme boşuna istek üretmesin.
 * - Hata sessizdir: konum geçici olarak alınamıyorsa ekranda eski konum ve "şu an alınamıyor"
 *   metni kalır, toast çıkmaz (yoklama her aralıkta tekrar denenecek).
 *
 * @param {number|null} shipmentId - null ise hiç yoklanmaz
 * @param {'broker'|'client'} audience - hangi ucun okunacağı
 * @param {boolean} enabled - bayrak / durum uygun değilse false
 * @returns {{ tracking: Object|null, loading: boolean, refresh: () => void }}
 */
export function useShipmentTracking(shipmentId, audience = 'broker', enabled = true) {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  // Zamanlayıcı ve "hâlâ bu gönderi mi" kontrolü efektler arasında paylaşılıyor.
  const timerRef = useRef(null);
  const activeIdRef = useRef(null);

  const read = useCallback(async () => {
    if (!shipmentId || !enabled) return null;
    const result = audience === 'client'
      ? await courierShipmentService.getMyTracking(shipmentId)
      : await courierShipmentService.getTracking(shipmentId);
    // Yanıt gelene kadar başka bir gönderiye geçilmiş olabilir.
    if (activeIdRef.current !== shipmentId) return null;
    if (result.success) {
      setTracking(result.data);
      return result.data;
    }
    return null;
  }, [shipmentId, audience, enabled]);

  useEffect(() => {
    activeIdRef.current = shipmentId;
    if (!shipmentId || !enabled) {
      setTracking(null);
      return undefined;
    }

    let cancelled = false;
    // Yoklama bir kez kapandıysa bir daha açılmaz; sekmeye dönmek donmuş bir görünümü yeniden
    // sormaya başlatmamalı.
    let stopped = false;
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const tick = async () => {
      clearTimer();
      if (cancelled || stopped || document.hidden) return;
      const data = await read();
      if (cancelled) return;
      // Sunucu kapanmış oturumda ve varışta 0 gönderir; bilinmeyen durumda da yoklamayı sürdürmeyiz.
      const option = getTrackingStatus(data?.status);
      const seconds = data?.pollIntervalSeconds ?? 0;
      if (data && (!option?.live || seconds <= 0)) {
        stopped = true;
        return;
      }
      if (option?.live && seconds > 0) {
        timerRef.current = setTimeout(tick, seconds * 1000);
      }
    };

    const onVisibility = () => {
      if (!document.hidden && !stopped) tick();
    };

    setLoading(true);
    tick().finally(() => {
      if (!cancelled) setLoading(false);
    });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [shipmentId, enabled, read]);

  return { tracking, loading, refresh: read };
}

export default useShipmentTracking;
