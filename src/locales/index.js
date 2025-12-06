/**
 * Çoklu Dil Yönetimi (i18n)
 * 
 * Kullanım:
 * import { t, setLanguage, getCurrentLanguage } from './locales';
 * 
 * // Çeviri almak için:
 * t('gates.yellow') // => "SARI HAT" (Türkçe aktifse)
 * 
 * // Dil değiştirmek için:
 * setLanguage('en');
 * 
 * // Mevcut dili öğrenmek için:
 * getCurrentLanguage() // => "tr"
 */

import { tr } from './tr';
import { en } from './en';

// Desteklenen diller
export const SUPPORTED_LANGUAGES = {
  tr: { code: 'tr', name: 'Türkçe', locale: 'tr-TR', flag: '🇹🇷' },
  en: { code: 'en', name: 'English', locale: 'en-US', flag: '🇬🇧' },
};

// Tüm çeviriler
const translations = {
  tr,
  en,
};

// Varsayılan dil
const DEFAULT_LANGUAGE = 'tr';

// Mevcut dil (localStorage'dan okunur veya varsayılan kullanılır)
let currentLanguage = DEFAULT_LANGUAGE;

// Tarayıcıda çalışıyorsa localStorage'dan dil tercihini oku
if (typeof window !== 'undefined') {
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
    currentLanguage = savedLanguage;
  }
}

/**
 * Mevcut dili döndürür
 * @returns {string} Dil kodu (tr, en, vb.)
 */
export const getCurrentLanguage = () => currentLanguage;

/**
 * Mevcut dil bilgisini döndürür
 * @returns {Object} Dil bilgisi objesi
 */
export const getCurrentLanguageInfo = () => SUPPORTED_LANGUAGES[currentLanguage];

/**
 * Mevcut locale'i döndürür (Türkçe karakter dönüşümleri için)
 * @returns {string} Locale (tr-TR, en-US, vb.)
 */
export const getCurrentLocale = () => SUPPORTED_LANGUAGES[currentLanguage]?.locale || 'tr-TR';

/**
 * Dil değiştirir
 * @param {string} langCode - Dil kodu (tr, en, vb.)
 */
export const setLanguage = (langCode) => {
  if (SUPPORTED_LANGUAGES[langCode]) {
    currentLanguage = langCode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', langCode);
    }
    // Sayfa yeniden yüklenmesi gerekiyorsa:
    // window.location.reload();
  } else {
    console.warn(`Desteklenmeyen dil: ${langCode}`);
  }
};

/**
 * Çeviri anahtarından metni döndürür
 * @param {string} key - Nokta notasyonlu anahtar (örn: 'gates.yellow')
 * @param {Object} params - Değişken parametreler (opsiyonel)
 * @returns {string} Çevrilmiş metin
 * 
 * Örnek kullanım:
 * t('gates.yellow') => "SARI HAT"
 * t('messages.itemCount', { count: 5 }) => "5 öğe bulundu"
 */
export const t = (key, params = {}) => {
  const keys = key.split('.');
  let value = translations[currentLanguage];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Anahtar bulunamazsa, varsayılan dilde ara
      value = translations[DEFAULT_LANGUAGE];
      for (const dk of keys) {
        if (value && typeof value === 'object' && dk in value) {
          value = value[dk];
        } else {
          console.warn(`Çeviri bulunamadı: ${key}`);
          return key; // Anahtar bulunamazsa anahtarı döndür
        }
      }
      break;
    }
  }

  // String değilse anahtarı döndür
  if (typeof value !== 'string') {
    console.warn(`Çeviri string değil: ${key}`);
    return key;
  }

  // Parametreleri yerleştir ({{param}} formatında)
  if (Object.keys(params).length > 0) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      value = value.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
    });
  }

  return value;
};

/**
 * Bir nesnenin tüm çevirilerini döndürür (select option'ları için)
 * @param {string} prefix - Çeviri öneki (örn: 'gates')
 * @returns {Object} Çeviri objesi
 * 
 * Örnek:
 * getTranslationGroup('gates') => { yellow: "SARI HAT", red: "KIRMIZI HAT", ... }
 */
export const getTranslationGroup = (prefix) => {
  const keys = prefix.split('.');
  let value = translations[currentLanguage];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return {};
    }
  }

  return typeof value === 'object' ? value : {};
};

/**
 * Desteklenen dillerin listesini döndürür
 * @returns {Array} Dil listesi
 */
export const getSupportedLanguages = () => Object.values(SUPPORTED_LANGUAGES);

export default {
  t,
  getCurrentLanguage,
  getCurrentLanguageInfo,
  getCurrentLocale,
  setLanguage,
  getTranslationGroup,
  getSupportedLanguages,
  SUPPORTED_LANGUAGES,
};