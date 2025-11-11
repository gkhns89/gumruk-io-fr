import axiosInstance from './axios';

/**
 * API response'unu güvenli bir şekilde array'e dönüştürür
 * @param {*} data - API'den gelen data
 * @param {string} context - Log için context (örn: "recent transactions")
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
    
    // Olası array field isimleri
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
    
    // Her field'ı kontrol et
    for (const field of possibleFields) {
      if (Array.isArray(data[field])) {
        console.log(`✅ [${context}] Array bulundu: data.${field} (${data[field].length} item)`);
        return data[field];
      }
    }
    
    // Objenin tüm key'lerini kontrol et (fallback)
    const keys = Object.keys(data);
    for (const key of keys) {
      if (Array.isArray(data[key])) {
        console.log(`✅ [${context}] Array bulundu: data.${key} (${data[key].length} item)`);
        return data[key];
      }
    }
    
    // Hiçbir array field yoksa, tek objeyi array'e çevir
    console.log(`⚠️ [${context}] Hiçbir array field bulunamadı, obje array'e sarılıyor`);
    return [data];
  }
  
  // 4. Primitive değer (string, number, boolean)
  console.log(`⚠️ [${context}] Beklenmeyen veri tipi (${typeof data}), boş array dönüyor`);
  return [];
};

export const transactionService = {
  // Son işlemleri getir (10 adet)
  getRecentTransactions: async () => {
    try {
      console.log("📋 Son işlemler getiriliyor...");
      
      const response = await axiosInstance.get('/transactions/recent');
      
      console.log("📦 API Response:", response.data);
      
      // Güvenli array dönüşümü
      const dataArray = safeArrayConversion(response.data, 'Recent Transactions');
      
      console.log(`✅ ${dataArray.length} işlem hazır`);
      
      return { success: true, data: dataArray };
    } catch (error) {
      console.error('❌ Son işlemler getirme hatası:', error);
      console.error('❌ Hata Detayı:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Özel hata mesajları
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.',
        };
      }

      if (!error.response) {
        return {
          success: false,
          error: 'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.',
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
        error: error.response?.data?.error || error.response?.data?.message || 'İşlemler alınamadı',
      };
    }
  },

  // Broker'ın işlemleri
  getBrokerTransactions: async (brokerId) => {
    try {
      console.log(`📋 Broker ${brokerId} işlemleri getiriliyor...`);
      
      const response = await axiosInstance.get(`/transactions/broker/${brokerId}`);
      
      // Güvenli array dönüşümü
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
};