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

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

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

// ==================== TASLAK = FARK ====================

/**
 * Bekleyen değişiklik bir **fark**tır. Taslak, formun tamamının fotoğrafını taşır; ama taslakçı yalnızca birkaç
 * alana dokunmuştur. Dokunulmayan alanlar formu açtığı andaki değerleriyle duruyordur ve taslak uygulanırken
 * bunların yazılması, bu arada başkasının yaptığı değişikliği sessizce geri alırdı.
 *
 * Bu yüzden taslak, alındığı andaki formu da taşır (`payload.base`). Fark = taslak ∖ base; uygulama = kaydın
 * **şimdiki** hâli + fark. Öncesinde alınmış taslaklarda `base` yok: onlarda eski davranış sürer (tüm form
 * uygulanır) ve arayüz bunu açıkça söyler.
 */

/** Nesnenin yaprak yolları ("formData.delayReasons.arrivalToRegistration"); diziler yaprak sayılır. */
const leafPaths = (source, prefix = '') => {
  if (!isPlainObject(source)) return prefix ? [prefix] : [];
  return Object.entries(source).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isPlainObject(value) ? leafPaths(value, path) : [path];
  });
};

/**
 * Alan tanımı olmayan anahtarların karşılaştırması (kimlikler, arama kutusu metinleri, formdan türeyen
 * `recipientName` gibi). Boş sayılan değerler (null, undefined, "") birbirinden farklı değildir; kimlikler
 * metin olarak karşılaştırılır, böylece 5 ile "5" aynıdır.
 */
const rawCompareKey = (value) => {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value)) return JSON.stringify(value.filter((item) => item != null && item !== ''));
  if (isPlainObject(value)) return JSON.stringify(value);
  return String(value);
};

const clonePayload = (value) => (isPlainObject(value)
  ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clonePayload(item)]))
  : value);

const setDraftPath = (target, path, value) => {
  const parts = String(path).split('.');
  const last = parts.pop();
  const parent = parts.reduce((node, part) => {
    if (!isPlainObject(node[part])) node[part] = {};
    return node[part];
  }, target);
  parent[last] = value;
};

/**
 * Taslakçının gerçekten değiştirdiği payload yolları: taslak ile `base` (taslak alındığı andaki form) arasındaki
 * fark. Alan tanımı olan anahtarlar tanımdaki `format` ile ölçülür, böylece "1500" ile 1500 ya da "2026-09-15"
 * ile aynı tarihin başka yazımı fark sayılmaz.
 *
 * @returns {Array<string>|null} `base` yoksa null (eski taslak)
 */
export const draftDeltaPaths = (basePayload, draftPayload, fields) => {
  if (!isPlainObject(basePayload) || !isPlainObject(draftPayload)) return null;
  const formats = new Map((Array.isArray(fields) ? fields : []).map((field) => [`formData.${field.key}`, field.format]));
  const paths = [...new Set([...leafPaths(basePayload), ...leafPaths(draftPayload)])]
    .filter((path) => path !== 'base' && !path.startsWith('base.'));
  return paths.filter((path) => {
    const draftValue = draftFieldValue(draftPayload, path);
    // Taslakta hiç bulunmayan alan (form sonradan büyümüş) fark sayılmaz: kaydınki kalır.
    if (draftValue === undefined) return false;
    const baseValue = draftFieldValue(basePayload, path);
    const format = formats.get(path);
    return format
      ? draftValueText(baseValue, format) !== draftValueText(draftValue, format)
      : rawCompareKey(baseValue) !== rawCompareKey(draftValue);
  });
};

/** Kaydın şimdiki payload'ı + taslakçının farkı. Fark dışındaki her alan kaydın şimdiki değerinde kalır. */
export const mergeDraftDelta = (recordPayload, draftPayload, paths) => {
  const merged = clonePayload(isPlainObject(recordPayload) ? recordPayload : {});
  (paths || []).forEach((path) => setDraftPath(merged, path, draftFieldValue(draftPayload, path)));
  return merged;
};

/**
 * Bekleyen değişikliğin özeti — hem karşılaştırma penceresi (`PendingChangeModal`) hem düzenleme modalının bandı
 * ve ön doldurması (`useEditDraftPrefill`) buradan geçer, böylece gösterilen ile uygulanan ayrışamaz.
 *
 * @param {object}   options.payload         Taslağın payload'ı
 * @param {object}   options.record          Kaydın şimdiki hâli
 * @param {Array}    options.fields          Alan tanımları
 * @param {Function} options.recordToFields  (record) => karşılaştırma alanları
 * @param {Function} options.payloadToFields (payloadLike, record) => karşılaştırma alanları
 * @param {Function} [options.recordToPayload] (record) => kaydın şimdiki hâlinin payload karşılığı
 * @returns {{ legacy, effectivePayload, changes, conflicts, otherChanges }|null}
 *   `legacy`           eski taslak: `base` yok, formun tamamı uygulanacak
 *   `effectivePayload` uygulanacak / forma yazılacak payload (kayıt + fark)
 *   `changes`          taslakçının farkı, "şimdiki değer → taslaktaki değer"
 *   `conflicts`        farkın, bu arada başkasının da değiştirdiği alanları (gerçek çakışma)
 *   `otherChanges`     bu arada değişen ama taslağın dokunmayacağı alanlar (yalnızca bilgi)
 */
export const buildPendingChange = ({ payload, record, fields, recordToFields, payloadToFields, recordToPayload }) => {
  if (!payload || !record) return null;
  const basePayload = isPlainObject(payload.base) ? payload.base : null;
  const currentFields = recordToFields(record);

  const deltaPaths = basePayload && typeof recordToPayload === 'function'
    ? draftDeltaPaths(basePayload, payload, fields)
    : null;
  const effectivePayload = deltaPaths ? mergeDraftDelta(recordToPayload(record), payload, deltaPaths) : payload;

  const changes = diffDraftFields(currentFields, payloadToFields(effectivePayload, record), fields);
  const changedKeys = new Set(changes.map((change) => change.key));
  // Taslak alındıktan sonra kaydı başkasının değiştirdiği alanlar
  const others = basePayload ? diffDraftFields(payloadToFields(basePayload, record), currentFields, fields) : [];

  return {
    legacy: !deltaPaths,
    effectivePayload,
    changes,
    conflicts: changes.filter((change) => others.some((other) => other.key === change.key)),
    otherChanges: others.filter((other) => !changedKeys.has(other.key)),
  };
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
