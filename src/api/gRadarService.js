import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

/**
 * Cargo-bound G-Radar endpoints (Phase 7 backend).
 *
 * Pairs with gRadarCreditService — that one handles wallet / pricing /
 * purchases, while this one is about turning the integration on and off for
 * individual cargo rows.
 */
export const gRadarService = {
  // ---- Master config (SuperAdmin) ----
  getMasterConfig: async () => {
    try {
      const res = await axiosInstance.get('/g-radar/master-config');
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - getMasterConfig', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Master konfigürasyon alınamadı',
      };
    }
  },

  updateMasterConfig: async ({ apiToken, webhookSecret, webhookUrl, active, reservedCredits }) => {
    try {
      const res = await axiosInstance.put('/g-radar/master-config', {
        apiToken, webhookSecret, webhookUrl, active, reservedCredits,
      });
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - updateMasterConfig', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Master konfigürasyon güncellenemedi',
      };
    }
  },

  testMasterConnection: async () => {
    try {
      const res = await axiosInstance.post('/g-radar/master-config/test');
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - testMasterConnection', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Bağlantı testi başarısız',
      };
    }
  },

  refreshMasterBalance: async ({ identifier, type } = {}) => {
    try {
      // Optional manual identifier — SuperAdmin pastes a B/L / AWB / container
      // they know is already on the G-Radar master account (e.g. an older
      // dashboard-only query). Empty body falls back to backend auto-pick.
      const body = identifier ? { identifier, type } : undefined;
      const res = await axiosInstance.post('/g-radar/master-config/refresh-balance', body);
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - refreshMasterBalance', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Bakiye yenilenemedi',
      };
    }
  },

  getMasterBalance: async () => {
    try {
      const res = await axiosInstance.get('/g-radar/master-balance');
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - getMasterBalance', error);
      return { success: false, error: error.response?.data?.error || 'Master bakiye alınamadı' };
    }
  },

  // ---- Modal preview (cargo not yet saved) ----
  preview: async ({ vehicleType, awbNumber, containerNumber, billOfLading }) => {
    try {
      const res = await axiosInstance.post('/g-radar/preview', {
        vehicleType, awbNumber, containerNumber, billOfLading,
      });
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - preview', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Önizleme alınamadı',
      };
    }
  },

  abandonPreview: async (gRadarTrackingId, vehicleType) => {
    try {
      await axiosInstance.delete(`/g-radar/preview/${gRadarTrackingId}`, {
        params: { vehicleType },
      });
      return { success: true };
    } catch (error) {
      logError('GRadarService - abandonPreview', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  // ---- Per-cargo lifecycle ----
  enable: async (cargoId) => {
    try {
      const res = await axiosInstance.post(`/g-radar/cargo/${cargoId}/enable`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - enable', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  fetch: async (cargoId) => {
    try {
      const res = await axiosInstance.post(`/g-radar/cargo/${cargoId}/fetch`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - fetch', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  disable: async (cargoId) => {
    try {
      const res = await axiosInstance.delete(`/g-radar/cargo/${cargoId}/disable`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - disable', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  refresh: async (cargoId) => {
    try {
      const res = await axiosInstance.post(`/g-radar/cargo/${cargoId}/refresh`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - refresh', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  resetOverride: async (cargoId, fieldName) => {
    try {
      const res = await axiosInstance.post(`/g-radar/cargo/${cargoId}/reset-override/${fieldName}`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - resetOverride', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  getCargoDetails: async (cargoId) => {
    try {
      const res = await axiosInstance.get(`/g-radar/cargo/${cargoId}/details`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - getCargoDetails', error);
      return { success: false, error: error.response?.data?.error };
    }
  },

  // ---- Enable-request workflow (BROKER_USER ↔ BROKER_ADMIN) ----
  requestEnable: async (cargoId, { notes } = {}) => {
    try {
      const res = await axiosInstance.post(`/g-radar/cargo/${cargoId}/request-enable`, { notes });
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - requestEnable', error);
      return { success: false, error: error.response?.data?.error || 'Talep gönderilemedi' };
    }
  },

  cancelRequest: async (requestId) => {
    try {
      await axiosInstance.delete(`/g-radar/requests/${requestId}`);
      return { success: true };
    } catch (error) {
      logError('GRadarService - cancelRequest', error);
      return { success: false, error: error.response?.data?.error || 'Talep iptal edilemedi' };
    }
  },

  listPendingRequests: async (brokerCompanyId) => {
    try {
      const res = await axiosInstance.get('/g-radar/pending-requests', {
        params: brokerCompanyId ? { brokerCompanyId } : {},
      });
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - listPendingRequests', error);
      return { success: false, error: error.response?.data?.error || 'Talep listesi alınamadı' };
    }
  },

  approveRequest: async (requestId, { fetchImmediately = false } = {}) => {
    try {
      const res = await axiosInstance.post(
        `/g-radar/requests/${requestId}/approve`,
        { fetchImmediately },
      );
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - approveRequest', error);
      return { success: false, error: error.response?.data?.error || 'Onay başarısız' };
    }
  },

  rejectRequest: async (requestId, reason) => {
    try {
      const res = await axiosInstance.post(
        `/g-radar/requests/${requestId}/reject`,
        { reason },
      );
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - rejectRequest', error);
      return { success: false, error: error.response?.data?.error || 'Red başarısız' };
    }
  },

  listCargoRequests: async (cargoId) => {
    try {
      const res = await axiosInstance.get(`/g-radar/cargo/${cargoId}/requests`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarService - listCargoRequests', error);
      return { success: false, error: error.response?.data?.error };
    }
  },
};
