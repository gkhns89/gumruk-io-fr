import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

/**
 * Frontend wrapper around the /api/g-radar credit endpoints (Phase 5 backend).
 *
 * Every method returns { success, data } on the happy path and
 * { success: false, error, code? } on failure, mirroring the pattern used by
 * the other services in this directory. The optional `code` carries the
 * machine-readable response codes the backend emits — currently
 * MASTER_POOL_UNAVAILABLE (409) and INSUFFICIENT_GRADAR_CREDITS (402) — so
 * UI components can show specific guidance without parsing error strings.
 */
export const gRadarCreditService = {
  // ---- Broker-self reads ----
  getMyWallet: async () => {
    try {
      const res = await axiosInstance.get('/g-radar/my-wallet');
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - getMyWallet', error);
      return {
        success: false,
        error: error.response?.data?.error || 'G-Radar kredisi bilgisi alınamadı',
      };
    }
  },

  /** Live price preview — no credits consumed. Safe to call as the user types. */
  getQuote: async (credits) => {
    try {
      const res = await axiosInstance.get('/g-radar/quote', { params: { credits } });
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - getQuote', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Fiyat hesaplanamadı',
      };
    }
  },

  // ---- Purchase ----
  purchaseFromBalance: async ({ creditAmount, notes }) => {
    try {
      const res = await axiosInstance.post('/g-radar/purchase/balance', {
        creditAmount,
        notes,
      });
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - purchaseFromBalance', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Satın alma başarısız',
        code: error.response?.data?.code,
      };
    }
  },

  purchaseByTransfer: async ({ creditAmount, referenceNumber, notes }) => {
    try {
      const res = await axiosInstance.post('/g-radar/purchase/transfer', {
        creditAmount,
        referenceNumber,
        notes,
      });
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - purchaseByTransfer', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Havale bildirimi gönderilemedi',
      };
    }
  },

  // ---- SuperAdmin ----
  listPendingPurchases: async () => {
    try {
      const res = await axiosInstance.get('/g-radar/purchases/pending');
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - listPendingPurchases', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Bekleyen ödemeler alınamadı',
      };
    }
  },

  approvePurchase: async (purchaseId) => {
    try {
      const res = await axiosInstance.post(`/g-radar/purchases/${purchaseId}/approve`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - approvePurchase', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Onay başarısız',
        code: error.response?.data?.code,
      };
    }
  },

  rejectPurchase: async (purchaseId, reason) => {
    try {
      const res = await axiosInstance.post(`/g-radar/purchases/${purchaseId}/reject`, { reason });
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - rejectPurchase', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Red başarısız',
      };
    }
  },

  adminGrant: async (brokerCompanyId, { credits, notes }) => {
    try {
      const res = await axiosInstance.post(
        `/g-radar/wallets/${brokerCompanyId}/admin-grant`,
        { credits, notes },
      );
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - adminGrant', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kredi tanımlanamadı',
        code: error.response?.data?.code,
      };
    }
  },

  // SuperAdmin reconciliation — FIFO-debits credits from a broker's wallet.
  // Used when local wallet drifts from upstream G-Radar (e.g. an old timing
  // bug burned a master credit but didn't debit the broker).
  adminDebit: async (brokerCompanyId, { credits, notes }) => {
    try {
      const res = await axiosInstance.post(
        `/g-radar/wallets/${brokerCompanyId}/admin-debit`,
        { credits, notes },
      );
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - adminDebit', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Kredi eksiltilemedi',
        code: error.response?.data?.code,
      };
    }
  },

  /**
   * SuperAdmin per-broker G-Radar toggle. Persists the new state, fires the
   * matching notification on the backend and returns the fresh wallet so
   * BrokerSubscriptionsPage can update without a separate reload.
   */
  setBrokerEnabled: async (brokerCompanyId, enabled) => {
    try {
      const res = await axiosInstance.patch(
        `/g-radar/brokers/${brokerCompanyId}/enabled`,
        { enabled },
      );
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - setBrokerEnabled', error);
      return {
        success: false,
        error: error.response?.data?.error || 'G-Radar durumu güncellenemedi',
      };
    }
  },

  getBrokerWallet: async (brokerCompanyId) => {
    try {
      const res = await axiosInstance.get(`/g-radar/wallets/${brokerCompanyId}`);
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - getBrokerWallet', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Cüzdan bilgisi alınamadı',
      };
    }
  },
};
