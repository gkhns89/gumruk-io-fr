import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales/runtime';

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
      return { success: false, error: getApiErrorMessage(error, t('api.featureFlag.loadMineError')) };
    }
  },

  list: async () => {
    try {
      const response = await axiosInstance.get('/feature-flags');
      return { success: true, data: response.data.flags || [] };
    } catch (error) {
      logError('FeatureFlagService - list', error);
      return { success: false, error: getApiErrorMessage(error, t('featureFlags.loadError')) };
    }
  },

  update: async (key, { state, pilotCompanyIds }) => {
    try {
      const response = await axiosInstance.put(`/feature-flags/${key}`, { state, pilotCompanyIds });
      return { success: true, data: response.data.flag };
    } catch (error) {
      logError('FeatureFlagService - update', error);
      return { success: false, error: getApiErrorMessage(error, t('featureFlags.saveError')) };
    }
  },
};

export default featureFlagService;
