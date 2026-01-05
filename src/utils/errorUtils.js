/**
 * Hata yönetimi yardımcı fonksiyonları
 * Güvenlik odaklı - hassas bilgilerin kullanıcıya gösterilmemesini sağlar
 */

import { showError } from './toastUtils';

// Hassas bilgi içerebilecek anahtar kelimeler
const SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'auth',
  'credential',
  'passphrase',
  'private',
  'session',
  'cookie',
  'jwt'
];

/**
 * Hata mesajını sanitize eder - hassas bilgileri kaldırır
 * @param {Error|string|object} error - Hata objesi veya mesajı
 * @returns {string} - Güvenli hata mesajı
 */
export const sanitizeError = (error) => {
  // Hata yoksa varsayılan mesaj
  if (!error) {
    return "Bir hata oluştu.";
  }

  let errorMessage = '';

  // Error objesi ise
  if (error instanceof Error) {
    errorMessage = error.message || "Beklenmeyen bir hata oluştu.";
  }
  // String ise
  else if (typeof error === 'string') {
    errorMessage = error;
  }
  // API response hatası ise
  else if (error.response?.data?.message) {
    errorMessage = error.response.data.message;
  }
  // Diğer objeler
  else if (typeof error === 'object') {
    errorMessage = error.message || error.error || "Beklenmeyen bir hata oluştu.";
  }
  // Diğer tipler
  else {
    errorMessage = "Beklenmeyen bir hata oluştu.";
  }

  // Hassas anahtar kelimeleri kontrol et
  const lowerCaseMessage = errorMessage.toLowerCase();
  const containsSensitiveInfo = SENSITIVE_KEYWORDS.some(keyword =>
    lowerCaseMessage.includes(keyword)
  );

  // Hassas bilgi içeriyorsa genel bir mesaj döndür
  if (containsSensitiveInfo) {
    return "İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
  }

  // Stack trace içeriyorsa temizle
  if (errorMessage.includes('at ') || errorMessage.includes('Error:')) {
    return "İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
  }

  // Çok uzun mesajları kısalt (potansiyel bilgi sızıntısını önle)
  if (errorMessage.length > 150) {
    return "İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
  }

  return errorMessage;
};

/**
 * Hatayı console'a güvenli şekilde loglar
 * Production'da hassas bilgileri göstermez
 * @param {string} context - Hata konteksti (örn: "İşlem oluşturma")
 * @param {Error|any} error - Hata objesi
 */
export const logError = (context, error) => {
  // Development ortamında detaylı log
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
  // Production ortamında sadece context ve genel bilgi
  else {
    console.error(`[${context}] Hata oluştu`);
    // Hassas bilgi içermeyen basit log
    if (error?.message && !SENSITIVE_KEYWORDS.some(k => error.message.toLowerCase().includes(k))) {
      console.error('Mesaj:', error.message);
    }
  }
};

/**
 * Hata yönetimi için yardımcı fonksiyon
 * @param {Error|any} error - Hata objesi
 * @param {Function} setError - State setter fonksiyonu (deprecated - artık kullanılmıyor)
 * @param {string} context - Hata konteksti
 * @param {string} fallbackMessage - Varsayılan hata mesajı
 */
export const handleError = (error, setError, context, fallbackMessage) => {
  // Console'a güvenli log
  logError(context, error);

  // Kullanıcıya sanitize edilmiş mesaj - Toast ile göster
  const safeMessage = sanitizeError(error);
  const finalMessage = safeMessage || fallbackMessage;
  showError(finalMessage);
};

/**
 * API yanıtını kontrol eder ve hata varsa işler
 * @param {object} result - API yanıt objesi
 * @param {Function} onSuccess - Başarı callback'i
 * @param {Function} setError - Hata state setter'ı (deprecated - artık kullanılmıyor)
 * @param {string} context - İşlem konteksti
 * @returns {boolean} - Başarılı mı?
 */
export const handleApiResponse = (result, onSuccess, setError, context) => {
  if (result.success) {
    if (onSuccess) onSuccess();
    return true;
  } else {
    const safeError = sanitizeError(result.error);
    logError(context, result.error);
    showError(safeError);
    return false;
  }
};
