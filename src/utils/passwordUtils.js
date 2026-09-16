import { t } from '../locales';

// Backend PasswordPolicy ile aynı eşikler: en az 8 karakter, en fazla 72 bayt UTF-8 (BCrypt sonrasını keser).
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;

const PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Okunurluğu bozan l/1/O/0 çiftleri dışarıda: parola telefonda okunup yazılacak. */
export function generatePassword(length = 12) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => PASSWORD_ALPHABET[v % PASSWORD_ALPHABET.length]).join('');
}

export function passwordByteLength(value) {
  return new TextEncoder().encode(value).length;
}

/** Tek bir şifre alanının hatası (uzunluk), yoksa null. */
export function validatePasswordLength(value) {
  if ([...value].length < MIN_PASSWORD_LENGTH) {
    return t('passwordForm.tooShort', { min: MIN_PASSWORD_LENGTH });
  }
  if (passwordByteLength(value) > MAX_PASSWORD_BYTES) {
    return t('passwordForm.tooLong', { max: MAX_PASSWORD_BYTES });
  }
  return null;
}

/** Şifre + tekrar: { password?, confirm? } hataları; boş nesne geçerli demek. */
export function validateNewPassword(password, confirm) {
  const errors = {};
  const lengthError = validatePasswordLength(password);
  if (lengthError) {
    errors.password = lengthError;
  } else if (password !== confirm) {
    errors.confirm = t('passwordForm.mismatch');
  }
  return errors;
}
