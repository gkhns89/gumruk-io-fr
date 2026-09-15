import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

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
        error: getApiErrorMessage(error, t('api.clientUser.createError')),
      };
    }
  },

  /**
   * Hesabın e-postası, kullanıcı adı ya da aktifliği. Şifre bu uçtan değişmez (backend 400 döner):
   * userService.setUserPassword kullanılır.
   */
  updateAccount: async (userId, { email, username, isActive }) => {
    try {
      const payload = {};
      if (email) payload.email = email;
      if (username) payload.username = username;
      if (isActive !== undefined) payload.isActive = isActive;

      const response = await axiosInstance.put(`/users/${userId}`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      logError('ClientUserService - updateAccount', error);
      return {
        success: false,
        error: getApiErrorMessage(error, t('api.clientUser.updateError')),
      };
    }
  },
};
