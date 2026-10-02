import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { reportIfFeatureDisabled } from '../utils/featureFlags';
import { t } from '../locales';

/**
 * Değişiklik talepleri (CHANGE_REQUESTS bayrağı arkasında; backend de kontrol ediyor).
 *
 * Bir BROKER_USER, kendisinin düzenleyemediği bir kayda (kapanmış ya da muayenedeki işlem) uygulanmasını istediği
 * değişikliği talep olarak gönderir; BROKER_ADMIN karşılaştırır ve onaylar ya da gerekçeyle reddeder. Taslaklardan
 * farkı: talep süresi dolmaz, kararın kendisi (kim, ne zaman, hangi gerekçeyle) kayıtta durur.
 *
 * `payload` taslaklarla **aynı biçimdedir** — `{ formData, ...aramaMetinleri, base }` — çünkü karşılaştırma ve
 * uygulama aynı yerden geçer (utils/draftDiff.js → buildPendingChange, components/transactions/transactionDraftFields.js).
 * `base` talep alındığı andaki formdur: talep bir **fark**tır, fotoğraf değil.
 *
 * Talep öğesi: { id, module, targetId, label, status, payload, schemaVersion, note,
 *   requestedBy: { id, fullName }, requestedAt, reviewedBy, reviewedAt, reviewReason, mine, canReview,
 *   target: { id, label, updatedAt, baseUpdatedAt, exists, stale } }. `payload` yalnızca `getRequest` ile dolu gelir:
 *   liste rozetleri form verisi taşımaz. `stale` kaydın talepten sonra başkası tarafından değiştiğini söyler.
 *
 * **Onay gövdesi talebin payload'ı değildir.** Uygulanacak gövdeyi çağıran hesaplar (kaydın şimdiki hâli + talebin
 * farkı) ve `approve` ona gönderir; sunucu onu normal güncelleme yolundan geçirir, yani tarih sırası ve kapanmış
 * kayıt kuralları talep üzerinden de aynen işler.
 *
 * Hatalar: 404 `CHANGE_REQUEST_NOT_FOUND`, 404 `CHANGE_REQUEST_TARGET_NOT_FOUND` (kayıt silinmiş ya da başka firmanın),
 * 409 `CHANGE_REQUEST_PENDING_EXISTS` (kayıtta zaten bekleyen talep var), 409 `CHANGE_REQUEST_NOT_PENDING`
 * (talep bu arada sonuçlanmış), 409 `CHANGE_REQUEST_LIMIT_REACHED`, 400 `CHANGE_REQUEST_TOO_LARGE`,
 * 400 `CHANGE_REQUEST_REASON_REQUIRED`, 400 `CHANGE_REQUEST_ADMIN_DIRECT` (yönetici kaydı doğrudan düzenler),
 * 400 `CHANGE_REQUEST_MODULE_UNSUPPORTED`, 403 `FORBIDDEN`, 400 `FEATURE_DISABLED` (bayrak sayfa açıkken kapatıldı:
 * bayraklar sessizce tazelenir, çağıran toast göstermez).
 *
 * Servisler hata fırlatmaz: `{ success: true, data }` | `{ success: false, error, code, status }`.
 * Başarılı her değişiklik window'a `changeRequestsChanged` olayı yayar; rozetler ve zil bunu dinler.
 */

export const CHANGE_REQUESTS_CHANGED_EVENT = 'changeRequestsChanged';

/** Zil dışarıdan açılır (bildirime tıklanınca), sayfa değiştirmeden. */
export const OPEN_CHANGE_REQUESTS_EVENT = 'openChangeRequests';

// Sözleşmedeki hata kodları → yedek metin. Sunucu kendi mesajını gönderirse o gösterilir.
const CODE_FALLBACK_KEYS = {
  CHANGE_REQUEST_NOT_FOUND: 'api.changeRequests.notFound',
  CHANGE_REQUEST_TARGET_NOT_FOUND: 'api.changeRequests.targetNotFound',
  CHANGE_REQUEST_PENDING_EXISTS: 'api.changeRequests.pendingExists',
  CHANGE_REQUEST_NOT_PENDING: 'api.changeRequests.notPending',
  CHANGE_REQUEST_LIMIT_REACHED: 'api.changeRequests.limitReached',
  CHANGE_REQUEST_TOO_LARGE: 'api.changeRequests.tooLarge',
  CHANGE_REQUEST_REASON_REQUIRED: 'api.changeRequests.reasonRequired',
  CHANGE_REQUEST_ADMIN_DIRECT: 'api.changeRequests.adminDirect',
  CHANGE_REQUEST_MODULE_UNSUPPORTED: 'api.changeRequests.moduleUnsupported',
  FEATURE_DISABLED: 'api.changeRequests.featureDisabled',
};

const STATUS_FALLBACK_KEYS = {
  403: 'api.changeRequests.forbidden',
  404: 'api.changeRequests.notFound',
};

const errorCodeOf = (error) => {
  const data = error?.response?.data;
  if (typeof data?.code === 'string') return data.code;
  return typeof data?.error === 'string' && CODE_FALLBACK_KEYS[data.error] ? data.error : undefined;
};

// Beklenen durumlar konsolu kirletmesin
const isExpected = (error) => error?.response?.status === 404
  || ['CHANGE_REQUEST_PENDING_EXISTS', 'CHANGE_REQUEST_NOT_PENDING'].includes(errorCodeOf(error));

/** Servis sonucu "talep yok" mu (silinmiş ya da görünmüyor)? */
export const isRequestNotFound = (result) => result?.status === 404
  || result?.code === 'CHANGE_REQUEST_NOT_FOUND';

/** Servis sonucu "kayıtta zaten bekleyen talep var" mı? */
export const isPendingRequestExists = (result) => result?.code === 'CHANGE_REQUEST_PENDING_EXISTS';

/** Servis sonucu "talep bu arada sonuçlanmış" mı? İki yönetici aynı talebe aynı anda baktığında olur. */
export const isRequestNotPending = (result) => result?.code === 'CHANGE_REQUEST_NOT_PENDING';

/** Servis sonucu "bayrak kapalı" mı? Bayraklar zaten tazeleniyor; çağıran hata toast'ı göstermemeli. */
export const isFeatureDisabled = (result) => result?.code === 'FEATURE_DISABLED';

const failure = (context, error, fallbackKey) => {
  const status = error?.response?.status;
  const code = errorCodeOf(error);
  const featureDisabled = reportIfFeatureDisabled(error);
  if (!featureDisabled && !isExpected(error)) logError(`ChangeRequestService - ${context}`, error);
  const key = CODE_FALLBACK_KEYS[code] || STATUS_FALLBACK_KEYS[status] || fallbackKey;
  return { success: false, error: getApiErrorMessage(error, t(key)), code, status };
};

const notifyChanged = (module) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHANGE_REQUESTS_CHANGED_EVENT, { detail: { module: module || null } }));
};

export const changeRequestService = {
  /**
   * Bekleyen talepler, en yenisi başta. Yönetici firmanınkilerin hepsini, personel kendininkileri görür.
   * Payload taşımaz: rozetler ve zil listesi için.
   * @param {'TRANSACTION'|'WAREHOUSE'|'CARGO'} [module]
   */
  listPending: async (module) => {
    try {
      const response = await axiosInstance.get('/change-requests/pending', { params: { module } });
      return { success: true, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      return failure('listPending', error, 'api.changeRequests.listError');
    }
  },

  /**
   * Tek talep, payload'ıyla: karşılaştırma penceresi bunu okur.
   * @param {number|string} id
   */
  getRequest: async (id) => {
    try {
      const response = await axiosInstance.get(`/change-requests/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('getRequest', error, 'api.changeRequests.notFound');
    }
  },

  /**
   * Yeni talep. `payload` taslak biçimindedir ve `base` taşımalıdır (talep bir fark).
   * @param {Object} body - { module, targetId, label, payload, schemaVersion, baseUpdatedAt, note }
   */
  createRequest: async ({ module, targetId, label, payload, schemaVersion, baseUpdatedAt = null, note = null }) => {
    try {
      const response = await axiosInstance.post('/change-requests',
        { module, targetId, label, payload, schemaVersion, baseUpdatedAt, note });
      notifyChanged(module);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('createRequest', error, 'api.changeRequests.createError');
    }
  },

  /**
   * Onay (yalnızca BROKER_ADMIN): gövde kaydın uygulanacak hâlidir — talebin payload'ı değil.
   * Sunucu gövdeyi normal güncelleme ucundan geçirir, sonra talebi APPROVED yapar; ikisi tek işlemde.
   * @param {number|string} id
   * @param {Object} updateBody buildPendingChange(...).effectivePayload üzerinden kurulmuş güncelleme gövdesi
   */
  approveRequest: async (id, updateBody) => {
    try {
      const response = await axiosInstance.post(`/change-requests/${id}/approve`, updateBody);
      notifyChanged(response.data?.module);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('approveRequest', error, 'api.changeRequests.approveError');
    }
  },

  /**
   * Reddetme (yalnızca BROKER_ADMIN). Gerekçe zorunlu.
   * @param {number|string} id
   * @param {string} reason
   */
  rejectRequest: async (id, reason) => {
    try {
      const response = await axiosInstance.post(`/change-requests/${id}/reject`, { reason });
      notifyChanged(response.data?.module);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('rejectRequest', error, 'api.changeRequests.rejectError');
    }
  },

  /**
   * Geri çekme: talebi açan kendisininkini, yönetici firmadaki her talebi kuyruktan düşürür.
   * @param {number|string} id
   */
  cancelRequest: async (id) => {
    try {
      const response = await axiosInstance.post(`/change-requests/${id}/cancel`);
      notifyChanged(response.data?.module);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('cancelRequest', error, 'api.changeRequests.cancelError');
    }
  },
};

export default changeRequestService;
