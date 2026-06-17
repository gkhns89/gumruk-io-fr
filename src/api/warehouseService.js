import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

const safeArrayConversion = (data, context = 'data') => {
  if (Array.isArray(data)) return data;
  if (data === null || data === undefined) return [];
  if (typeof data === 'object') {
    const possibleFields = ['data', 'items', 'content', 'results', 'list', 'records', 'rows'];
    for (const field of possibleFields) {
      if (Array.isArray(data[field])) return data[field];
    }
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key];
    }
    return [data];
  }
  return [];
};

export const warehouseService = {

  getAll: async () => {
    try {
      const response = await axiosInstance.get('/warehouse');
      return { success: true, data: safeArrayConversion(response.data, 'WarehouseDeclarations') };
    } catch (error) {
      logError('WarehouseService - getAll', error);
      return { success: false, error: error.response?.data?.error || 'Antrepo kayıtları alınamadı' };
    }
  },

  // Dashboard sayım özeti (TESCIL_EDILDI / KAPANDI / total)
  getStatsSummary: async () => {
    try {
      const response = await axiosInstance.get('/warehouse/stats/summary');
      return { success: true, data: response.data };
    } catch (error) {
      logError('WarehouseService - getStatsSummary', error);
      return { success: false, error: error.response?.data?.error || 'Antrepo özeti alınamadı' };
    }
  },

  // Dashboard birleşik liste için: son aktif antrepolar (KAPANDI hariç, LIMIT 10)
  getRecent: async () => {
    try {
      const response = await axiosInstance.get('/warehouse/recent');
      return { success: true, data: safeArrayConversion(response.data, 'RecentWarehouseDeclarations') };
    } catch (error) {
      logError('WarehouseService - getRecent', error);
      return { success: false, error: error.response?.data?.error || 'Son antrepo kayıtları alınamadı' };
    }
  },

  getTransfers: async (id) => {
    try {
      const response = await axiosInstance.get(`/warehouse/${id}/transfers`);
      return { success: true, data: safeArrayConversion(response.data, 'WarehouseTransfers') };
    } catch (error) {
      logError('WarehouseService - getTransfers', error);
      return { success: false, error: error.response?.data?.error || 'Aktarım geçmişi alınamadı' };
    }
  },

  create: async (data) => {
    try {
      const response = await axiosInstance.post('/warehouse', data);
      return { success: true, data: response.data, message: response.data.message || 'Antrepo kaydı oluşturuldu' };
    } catch (error) {
      logError('WarehouseService - create', error);
      if (error.response?.status === 403) {
        return { success: false, error: 'Antrepo kaydı oluşturma yetkiniz yok' };
      }
      return { success: false, error: error.response?.data?.error || 'Antrepo kaydı oluşturulamadı' };
    }
  },

  update: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/warehouse/${id}`, data);
      return { success: true, data: response.data, message: response.data.message || 'Antrepo kaydı güncellendi' };
    } catch (error) {
      logError('WarehouseService - update', error);
      if (error.response?.status === 403) {
        return { success: false, error: 'Bu kaydı güncelleme yetkiniz yok' };
      }
      return { success: false, error: error.response?.data?.error || 'Antrepo kaydı güncellenemedi' };
    }
  },

  toggleProtocol: async (id) => {
    try {
      const response = await axiosInstance.patch(`/warehouse/${id}/protocol`);
      return { success: true, data: response.data };
    } catch (error) {
      logError('WarehouseService - toggleProtocol', error);
      return { success: false, error: error.response?.data?.error || 'Tutanak güncellenemedi' };
    }
  },

  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/warehouse/${id}`);
      return { success: true, message: response.data.message || 'Antrepo kaydı silindi' };
    } catch (error) {
      logError('WarehouseService - delete', error);
      if (error.response?.status === 403) {
        return { success: false, error: 'Bu kaydı silme yetkiniz yok' };
      }
      return { success: false, error: error.response?.data?.error || 'Antrepo kaydı silinemedi' };
    }
  },

  transfer: async (id, data) => {
    try {
      const response = await axiosInstance.post(`/warehouse/${id}/transfer`, data);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'İşlem Takip\'e aktarıldı',
        fileNo: response.data.fileNo,
      };
    } catch (error) {
      logError('WarehouseService - transfer', error);
      if (error.response?.status === 403) {
        return { success: false, error: 'Aktarım yapma yetkiniz yok' };
      }
      return { success: false, error: error.response?.data?.error || 'Aktarım yapılamadı' };
    }
  },
};
