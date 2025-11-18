import axiosInstance from './axios';

export const companyService = {
  // Tüm firmaları getir
  getAllCompanies: async () => {
    try {
      const response = await axiosInstance.get('/companies');
      return { success: true, data: response.data.companies || [] };
    } catch (error) {
      console.error('Get all companies error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Firmalar alınamadı',
      };
    }
  },

  // Broker firmasının client'larını getir
  getClientCompanies: async (brokerId) => {
    try {
      const response = await axiosInstance.get(`/companies/${brokerId}/clients`);
      return { success: true, data: response.data.clients || [] };
    } catch (error) {
      console.error('Get client companies error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Müşteri firmaları alınamadı',
      };
    }
  },

  // Kullanıcının erişimine izin verilen firmalar
  getMyCompanies: async () => {
    try {
      const response = await axiosInstance.get('/companies/my-companies');
      return { success: true, data: response.data.companies || [] };
    } catch (error) {
      console.error('Get my companies error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Firmalar alınamadı',
      };
    }
  },
};