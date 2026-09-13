import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

/**
 * API response'unu güvenli bir şekilde array'e dönüştürür
 * @param {*} data - API'den gelen data
 * @param {string} context - Log için context
 * @returns {Array} - Güvenli array
 */
const safeArrayConversion = (data, context = 'data') => {
  console.log(`🔍 [${context}] Veri tipi:`, typeof data);
  console.log(`🔍 [${context}] Veri içeriği:`, data);
  
  // 1. Zaten array ise
  if (Array.isArray(data)) {
    console.log(`✅ [${context}] Veri zaten array (${data.length} item)`);
    return data;
  }
  
  // 2. Null veya undefined
  if (data === null || data === undefined) {
    console.log(`⚠️ [${context}] Veri null/undefined, boş array dönüyor`);
    return [];
  }
  
  // 3. Obje içinde array olabilir
  if (typeof data === 'object') {
    console.log(`📦 [${context}] Veri bir obje, array field'lar aranıyor...`);
    
    const possibleFields = [
      'transactions',
      'data',
      'items',
      'content',
      'results',
      'list',
      'records',
      'rows'
    ];
    
    for (const field of possibleFields) {
      if (Array.isArray(data[field])) {
        console.log(`✅ [${context}] Array bulundu: data.${field} (${data[field].length} item)`);
        return data[field];
      }
    }
    
    const keys = Object.keys(data);
    for (const key of keys) {
      if (Array.isArray(data[key])) {
        console.log(`✅ [${context}] Array bulundu: data.${key} (${data[key].length} item)`);
        return data[key];
      }
    }
    
    console.log(`⚠️ [${context}] Hiçbir array field bulunamadı, obje array'e sarılıyor`);
    return [data];
  }
  
  // 4. Primitive değer
  console.log(`⚠️ [${context}] Beklenmeyen veri tipi (${typeof data}), boş array dönüyor`);
  return [];
};

export const transactionService = {
  // ==========================================
  // READ OPERATIONS
  // ==========================================
  
  // Son işlemleri getir (kullanıcı tipine göre filtrelenir)
  getRecentTransactions: async () => {
    try {
      console.log("📋 Son işlemler getiriliyor...");
      
      const response = await axiosInstance.get('/transactions/recent');
      
      console.log("📦 API Response:", response.data);
      
      const dataArray = safeArrayConversion(response.data, 'Recent Transactions');
      
      console.log(`✅ ${dataArray.length} işlem hazır`);
      
      return { success: true, data: dataArray };
    } catch (error) {
      logError('TransactionService - getRecentTransactions', error);

      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.listError')),
      };
    }
  },

  /**
   * Tüm işlemleri getir (yetki bazlı - LIMIT YOK)
   *
   * @param {Object} [opts]
   * @param {number|null} [opts.withdrawnWithinDays=null] — verilirse kapanmış
   *   (Çekildi/İptal) işlemlerden yalnızca son N gün içindekiler gelir; açık
   *   işlemler her zaman gelir. İşlem Takip sayfası ilk açılışta bu pencereyi
   *   kullanır, böylece binlerce geçmiş kaydı olan brokerlarda sayfa hızlı
   *   açılır. Parametresiz çağrılar (arama, öneri listeleri) tüm geçmişi alır.
   */
  getAllTransactions: async ({ withdrawnWithinDays = null } = {}) => {
    try {
      const windowed = Number.isInteger(withdrawnWithinDays) && withdrawnWithinDays > 0;
      console.log(`📋 Tüm işlemler getiriliyor (${windowed ? `kapanmışlar: son ${withdrawnWithinDays} gün` : 'LIMIT yok'})...`);

      const response = await axiosInstance.get('/transactions/all', {
        params: windowed ? { withdrawnWithinDays } : {},
        timeout: windowed ? 20_000 : 60_000,
      });

      const dataArray = safeArrayConversion(response.data, 'All Transactions');

      console.log(`✅ ${dataArray.length} işlem hazır (toplam)`);

      return { success: true, data: dataArray };
    } catch (error) {
      logError('TransactionService - getAllTransactions', error);

      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.listError')),
      };
    }
  },

  // Dashboard sayım özeti (yalnızca sayı - tüm kayıt indirmeden)
  getDashboardStats: async () => {
    try {
      const response = await axiosInstance.get('/transactions/stats/summary');
      return { success: true, data: response.data };
    } catch (error) {
      logError('TransactionService - getDashboardStats', error);
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.summaryError')),
      };
    }
  },

  // Broker'ın işlemleri
  getBrokerTransactions: async (brokerId) => {
    try {
      console.log(`📋 Broker ${brokerId} işlemleri getiriliyor...`);
      
      const response = await axiosInstance.get(`/transactions/broker/${brokerId}`);
      
      const dataArray = safeArrayConversion(response.data, 'Broker Transactions');
      
      console.log(`✅ ${dataArray.length} broker işlemi hazır`);
      
      return { success: true, data: dataArray };
    } catch (error) {
      logError('TransactionService - getBrokerTransactions', error);

      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.listError')),
      };
    }
  },

  // Client'in işlemleri
  getClientTransactions: async (clientId) => {
    try {
      console.log(`📋 Client ${clientId} işlemleri getiriliyor...`);
      
      const response = await axiosInstance.get(`/transactions/client/${clientId}`);
      
      const dataArray = safeArrayConversion(response.data, 'Client Transactions');
      
      console.log(`✅ ${dataArray.length} client işlemi hazır`);
      
      return { success: true, data: dataArray };
    } catch (error) {
      logError('TransactionService - getClientTransactions', error);

      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.listError')),
      };
    }
  },

  // İşlem detayı
  getTransactionById: async (id) => {
    try {
      console.log(`📋 İşlem ${id} detayı getiriliyor...`);
      
      const response = await axiosInstance.get(`/transactions/${id}`);
      
      console.log(`✅ İşlem detayı getirildi:`, response.data);
      
      return { success: true, data: response.data };
    } catch (error) {
      logError('TransactionService - getTransactionById', error);

      if (error.response?.status === 404) {
        return {
          success: false,
          error: t('api.transaction.notFound'),
        };
      }
      
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.loadError')),
      };
    }
  },

  // ==========================================
  // CREATE OPERATION
  // ==========================================
  
  // Yeni işlem oluştur
  createTransaction: async (transactionData) => {
    try {
      console.log("📝 Yeni işlem oluşturuluyor...", transactionData);
      
      const response = await axiosInstance.post('/transactions', transactionData);
      
      console.log("✅ İşlem oluşturuldu:", response.data);
      
      return { 
        success: true, 
        data: response.data,
        message: response.data.message || t('api.transaction.created')
      };
    } catch (error) {
      logError('TransactionService - createTransaction', error);

      if (error.response?.status === 403) {
        return {
          success: false,
          error: t('api.transaction.createForbidden'),
        };
      }

      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.createError')),
      };
    }
  },

  // ==========================================
  // UPDATE OPERATION
  // ==========================================
  
  // İşlem güncelle
  updateTransaction: async (id, transactionData) => {
    try {
      console.log(`📝 İşlem ${id} güncelleniyor...`, transactionData);
      
      const response = await axiosInstance.put(`/transactions/${id}`, transactionData);
      
      console.log("✅ İşlem güncellendi:", response.data);
      
      return { 
        success: true, 
        data: response.data,
        message: response.data.message || t('api.transaction.updated')
      };
    } catch (error) {
      logError('TransactionService - updateTransaction', error);

      if (error.response?.status === 403) {
        return {
          success: false,
          error: t('api.transaction.updateForbidden'),
        };
      }

      if (error.response?.status === 404) {
        return {
          success: false,
          error: t('api.transaction.notFound'),
        };
      }

      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.updateError')),
      };
    }
  },

  // ==========================================
  // STATUS OPERATIONS
  // ==========================================
  
  // İşlem durumunu değiştir
  updateTransactionStatus: async (id, status) => {
    try {
      console.log(`📝 İşlem ${id} durumu değiştiriliyor: ${status}`);
      
      const response = await axiosInstance.patch(`/transactions/${id}/status`, null, {
        params: { status }
      });
      
      console.log("✅ İşlem durumu değiştirildi:", response.data);
      
      return { 
        success: true, 
        data: response.data,
        message: response.data.message || t('api.transaction.statusChanged')
      };
    } catch (error) {
      logError('TransactionService - updateTransactionStatus', error);

      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.statusChangeError')),
      };
    }
  },

  // İşlemi tamamla
  withdrawTransaction: async (id) => {
    try {
      console.log(`✅ İşlem ${id} tamamlanıyor...`);
      
      const response = await axiosInstance.patch(`/transactions/${id}/withdraw`);
      
      console.log("✅ İşlem tamamlandı:", response.data);
      
      return { 
        success: true, 
        data: response.data,
        message: response.data.message || t('api.transaction.withdrawn')
      };
    } catch (error) {
      logError('TransactionService - withdrawTransaction', error);

      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.withdrawError')),
      };
    }
  },

  // İşlemi iptal et
  cancelTransaction: async (id, reason) => {
    try {
      console.log(`❌ İşlem ${id} iptal ediliyor...`);

      const response = await axiosInstance.patch(`/transactions/${id}/cancel`, null, {
        params: { reason }
      });

      console.log("✅ İşlem iptal edildi:", response.data);

      return {
        success: true,
        data: response.data,
        message: response.data.message || t('api.transaction.cancelled')
      };
    } catch (error) {
      logError('TransactionService - cancelTransaction', error);

      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.cancelError')),
      };
    }
  },

  // ==========================================
  // DELAYED TRANSACTIONS
  // ==========================================

  // Gecikme olan işlemleri getir
  getDelayedTransactions: async () => {
    try {
      console.log("⏰ Gecikmiş işlemler getiriliyor...");

      const response = await axiosInstance.get('/transactions/delayed');

      const dataArray = safeArrayConversion(response.data, 'Delayed Transactions');

      console.log(`✅ ${dataArray.length} gecikmiş işlem hazır`);

      return { success: true, data: dataArray };
    } catch (error) {
      logError('TransactionService - getDelayedTransactions', error);

      return {
        success: false,
        error: getApiErrorMessage(error, t('api.transaction.delayedListError')),
      };
    }
  },
};