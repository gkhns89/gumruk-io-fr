import axiosInstance from './axios';

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
      console.error('❌ Son işlemler getirme hatası:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'İşlemler alınamadı',
      };
    }
  },

  // Tüm işlemleri getir (yetki bazlı)
  getAllTransactions: async () => {
    try {
      console.log("📋 Tüm işlemler getiriliyor...");
      
      const response = await axiosInstance.get('/transactions/recent');
      
      const dataArray = safeArrayConversion(response.data, 'All Transactions');
      
      console.log(`✅ ${dataArray.length} işlem hazır`);
      
      return { success: true, data: dataArray };
    } catch (error) {
      console.error('❌ İşlemler getirme hatası:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'İşlemler alınamadı',
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
      console.error('❌ Broker işlemleri getirme hatası:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'İşlemler alınamadı',
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
      console.error('❌ Client işlemleri getirme hatası:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'İşlemler alınamadı',
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
      console.error('❌ İşlem detayı getirme hatası:', error);
      
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'İşlem bulunamadı.',
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'İşlem bilgisi alınamadı',
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
        message: response.data.message || 'İşlem başarıyla oluşturuldu'
      };
    } catch (error) {
      console.error('❌ İşlem oluşturma hatası:', error);
      
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Bu broker için işlem oluşturma yetkiniz yok.',
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'İşlem oluşturulamadı',
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
        message: response.data.message || 'İşlem başarıyla güncellendi'
      };
    } catch (error) {
      console.error('❌ İşlem güncelleme hatası:', error);
      
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Bu işlemi güncelleme yetkiniz yok.',
        };
      }
      
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'İşlem bulunamadı.',
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'İşlem güncellenemedi',
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
        message: response.data.message || 'İşlem durumu başarıyla değiştirildi'
      };
    } catch (error) {
      console.error('❌ İşlem durumu değiştirme hatası:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'İşlem durumu değiştirilemedi',
      };
    }
  },

  // İşlemi tamamla
  withdrawTransaction: async (id) => {
    try {
      console.log(`✅ İşlem ${id} tamamlanıyor...`);
      
      const response = await axiosInstance.post(`/transactions/${id}/withdraw`);
      
      console.log("✅ İşlem tamamlandı:", response.data);
      
      return { 
        success: true, 
        data: response.data,
        message: response.data.message || 'İşlem başarıyla çekildi olarak güncellendi'
      };
    } catch (error) {
      console.error('❌ İşlem çekildi olarak güncellenemedi', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'İşlem çekildi olarak güncellenemedi',
      };
    }
  },

  // İşlemi iptal et
  cancelTransaction: async (id, reason) => {
    try {
      console.log(`❌ İşlem ${id} iptal ediliyor...`);

      const response = await axiosInstance.post(`/transactions/${id}/cancel`, null, {
        params: { reason }
      });

      console.log("✅ İşlem iptal edildi:", response.data);

      return {
        success: true,
        data: response.data,
        message: response.data.message || 'İşlem başarıyla iptal edildi'
      };
    } catch (error) {
      console.error('❌ İşlem iptal hatası:', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'İşlem iptal edilemedi',
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
      console.error('❌ Gecikmiş işlemler getirme hatası:', error);

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Gecikmiş işlemler alınamadı',
      };
    }
  },
};