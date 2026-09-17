import { t, getCurrentLocale } from '../locales';

/**
 * G-Radar kredi fiyatı planda durur (firmaya özel fiyat = özel plan). Backend fiyatsız bir planla G-Radar'ın
 * açık kalmasını engeller ve bunu şu kodlarla bildirir (400):
 * - GRADAR_PLAN_PRICE_MISSING: fiyatsız planda G-Radar açılmak istendi ya da G-Radar'ı açık firma fiyatsız plana taşınıyor
 * - GRADAR_PLAN_PRICE_IN_USE: G-Radar'ı açık firmaların kullandığı plandan fiyat kaldırılıyor / sıfırlanıyor
 * - GRADAR_PLAN_PRICE_INVALID: fiyat pozitif değil ya da DECIMAL(10,4)'e sığmıyor
 */
export const GRADAR_PLAN_PRICE_CODES = Object.freeze({
  MISSING: 'GRADAR_PLAN_PRICE_MISSING',
  IN_USE: 'GRADAR_PLAN_PRICE_IN_USE',
  INVALID: 'GRADAR_PLAN_PRICE_INVALID',
});

const MAX_PRICE = 999999.9999;

/** Planın geçerli G-Radar fiyatı var mı (tanımlı ve sıfırdan büyük). */
export const hasGRadarPrice = (value) => value != null && value !== '' && Number(value) > 0;

/** Kullanıcının yazdığı fiyat backend'in kabul edeceği biçimde mi: pozitif, ≤ 999999.9999, en çok 4 ondalık. */
export const isValidGRadarPriceInput = (raw) => {
  const text = String(raw ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,4})?$/.test(text)) return false;
  const value = Number(text);
  return value > 0 && value <= MAX_PRICE;
};

export const parseGRadarPriceInput = (raw) => Number(String(raw ?? '').trim().replace(',', '.'));

/** "$2.50" — en az 2, en çok 4 ondalık. Fiyat yoksa null. */
export const formatGRadarPrice = (value) => {
  if (!hasGRadarPrice(value)) return null;
  return `$${Number(value).toLocaleString(getCurrentLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
};

/**
 * Plan fiyatı kodları için okunur mesaj; kod bu üçünden biri değilse null (çağıran kendi mesajını gösterir).
 * IN_USE'da etkilenen firma sayısı yalnızca sunucu mesajında olduğundan o tercih edilir.
 */
export const getGRadarPlanPriceError = (code, serverMessage, { planName } = {}) => {
  switch (code) {
    case GRADAR_PLAN_PRICE_CODES.MISSING:
      return planName
        ? t('gRadarPlanPrice.errors.missing', { plan: planName })
        : (serverMessage || t('gRadarPlanPrice.errors.missingGeneric'));
    case GRADAR_PLAN_PRICE_CODES.IN_USE:
      return serverMessage || t('gRadarPlanPrice.errors.inUse', { plan: planName ?? '' });
    case GRADAR_PLAN_PRICE_CODES.INVALID:
      return t('gRadarPlanPrice.errors.invalid');
    default:
      return null;
  }
};
