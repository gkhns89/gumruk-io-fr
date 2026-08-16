import axiosInstance from './axios';
import { logError } from '../utils/errorUtils';

/**
 * Müşteri firmasının sisteme giriş hesabı.
 * Backend firma başına tek CLIENT_USER'a izin veriyor, o yüzden burada
 * "hesap oluştur / hesabı güncelle" var; çoklu kullanıcı yönetimi yok.
 */
export const clientUserService = {
  // Müşteri firması için giriş hesabı aç
  createAccount: async ({ clientCompanyId, email, username, password }) => {
    try {
      const response = await axiosInstance.post('/users', {
        email,
        username,
        password,
        globalRole: 'CLIENT_USER',
        companyId: clientCompanyId,
      });
      return { success: true, data: response.data };
    } catch (error) {
      logError('ClientUserService - createAccount', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Giriş hesabı oluşturulamadı',
      };
    }
  },

  /**
   * Hesabı güncelle. password boş gönderilirse backend şifreye dokunmuyor,
   * bu yüzden "sadece e-postayı değiştir" ve "sadece şifreyi sıfırla" aynı uçtan.
   */
  updateAccount: async (userId, { email, username, password, isActive }) => {
    try {
      const payload = {};
      if (email) payload.email = email;
      if (username) payload.username = username;
      if (password) payload.password = password;
      if (isActive !== undefined) payload.isActive = isActive;

      const response = await axiosInstance.put(`/users/${userId}`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      logError('ClientUserService - updateAccount', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Giriş hesabı güncellenemedi',
      };
    }
  },
};
