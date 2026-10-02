import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { reportIfFeatureDisabled } from '../utils/featureFlags';
import { t } from '../locales';

/**
 * Müşteri firmasının teslimat / alım noktaları (COURIER_LIVE_TRACKING bayrağı arkasında).
 *
 * Gönderi formunda varış noktası bu listeden seçilir; koordinat girilmişse canlı takip haritası ve
 * yaklaşma bildirimi mümkün olur, girilmemişse nokta yalnızca ad ve adres olarak kullanılır.
 * Noktaları şimdilik gümrük firması yönetir (broker müşterisi adına); müşterinin kendi noktalarını
 * yönetmesi sonraki aşama.
 *
 * Nokta öğesi: { id, companyId, label, address, latitude, longitude, isDefault, active }.
 * Enlem/boylam birlikte girilmeli (`companyLocation.coordinatesIncomplete`).
 *
 * Okuma BROKER_USER'a da açıktır; yazma BROKER_ADMIN ve SUPER_ADMIN'de. Silme yoktur: `deactivate`
 * noktayı pasife alır, çünkü geçmiş gönderiler noktaya bağlıdır.
 *
 * Servisler hata fırlatmaz: `{ success: true, data }` | `{ success: false, error, code, status }`.
 */

const CODE_FALLBACK_KEYS = {
  FEATURE_DISABLED: 'api.companyLocation.featureDisabled',
  FORBIDDEN: 'api.companyLocation.forbidden',
  COMPANY_LOCATION_LABEL_EXISTS: 'api.companyLocation.labelExists',
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
  if (!featureDisabled) logError(`CompanyLocationService - ${context}`, error);
  const key = CODE_FALLBACK_KEYS[code] || fallbackKey;
  return { success: false, error: getApiErrorMessage(error, t(key)), code, status };
};

export const companyLocationService = {
  /**
   * Müşteri firmasının noktaları
   * @param {number|string} clientId - Müşteri firmasının kimliği
   * @param {boolean} activeOnly - true ise yalnızca aktif noktalar (gönderi formunun seçenek listesi)
   */
  listLocations: async (clientId, activeOnly = false) => {
    try {
      const response = await axiosInstance.get(`/companies/${clientId}/locations`, {
        params: activeOnly ? { activeOnly: true } : undefined,
      });
      return { success: true, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      return failure('listLocations', error, 'api.companyLocation.listError');
    }
  },

  /**
   * Yeni nokta
   * @param {number|string} clientId
   * @param {Object} data - { label, address, latitude, longitude, isDefault, active }
   */
  createLocation: async (clientId, data) => {
    try {
      const response = await axiosInstance.post(`/companies/${clientId}/locations`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('createLocation', error, 'api.companyLocation.createError');
    }
  },

  /**
   * Noktayı güncelle
   * @param {number|string} clientId
   * @param {number|string} locationId
   * @param {Object} data
   */
  updateLocation: async (clientId, locationId, data) => {
    try {
      const response = await axiosInstance.put(`/companies/${clientId}/locations/${locationId}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('updateLocation', error, 'api.companyLocation.updateError');
    }
  },

  /**
   * Noktayı pasife alır (silmez); yanıt noktanın yeni hâlidir.
   * @param {number|string} clientId
   * @param {number|string} locationId
   */
  deactivateLocation: async (clientId, locationId) => {
    try {
      const response = await axiosInstance.delete(`/companies/${clientId}/locations/${locationId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('deactivateLocation', error, 'api.companyLocation.deactivateError');
    }
  },
};

export default companyLocationService;
