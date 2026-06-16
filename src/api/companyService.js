import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

export const companyService = {
  // Tüm firmaları getir
  getAllCompanies: async () => {
    try {
      const response = await axiosInstance.get('/companies');
      return { success: true, data: response.data.companies || [] };
    } catch (error) {
      logError('CompanyService - getAllCompanies', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Firmalar alınamadı',
      };
    }
  },

  // SUPER_ADMIN: tüm gümrük (broker) firmalarını getir
  getAllBrokerCompanies: async () => {
    try {
      const response = await axiosInstance.get('/companies/brokers');
      return { success: true, data: response.data.brokers || [] };
    } catch (error) {
      logError('CompanyService - getAllBrokerCompanies', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Gümrük firmaları alınamadı',
      };
    }
  },

  // SUPER_ADMIN: tüm broker'lardaki client firmaları
  getAllClientCompanies: async () => {
    try {
      const response = await axiosInstance.get('/companies/clients/all');
      return { success: true, data: response.data.clients || [] };
    } catch (error) {
      logError('CompanyService - getAllClientCompanies', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Müşteri firmaları alınamadı',
      };
    }
  },

  // Broker firmasının client'larını getir
  getClientCompanies: async (brokerId) => {
    if (!brokerId) {
      return { success: true, data: [] };
    }
    try {
      console.log(`📡 Client companies API çağrısı: /companies/${brokerId}/clients`);
      const response = await axiosInstance.get(`/companies/${brokerId}/clients`);
      console.log('✅ Client companies yanıtı:', response.data);
      return { success: true, data: response.data.clients || [] };
    } catch (error) {
      logError('CompanyService - getClientCompanies', error);
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
      logError('CompanyService - getMyCompanies', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Firmalar alınamadı',
      };
    }
  },

  // ✅ YENİ: Client company oluştur
  createClientCompany: async (companyData) => {
    try {
      console.log('📤 Client company oluşturuluyor:', companyData);
      const response = await axiosInstance.post('/companies/client', companyData);
      console.log('✅ Client company oluşturuldu:', response.data);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Firma başarıyla oluşturuldu'
      };
    } catch (error) {
      logError('CompanyService - createClientCompany', error);

      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Müşteri firması limiti aşıldı. Lütfen aboneliğinizi yükseltin.',
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Firma oluşturulamadı',
      };
    }
  },

  // Firma logosunu yükle/değiştir (SUPER_ADMIN her firma; BROKER_ADMIN kendi broker'ı/client'ları)
  uploadCompanyLogo: async (companyId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosInstance.post(`/companies/${companyId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { success: true, data: response.data };
    } catch (error) {
      logError('CompanyService - uploadCompanyLogo', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Logo yüklenemedi',
      };
    }
  },

  // Firma logosunu kaldır
  deleteCompanyLogo: async (companyId) => {
    try {
      const response = await axiosInstance.delete(`/companies/${companyId}/logo`);
      return { success: true, data: response.data };
    } catch (error) {
      logError('CompanyService - deleteCompanyLogo', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Logo kaldırılamadı',
      };
    }
  },

  // ✅ YENİ: Client company güncelle
  updateClientCompany: async (companyId, companyData) => {
    try {
      console.log('📤 Client company güncelleniyor:', companyId, companyData);
      const response = await axiosInstance.put(`/companies/${companyId}`, companyData);
      console.log('✅ Client company güncellendi:', response.data);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Firma başarıyla güncellendi'
      };
    } catch (error) {
      logError('CompanyService - updateClientCompany', error);
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Firma güncellenemedi',
      };
    }
  },
};