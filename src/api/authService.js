import axiosInstance from './axios';
import { tokenManager } from '../utils/tokenManager';
import { logError } from '../utils/errorUtils';
import { t } from '../locales';

export const authService = {
  // Login işlemi
  login: async (email, password, rememberMe = false) => {
    try {
      console.log("🔐 Login isteği gönderiliyor...", { email, rememberMe });

      const response = await axiosInstance.post('/auth/login-with-context', {
        email,
        password,
        rememberMe,
      });

      const { token, user, selectedBroker, status } = response.data;

      // Yanıtın tamamı token'ı da taşıyor; loga yalnızca kimliği belirleyen alanlar girer.
      console.log("✅ Login başarılı:", { email: user?.email, role: user?.globalRole });

      // Token ve kullanıcı bilgilerini kaydet
      tokenManager.setToken(token);
      tokenManager.setUser({
        ...user,
        selectedBroker,
        status,
      });

      return { success: true, data: response.data };
    } catch (error) {
      logError('AuthService - login', error);

      if (error.response?.status === 403) {
        return {
          success: false,
          error: t('api.auth.pendingApproval'),
        };
      }

      if (error.response?.status === 401) {
        return {
          success: false,
          error: t('api.auth.invalidCredentials'),
        };
      }

      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: t('api.auth.timeout'),
        };
      }

      if (!error.response) {
        return {
          success: false,
          error: t('api.auth.serverUnreachable'),
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || t('api.auth.loginFailed'),
      };
    }
  },

  // Logout işlemi
  logout: async () => {
    try {
      console.log("👋 Kullanıcı çıkış yapıyor");
      // Backend'e logout bildirimi gönder (session invalidate için)
      await axiosInstance.delete('/auth/logout');
    } catch (error) {
      console.warn('Logout request failed:', error);
      // Hata olsa bile client-side temizlik yap
    } finally {
      tokenManager.clear();
      window.location.href = '/login';
    }
  },

  // ✅ GÜNCELLENDİ: Token kontrolü - artık süre de kontrol ediliyor
  isAuthenticated: () => {
    const hasToken = !!tokenManager.getToken();
    
    if (!hasToken) {
      console.log("🔍 Token kontrolü: Token yok");
      return false;
    }

    // Token süresini kontrol et
    const isValid = tokenManager.isTokenValid();
    
    if (!isValid) {
      console.log("⏰ Token süresi dolmuş, temizleniyor...");
      tokenManager.clear();
      return false;
    }

    console.log("✅ Token geçerli");
    return true;
  },

  // Mevcut kullanıcı bilgisi
  getCurrentUser: () => {
    return tokenManager.getUser();
  },

  // ✅ YENİ: Token bilgilerini getir
  getTokenInfo: () => {
    const decoded = tokenManager.decodeToken();
    const remainingTime = tokenManager.getTokenRemainingTime();
    
    return {
      decoded,
      remainingTime,
      remainingMinutes: Math.floor(remainingTime / 60000),
      isValid: tokenManager.isTokenValid(),
    };
  },
};