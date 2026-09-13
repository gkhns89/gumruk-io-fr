import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

const safeArrayConversion = (data) => {
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
      return { success: true, data: safeArrayConversion(response.data) };
    } catch (error) {
      logError('WarehouseService - getAll', error);
      return { success: false, error: getApiErrorMessage(error, t('api.warehouse.listError')) };
    }
  },

  // Dashboard sayım özeti (TESCIL_EDILDI / KAPANDI / total)
  getStatsSummary: async () => {
    try {
      const response = await axiosInstance.get('/warehouse/stats/summary');
      return { success: true, data: response.data };
    } catch (error) {
      logError('WarehouseService - getStatsSummary', error);
      return { success: false, error: getApiErrorMessage(error, t('api.warehouse.summaryError')) };
    }
  },

  // Dashboard birleşik liste için: son aktif antrepolar (KAPANDI hariç, LIMIT 10)
  getRecent: async () => {
    try {
      const response = await axiosInstance.get('/warehouse/recent');
      return { success: true, data: safeArrayConversion(response.data) };
    } catch (error) {
      logError('WarehouseService - getRecent', error);
      return { success: false, error: getApiErrorMessage(error, t('api.warehouse.recentError')) };
    }
  },

  getTransfers: async (id) => {
    try {
      const response = await axiosInstance.get(`/warehouse/${id}/transfers`);
      return { success: true, data: safeArrayConversion(response.data) };
    } catch (error) {
      logError('WarehouseService - getTransfers', error);
      return { success: false, error: getApiErrorMessage(error, t('api.warehouse.transfersError')) };
    }
  },

  create: async (data) => {
    try {
      const response = await axiosInstance.post('/warehouse', data);
      return { success: true, data: response.data, message: response.data.message || t('warehouse.form.createSuccess') };
    } catch (error) {
      logError('WarehouseService - create', error);
      if (error.response?.status === 403) {
        return { success: false, error: t('api.warehouse.createForbidden') };
      }
      return { success: false, error: getApiErrorMessage(error, t('api.warehouse.createError')) };
    }
  },

  update: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/warehouse/${id}`, data);
      return { success: true, data: response.data, message: response.data.message || t('warehouse.form.updateSuccess') };
    } catch (error) {
      logError('WarehouseService - update', error);
      if (error.response?.status === 403) {
        return { success: false, error: t('api.warehouse.updateForbidden') };
      }
      return { success: false, error: getApiErrorMessage(error, t('api.warehouse.updateError')) };
    }
  },

  toggleProtocol: async (id) => {
    try {
      const response = await axiosInstance.patch(`/warehouse/${id}/protocol`);
      return { success: true, data: response.data };
    } catch (error) {
      logError('WarehouseService - toggleProtocol', error);
      return { success: false, error: getApiErrorMessage(error, t('api.warehouse.protocolError')) };
    }
  },

  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/warehouse/${id}`);
      return { success: true, message: response.data.message || t('warehouse.delete.success') };
    } catch (error) {
      logError('WarehouseService - delete', error);
      if (error.response?.status === 403) {
        return { success: false, error: t('api.warehouse.deleteForbidden') };
      }
      return { success: false, error: getApiErrorMessage(error, t('api.warehouse.deleteError')) };
    }
  },

  transfer: async (id, data) => {
    try {
      const response = await axiosInstance.post(`/warehouse/${id}/transfer`, data);
      return {
        success: true,
        data: response.data,
        message: response.data.message || t('api.warehouse.transferred'),
        fileNo: response.data.fileNo,
      };
    } catch (error) {
      logError('WarehouseService - transfer', error);
      if (error.response?.status === 403) {
        return { success: false, error: t('api.warehouse.transferForbidden') };
      }
      return { success: false, error: getApiErrorMessage(error, t('api.warehouse.transferError')) };
    }
  },
};
