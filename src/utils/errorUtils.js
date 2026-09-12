/**
 * Hata yönetimi yardımcı fonksiyonları
 * Güvenlik odaklı - hassas bilgilerin kullanıcıya gösterilmemesini sağlar
 */

import { showError } from './toastUtils';
import { t } from '../locales/runtime';

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

// Sunucunun `error` alanına koyduğu makine kodları (örn. PAYMENT_RESTRICTION) — kullanıcı metni değil.
const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]+$/;

/**
 * Sunucu hata yanıtından kullanıcıya gösterilecek metni çıkarır.
 * Zarf: `{ error, message, code, details? }` — `message` öncelikli; henüz taşınmamış uçlar
 * yalnızca `error` döndürüyor. `error` bir kodsa metin sayılmaz.
 * @param {object} error - Axios hatası
 * @param {string} fallback - Metin bulunamazsa dönecek değer
 * @returns {string}
 */
export const getApiErrorMessage = (error, fallback = '') => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') {
    return fallback;
  }
  if (typeof data.message === 'string' && data.message) {
    return data.message;
  }
  if (typeof data.error === 'string' && data.error && !ERROR_CODE_PATTERN.test(data.error)) {
    return data.error;
  }
  return fallback;
};

/**
 * Hata mesajını sanitize eder - hassas bilgileri kaldırır
 * @param {Error|string|object} error - Hata objesi veya mesajı
 * @returns {string} - Güvenli hata mesajı
 */
export const sanitizeError = (error) => {
  // Hata yoksa varsayılan mesaj
  if (!error) {
    return t('api.errors.generic');
  }

  let errorMessage = '';

  // API response hatası ise — AxiosError da bir Error olduğu için bu kontrol önce gelmeli,
  // yoksa sunucu mesajı yerine "Request failed with status code 400" gösteriliyor.
  if (getApiErrorMessage(error)) {
    errorMessage = getApiErrorMessage(error);
  }
  // Error objesi ise
  else if (error instanceof Error) {
    errorMessage = error.message || t('api.errors.unexpected');
  }
  // String ise
  else if (typeof error === 'string') {
    errorMessage = error;
  }
  // Diğer objeler
  else if (typeof error === 'object') {
    errorMessage = error.message || error.error || t('api.errors.unexpected');
  }
  // Diğer tipler
  else {
    errorMessage = t('api.errors.unexpected');
  }

  // Hassas anahtar kelimeleri kontrol et
  const lowerCaseMessage = errorMessage.toLowerCase();
  const containsSensitiveInfo = SENSITIVE_KEYWORDS.some(keyword =>
    lowerCaseMessage.includes(keyword)
  );

  // Hassas bilgi içeriyorsa genel bir mesaj döndür
  if (containsSensitiveInfo) {
    return t('api.errors.tryLater');
  }

  // Stack trace içeriyorsa temizle
  if (errorMessage.includes('at ') || errorMessage.includes('Error:')) {
    return t('api.errors.tryLater');
  }

  // Çok uzun mesajları kısalt (potansiyel bilgi sızıntısını önle)
  if (errorMessage.length > 150) {
    return t('api.errors.tryLater');
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
  if (import.meta.env.DEV) {
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
