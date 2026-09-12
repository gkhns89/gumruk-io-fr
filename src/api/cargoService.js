import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';
import { t } from '../locales';

/**
 * Safe array conversion utility
 * Ensures response data is always converted to an array
 */
const safeArrayConversion = (data, context = 'data') => {
  if (Array.isArray(data)) return data;
  if (data === null || data === undefined) return [];
  if (typeof data === 'object') {
    const possibleFields = ['cargo', 'data', 'items', 'content', 'list'];
    for (const field of possibleFields) {
      if (Array.isArray(data[field])) return data[field];
    }
    // If object but not array-like, return as single-item array
    return [data];
  }
  logError(`[safeArrayConversion] Unexpected data type for ${context}:`, data);
  return [];
};

export const cargoService = {
  /**
   * Get all cargo (role-based filtering on backend).
   *
   * @param {Object} [opts]
   * @param {boolean} [opts.includeCompleted=false] — by default only TRACKING +
   *   ARRIVED rows are returned. The cargo page toggles this on when the user
   *   ticks "Tamamlananları Göster"; the heavier query gets its own longer
   *   timeout to survive brokers with thousands of historical records.
   */
  getAllCargo: async ({ includeCompleted = false } = {}) => {
    try {
      const response = await axiosInstance.get('/cargo/all', {
        params: { includeCompleted },
        timeout: includeCompleted ? 60_000 : 20_000,
      });
      const dataArray = safeArrayConversion(response.data, 'All Cargo');
      return { success: true, data: dataArray };
    } catch (error) {
      logError('CargoService - getAllCargo', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.cargo.listError'),
        message: error.message
      };
    }
  },

  /**
   * Dashboard sayım özeti (durum × araç tipi)
   */
  getStatsSummary: async () => {
    try {
      const response = await axiosInstance.get('/cargo/stats/summary');
      return { success: true, data: response.data };
    } catch (error) {
      logError('CargoService - getStatsSummary', error);
      return { success: false, error: error.response?.data?.error || t('api.cargo.summaryError') };
    }
  },

  /**
   * Dashboard için son aktif cargo (COMPLETED hariç, TRACKING önce, LIMIT 10)
   */
  getRecentCargo: async () => {
    try {
      const response = await axiosInstance.get('/cargo/recent');
      const dataArray = safeArrayConversion(response.data, 'Recent Cargo');
      return { success: true, data: dataArray };
    } catch (error) {
      logError('CargoService - getRecentCargo', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.cargo.recentError'),
        message: error.message
      };
    }
  },

  /**
   * Get single cargo by ID
   */
  getCargoById: async (id) => {
    try {
      const response = await axiosInstance.get(`/cargo/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      logError('CargoService - getCargoById', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.cargo.loadError'),
        message: error.message
      };
    }
  },

  /**
   * Get broker's cargo
   */
  getBrokerCargo: async (brokerId) => {
    try {
      const response = await axiosInstance.get(`/cargo/broker/${brokerId}`);
      const dataArray = safeArrayConversion(response.data, 'Broker Cargo');
      return { success: true, data: dataArray };
    } catch (error) {
      logError('CargoService - getBrokerCargo', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.cargo.brokerListError'),
        message: error.message
      };
    }
  },

  /**
   * Get client's cargo
   */
  getClientCargo: async (clientId) => {
    try {
      const response = await axiosInstance.get(`/cargo/client/${clientId}`);
      const dataArray = safeArrayConversion(response.data, 'Client Cargo');
      return { success: true, data: dataArray };
    } catch (error) {
      logError('CargoService - getClientCargo', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.cargo.clientListError'),
        message: error.message
      };
    }
  },

  /**
   * Create new cargo
   */
  createCargo: async (cargoData) => {
    try {
      const response = await axiosInstance.post('/cargo', cargoData);
      return {
        success: true,
        data: response.data,
        message: t('api.cargo.created')
      };
    } catch (error) {
      logError('CargoService - createCargo', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.cargo.createError'),
        message: error.message
      };
    }
  },

  /**
   * Update cargo
   */
  updateCargo: async (id, cargoData) => {
    try {
      const response = await axiosInstance.put(`/cargo/${id}`, cargoData);
      return {
        success: true,
        data: response.data,
        message: t('api.cargo.updated')
      };
    } catch (error) {
      logError('CargoService - updateCargo', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.cargo.updateError'),
        message: error.message
      };
    }
  },

  /**
   * Delete cargo
   */
  deleteCargo: async (id) => {
    try {
      const response = await axiosInstance.delete(`/cargo/${id}`);
      return {
        success: true,
        message: response.data?.message || t('cargoTracking.delete.success')
      };
    } catch (error) {
      logError('CargoService - deleteCargo', error);
      return {
        success: false,
        error: error.response?.data?.error || t('api.cargo.deleteError'),
        message: error.message
      };
    }
  },
};

export default cargoService;
