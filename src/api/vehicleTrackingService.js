import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { reportIfFeatureDisabled } from '../utils/featureFlags';
import { t } from '../locales';

/**
 * Gümrük firmasının araç takip bağlantısı (COURIER_LIVE_TRACKING bayrağı arkasında).
 *
 * Sağlayıcı token'ı yalnızca yazılır; yanıtta hiçbir zaman dönmez, yerine `tokenSet` gelir.
 * `liveMode` false ise sunucu taklit sağlayıcıyla çalışıyordur (gerçek Mobiliz bağlantısı henüz yok):
 * araç listesi ve konumlar örnektir, arayüzde bunu belirtmek gerekir.
 *
 * Bağlantı: { provider, active, tokenSet, lastSuccessAt, lastErrorAt, lastErrorCode, consecutiveFailures, liveMode }.
 * Sağlayıcı aracı: { key, plate, label } — `key` sağlayıcı kimliğinin karmasıdır, kimliğin kendisi
 * tarayıcıya hiç gönderilmez; araç eşleştirirken bu anahtar `providerVehicleKey` olarak geri gönderilir.
 *
 * `brokerCompanyId` yalnızca SUPER_ADMIN için anlamlıdır; broker personeli gönderse de yok sayılır.
 * Sağlayıcı aynı anda tek istek işlediği için eşzamanlı çağrılarda 409 `VEHICLE_TRACKING_BUSY` gelir —
 * bu bir hata değil, "birazdan tekrar dene" demektir.
 *
 * Servisler hata fırlatmaz: `{ success: true, data }` | `{ success: false, error, code, status }`.
 */

const CODE_FALLBACK_KEYS = {
  FEATURE_DISABLED: 'api.vehicleTracking.featureDisabled',
  FORBIDDEN: 'api.vehicleTracking.forbidden',
  VEHICLE_TRACKING_BUSY: 'api.vehicleTracking.busy',
  VEHICLE_TRACKING_UNAVAILABLE: 'api.vehicleTracking.unavailable',
  VEHICLE_TRACKING_AUTH: 'api.vehicleTracking.authFailed',
  VEHICLE_TRACKING_NOT_CONFIGURED: 'api.vehicleTracking.notConfigured',
};

const errorCodeOf = (error) => {
  const data = error?.response?.data;
  if (typeof data?.code === 'string') return data.code;
  return typeof data?.error === 'string' ? data.error : undefined;
};

const failure = (context, error, fallbackKey) => {
  const status = error?.response?.status;
  const code = errorCodeOf(error);
  const featureDisabled = reportIfFeatureDisabled(error);
  // Sağlayıcı meşguliyeti ve kurulmamış bağlantı beklenen durumlar; konsolu kirletmesinler.
  const expected = code === 'VEHICLE_TRACKING_BUSY' || code === 'VEHICLE_TRACKING_NOT_CONFIGURED';
  if (!featureDisabled && !expected) logError(`VehicleTrackingService - ${context}`, error);
  const key = CODE_FALLBACK_KEYS[code] || fallbackKey;
  return { success: false, error: getApiErrorMessage(error, t(key)), code, status };
};

/** Sağlayıcı şu anda başka bir isteği işliyor; çağıran kullanıcıya "tekrar dene" demeli. */
export const isTrackingBusy = (result) => result?.code === 'VEHICLE_TRACKING_BUSY';

/** Bağlantı hiç kurulmamış ya da kapalı: araç eşleştirme ekranı yerine kurulum yönlendirmesi gösterilir. */
export const isTrackingNotConfigured = (result) => result?.code === 'VEHICLE_TRACKING_NOT_CONFIGURED';

export const vehicleTrackingService = {
  /**
   * Firmanın bağlantı durumu
   * @param {number|string} [brokerCompanyId] - Yalnızca SUPER_ADMIN için
   */
  getIntegration: async (brokerCompanyId = null) => {
    try {
      const response = await axiosInstance.get('/vehicle-tracking/integration', {
        params: brokerCompanyId ? { brokerCompanyId } : undefined,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return failure('getIntegration', error, 'api.vehicleTracking.loadError');
    }
  },

  /**
   * Bağlantıyı kaydet
   * @param {Object} data - { provider, apiToken, clearToken, active }
   *   `apiToken` boş bırakılırsa mevcut token korunur; `clearToken: true` token'ı siler.
   * @param {number|string} [brokerCompanyId]
   */
  updateIntegration: async (data, brokerCompanyId = null) => {
    try {
      const response = await axiosInstance.put('/vehicle-tracking/integration', data, {
        params: brokerCompanyId ? { brokerCompanyId } : undefined,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return failure('updateIntegration', error, 'api.vehicleTracking.saveError');
    }
  },

  /**
   * Bağlantıyı sına; yanıt bağlantının güncel durumudur (son başarı / son hata alanları tazelenir).
   * @param {number|string} [brokerCompanyId]
   */
  testIntegration: async (brokerCompanyId = null) => {
    try {
      const response = await axiosInstance.post('/vehicle-tracking/integration/test', null, {
        params: brokerCompanyId ? { brokerCompanyId } : undefined,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return failure('testIntegration', error, 'api.vehicleTracking.testError');
    }
  },

  /**
   * Sağlayıcıdaki araçlar (plaka eşleştirme listesi)
   * @param {number|string} [brokerCompanyId]
   */
  listProviderVehicles: async (brokerCompanyId = null) => {
    try {
      const response = await axiosInstance.get('/vehicle-tracking/provider-vehicles', {
        params: brokerCompanyId ? { brokerCompanyId } : undefined,
      });
      return { success: true, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      return failure('listProviderVehicles', error, 'api.vehicleTracking.providerVehiclesError');
    }
  },
};

export default vehicleTrackingService;
