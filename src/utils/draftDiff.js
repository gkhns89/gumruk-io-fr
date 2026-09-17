import { t, getCurrentLocale } from '../locales';

/**
 * Bekleyen değişiklik karşılaştırması (taslak aşama 3): kaydın şimdiki hâli ile taslaktaki hâlinin alan bazlı farkı.
 *
 * Her modül kendi alan tanımını verir (`src/components/<modül>/<modül>DraftFields.js`):
 *   { key, label, format }  — `key` form anahtarı ("delayReasons.arrivalToRegistration" gibi noktalı olabilir),
 *   `label` formda görünen etiketin aynısı, `format` isteğe bağlı görüntüleme dönüştürücüsü.
 *
 * Karşılaştırma **görünen metin** üzerinden yapılır: kullanıcı "3" ile 3 arasındaki tür farkını değil, ekranda ne
 * değiştiğini görmek ister. `format` iki tarafa da uygulandığı için 1500 ile "1500.00" fark sayılmaz.
 *
 * Kimlik taşıyan alanlar (müşteri, gümrük, temsilci) {@link idValue} ile sarmalanır: karşılaştırma kimliğe,
 * gösterim ada göre yapılır. Aynı firmanın adı iki yerde farklı yazıldığı için ("ABC A.Ş." / "ABC") ada bakmak
 * olmayan bir değişiklik gösterirdi.
 */

/** Kimliğe göre karşılaştırılan, ada göre gösterilen değer */
export const idValue = (id, text) => ({ __draftId: id ?? null, text: text || '' });

const isIdValue = (value) => value !== null && typeof value === 'object' && '__draftId' in value;

/** "a.b.c" yolundan değer okur */
export const draftFieldValue = (source, key) => {
  if (!source || !key) return undefined;
  return String(key).split('.').reduce((value, part) => (value == null ? undefined : value[part]), source);
};

/** Boş değerler (null, undefined, "", boş dizi) tek bir "—" olarak gösterilir ve birbirinden farklı sayılmaz. */
const isEmpty = (value) => value == null || value === ''
  || (Array.isArray(value) && value.filter((item) => item != null && item !== '').length === 0);

/** Karşılaştırma ve görüntüleme için tek bir metin. */
export const draftValueText = (value, format) => {
  if (isIdValue(value)) return value.text || t('drafts.pending.emptyValue');
  if (typeof format === 'function') {
    const formatted = format(value);
    return formatted == null || formatted === '' ? t('drafts.pending.emptyValue') : String(formatted);
  }
  if (isEmpty(value)) return t('drafts.pending.emptyValue');
  if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no');
  if (Array.isArray(value)) {
    return value.filter((item) => item != null && item !== '').map((item) => String(item)).join(', ');
  }
  if (typeof value === 'number') return value.toLocaleString(getCurrentLocale());
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/** Karşılaştırma anahtarı: kimlikli alanda kimlik, diğerlerinde görünen metin. */
const compareKey = (value, format) => (isIdValue(value) ? `#${value.__draftId ?? ''}` : draftValueText(value, format));

/**
 * Yalnızca gerçekten değişen alanlar, tanımdaki sırayla.
 * @param {object} current kaydın şimdiki hâli
 * @param {object} next    taslaktaki hâli
 * @param {Array}  fields  alan tanımları
 * @returns {Array<{ key, label, currentText, draftText }>}
 */
export const diffDraftFields = (current, next, fields) => {
  if (!current || !next || !Array.isArray(fields)) return [];
  return fields.reduce((changes, field) => {
    const currentValue = draftFieldValue(current, field.key);
    const draftValue = draftFieldValue(next, field.key);
    // Taslakta hiç bulunmayan alan (form sonradan büyümüş) değişiklik sayılmaz
    if (draftValue === undefined) return changes;
    if (compareKey(currentValue, field.format) === compareKey(draftValue, field.format)) return changes;
    changes.push({
      key: field.key,
      label: field.label,
      currentText: draftValueText(currentValue, field.format),
      draftText: draftValueText(draftValue, field.format),
    });
    return changes;
  }, []);
};

// ==================== ORTAK BİÇİMLENDİRİCİLER ====================

/** "2026-09-15" → kullanıcının dilinde tarih; ayrıştırılamayan değer olduğu gibi gösterilir. */
export const draftDateText = (value) => {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(getCurrentLocale());
};

/** Sayı alanları: iki taraf da aynı biçime girsin diye ("1500" ile 1500 fark olmasın). */
export const draftNumberText = (value) => {
  if (value === '' || value == null) return '';
  const number = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isNaN(number) ? String(value) : number.toLocaleString(getCurrentLocale(), { maximumFractionDigits: 4 });
};

/** Evet / Hayır alanları */
export const draftBooleanText = (value) => (value ? t('common.yes') : t('common.no'));
