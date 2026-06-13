import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

/**
 * TCMB (Türkiye Cumhuriyet Merkez Bankası) exchange rate read endpoints.
 * Backs the NewsPage currency ticker — one tracked rate per major currency,
 * refreshed daily by the backend's TcmbExchangeRateService 09:00 cron.
 */
export const tcmbService = {
  getLatestRates: async () => {
    try {
      const res = await axiosInstance.get('/tcmb/rates');
      return { success: true, data: res.data };
    } catch (error) {
      logError('TcmbService - getLatestRates', error);
      return {
        success: false,
        error: error.response?.data?.error || 'TCMB kurları alınamadı',
      };
    }
  },
};
