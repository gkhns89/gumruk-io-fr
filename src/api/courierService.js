import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

/**
 * Kurye Takip API Servisi
 * Kurye firmalarını ve kalkış saatlerini yönetir
 */
export const courierService = {
  // ==================== COURIER COMPANIES ====================

  /**
   * Tüm kurye firmalarını getir
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  getCourierCompanies: async (brokerCompanyId = null) => {
    try {
      const url = brokerCompanyId ? `/couriers?brokerCompanyId=${brokerCompanyId}` : '/couriers';
      const response = await axiosInstance.get(url);
      return { success: true, data: response.data.data || [] };
    } catch (error) {
      logError('CourierService - getCourierCompanies', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kurye firmaları yüklenemedi',
      };
    }
  },

  /**
   * Tek kurye firmasını getir
   * @param {number} id - Kurye firması ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  getCourierCompanyById: async (id) => {
    try {
      const response = await axiosInstance.get(`/couriers/${id}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      logError('CourierService - getCourierCompanyById', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kurye firması bilgileri alınamadı',
      };
    }
  },

  /**
   * Yeni kurye firması oluştur
   * @param {Object} data - Kurye firması bilgileri
   * @param {string} data.name - Firma adı
   * @param {string} data.shortName - Kısa ad (opsiyonel)
   * @param {boolean} data.active - Aktif/pasif durum
   * @param {string} data.contactPhone - İletişim telefonu (opsiyonel)
   * @param {string} data.contactEmail - İletişim email (opsiyonel)
   * @param {string} data.notes - Notlar (opsiyonel)
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  createCourierCompany: async (data, brokerCompanyId = null) => {
    try {
      const payload = brokerCompanyId ? { ...data, brokerCompanyId } : data;
      const response = await axiosInstance.post('/couriers', payload);
      return { success: true, data: response.data.data };
    } catch (error) {
      logError('CourierService - createCourierCompany', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kurye firması oluşturulamadı',
      };
    }
  },

  /**
   * Kurye firmasını güncelle
   * @param {number} id - Kurye firması ID
   * @param {Object} data - Güncellenecek bilgiler
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  updateCourierCompany: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/couriers/${id}`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      logError('CourierService - updateCourierCompany', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kurye firması güncellenemedi',
      };
    }
  },

  /**
   * Kurye firmasını sil
   * @param {number} id - Kurye firması ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  deleteCourierCompany: async (id) => {
    try {
      const response = await axiosInstance.delete(`/couriers/${id}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      logError('CourierService - deleteCourierCompany', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kurye firması silinemedi',
      };
    }
  },

  // ==================== SCHEDULES ====================

  /**
   * Kurye firmasının schedule'larını getir
   * @param {number} courierId - Kurye firması ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  getSchedules: async (courierId) => {
    try {
      const response = await axiosInstance.get(`/couriers/${courierId}/schedules`);
      return { success: true, data: response.data.data || [] };
    } catch (error) {
      logError('CourierService - getSchedules', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kalkış saatleri alınamadı',
      };
    }
  },

  /**
   * Kurye firmasına yeni saat ekle
   * @param {number} courierId - Kurye firması ID
   * @param {Object} data - Schedule bilgileri
   * @param {number} data.customsId - Gümrük müdürlüğü ID
   * @param {number} data.dayOfWeek - Haftanın günü (1-7)
   * @param {string} data.departureTime - Kalkış saati (HH:mm format)
   * @param {boolean} data.active - Aktif/pasif durum
   * @param {string} data.notes - Notlar (opsiyonel)
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  addSchedule: async (courierId, data) => {
    try {
      const response = await axiosInstance.post(`/couriers/${courierId}/schedules`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      logError('CourierService - addSchedule', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kalkış saati eklenemedi',
      };
    }
  },

  /**
   * Schedule'ı güncelle
   * @param {number} scheduleId - Schedule ID
   * @param {Object} data - Güncellenecek bilgiler
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  updateSchedule: async (scheduleId, data) => {
    try {
      const response = await axiosInstance.put(`/couriers/schedules/${scheduleId}`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      logError('CourierService - updateSchedule', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kalkış saati güncellenemedi',
      };
    }
  },

  /**
   * Schedule'ı sil
   * @param {number} scheduleId - Schedule ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  deleteSchedule: async (scheduleId) => {
    try {
      const response = await axiosInstance.delete(`/couriers/schedules/${scheduleId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      logError('CourierService - deleteSchedule', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kalkış saati silinemedi',
      };
    }
  },

  // ==================== DASHBOARD ====================

  /**
   * Bir sonraki kurye kalkış bilgilerini getir (Dashboard için)
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   * Response data: {
   *   nextDepartures: [{
   *     courierCompanyId: number,
   *     courierCompanyName: string,
   *     customsId: number,
   *     customsName: string,
   *     departureTime: string (HH:mm),
   *     minutesUntilDeparture: number,
   *     status: string
   *   }],
   *   calculatedAt: string (ISO datetime)
   * }
   */
  getNextDepartures: async () => {
    try {
      const response = await axiosInstance.get('/couriers/next-departures');
      return { success: true, data: response.data.data };
    } catch (error) {
      logError('CourierService - getNextDepartures', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kurye kalkış bilgileri alınamadı',
      };
    }
  }
};

export default courierService;
