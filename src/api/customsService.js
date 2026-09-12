import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

// Önizleme sunucuda Bakanlık sitesinden Word dosyasını indirip ayrıştırıyor; varsayılan 20 sn yetmeyebilir.
const REFRESH_TIMEOUT_MS = 120000;

/**
 * Gümrük idareleri API servisi.
 * Liste güncellemesi (önizle → doğrula → uygula) yalnızca SUPER_ADMIN içindir.
 */
export const customsService = {

  /** Aktif gümrük idareleri (açılır listeler için) */
  getActiveCustoms: async () => {
    try {
      const response = await axiosInstance.get('/customs/active');
      return { success: true, data: response.data };
    } catch (error) {
      logError('CustomsService - getActiveCustoms', error);
      return { success: false, error: getApiErrorMessage(error, t('api.customs.loadError')) };
    }
  },

  /** Tüm gümrük idareleri, pasifler dahil (yönetim paneli) */
  getAllCustoms: async () => {
    try {
      const response = await axiosInstance.get('/customs/all');
      return { success: true, data: response.data };
    } catch (error) {
      logError('CustomsService - getAllCustoms', error);
      return { success: false, error: getApiErrorMessage(error, t('api.customs.loadError')) };
    }
  },

  /** Tek gümrük idaresi */
  getCustomsById: async (id) => {
    try {
      const response = await axiosInstance.get(`/customs/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      logError('CustomsService - getCustomsById', error);
      return { success: false, error: getApiErrorMessage(error, t('api.customs.notFound')) };
    }
  },

  /** Mevcut liste özeti, kaynak bilgisi ve son güncelleme denemeleri (SUPER_ADMIN) */
  getRefreshStatus: async () => {
    try {
      const response = await axiosInstance.get('/customs/refresh/status');
      return { success: true, data: response.data };
    } catch (error) {
      logError('CustomsService - getRefreshStatus', error);
      return { success: false, error: getApiErrorMessage(error, t('api.customs.statusError')) };
    }
  },

  /**
   * Kaynaktan listeyi çekip veritabanına dokunmadan farkı ve doğrulama sonucunu döndürür (SUPER_ADMIN).
   * Kaynak erişilemezse sunucu 502 + `code: CUSTOMS_SOURCE_UNAVAILABLE` döner.
   */
  previewRefresh: async () => {
    try {
      const response = await axiosInstance.post('/customs/refresh/preview', null, { timeout: REFRESH_TIMEOUT_MS });
      return { success: true, data: response.data };
    } catch (error) {
      logError('CustomsService - previewRefresh', error);
      const fallback = error.response?.data?.code === 'CUSTOMS_SOURCE_UNAVAILABLE'
        ? t('api.customs.sourceUnavailable')
        : t('api.customs.previewError');
      return { success: false, error: getApiErrorMessage(error, fallback) };
    }
  },

  /**
   * Önizlemeyi uygular (SUPER_ADMIN). `force` doğrulamadan geçemeyen önizlemeyi yine de uygular.
   * Dönen değer kaydedilen güncelleme denemesidir.
   */
  applyRefresh: async (previewId, force = false) => {
    try {
      const response = await axiosInstance.post(
        '/customs/refresh/apply',
        { previewId, force: !!force },
        { timeout: REFRESH_TIMEOUT_MS },
      );
      return { success: true, data: response.data };
    } catch (error) {
      logError('CustomsService - applyRefresh', error);
      return { success: false, error: getApiErrorMessage(error, t('api.customs.applyError')) };
    }
  },
};
