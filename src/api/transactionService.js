import axiosInstance from './axios';

export const transactionService = {
  // Son işlemleri getir (10 adet)
  getRecentTransactions: async () => {
    try {
      const response = await axiosInstance.get('/transactions/recent');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get recent transactions error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'İşlemler alınamadı',
      };
    }
  },

  // Broker'ın işlemleri
  getBrokerTransactions: async (brokerId) => {
    try {
      const response = await axiosInstance.get(`/transactions/broker/${brokerId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get broker transactions error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'İşlemler alınamadı',
      };
    }
  },

  // İşlem detayı
  getTransactionById: async (id) => {
    try {
      const response = await axiosInstance.get(`/transactions/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get transaction error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'İşlem bilgisi alınamadı',
      };
    }
  },
};