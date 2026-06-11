import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

/**
 * Cargo-bound ShipsGo endpoints (Phase 7 backend).
 *
 * Pairs with shipsGoCreditService — that one handles wallet / pricing /
 * purchases, while this one is about turning the integration on and off for
 * individual cargo rows.
 */
export const shipsGoService = {
  // ---- Master config (SuperAdmin) ----
  getMasterConfig: async () => {
    try {
      const res = await axiosInstance.get('/shipsgo/master-config');
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - getMasterConfig', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Master konfigürasyon alınamadı',
      };
    }
  },

  updateMasterConfig: async ({ apiToken, webhookSecret, webhookUrl, active }) => {
    try {
      const res = await axiosInstance.put('/shipsgo/master-config', {
        apiToken, webhookSecret, webhookUrl, active,
      });
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - updateMasterConfig', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Master konfigürasyon güncellenemedi',
      };
    }
  },

  getMasterBalance: async () => {
    try {
      const res = await axiosInstance.get('/shipsgo/master-balance');
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - getMasterBalance', error);
      return { success: false, error: error.response?.data?.error || 'Master bakiye alınamadı' };
    }
  },

  // ---- Modal preview (cargo not yet saved) ----
  preview: async ({ vehicleType, awbNumber, containerNumber, billOfLading }) => {
    try {
      const res = await axiosInstance.post('/shipsgo/preview', {
        vehicleType, awbNumber, containerNumber, billOfLading,
      });
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - preview', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Önizleme alınamadı',
      };
    }
  },

  abandonPreview: async (shipsGoTrackingId, vehicleType) => {
    try {
      await axiosInstance.delete(`/shipsgo/preview/${shipsGoTrackingId}`, {
        params: { vehicleType },
      });
      return { success: true };
    } catch (error) {
      logError('ShipsGoService - abandonPreview', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  // ---- Per-cargo lifecycle ----
  enable: async (cargoId) => {
    try {
      const res = await axiosInstance.post(`/shipsgo/cargo/${cargoId}/enable`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - enable', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  fetch: async (cargoId) => {
    try {
      const res = await axiosInstance.post(`/shipsgo/cargo/${cargoId}/fetch`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - fetch', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  disable: async (cargoId) => {
    try {
      const res = await axiosInstance.delete(`/shipsgo/cargo/${cargoId}/disable`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - disable', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  refresh: async (cargoId) => {
    try {
      const res = await axiosInstance.post(`/shipsgo/cargo/${cargoId}/refresh`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - refresh', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  resetOverride: async (cargoId, fieldName) => {
    try {
      const res = await axiosInstance.post(`/shipsgo/cargo/${cargoId}/reset-override/${fieldName}`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - resetOverride', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  getCargoDetails: async (cargoId) => {
    try {
      const res = await axiosInstance.get(`/shipsgo/cargo/${cargoId}/details`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - getCargoDetails', error);
      return { success: false, error: error.response?.data?.error };
    }
  },
};
