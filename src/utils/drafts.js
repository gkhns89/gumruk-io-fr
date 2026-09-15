import { DRAFT_SCHEMA_VERSION } from '../api/draftService';
import { FEATURE_FLAGS } from './featureFlags';
import { t, getCurrentLocale } from '../locales';

/**
 * Taslak arayüzünün ortak yardımcıları (DRAFTS bayrağı). Servis: api/draftService.js.
 */

// Taslak arayüzünü gören roller. SUPER_ADMIN ve CLIENT_USER hiçbir taslak arayüzü görmez.
const DRAFT_ROLES = ['BROKER_ADMIN', 'BROKER_USER'];

// Bildirimden ya da menüden taslak listesini açarken modülün sayfası
export const DRAFT_MODULE_PATHS = {
  TRANSACTION: '/transactions',
  WAREHOUSE: '/warehouse',
  CARGO: '/cargo',
};

// Silme saati firma ayarında Europe/Istanbul saatiyle tutulur; gösterilen saatler aynı saat diliminde olmalı.
const COMPANY_TIME_ZONE = 'Europe/Istanbul';

const LABEL_MAX_LENGTH = 120;

/** Kullanıcı taslak arayüzünü görebilir mi? `hasFeature` → useFeatureFlags() */
export const canUseDrafts = (user, hasFeature) =>
  DRAFT_ROLES.includes(user?.globalRole) && typeof hasFeature === 'function' && hasFeature(FEATURE_FLAGS.DRAFTS);

const toDate = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "21:00" — taslağın silineceği saat gibi */
export const formatDraftClock = (iso) => {
  const date = toDate(iso);
  if (!date) return '';
  return date.toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit', timeZone: COMPANY_TIME_ZONE });
};

/** "15 Eyl 14:32" */
export const formatDraftDateTime = (iso) => {
  const date = toDate(iso);
  if (!date) return '';
  return date.toLocaleString(getCurrentLocale(), {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: COMPANY_TIME_ZONE,
  });
};

/**
 * Taslak etiketi: dolu parçalar " · " ile birleşir (dosya no, müşteri adı, konşimento...). Hiçbiri yoksa
 * "İşlem Takip taslağı · 14:32".
 */
export const buildDraftLabel = (parts, module) => {
  const label = parts
    .map((part) => (typeof part === 'string' ? part.trim() : part != null ? String(part) : ''))
    .filter(Boolean)
    .join(' · ');
  if (label) return label.length > LABEL_MAX_LENGTH ? `${label.substring(0, LABEL_MAX_LENGTH - 1)}…` : label;
  const time = new Date().toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit' });
  return t('drafts.fallbackLabel', { module: t(`drafts.modules.${module}`), time });
};

/** Listede gösterilecek etiket */
export const draftDisplayLabel = (draft) => (draft?.label && draft.label.trim()) || t('drafts.untitled');

/**
 * Geri yüklenebilir payload: modül ve şema sürümü tutuyorsa nesne, yoksa null.
 * Başkasının taslağı (mine=false) açılmaz.
 */
export const readDraftPayload = (draft, module) => {
  if (!draft || draft.mine === false || draft.module !== module) return null;
  if (Number(draft.schemaVersion) !== DRAFT_SCHEMA_VERSION) return null;
  const { payload } = draft;
  return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Taslaktaki form alanlarını varsayılanların üstüne yazar. Yalnızca varsayılanda bulunan anahtarlar alınır, böylece
 * sonradan eklenen alanlar varsayılanıyla gelir ve eski/bozuk değerler state'e sızmaz:
 *  - varsayılan dizi → taslaktaki değer de dizi olmalı
 *  - varsayılan düz nesne → iç içe aynı kural
 *  - null/undefined taslak değeri → varsayılan (varsayılanı null olan alanlar hariç)
 */
export const mergeDraftFields = (defaults, saved) => {
  if (!isPlainObject(saved)) return defaults;
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const value = saved[key];
    if (value === undefined) return [key, fallback];
    if (Array.isArray(fallback)) return [key, Array.isArray(value) ? value : fallback];
    if (isPlainObject(fallback)) return [key, mergeDraftFields(fallback, value)];
    if (fallback === null) return [key, isPlainObject(value) || Array.isArray(value) ? null : value];
    if (value === null || isPlainObject(value) || Array.isArray(value)) return [key, fallback];
    return [key, value];
  }));
};

/** Taslaktaki metin alanı (arama terimi, not); metin değilse boş */
export const draftText = (payload, key, fallback = '') =>
  (payload && typeof payload[key] === 'string' ? payload[key] : fallback);
