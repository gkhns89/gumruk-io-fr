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

  updateMasterConfig: async ({ apiToken, webhookSecret, webhookUrl, active, reservedCredits }) => {
    try {
      const res = await axiosInstance.put('/shipsgo/master-config', {
        apiToken, webhookSecret, webhookUrl, active, reservedCredits,
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

  testMasterConnection: async () => {
    try {
      const res = await axiosInstance.post('/shipsgo/master-config/test');
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - testMasterConnection', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Bağlantı testi başarısız',
      };
    }
  },

  refreshMasterBalance: async ({ identifier, type } = {}) => {
    try {
      // Optional manual identifier — SuperAdmin pastes a B/L / AWB / container
      // they know is already on the ShipsGo master account (e.g. an older
      // dashboard-only query). Empty body falls back to backend auto-pick.
      const body = identifier ? { identifier, type } : undefined;
      const res = await axiosInstance.post('/shipsgo/master-config/refresh-balance', body);
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - refreshMasterBalance', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Bakiye yenilenemedi',
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

  // ---- Enable-request workflow (BROKER_USER ↔ BROKER_ADMIN) ----
  requestEnable: async (cargoId, { notes } = {}) => {
    try {
      const res = await axiosInstance.post(`/shipsgo/cargo/${cargoId}/request-enable`, { notes });
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - requestEnable', error);
      return { success: false, error: error.response?.data?.error || 'Talep gönderilemedi' };
    }
  },

  cancelRequest: async (requestId) => {
    try {
      await axiosInstance.delete(`/shipsgo/requests/${requestId}`);
      return { success: true };
    } catch (error) {
      logError('ShipsGoService - cancelRequest', error);
      return { success: false, error: error.response?.data?.error || 'Talep iptal edilemedi' };
    }
  },

  listPendingRequests: async (brokerCompanyId) => {
    try {
      const res = await axiosInstance.get('/shipsgo/pending-requests', {
        params: brokerCompanyId ? { brokerCompanyId } : {},
      });
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - listPendingRequests', error);
      return { success: false, error: error.response?.data?.error || 'Talep listesi alınamadı' };
    }
  },

  approveRequest: async (requestId, { fetchImmediately = false } = {}) => {
    try {
      const res = await axiosInstance.post(
        `/shipsgo/requests/${requestId}/approve`,
        { fetchImmediately },
      );
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - approveRequest', error);
      return { success: false, error: error.response?.data?.error || 'Onay başarısız' };
    }
  },

  rejectRequest: async (requestId, reason) => {
    try {
      const res = await axiosInstance.post(
        `/shipsgo/requests/${requestId}/reject`,
        { reason },
      );
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - rejectRequest', error);
      return { success: false, error: error.response?.data?.error || 'Red başarısız' };
    }
  },

  listCargoRequests: async (cargoId) => {
    try {
      const res = await axiosInstance.get(`/shipsgo/cargo/${cargoId}/requests`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('ShipsGoService - listCargoRequests', error);
      return { success: false, error: error.response?.data?.error };
    }
  },
};
