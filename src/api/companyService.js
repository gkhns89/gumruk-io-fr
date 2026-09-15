import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

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
        error: getApiErrorMessage(error, t('api.company.listError')),
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
        error: getApiErrorMessage(error, t('api.company.brokerListError')),
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
        error: getApiErrorMessage(error, t('api.company.clientListError')),
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
        error: getApiErrorMessage(error, t('api.company.clientListError')),
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
        error: getApiErrorMessage(error, t('api.company.listError')),
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
        message: response.data.message || t('api.company.created')
      };
    } catch (error) {
      logError('CompanyService - createClientCompany', error);

      if (error.response?.status === 429) {
        return {
          success: false,
          error: t('api.company.clientQuotaExceeded'),
        };
      }

      return {
        success: false,
        error: getApiErrorMessage(error, t('api.company.createError')),
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
        error: getApiErrorMessage(error, t('api.company.logoUploadError')),
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
        error: getApiErrorMessage(error, t('api.company.logoDeleteError')),
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
        message: response.data.message || t('api.company.updated')
      };
    } catch (error) {
      logError('CompanyService - updateClientCompany', error);
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.company.updateError')),
      };
    }
  },

  /**
   * Kullanıcının firmasının çalışma saatleri ve taslak silme saati (DRAFTS bayrağı).
   * Saatler Europe/Istanbul, "HH:mm".
   * @returns data: { workDays: ['MONDAY', ...], workStart: '09:00', workEnd: '18:00', draftPurgeTime: '21:00' }
   */
  getWorkSettings: async () => {
    try {
      const response = await axiosInstance.get('/company/work-settings');
      return { success: true, data: response.data };
    } catch (error) {
      logError('CompanyService - getWorkSettings', error);
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.company.workSettingsLoadError')),
      };
    }
  },

  /**
   * Çalışma saatlerini kaydet — yalnızca BROKER_ADMIN
   * @param {Object} settings - { workDays, workStart, workEnd, draftPurgeTime }
   * @returns data: kaydedilen ayarlar
   */
  updateWorkSettings: async (settings) => {
    try {
      const response = await axiosInstance.put('/company/work-settings', settings);
      return { success: true, data: response.data };
    } catch (error) {
      logError('CompanyService - updateWorkSettings', error);
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.company.workSettingsSaveError')),
      };
    }
  },
};