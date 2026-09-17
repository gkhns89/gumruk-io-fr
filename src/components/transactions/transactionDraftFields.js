import { GATE_OPTIONS } from '../../utils/constants';
import { transformFormData, TRANSACTION_UPPERCASE_FIELDS } from '../../utils/textUtils';
import { mergeDraftFields, draftText } from '../../utils/drafts';
import { idValue, draftDateText, draftNumberText } from '../../utils/draftDiff';
import { t, getCurrentLocale } from '../../locales';

/**
 * İşlem Takip formunun taslak tarafı (todo 16, aşama 3).
 *
 * `EditTransactionModal` hem formu doldururken hem kaydederken buradaki işlevleri kullanır; bekleyen değişikliğin
 * karşılaştırması ve "Uygula" işlemi de aynı işlevlerden geçer. Tek kaynak olmasının sebebi budur: taslağın uyguladığı
 * gövde ile modalın gönderdiği gövde asla ayrışamaz.
 */

/** Kaydı form alanlarına çevirir (modalın açılış değeri). */
export const createTransactionFormData = (transaction) => ({
  brokerCompanyId: transaction?.brokerCompany?.id || '',
  clientCompanyId: transaction?.clientCompany?.id || '',
  fileNo: transaction?.fileNo || '',
  recipientName: transaction?.recipientName || '',
  customsId: transaction?.customs?.id || '',
  customsWarehouse: transaction?.customsWarehouse || '',
  containerAmount: transaction?.containerAmount || '',
  gate: transaction?.gate || '',
  weight: transaction?.weight || '',
  tax: transaction?.tax || '',
  guaranteeAmount: transaction?.guaranteeAmount || '',
  senderName: transaction?.senderName || '',
  warehouseArrivalDate: transaction?.warehouseArrivalDate || '',
  registrationDate: transaction?.registrationDate || '',
  declarationNumber: transaction?.declarationNumber || '',
  lineClosureDate: transaction?.lineClosureDate || '',
  withdrawalDate: transaction?.withdrawalDate || '',
  description: transaction?.description || '',
  delayReasons: parseDelayReasons(transaction?.userDelayNote),
});

const EMPTY_DELAY_REASONS = { arrivalToRegistration: '', registrationToClosure: '', closureToWithdrawal: '' };

/** Gecikme nedenleri kayıtta JSON metni olarak duruyor; bozuksa boş kabul edilir (form açılmalı). */
export function parseDelayReasons(userDelayNote) {
  if (!userDelayNote) return { ...EMPTY_DELAY_REASONS };
  try {
    const parsed = JSON.parse(userDelayNote);
    return parsed && typeof parsed === 'object' ? { ...EMPTY_DELAY_REASONS, ...parsed } : { ...EMPTY_DELAY_REASONS };
  } catch {
    return { ...EMPTY_DELAY_REASONS };
  }
}

/** Güncelleme ucunun gövdesi: büyük harf alanları, boş gecikme nedenlerinin atılması, boş metin → null, sayılar. */
export const buildTransactionUpdatePayload = (formData, locale = getCurrentLocale()) => {
  const transformed = transformFormData(formData, TRANSACTION_UPPERCASE_FIELDS, locale);

  const delayReasons = Object.fromEntries(
    Object.entries(transformed.delayReasons || {}).filter(([, value]) => value && value.trim() !== ''),
  );
  transformed.delayReasons = Object.keys(delayReasons).length > 0 ? delayReasons : undefined;

  // Boş metin null olur: alanı temizlemenin yolu bu
  const cleaned = Object.fromEntries(
    Object.entries(transformed).map(([key, value]) => [key, value === '' ? null : value]),
  );

  ['weight', 'tax', 'guaranteeAmount'].forEach((key) => {
    if (cleaned[key] !== null && cleaned[key] !== undefined) cleaned[key] = parseFloat(cleaned[key]);
  });
  if (cleaned.containerAmount !== null && cleaned.containerAmount !== undefined) {
    cleaned.containerAmount = parseInt(cleaned.containerAmount, 10);
  }
  return cleaned;
};

// ==================== BEKLEYEN DEĞİŞİKLİK ====================

const gateText = (value) => {
  const option = GATE_OPTIONS.find((item) => item.value === value);
  return option ? `${option.emoji} ${t(option.labelKey)}` : value || '';
};

/**
 * Karşılaştırma alanları. Etiketler formdakilerin aynısı. `recipientName` burada yok: formda ne alanı ne etiketi var,
 * müşteri seçilince türetiliyor.
 */
export const transactionDraftFields = () => [
  { key: 'brokerCompanyId', label: t('transaction.brokerCompany') },
  { key: 'clientCompanyId', label: t('transaction.clientCompany') },
  { key: 'fileNo', label: t('transaction.fileNo') },
  { key: 'customsId', label: t('transaction.customsName') },
  { key: 'customsWarehouse', label: t('transaction.customsWarehouse') },
  { key: 'containerAmount', label: t('transaction.containerAmount'), format: draftNumberText },
  { key: 'weight', label: t('transaction.weight'), format: draftNumberText },
  { key: 'tax', label: t('transaction.tax'), format: draftNumberText },
  { key: 'guaranteeAmount', label: t('transaction.guaranteeAmount'), format: draftNumberText },
  { key: 'senderName', label: t('transaction.sender') },
  { key: 'declarationNumber', label: t('transaction.declarationNumber') },
  { key: 'gate', label: t('transaction.gate'), format: gateText },
  { key: 'warehouseArrivalDate', label: t('transaction.warehouseArrivalDate'), format: draftDateText },
  { key: 'registrationDate', label: t('transaction.registrationDate'), format: draftDateText },
  { key: 'lineClosureDate', label: t('transaction.lineClosureDate'), format: draftDateText },
  { key: 'withdrawalDate', label: t('transaction.withdrawalDate'), format: draftDateText },
  { key: 'delayReasons.arrivalToRegistration', label: t('transactions.delay.arrivalToRegistration') },
  { key: 'delayReasons.registrationToClosure', label: t('transactions.delay.registrationToClosure') },
  { key: 'delayReasons.closureToWithdrawal', label: t('transactions.delay.closureToWithdrawal') },
  { key: 'description', label: t('transaction.description') },
];

/** Kimlik alanlarının karşılaştırmada kimliğe, ekranda ada göre çalışması için. */
const withNames = (formData, names) => ({
  ...formData,
  brokerCompanyId: idValue(formData.brokerCompanyId, names.broker),
  clientCompanyId: idValue(formData.clientCompanyId, names.client),
  customsId: idValue(formData.customsId, names.customs),
});

/** Kaydın şimdiki hâli, karşılaştırma için */
export const transactionRecordToFields = (transaction) => withNames(createTransactionFormData(transaction), {
  broker: transaction?.brokerCompany?.name,
  client: transaction?.clientCompany?.name,
  customs: transaction?.customs?.customsShortName,
});

/** Taslaktaki (ya da taslak alındığı andaki) hâli. Taslakta bulunmayan alanlar kaydınkiyle doldurulur. */
export const transactionPayloadToFields = (payloadLike, transaction) => {
  const formData = transactionPayloadToFormData(payloadLike, transaction);
  const sameBroker = String(formData.brokerCompanyId) === String(transaction?.brokerCompany?.id || '');
  const sameClient = String(formData.clientCompanyId) === String(transaction?.clientCompany?.id || '');
  const sameCustoms = String(formData.customsId) === String(transaction?.customs?.id || '');
  return withNames(formData, {
    broker: sameBroker ? transaction?.brokerCompany?.name : draftText(payloadLike, 'brokerSearchTerm'),
    client: sameClient ? transaction?.clientCompany?.name : draftText(payloadLike, 'clientSearchTerm'),
    customs: sameCustoms ? transaction?.customs?.customsShortName : draftText(payloadLike, 'customsSearchTerm'),
  });
};

/** Taslaktaki form alanları (uygulanacak değerler) */
export const transactionPayloadToFormData = (payloadLike, transaction) =>
  mergeDraftFields(createTransactionFormData(transaction), payloadLike?.formData);

/**
 * Kaydın şimdiki hâlinin payload karşılığı. İki yerde kullanılır ve aynı olmak zorundadır:
 *  - düzenleme modalı taslağı kaydederken `payload.base` (taslak alındığı andaki form),
 *  - taslak uygulanırken farkın üstüne yazılacağı taban (kaydın şimdiki hâli).
 * Sayı alanlarının görüntü metinleri (displayWeight...) burada yok: yalnızca ekranda görünen, gövdeye girmeyen
 * değerler oldukları için taslaktakiler kullanılır.
 */
export const transactionRecordToPayload = (transaction) => ({
  formData: createTransactionFormData(transaction),
  brokerSearchTerm: transaction?.brokerCompany?.name || '',
  clientSearchTerm: transaction?.clientCompany?.name || '',
  customsSearchTerm: transaction?.customs?.customsShortName || '',
  senderSearchTerm: transaction?.senderName || '',
  warehouseSearchTerm: transaction?.customsWarehouse || '',
});
