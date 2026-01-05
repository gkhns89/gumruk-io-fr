import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

/**
 * Gümrük Haberleri API Servisi
 * Backend'den RSS feed ile toplanan gümrük haberlerini getirir
 */
export const customsNewsService = {
  /**
   * Son 10 gümrük haberini getir
   * @returns {Promise<{success: boolean, data: Array, error?: string}>}
   */
  getRecentNews: async () => {
    try {
      console.log("📰 Gümrük haberleri getiriliyor...");

      const response = await axiosInstance.get('/customs-news/recent');

      // Response direkt array veya obje içinde array olabilir
      let newsArray = [];
      if (Array.isArray(response.data)) {
        newsArray = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        newsArray = response.data.data;
      } else if (response.data?.items && Array.isArray(response.data.items)) {
        newsArray = response.data.items;
      } else if (response.data?.news && Array.isArray(response.data.news)) {
        newsArray = response.data.news;
      }

      console.log(`✅ ${newsArray.length} haber getirildi`);

      return {
        success: true,
        data: newsArray
      };
    } catch (error) {
      logError('CustomsNewsService - getRecentNews', error);

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Haberler alınamadı',
        data: [] // Fallback olarak boş array
      };
    }
  },

  /**
   * Manuel haber yenileme (admin için - opsiyonel)
   * Backend'deki scheduled job'u manuel tetikler
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  refreshNews: async () => {
    try {
      console.log("🔄 Haberler manuel olarak yenileniyor...");

      const response = await axiosInstance.post('/customs-news/refresh');

      console.log("✅ Haberler başarıyla yenilendi");

      return {
        success: true,
        message: response.data?.message || 'Haberler yenilendi'
      };
    } catch (error) {
      logError('CustomsNewsService - refreshNews', error);

      // 403 Forbidden - Yetki hatası
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Bu işlem için yetkiniz yok'
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Haberler yenilenemedi'
      };
    }
  }
};
