import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { reportIfFeatureDisabled } from '../utils/featureFlags';
import { t } from '../locales';

/**
 * Firma içi kurye kaydının araçları (COURIER_LIVE_TRACKING bayrağı arkasında; backend de kontrol ediyor).
 *
 * Bir firma içi kurye kaydı birden çok araç taşıyabilir; gönderi formunda bunlardan biri seçilir.
 * Dış kurye firmalarında araç yoktur (`courierVehicle.inHouseOnly`).
 *
 * Güncelleme kısmidir: gönderilmeyen alan olduğu gibi kalır, boş metin alanı temizler. Yani yalnızca
 * `{ active: true }` göndererek pasif bir aracı geri getirebilirsiniz.
 *
 * Araç öğesi: { id, courierCompanyId, plate, vehicleType, driverName, driverPhone, active, matched,
 *   provider, providerLabel, matchedAt }. `matched` true ise araç sağlayıcıdaki bir cihazla eşleşmiştir,
 *   yani canlı takip açılabilir; eşleşme `providerVehicleKey` ile kurulur (bkz. vehicleTrackingService).
 *
 * Okuma BROKER_USER'a da açıktır (gönderi formu için); yazma BROKER_ADMIN ve SUPER_ADMIN'de.
 * Silme koşulludur: araç hiçbir gönderide kullanılmamışsa gerçekten silinir, kullanılmışsa pasife alınır.
 *
 * Servisler hata fırlatmaz: `{ success: true, data }` | `{ success: false, error, code, status }`.
 */

const CODE_FALLBACK_KEYS = {
  FEATURE_DISABLED: 'api.courierVehicle.featureDisabled',
  FORBIDDEN: 'api.courierVehicle.forbidden',
  COURIER_VEHICLE_PLATE_EXISTS: 'api.courierVehicle.plateExists',
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
  if (!featureDisabled) logError(`CourierVehicleService - ${context}`, error);
  const key = CODE_FALLBACK_KEYS[code] || fallbackKey;
  return { success: false, error: getApiErrorMessage(error, t(key)), code, status };
};

/** Bayrak sayfa açıkken kapatıldıysa true; bayraklar zaten tazeleniyor, çağıran toast göstermemeli. */
export const isVehicleFeatureDisabled = (result) => result?.code === 'FEATURE_DISABLED';

export const courierVehicleService = {
  /**
   * Kurye kaydının araçları (pasifler dahil)
   * @param {number|string} courierId - Firma içi kurye kaydının kimliği
   */
  listVehicles: async (courierId) => {
    try {
      const response = await axiosInstance.get(`/couriers/${courierId}/vehicles`);
      return { success: true, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      return failure('listVehicles', error, 'api.courierVehicle.listError');
    }
  },

  /**
   * Yeni araç
   * @param {number|string} courierId
   * @param {Object} data - { plate, vehicleType, driverName, driverPhone, active, providerVehicleKey }
   *   `providerVehicleKey` sağlayıcı listesinden gelen anahtardır; boş bırakılırsa eşleşme kurulmaz.
   */
  createVehicle: async (courierId, data) => {
    try {
      const response = await axiosInstance.post(`/couriers/${courierId}/vehicles`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('createVehicle', error, 'api.courierVehicle.createError');
    }
  },

  /**
   * Aracı güncelle. `providerVehicleKey`: gönderilmezse eşleşmeye dokunulmaz, boş metin eşleşmeyi kaldırır.
   * @param {number|string} courierId
   * @param {number|string} vehicleId
   * @param {Object} data
   */
  updateVehicle: async (courierId, vehicleId, data) => {
    try {
      const response = await axiosInstance.put(`/couriers/${courierId}/vehicles/${vehicleId}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('updateVehicle', error, 'api.courierVehicle.updateError');
    }
  },

  /**
   * Aracı siler; gönderide kullanılmışsa silinmez, pasife alınır.
   * Yanıt: `{ deleted: boolean, vehicle }` — `deleted` true ise kayıt gitti ve `vehicle` null gelir.
   * @param {number|string} courierId
   * @param {number|string} vehicleId
   */
  deleteVehicle: async (courierId, vehicleId) => {
    try {
      const response = await axiosInstance.delete(`/couriers/${courierId}/vehicles/${vehicleId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('deleteVehicle', error, 'api.courierVehicle.deleteError');
    }
  },
};

export default courierVehicleService;
