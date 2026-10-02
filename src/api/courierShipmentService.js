import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

/**
 * Tek seferlik kurye gönderileri (COURIER_CLIENT_STOPS bayrağı arkasında; backend de kontrol ediyor).
 * Tekrarlayan haftalık kalkışlardan ayrı: gümrük firması bir müşteriye belirli bir gün/saatte
 * evrak/paket götürür (DELIVERY) ya da müşteriden alır (PICKUP).
 *
 * Tarih-saat alanları (plannedAt, departedAt, ...) UTC ISO metinleridir (`...Z`).
 * Servisler hata fırlatmaz: `{ success: true, data }` | `{ success: false, error }`.
 */

// Liste yanıtı `{ shipments: [...] }`; tekil yanıt `{ message, shipment }` ya da doğrudan gönderi olabilir.
const shipmentsOf = (data) => (Array.isArray(data?.shipments) ? data.shipments : []);
const shipmentOf = (data) => data?.shipment ?? data ?? null;

/**
 * Takip yanıtı. Sunucu takip olmayan gönderide `status: 'NONE'` döner; burada alanların varlığı da
 * garanti altına alınır ki ekranlar `trail.length` gibi kontrolleri koşulsuz yapabilsin.
 */
const trackingOf = (data) => ({
  status: data?.status || 'NONE',
  position: data?.position || null,
  trail: Array.isArray(data?.trail) ? data.trail : [],
  destination: data?.destination || null,
  distanceMeters: typeof data?.distanceMeters === 'number' ? data.distanceMeters : null,
  vehicle: data?.vehicle || null,
  startedAt: data?.startedAt || null,
  endedAt: data?.endedAt || null,
  lastPolledAt: data?.lastPolledAt || null,
  pollIntervalSeconds: typeof data?.pollIntervalSeconds === 'number' ? data.pollIntervalSeconds : 0,
});

/**
 * Şeridin takip özeti. Bayrak kapalıyken ya da yolda takipli gönderi yokken sunucu boş liste ve
 * `pollIntervalSeconds: 0` döner — hata değil, "canlı gösterecek bir şey yok" demektir.
 */
const trackingSummaryOf = (data) => ({
  items: Array.isArray(data?.items) ? data.items : [],
  pollIntervalSeconds: typeof data?.pollIntervalSeconds === 'number' ? data.pollIntervalSeconds : 0,
});

// Boş filtreleri query string'e koyma
const cleanParams = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
);

const failure = (context, error, fallbackKey) => {
  logError(`CourierShipmentService - ${context}`, error);
  return { success: false, error: getApiErrorMessage(error, t(fallbackKey)) };
};

export const courierShipmentService = {
  // ==================== BROKER (SUPER_ADMIN, BROKER_ADMIN, BROKER_USER) ====================

  /**
   * Gümrük firmasının gönderileri
   * @param {Object} filters - { brokerCompanyId (SUPER_ADMIN), status, clientCompanyId, courierCompanyId, from, to }
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  getShipments: async (filters = {}) => {
    try {
      const response = await axiosInstance.get('/courier-shipments', { params: cleanParams(filters) });
      return { success: true, data: shipmentsOf(response.data) };
    } catch (error) {
      return failure('getShipments', error, 'api.courierShipments.listError');
    }
  },

  /**
   * Tek gönderi, olay geçmişiyle (events)
   * @param {number} id
   */
  getShipment: async (id) => {
    try {
      const response = await axiosInstance.get(`/courier-shipments/${id}`);
      return { success: true, data: shipmentOf(response.data) };
    } catch (error) {
      return failure('getShipment', error, 'api.courierShipments.loadError');
    }
  },

  /**
   * Yeni gönderi
   * @param {Object} payload - { brokerCompanyId?, clientCompanyId, courierCompanyId, direction, itemType, description?, plannedAt, internalNotes? }
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>} data: oluşturulan gönderi
   */
  createShipment: async (payload) => {
    try {
      const response = await axiosInstance.post('/courier-shipments', payload);
      return { success: true, data: shipmentOf(response.data) };
    } catch (error) {
      return failure('createShipment', error, 'api.courierShipments.createError');
    }
  },

  /**
   * Gönderiyi güncelle — yalnızca PLANNED durumundayken; müşteri değiştirilemez
   * @param {number} id
   * @param {Object} payload - { brokerCompanyId?, courierCompanyId, direction, itemType, description?, plannedAt, internalNotes? }
   */
  updateShipment: async (id, payload) => {
    try {
      const response = await axiosInstance.put(`/courier-shipments/${id}`, payload);
      return { success: true, data: shipmentOf(response.data) };
    } catch (error) {
      return failure('updateShipment', error, 'api.courierShipments.updateError');
    }
  },

  /**
   * Durum değiştir: PLANNED→IN_TRANSIT, IN_TRANSIT/PLANNED→DELIVERED, PLANNED/IN_TRANSIT→CANCELLED
   * @param {number} id
   * @param {Object} payload - { status: 'IN_TRANSIT'|'DELIVERED'|'CANCELLED', receivedBy?, note? }
   */
  changeStatus: async (id, payload) => {
    try {
      const response = await axiosInstance.post(`/courier-shipments/${id}/status`, payload);
      return { success: true, data: shipmentOf(response.data) };
    } catch (error) {
      return failure('changeStatus', error, 'api.courierShipments.statusError');
    }
  },

  /**
   * Gönderinin canlı takibi — gümrük firması görünümü (COURIER_LIVE_TRACKING bayrağı arkasında).
   * Yalnızca sunucunun kendi tablolarını okur; sağlayıcıya hiç gidilmez.
   *
   * @param {number} id
   * @returns data: {
   *   status: 'NONE'|'WAITING'|'LIVE'|'STALE'|'UNAVAILABLE'|'ENDED',
   *   position?: { lat, lng, heading, speedKph, ignition, gpsAt },
   *   trail: [[lng, lat], ...] (GeoJSON sırası),
   *   destination?: { label, lat, lng },
   *   distanceMeters?, vehicle?: { plate, vehicleType, driverName, driverPhone },
   *   startedAt?, endedAt?, lastPolledAt?, pollIntervalSeconds
   * }
   * Takip yoksa `status: 'NONE'` gelir — hata değil, "bu gönderide harita yok" demektir.
   */
  getTracking: async (id) => {
    try {
      const response = await axiosInstance.get(`/courier-shipments/${id}/tracking`);
      return { success: true, data: trackingOf(response.data) };
    } catch (error) {
      return failure('getTracking', error, 'api.courierShipments.trackingError');
    }
  },

  /**
   * Ana ekran kurye şeridinin canlı takip özeti — gümrük firması görünümü.
   * Yoldaki bütün takipli gönderiler <b>tek</b> çağrıda gelir; gönderi başına `getTracking` çağırmak
   * tarayıcıda N+1 olurdu (beş gönderi, yirmi saniyede bir beş istek).
   *
   * @param {number|null} brokerCompanyId - yalnızca SUPER_ADMIN gönderir
   * @returns data: { items: [...], pollIntervalSeconds }
   */
  getTrackingSummary: async (brokerCompanyId = null) => {
    try {
      const response = await axiosInstance.get('/courier-shipments/tracking/summary', {
        params: cleanParams({ brokerCompanyId }),
      });
      return { success: true, data: trackingSummaryOf(response.data) };
    } catch (error) {
      return failure('getTrackingSummary', error, 'api.courierShipments.trackingError');
    }
  },

  // ==================== MÜŞTERİ (CLIENT_USER) ====================

  /**
   * Müşteri firmasının gönderileri (iç notlar gelmez)
   * @param {string} [status] - PLANNED | IN_TRANSIT | DELIVERED | CANCELLED
   */
  getMyShipments: async (status = null) => {
    try {
      const response = await axiosInstance.get('/courier-shipments/my', { params: cleanParams({ status }) });
      return { success: true, data: shipmentsOf(response.data) };
    } catch (error) {
      return failure('getMyShipments', error, 'api.courierShipments.listError');
    }
  },

  /**
   * Müşterinin tek gönderisi, olay geçmişiyle
   * @param {number} id
   */
  getMyShipment: async (id) => {
    try {
      const response = await axiosInstance.get(`/courier-shipments/my/${id}`);
      return { success: true, data: shipmentOf(response.data) };
    } catch (error) {
      return failure('getMyShipment', error, 'api.courierShipments.loadError');
    }
  },

  /**
   * Müşterinin gönderisinin canlı takibi — anlık konum ve son 15 dakikalık iz.
   * Hız, kontak ve sürücü telefonu bu yanıtta hiç gelmez; kapanmış gönderide konum da gelmez.
   * @param {number} id
   * @returns data: `getTracking` ile aynı biçim
   */
  getMyTracking: async (id) => {
    try {
      const response = await axiosInstance.get(`/courier-shipments/my/${id}/tracking`);
      return { success: true, data: trackingOf(response.data) };
    } catch (error) {
      return failure('getMyTracking', error, 'api.courierShipments.trackingError');
    }
  },

  /**
   * Ana ekran kurye şeridinin canlı takip özeti — müşteri görünümü. Hız, kontak ve sürücü telefonu
   * bu yanıtta hiç gelmez.
   * @returns data: `getTrackingSummary` ile aynı biçim
   */
  getMyTrackingSummary: async () => {
    try {
      const response = await axiosInstance.get('/courier-shipments/my/tracking/summary');
      return { success: true, data: trackingSummaryOf(response.data) };
    } catch (error) {
      return failure('getMyTrackingSummary', error, 'api.courierShipments.trackingError');
    }
  },

  /**
   * Dashboard özeti
   * @returns data: { inTransit: [], upcoming: [] (en fazla 5), recentlyCompleted: [] (en fazla 3) }
   */
  getMySummary: async () => {
    try {
      const response = await axiosInstance.get('/courier-shipments/my/summary');
      const data = response.data || {};
      return {
        success: true,
        data: {
          inTransit: Array.isArray(data.inTransit) ? data.inTransit : [],
          upcoming: Array.isArray(data.upcoming) ? data.upcoming : [],
          recentlyCompleted: Array.isArray(data.recentlyCompleted) ? data.recentlyCompleted : [],
        },
      };
    } catch (error) {
      return failure('getMySummary', error, 'api.courierShipments.summaryError');
    }
  },
};

export default courierShipmentService;
