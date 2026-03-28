import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

if (import.meta.env.DEV) {
  console.log('🌐 API Base URL:', API_BASE_URL);
  console.log('🔧 Environment:', import.meta.env.MODE);
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Logout flag - birden fazla 401'de sadece bir kere logout olsun
let isLoggingOut = false;
let isRedirecting = false;

// Request interceptor - Token ekleme ve kontrol
axiosInstance.interceptors.request.use(
  (config) => {
    // Logout işlemi başladıysa, tüm istekleri iptal et
    if (isLoggingOut) {
      console.warn('⚠️ Logout işlemi devam ediyor, API isteği iptal edildi:', config.url);
      return Promise.reject({
        config,
        message: 'Logout in progress',
        code: 'LOGOUT_IN_PROGRESS',
        skipToast: true
      });
    }

    const token = localStorage.getItem('token');

    // Public endpoint'ler için token kontrolü yapma
    const isPublicEndpoint =
      config.url?.includes('/auth/') ||
      config.url?.includes('/setup/');

    if (!isPublicEndpoint && !token) {
      // Token yok ve protected endpoint - isteği iptal et
      console.warn('⚠️ Token bulunamadı, API isteği iptal edildi:', config.url);
      return Promise.reject({
        config,
        message: 'No authentication token',
        code: 'NO_TOKEN',
        skipToast: true // Toast gösterme flag'i
      });
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('❌ Request hatası:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Hata yönetimi
axiosInstance.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ Response: ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    // Token yoksa veya logout devam ediyorsa, sessizce reject et
    if (error.skipToast || error.code === 'NO_TOKEN' || error.code === 'LOGOUT_IN_PROGRESS') {
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    console.error(`❌ Response hatası: ${originalRequest?.url}`, {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    // 401 - Unauthorized (Token validation failed or session invalidated)
    if (error.response?.status === 401) {
      // Zaten logout işlemi başlatıldıysa, sessizce reject et (toast gösterme)
      if (isLoggingOut) {
        console.warn('⚠️ 401 alındı ama logout zaten devam ediyor, sessizce reject ediliyor');
        return Promise.reject(error);
      }

      isLoggingOut = true;
      console.warn('⚠️ İlk 401 - Logout işlemi başlatılıyor');

      const authError = error.response.headers['x-auth-error'];
      const authReason = error.response.headers['x-auth-reason'];

      console.warn('⚠️ 401 Unauthorized:', { authError, authReason });

      // Token'ı temizle
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Kullanıcıya Türkçe bilgi ver
      let message = 'Oturumunuz sonlandı. Lütfen tekrar giriş yapın.';

      if (authError === 'SESSION_INVALIDATED') {
        message = 'Başka bir cihazdan giriş yapıldı. Oturumunuz sonlandırıldı.';
      } else if (authError === 'INVALID_TOKEN') {
        message = 'Oturumunuz süresi doldu. Lütfen tekrar giriş yapın.';
      }

      // Toast göster ve HEMEN yönlendir
      import('../utils/toastUtils').then(({ showWarning }) => {
        showWarning(message, {
          autoClose: 3000
        });
      });

      // ANINDA yönlendir (diğer 401'ler gelmeden önce sayfa değişsin)
      if (!window.location.pathname.includes('/login') && !isRedirecting) {
        isRedirecting = true;
        // Toast render olsun diye minimal delay ama diğer API response'ları gelmeden redirect
        setTimeout(() => {
          window.location.href = '/login';
        }, 200); // 200ms - toast render olur, diğer API'ler henüz dönmedi
      }
    }

    // 404 - Not Found
    if (error.response?.status === 404) {
      console.warn('⚠️ Kaynak bulunamadı');
    }

    // 500 - Server Error
    if (error.response?.status === 500) {
      console.error('💥 Sunucu hatası');
    }

    // Network Error
    if (error.code === 'ERR_NETWORK') {
      console.error('🌐 Ağ bağlantı hatası');
    }

    // Timeout Error
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ İstek zaman aşımına uğradı');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;