/**
 * Metin Dönüşüm Yardımcı Fonksiyonları
 * Türkçe karakter desteği ile büyük/küçük harf dönüşümleri
 */

const DEFAULT_LOCALE = 'tr-TR';

/**
 * Türkçe büyük harfe çevirme (locale bağımsız, %100 doğru)
 * @param {string} text
 * @returns {string}
 */
export const toUpperCase = (text) => {
  if (!text || typeof text !== 'string') return text;

  // Türkçe özel karakter eşlemeleri
  const map = {
    'i': 'İ',
    'ı': 'I',
    'ğ': 'Ğ',
    'ü': 'Ü',
    'ş': 'Ş',
    'ö': 'Ö',
    'ç': 'Ç',
  };

  // Türkçe karakterleri uygun büyük harfe çevir
  const replaced = text.replace(/[iığüşöç]/g, char => map[char] || char);

  // Kalan tüm karakterleri büyük harfe çevir
  return replaced.toUpperCase();
};

/**
 * Türkçe küçük harfe çevirme
 * @param {string} text
 * @returns {string}
 */
export const toLowerCase = (text) => {
  if (!text || typeof text !== 'string') return text;

  return text
    .toLocaleLowerCase(DEFAULT_LOCALE)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı');
};

/**
 * İlk harfi büyük yapar (tek kelime)
 * @param {string} text
 * @returns {string}
 */
export const capitalize = (text) => {
  if (!text || typeof text !== 'string') return text;

  return (
    text.charAt(0)
      .replace(/[iığüşöç]/g, char => ({
        'i': 'İ',
        'ı': 'I',
        'ğ': 'Ğ',
        'ü': 'Ü',
        'ş': 'Ş',
        'ö': 'Ö',
        'ç': 'Ç',
      }[char] || char))
      .toUpperCase()
    +
    text.slice(1).toLocaleLowerCase(DEFAULT_LOCALE)
  );
};

/**
 * Her kelimenin ilk harfini büyük yapar (Title Case)
 * @param {string} text
 * @returns {string}
 */
export const toTitleCase = (text) => {
  if (!text || typeof text !== 'string') return text;

  return text
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Form verilerindeki belirli alanları büyük harfe çevirir
 * @param {Object} formData
 * @param {Array<string>} fieldsToUpperCase
 * @returns {Object}
 */
export const transformFormData = (formData, fieldsToUpperCase = []) => {
  const transformed = { ...formData };

  fieldsToUpperCase.forEach(field => {
    if (transformed[field] && typeof transformed[field] === 'string') {
      transformed[field] = toUpperCase(transformed[field]);
    }
  });

  return transformed;
};

/**
 * İşlem (Transaction) formu için büyük harfe çevrilecek alanlar
 */
export const TRANSACTION_UPPERCASE_FIELDS = [
  'senderName',
  'recipientName',
  'customsWarehouse',
  'declarationNumber',
  'fileNo',
];

/**
 * Firma formu için büyük harfe çevrilecek alanlar
 */
export const COMPANY_UPPERCASE_FIELDS = [
  'name',
  'shortName',
];

/**
 * Kullanıcı formu için büyük harfe çevrilecek alanlar
 */
export const USER_UPPERCASE_FIELDS = [
  'firstName',
  'lastName',
];

/**
 * Yük (Cargo) formu için büyük harfe çevrilecek alanlar
 */
export const CARGO_UPPERCASE_FIELDS = [
  'senderCompany',
  'carrierName',
  'billOfLading',
  'licensePlate',
  'consignmentNumber',
  'documentReceiver',
  'transportInfo',
];

/**
 * Kurye formu için büyük harfe çevrilecek alanlar
 */
export const COURIER_UPPERCASE_FIELDS = [
  'name',
  'shortName',
];

export default {
  toUpperCase,
  toLowerCase,
  capitalize,
  toTitleCase,
  transformFormData,
  TRANSACTION_UPPERCASE_FIELDS,
  COMPANY_UPPERCASE_FIELDS,
  USER_UPPERCASE_FIELDS,
  CARGO_UPPERCASE_FIELDS,
  COURIER_UPPERCASE_FIELDS,
};
