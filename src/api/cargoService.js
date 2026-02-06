import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

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
   * Get all cargo (role-based filtering on backend)
   */
  getAllCargo: async () => {
    try {
      const response = await axiosInstance.get('/cargo/all');
      const dataArray = safeArrayConversion(response.data, 'All Cargo');
      return { success: true, data: dataArray };
    } catch (error) {
      logError('CargoService - getAllCargo', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Yük verileri alınamadı',
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
        error: error.response?.data?.error || 'Yük bilgisi alınamadı',
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
        error: error.response?.data?.error || 'Broker yükleri alınamadı',
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
        error: error.response?.data?.error || 'Müşteri yükleri alınamadı',
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
        message: 'Yük kaydı başarıyla oluşturuldu'
      };
    } catch (error) {
      logError('CargoService - createCargo', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Yük kaydı oluşturulamadı',
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
        message: 'Yük kaydı başarıyla güncellendi'
      };
    } catch (error) {
      logError('CargoService - updateCargo', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Yük kaydı güncellenemedi',
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
        message: response.data?.message || 'Yük kaydı başarıyla silindi'
      };
    } catch (error) {
      logError('CargoService - deleteCargo', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Yük kaydı silinemedi',
        message: error.message
      };
    }
  },
};

export default cargoService;
