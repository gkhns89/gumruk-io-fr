import { FEATURE_FLAGS } from './featureFlags';
import { OPEN_CHANGE_REQUESTS_EVENT } from '../api/changeRequestService';
import { getCurrentLocale } from '../locales';

/**
 * Değişiklik talebi arayüzünün ortak yardımcıları (CHANGE_REQUESTS bayrağı). Servis: api/changeRequestService.js.
 *
 * Talep, personelin **düzenleyemediği** bir kayıt için vardır. Düzenleyebildiği kayıtta talep yoktur: kullanıcı
 * kaydı zaten kendisi güncelleyebilirken araya yönetici koymak, günlük işi durdurmaktan başka bir şey yapmazdı.
 */

// Talep açabilen rol. Yönetici kaydı doğrudan düzenler; SUPER_ADMIN ve CLIENT_USER bu arayüzü hiç görmez.
const REQUESTER_ROLES = ['BROKER_USER'];

// Talebi sonuçlandıran rol.
const REVIEWER_ROLES = ['BROKER_ADMIN'];

/**
 * BROKER_USER'ın düzenleyemediği işlem durumları — talebin devreye girdiği yer.
 * Muayenede kritik alanlar, kapanmış kayıtta bütün alanlar kilitli
 * (bkz. CustomsTransactionService.updateTransaction ve EditTransactionModal'daki isFieldLocked).
 */
export const LOCKED_TRANSACTION_STATUSES = ['INSPECTION', 'CP_COMPLETED', 'WITHDRAWN', 'CANCELLED'];

/** Kullanıcı talep açabilir mi? `hasFeature` → useFeatureFlags() */
export const canRequestChanges = (user, hasFeature) =>
  REQUESTER_ROLES.includes(user?.globalRole)
  && typeof hasFeature === 'function' && hasFeature(FEATURE_FLAGS.CHANGE_REQUESTS);

/** Kullanıcı talepleri sonuçlandırabilir mi? */
export const canReviewChanges = (user, hasFeature) =>
  REVIEWER_ROLES.includes(user?.globalRole)
  && typeof hasFeature === 'function' && hasFeature(FEATURE_FLAGS.CHANGE_REQUESTS);

/** Kullanıcı talep arayüzünün herhangi bir parçasını görür mü (rozetler iki tarafta da görünür)? */
export const canSeeChangeRequests = (user, hasFeature) =>
  canRequestChanges(user, hasFeature) || canReviewChanges(user, hasFeature);

/** İşlem, personelin düzenleyemediği bir durumda mı? */
export const isTransactionLocked = (transaction) =>
  LOCKED_TRANSACTION_STATUSES.includes(transaction?.status);

/**
 * Bu kayıt için talep açılmalı mı? Ödeme kısıtı (`isReadOnly`) talebi de kapatır: kısıtlı firmada yazma yoktur,
 * talep de bir yazmadır.
 */
export const shouldRequestChange = ({ transaction, user, hasFeature, isReadOnly }) =>
  !isReadOnly && canRequestChanges(user, hasFeature) && isTransactionLocked(transaction);

/** Zili sayfa değiştirmeden aç; `requestId` verilirse o satır vurgulanır. */
export const openChangeRequests = (requestId = null) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_CHANGE_REQUESTS_EVENT, { detail: { requestId } }));
};

/** "14 Eylül 2026 15:30" — talep listesindeki zaman damgaları */
export const formatRequestTime = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(getCurrentLocale(), {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/** Talebin etiketi: kaydın şimdiki adı varsa o, yoksa talebin açıldığı andaki ad, o da yoksa "#id". */
export const requestLabel = (request) =>
  request?.target?.label || request?.label || `#${request?.targetId ?? ''}`;
