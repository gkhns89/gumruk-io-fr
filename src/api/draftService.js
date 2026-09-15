import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { reportIfFeatureDisabled } from '../utils/featureFlags';
import { t } from '../locales';

/**
 * Kaydedilmemiş form taslakları (DRAFTS bayrağı arkasında; backend de kontrol ediyor).
 *
 * Taslak sunucuda firma ve oluşturan kullanıcıyla saklanır, her gün firmanın silme saatinde temizlenir. Süresi dolmuş
 * taslak temizlik işi çalışmadan da hiçbir uçta görünmez.
 * BROKER_USER yalnızca kendi taslaklarını görür; BROKER_ADMIN firmadaki tüm taslakları görür. Başkasının taslağında
 * `mine` false gelir: yönetici silebilir, ama devam edemez ve üzerine yazamaz (PUT → 403 FORBIDDEN).
 *
 * Taslak öğesi: { id, module, targetId, label, payload, schemaVersion, createdBy: { id, fullName },
 *   createdAt, updatedAt, expiresAt, mine }. Zamanlar UTC (`2026-09-15T20:30:00Z`); `createdBy.fullName` kullanıcı
 *   adıdır. `payload` formun geri yüklenebilir JSON görüntüsüdür.
 *
 * Hatalar: 404 `DRAFT_NOT_FOUND` (yok, silinmiş, süresi dolmuş ya da görünmüyor), 400 `DRAFT_TOO_LARGE`,
 * 409 `DRAFT_LIMIT_REACHED`, 403 `FORBIDDEN`, 400 `FEATURE_DISABLED` (bayrak sayfa açıkken kapatıldı: bayraklar
 * sessizce tazelenir, çağıran toast göstermez).
 *
 * Servisler hata fırlatmaz: `{ success: true, data }` | `{ success: false, error, code, status }`.
 * Başarılı her değişiklik window'a `draftsChanged` olayı yayar; sayfalardaki taslak sayacı bunu dinler.
 */

export const DRAFT_MODULES = {
  TRANSACTION: 'TRANSACTION',
  WAREHOUSE: 'WAREHOUSE',
  CARGO: 'CARGO',
};

// Formların payload şeması. Bir modalın kaydettiği alanlar uyumsuz biçimde değişirse artırılır; geri yükleme
// yalnızca bilinen sürümü açar (bkz. utils/drafts.js → readDraftPayload).
export const DRAFT_SCHEMA_VERSION = 1;

export const DRAFTS_CHANGED_EVENT = 'draftsChanged';

// Sözleşmedeki hata kodları → yedek metin. Sunucu kendi mesajını gönderirse o gösterilir.
const CODE_FALLBACK_KEYS = {
  DRAFT_NOT_FOUND: 'api.drafts.notFound',
  DRAFT_TOO_LARGE: 'api.drafts.tooLarge',
  DRAFT_LIMIT_REACHED: 'api.drafts.limitReached',
  FEATURE_DISABLED: 'api.drafts.featureDisabled',
};

const STATUS_FALLBACK_KEYS = {
  403: 'api.drafts.forbidden',
  404: 'api.drafts.notFound',
};

const errorCodeOf = (error) => {
  const data = error?.response?.data;
  if (typeof data?.code === 'string') return data.code;
  return typeof data?.error === 'string' && CODE_FALLBACK_KEYS[data.error] ? data.error : undefined;
};

const isNotFoundError = (error) => error?.response?.status === 404 || errorCodeOf(error) === 'DRAFT_NOT_FOUND';

/** Servis sonucu "taslak yok" mu (silinmiş, temizlenmiş, süresi dolmuş ya da görünmüyor)? */
export const isDraftNotFound = (result) => result?.status === 404 || result?.code === 'DRAFT_NOT_FOUND';

/** Servis sonucu "bayrak kapalı" mı? Bayraklar zaten tazeleniyor; çağıran hata toast'ı göstermemeli. */
export const isFeatureDisabled = (result) => result?.code === 'FEATURE_DISABLED';

const failure = (context, error, fallbackKey) => {
  const status = error?.response?.status;
  const code = errorCodeOf(error);
  const featureDisabled = reportIfFeatureDisabled(error);
  // Beklenen durumlar konsolu kirletmesin
  if (!featureDisabled && !isNotFoundError(error)) logError(`DraftService - ${context}`, error);
  const key = CODE_FALLBACK_KEYS[code] || STATUS_FALLBACK_KEYS[status] || fallbackKey;
  return { success: false, error: getApiErrorMessage(error, t(key)), code, status };
};

const notifyChanged = (module) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DRAFTS_CHANGED_EVENT, { detail: { module: module || null } }));
};

const countOf = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export const draftService = {
  /**
   * Bir modülün taslakları, en yeni önce
   * @param {'TRANSACTION'|'WAREHOUSE'|'CARGO'} module
   */
  listDrafts: async (module) => {
    try {
      const response = await axiosInstance.get('/drafts', { params: { module } });
      return { success: true, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      return failure('listDrafts', error, 'api.drafts.listError');
    }
  },

  /**
   * Tek taslak (listeyle aynı görünürlük). Yoksa `code: 'DRAFT_NOT_FOUND'`, `status: 404`.
   * @param {number|string} id
   */
  getDraft: async (id) => {
    try {
      const response = await axiosInstance.get(`/drafts/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('getDraft', error, 'api.drafts.notFound');
    }
  },

  /**
   * Modül başına taslak sayısı ve firmanın silme saati
   * @returns data: { TRANSACTION, WAREHOUSE, CARGO, purgeTime: "21:00" | null }
   */
  getSummary: async () => {
    try {
      const response = await axiosInstance.get('/drafts/summary');
      const data = response.data || {};
      return {
        success: true,
        data: {
          TRANSACTION: countOf(data.TRANSACTION),
          WAREHOUSE: countOf(data.WAREHOUSE),
          CARGO: countOf(data.CARGO),
          purgeTime: typeof data.purgeTime === 'string' ? data.purgeTime : null,
        },
      };
    } catch (error) {
      return failure('getSummary', error, 'api.drafts.summaryError');
    }
  },

  /**
   * Yeni taslak
   * @param {Object} body - { module, targetId?, label?, payload, schemaVersion }
   * @returns data: oluşturulan taslak
   */
  createDraft: async ({ module, targetId = null, label, payload, schemaVersion }) => {
    try {
      const response = await axiosInstance.post('/drafts', { module, targetId, label, payload, schemaVersion });
      notifyChanged(module);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('createDraft', error, 'api.drafts.saveError');
    }
  },

  /**
   * Taslağı güncelle — yalnızca oluşturan. Etiket değiştirilir (null temizler), bu yüzden her seferinde güncel etiket
   * gönderilmeli. Taslak bu arada silinmiş ya da süresi dolmuşsa `isDraftNotFound(result)`.
   * @param {number} id
   * @param {Object} body - { label, payload, schemaVersion }
   */
  updateDraft: async (id, { label, payload, schemaVersion }) => {
    try {
      const response = await axiosInstance.put(`/drafts/${id}`, { label: label ?? null, payload, schemaVersion });
      notifyChanged(response.data?.module);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('updateDraft', error, 'api.drafts.saveError');
    }
  },

  /**
   * Taslağı sil (oluşturan ya da BROKER_ADMIN). Taslak zaten yoksa (404) silme amacına ulaşmış sayılır:
   * `{ success: true, data: { alreadyGone: true } }`.
   * @param {number} id
   */
  deleteDraft: async (id) => {
    try {
      await axiosInstance.delete(`/drafts/${id}`);
      notifyChanged();
      return { success: true, data: { alreadyGone: false } };
    } catch (error) {
      if (isNotFoundError(error)) {
        notifyChanged();
        return { success: true, data: { alreadyGone: true } };
      }
      return failure('deleteDraft', error, 'api.drafts.deleteError');
    }
  },

  /**
   * Hatırlatma bildirimi yalnızca taslak id'si taşır; taslağın modülünü bulur. Taslak alınamazsa (yok, süresi
   * dolmuş, ağ hatası) taslağı olan ilk modülü, hiç taslak yoksa null döner.
   * @param {number|string} id
   * @returns data: 'TRANSACTION' | 'WAREHOUSE' | 'CARGO' | null
   */
  locateDraft: async (id) => {
    const draft = await draftService.getDraft(id);
    if (draft.success && DRAFT_MODULES[draft.data?.module]) return { success: true, data: draft.data.module };
    if (isFeatureDisabled(draft)) return { success: true, data: null };

    const summary = await draftService.getSummary();
    if (!summary.success) return { success: true, data: null };
    return { success: true, data: Object.values(DRAFT_MODULES).find((module) => summary.data[module] > 0) || null };
  },
};

export default draftService;
