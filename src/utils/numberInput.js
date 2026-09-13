/**
 * Metin kutusuna yazılan sayılar (kilo, vergi, teminat) için dile duyarlı ayrıştırma ve biçimlendirme.
 *
 * Binlik ve ondalık ayraçları `Intl` ile seçili dilden türetilir: tr-TR "1.234,56", en-US "1,234.56".
 * Türkçe davranış eski el yazımı ayrıştırıcıyla birebir aynıdır (tüm "." silinir, ilk "," ondalık olur).
 * API'ye giden değer her zaman düz bir JS sayısıdır. `type="number"` alanlarda gerekmez; tarayıcı çözer.
 */
import { getCurrentLocale } from '../locales';

const separatorCache = new Map();

/** Dilin binlik (`group`) ve ondalık (`decimal`) ayraçları */
export const getNumberSeparators = (locale = getCurrentLocale()) => {
  if (!separatorCache.has(locale)) {
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    separatorCache.set(locale, {
      group: parts.find((part) => part.type === 'group')?.value ?? '',
      decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
    });
  }
  return separatorCache.get(locale);
};

/**
 * Kullanıcının yazdığı metni sayıya çevirir; boş ya da sayı olmayan girdide `""` döner.
 * Binlik ayraçlar atılır, ilk ondalık ayraç "." olur, kalanını `parseFloat` okur ("12abc" → 12).
 *
 * Metinde hem "." hem "," varsa dilden bağımsız olarak EN SAĞDAKİ ondalık, diğeri binlik sayılır;
 * böylece öteki biçimde yapıştırılan tutar da doğru okunur. Tek tür ayraç varsa dilin kuralı geçerli.
 *   tr: "1.234,56" → 1234.56   "1,234.56" → 1234.56   "1234,56" → 1234.56   "1234.56" → 123456
 *   en: "1,234.56" → 1234.56   "1.234,56" → 1234.56   "1234.56" → 1234.56   "1234,56" → 123456
 */
export const parseLocaleNumber = (text, locale = getCurrentLocale()) => {
  if (!text || text === '') return '';
  const value = String(text);
  const lastDot = value.lastIndexOf('.');
  const lastComma = value.lastIndexOf(',');
  const { group, decimal } = lastDot !== -1 && lastComma !== -1
    ? (lastDot > lastComma ? { group: ',', decimal: '.' } : { group: '.', decimal: ',' })
    : getNumberSeparators(locale);
  const withoutGroups = group ? value.split(group).join('') : value;
  const num = parseFloat(withoutGroups.replace(decimal, '.'));
  return Number.isNaN(num) ? '' : num;
};

/** Alan odaktan çıkınca gösterilecek biçim ("1.234,56"); 0 ve boş değer `""` olur. */
export const formatLocaleNumber = (value, decimals = 2, locale = getCurrentLocale()) => {
  if (!value || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '';
  return num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Odaklanınca düzenlemeye açılan ham değer: binlik ayraç yok, ondalık ayraç dilinki ("1234,56").
 * `String(sayı)` "." ürettiği için Türkçede sonraki tuş vuruşu değeri 100 katına çıkarıyordu.
 */
export const toEditableNumber = (value, locale = getCurrentLocale()) => {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  return String(num).replace('.', getNumberSeparators(locale).decimal);
};
