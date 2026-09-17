import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

/**
 * Frontend wrapper around the /api/g-radar credit endpoints (Phase 5 backend).
 *
 * Every method returns { success, data } on the happy path and
 * { success: false, error, code? } on failure, mirroring the pattern used by
 * the other services in this directory. The optional `code` carries the
 * machine-readable response codes the backend emits — currently
 * MASTER_POOL_UNAVAILABLE (409) and INSUFFICIENT_WALLET (409, admin debit) — so
 * UI components can show specific guidance without parsing error strings.
 * A credit shortage while spending credits (fetch / preview) comes back from
 * gRadarService as 400 GRADAR_INSUFFICIENT_CREDITS; see utils/gRadarCreditGuidance.
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
        error: getApiErrorMessage(error, t('api.gRadar.walletError')),
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
        error: getApiErrorMessage(error, t('api.gRadar.quoteError')),
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
        error: getApiErrorMessage(error, t('api.gRadar.purchaseError')),
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
        error: getApiErrorMessage(error, t('api.gRadar.transferError')),
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
        error: getApiErrorMessage(error, t('api.gRadar.pendingPurchasesError')),
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
        error: getApiErrorMessage(error, t('api.gRadar.approveError')),
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
        error: getApiErrorMessage(error, t('api.gRadar.rejectError')),
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
        error: getApiErrorMessage(error, t('api.gRadar.grantError')),
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
        error: getApiErrorMessage(error, t('api.gRadar.debitError')),
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
        error: getApiErrorMessage(error, t('api.gRadar.toggleError')),
        // GRADAR_PLAN_PRICE_MISSING: planın G-Radar fiyatı yok (utils/gRadarPlanPrice)
        code: error.response?.data?.code,
      };
    }
  },

  /**
   * SUPER_ADMIN: yalnızca planın G-Radar kredi fiyatını değiştirir. Fiyat planı kullanan tüm firmalarda geçerli olur.
   * data: { planId, planName, pricePerCreditUsd, brokerCount, gRadarEnabledBrokerCount, message }.
   * Hata kodu GRADAR_PLAN_PRICE_INVALID olabilir.
   */
  updatePlanPrice: async (planId, pricePerCreditUsd) => {
    try {
      const res = await axiosInstance.put(`/subscriptions/plans/${planId}/gradar-price`, { pricePerCreditUsd });
      return { success: true, data: res.data };
    } catch (error) {
      logError('GRadarCreditService - updatePlanPrice', error);
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.gRadar.planPriceError')),
        code: error.response?.data?.code,
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
        error: getApiErrorMessage(error, t('api.gRadar.brokerWalletError')),
      };
    }
  },
};
