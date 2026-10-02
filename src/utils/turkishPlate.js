/**
 * Türk plakasının tek biçimi — backend'deki `TurkishPlate` ile aynı kural (orası son sözü söyler).
 *
 * Şema: il kodu (01–81) + 1–3 harf + rakamlar; harf sayısı rakam sayısını belirler (1 harf 4–5 rakam,
 * 2 harf 3–4, 3 harf 2–3). Veritabanına büyük harf ve boşluksuz yazılır: "34 tpm 32" → "34TPM32",
 * "1ak 4543" → "01AK4543".
 *
 * Boşluk yalnızca grup sınırlarında kabul edilir: "1ak 4543" olur, "1ak45 32" olmaz — ikincisi rakamın
 * ortasına düşen bir boşluktur ve sessizce düzeltilirse yanlış plaka doğru gibi kaydedilir.
 */

const SEPARATOR = /[\s-]+/;
const SHAPE = /^(\d{1,2})([A-Z]{1,3})(\d{2,5})$/;

const DIGITS_FOR_LETTERS = { 1: [4, 5], 2: [3, 4], 3: [2, 3] };

/** Yazarken kullanılır: yalnızca büyük harfe çevirir ve ayırıcıları atar, kurala bakmaz. */
export const compactPlate = (raw) => (raw || '').trim().toUpperCase().replace(new RegExp(SEPARATOR, 'g'), '');

/**
 * @returns {{ ok: true, plate: string } | { ok: false, reason: 'empty'|'shape'|'province'|'groups'|'spacing' }}
 */
export const normalizePlate = (raw) => {
  const trimmed = (raw || '').trim().toUpperCase();
  if (!trimmed) return { ok: false, reason: 'empty' };

  const tokens = trimmed.split(SEPARATOR).filter(Boolean);
  const joined = tokens.join('');
  const match = SHAPE.exec(joined);
  if (!match) return { ok: false, reason: 'shape' };

  const [, province, letters, digits] = match;
  const provinceNumber = Number(province);
  if (provinceNumber < 1 || provinceNumber > 81) return { ok: false, reason: 'province' };

  const allowed = DIGITS_FOR_LETTERS[letters.length] || [];
  if (!allowed.includes(digits.length)) return { ok: false, reason: 'groups' };

  // Boşluklar yalnızca il kodundan ve harflerden sonra olabilir
  if (tokens.length > 1) {
    const boundaries = [province.length, province.length + letters.length];
    let position = 0;
    for (let i = 0; i < tokens.length - 1; i += 1) {
      position += tokens[i].length;
      if (!boundaries.includes(position)) return { ok: false, reason: 'spacing' };
    }
  }

  return { ok: true, plate: `${String(provinceNumber).padStart(2, '0')}${letters}${digits}` };
};
