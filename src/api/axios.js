import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 saniye timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Token ekleme
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
    console.log(`✅ Response: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    
    console.error(`❌ Response hatası: ${originalRequest?.url}`, {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    // 401 - Unauthorized
    if (error.response?.status === 401) {
      console.warn('⚠️ Token geçersiz, kullanıcı çıkarılıyor');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Login sayfasında değilsek yönlendir
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // 403 - Forbidden
    if (error.response?.status === 403) {
      console.warn('⚠️ Yetkisiz erişim');
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