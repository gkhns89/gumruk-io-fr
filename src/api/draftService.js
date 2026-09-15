import axiosInstance from './axios';
import { logError, getApiErrorMessage } from '../utils/errorUtils';
import { t } from '../locales';

/**
 * Kaydedilmemiş form taslakları (DRAFTS bayrağı arkasında; backend de kontrol ediyor).
 *
 * Taslak sunucuda firma ve oluşturan kullanıcıyla saklanır, her gün firmanın silme saatinde temizlenir.
 * BROKER_USER yalnızca kendi taslaklarını görür; BROKER_ADMIN firmadaki tüm taslakları görür. Başkasının taslağında
 * `mine` false gelir: yönetici silebilir, ama devam edemez ve üzerine yazamaz (PUT yalnızca oluşturana açık).
 *
 * Taslak öğesi: { id, module, targetId, label, payload, schemaVersion, createdBy: { id, fullName },
 *   createdAt, updatedAt, expiresAt, mine }. `payload` formun geri yüklenebilir JSON görüntüsüdür.
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
  DRAFT_TOO_LARGE: 'api.drafts.tooLarge',
  DRAFT_LIMIT_REACHED: 'api.drafts.limitReached',
};

const STATUS_FALLBACK_KEYS = {
  403: 'api.drafts.forbidden',
  404: 'api.drafts.notFound',
};

const failure = (context, error, fallbackKey) => {
  logError(`DraftService - ${context}`, error);
  const status = error?.response?.status;
  const data = error?.response?.data;
  const code = typeof data?.code === 'string'
    ? data.code
    : (typeof data?.error === 'string' && CODE_FALLBACK_KEYS[data.error] ? data.error : undefined);
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
          purgeTime: typeof data.purgeTime === 'string' ? data.purgeTime.substring(0, 5) : null,
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
   * Taslağı güncelle — yalnızca oluşturan. Taslak bu arada silinmişse `status: 404` döner.
   * @param {number} id
   * @param {Object} body - { label?, payload, schemaVersion }
   */
  updateDraft: async (id, { label, payload, schemaVersion }) => {
    try {
      const response = await axiosInstance.put(`/drafts/${id}`, { label, payload, schemaVersion });
      notifyChanged(response.data?.module);
      return { success: true, data: response.data };
    } catch (error) {
      return failure('updateDraft', error, 'api.drafts.saveError');
    }
  },

  /**
   * Taslağı sil (oluşturan ya da BROKER_ADMIN)
   * @param {number} id
   */
  deleteDraft: async (id) => {
    try {
      await axiosInstance.delete(`/drafts/${id}`);
      notifyChanged();
      return { success: true, data: null };
    } catch (error) {
      return failure('deleteDraft', error, 'api.drafts.deleteError');
    }
  },

  /**
   * Hatırlatma bildirimi yalnızca taslak id'si taşır; taslağın hangi modülde olduğunu bulur.
   * Tek modülde taslak varsa listeye bakmadan onu, birden fazlaysa listelerde id'yi arar.
   * Taslak artık yoksa taslağı olan ilk modülü, hiç taslak yoksa null döner.
   * @param {number|string} id
   * @returns data: 'TRANSACTION' | 'WAREHOUSE' | 'CARGO' | null
   */
  locateDraft: async (id) => {
    const summary = await draftService.getSummary();
    if (!summary.success) return summary;
    const withDrafts = Object.values(DRAFT_MODULES).filter((module) => summary.data[module] > 0);
    if (withDrafts.length <= 1) return { success: true, data: withDrafts[0] || null };

    const lists = await Promise.all(withDrafts.map((module) => draftService.listDrafts(module)));
    const index = lists.findIndex((list) => list.success && list.data.some((draft) => String(draft.id) === String(id)));
    return { success: true, data: index >= 0 ? withDrafts[index] : withDrafts[0] };
  },
};

export default draftService;
