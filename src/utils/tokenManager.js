export const tokenManager = {
  setToken: (token) => {
    localStorage.setItem('token', token);
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  removeToken: () => {
    localStorage.removeItem('token');
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  removeUser: () => {
    localStorage.removeItem('user');
  },

  clear: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * JWT token'ı decode eder (base64)
   * @returns {object|null} Token payload veya null
   */
  decodeToken: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      // JWT formatı: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Base64 decode (URL-safe karakterleri düzelt)
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('❌ Token decode hatası:', error);
      return null;
    }
  },

  /**
   * Token'ın süresinin dolup dolmadığını kontrol eder
   * @returns {boolean} Token geçerli mi?
   */
  isTokenValid: () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🔍 Token bulunamadı');
      return false;
    }

    const decoded = tokenManager.decodeToken();
    if (!decoded) {
      console.log('🔍 Token decode edilemedi');
      return false;
    }

    // exp değeri saniye cinsindendir, Date.now() milisaniye döner
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    
    // 30 saniye buffer ekle (network latency için)
    const bufferTime = 30 * 1000;
    const isValid = expirationTime > (currentTime + bufferTime);

    if (!isValid) {
      console.log('⏰ Token süresi dolmuş:', {
        expiration: new Date(expirationTime).toLocaleString(),
        current: new Date(currentTime).toLocaleString(),
      });
    }

    return isValid;
  },

  /**
   * Token'ın kalan süresini döner (milisaniye)
   * @returns {number} Kalan süre (ms) veya 0
   */
  getTokenRemainingTime: () => {
    const decoded = tokenManager.decodeToken();
    if (!decoded || !decoded.exp) return 0;

    const expirationTime = decoded.exp * 1000;
    const remainingTime = expirationTime - Date.now();
    
    return Math.max(0, remainingTime);
  },
};