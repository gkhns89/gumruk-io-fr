import axiosInstance from './axios';
import { tokenManager } from '../utils/tokenManager';

export const authService = {
  // Login işlemi
  login: async (email, password) => {
    try {
      const response = await axiosInstance.post('/auth/login-with-context', {
        email,
        password,
      });

      const { token, user, selectedBroker, status } = response.data;

      // Token ve kullanıcı bilgilerini kaydet
      tokenManager.setToken(token);
      tokenManager.setUser({
        ...user,
        selectedBroker,
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Login error:', error);
      
      // Özel hata mesajları
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Hesabınız onay bekliyor. Lütfen yöneticinizle iletişime geçin.',
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || 'Giriş başarısız. Bilgilerinizi kontrol edin.',
      };
    }
  },

  // Logout işlemi
  logout: () => {
    tokenManager.clear();
    window.location.href = '/login';
  },

  // Token kontrolü
  isAuthenticated: () => {
    return !!tokenManager.getToken();
  },

  // Mevcut kullanıcı bilgisi
  getCurrentUser: () => {
    return tokenManager.getUser();
  },
};