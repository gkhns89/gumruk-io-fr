import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

export const employeeService = {
  // Broker firmasının çalışanlarını getir
  getEmployees: async (brokerCompanyId) => {
    try {
      console.log(`📡 Employees API çağrısı: /users/company/${brokerCompanyId}`);
      const response = await axiosInstance.get(`/users/company/${brokerCompanyId}`);
      console.log('✅ Employees yanıtı:', response.data);
      return { success: true, data: response.data.users || [] };
    } catch (error) {
      logError('EmployeeService - getEmployees', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Çalışanlar alınamadı',
      };
    }
  },

  // Broker firmasının çalışan limitlerini getir
  getEmployeeLimits: async (brokerCompanyId) => {
    try {
      console.log(`📡 Employee limits API çağrısı: /users/limits?brokerCompanyId=${brokerCompanyId}`);
      const response = await axiosInstance.get(`/users/limits?brokerCompanyId=${brokerCompanyId}`);
      console.log('✅ Employee limits yanıtı:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      logError('EmployeeService - getEmployeeLimits', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Çalışan limitleri alınamadı',
      };
    }
  },

  // Tek bir çalışanın bilgilerini getir
  getEmployeeById: async (userId) => {
    try {
      console.log(`📡 Employee detail API çağrısı: /users/${userId}`);
      const response = await axiosInstance.get(`/users/${userId}`);
      console.log('✅ Employee detail yanıtı:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      logError('EmployeeService - getEmployeeById', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Çalışan bilgileri alınamadı',
      };
    }
  },

  // Yeni çalışan oluştur
  createEmployee: async (employeeData) => {
    try {
      console.log('📤 Employee oluşturuluyor:', employeeData);
      const response = await axiosInstance.post('/users', employeeData);
      console.log('✅ Employee oluşturuldu:', response.data);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Çalışan başarıyla oluşturuldu'
      };
    } catch (error) {
      logError('EmployeeService - createEmployee', error);

      // Quota exceeded (HTTP 429)
      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Çalışan limiti aşıldı. Lütfen aboneliğinizi yükseltin.',
          isQuotaExceeded: true
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Çalışan oluşturulamadı',
      };
    }
  },

  // Çalışan bilgilerini güncelle
  updateEmployee: async (userId, employeeData) => {
    try {
      console.log('📤 Employee güncelleniyor:', userId, employeeData);
      const response = await axiosInstance.put(`/users/${userId}`, employeeData);
      console.log('✅ Employee güncellendi:', response.data);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Çalışan başarıyla güncellendi'
      };
    } catch (error) {
      logError('EmployeeService - updateEmployee', error);
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Çalışan güncellenemedi',
      };
    }
  },

  // Çalışanı sil (soft delete)
  deleteEmployee: async (userId) => {
    try {
      console.log('📤 Employee siliniyor:', userId);
      const response = await axiosInstance.delete(`/users/${userId}`);
      console.log('✅ Employee silindi:', response.data);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Çalışan başarıyla silindi'
      };
    } catch (error) {
      logError('EmployeeService - deleteEmployee', error);

      const errorMsg = error.response?.data?.error || error.response?.data?.message || '';

      // Cannot delete self
      if (errorMsg.toLowerCase().includes('kendinizi') || errorMsg.toLowerCase().includes('yourself')) {
        return {
          success: false,
          error: 'Kendi hesabınızı silemezsiniz',
        };
      }

      // Cannot delete last BROKER_ADMIN
      if (errorMsg.toLowerCase().includes('son broker_admin') || errorMsg.toLowerCase().includes('last broker_admin')) {
        return {
          success: false,
          error: 'Son BROKER_ADMIN kullanıcısı silinemez. Önce başka bir yönetici atayın.',
        };
      }

      return {
        success: false,
        error: errorMsg || 'Çalışan silinemedi',
      };
    }
  },

  // Tüm broker firmalarını getir (SUPER_ADMIN için)
  getBrokerCompanies: async () => {
    try {
      console.log('📡 Broker companies API çağrısı: /companies');
      const response = await axiosInstance.get('/companies');
      console.log('✅ Broker companies yanıtı:', response.data);
      // Backend'den gelen tüm firmaları filtrele, sadece BROKER tipinde olanları al
      const companies = response.data.companies || [];
      const brokerCompanies = companies.filter(company => company.type === 'CUSTOMS_BROKER');
      return { success: true, data: brokerCompanies };
    } catch (error) {
      logError('EmployeeService - getBrokerCompanies', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Broker firmaları alınamadı',
      };
    }
  },
};
