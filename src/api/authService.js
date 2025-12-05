import axiosInstance from './axios';
import { tokenManager } from '../utils/tokenManager';

export const authService = {
  // Login işlemi
  login: async (email, password) => {
    try {
      console.log("🔐 Login isteği gönderiliyor...", { email });
      
      const response = await axiosInstance.post('/auth/login-with-context', {
        email,
        password,
      });

      console.log("✅ Login başarılı:", response.data);

      const { token, user, selectedBroker, status } = response.data;

      // Token ve kullanıcı bilgilerini kaydet
      tokenManager.setToken(token);
      tokenManager.setUser({
        ...user,
        selectedBroker,
        status,
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Login hatası:', error);
      
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Hesabınız onay bekliyor. Lütfen yöneticinizle iletişime geçin.',
        };
      }

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Email veya şifre hatalı. Lütfen tekrar deneyin.',
        };
      }

      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edin.',
        };
      }

      if (!error.response) {
        return {
          success: false,
          error: 'Sunucuya bağlanılamıyor. Lütfen daha sonra tekrar deneyin.',
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Giriş başarısız. Bilgilerinizi kontrol edin.',
      };
    }
  },

  // Logout işlemi
  logout: () => {
    console.log("👋 Kullanıcı çıkış yapıyor");
    tokenManager.clear();
    window.location.href = '/login';
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
    const user = tokenManager.getUser();
    console.log("👤 Mevcut kullanıcı:", user);
    return user;
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