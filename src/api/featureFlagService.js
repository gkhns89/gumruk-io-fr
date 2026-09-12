import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';

/**
 * Kademeli yayın bayrakları.
 * - getMyFeatures: giriş yapmış kullanıcı için açık bayraklar [{ key, state }]
 * - list / update: SUPER_ADMIN yönetimi
 */
export const featureFlagService = {
  getMyFeatures: async () => {
    try {
      // Bayraklar olmadan uygulama eski davranışla çalışır; hata konsolu kirletmesin.
      const response = await axiosInstance.get('/feature-flags/me', { silentOnError: true });
      return { success: true, data: response.data.features || [] };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Özellik bilgisi alınamadı') };
    }
  },

  list: async () => {
    try {
      const response = await axiosInstance.get('/feature-flags');
      return { success: true, data: response.data.flags || [] };
    } catch (error) {
      logError('FeatureFlagService - list', error);
      return { success: false, error: getApiErrorMessage(error, 'Bayraklar yüklenemedi') };
    }
  },

  update: async (key, { state, pilotCompanyIds }) => {
    try {
      const response = await axiosInstance.put(`/feature-flags/${key}`, { state, pilotCompanyIds });
      return { success: true, data: response.data.flag };
    } catch (error) {
      logError('FeatureFlagService - update', error);
      return { success: false, error: getApiErrorMessage(error, 'Bayrak güncellenemedi') };
    }
  },
};

export default featureFlagService;
