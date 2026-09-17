import { GATE_OPTIONS } from '../../utils/constants';
import { toUpperCase } from '../../utils/textUtils';
import { mergeDraftFields, draftText } from '../../utils/drafts';
import { idValue, draftDateText, draftNumberText, draftBooleanText } from '../../utils/draftDiff';
import { t } from '../../locales';

/**
 * Antrepo Takip formunun taslak tarafı (todo 16, aşama 3). `EditWarehouseModal` hem formu doldururken hem
 * kaydederken buradan geçer; bekleyen değişikliğin karşılaştırması ve "Uygula"sı da aynı işlevleri kullanır.
 *
 * Bu formun özelliği: gönderici, antrepo, nakliyeci ve alıcı alanları `formData`da değil arama kutularının metninde
 * tutuluyor ve kaydederken oradan alınıyor. Taslak da, karşılaştırma da aynı "etkin değer" hesabından geçmeli,
 * yoksa büyük harfe çevirme bile olmayan bir fark gösterir.
 */

export const getRepName = (r) =>
  (r ? (r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : r.username || r.email || '') : '');

/** Kaydı form alanlarına çevirir (modalın açılış değeri). */
export const createWarehouseFormData = (declaration) => ({
  brokerCompanyId: declaration?.brokerCompany?.id || '',
  clientCompanyId: declaration?.clientCompany?.id || '',
  fileNo: declaration?.fileNo || '',
  declarationNo: declaration?.declarationNo || '',
  recipientName: declaration?.recipientName || '',
  senderName: declaration?.senderName || '',
  warehouse: declaration?.warehouse || '',
  customsId: declaration?.customs?.id || '',
  containerAmount: declaration?.containerAmount || '',
  weight: declaration?.weight || '',
  carrierName: declaration?.carrierName || '',
  representativeId: declaration?.representative?.id || '',
  gate: declaration?.gate || '',
  declarationDate: declaration?.declarationDate || '',
  stampPaymentDate: declaration?.stampPaymentDate || '',
  protocol: declaration?.protocol || false,
});

/** Arama kutularının metnini alanlara katan "etkin" form: kaydedilen de, karşılaştırılan da budur. */
export const warehouseEffectiveFormData = (formData, searches = {}) => ({
  ...formData,
  recipientName: (formData.recipientName || '').trim() || toUpperCase(searches.clientSearch || ''),
  senderName: toUpperCase((searches.senderSearch || '').trim()),
  warehouse: toUpperCase((searches.whSearch || '').trim()),
  carrierName: toUpperCase((searches.carrierSearch || '').trim()),
});

/** Güncelleme ucunun gövdesi */
export const buildWarehouseUpdatePayload = (formData, searches = {}) => {
  const effective = warehouseEffectiveFormData(formData, searches);
  return {
    brokerCompanyId: Number(effective.brokerCompanyId),
    clientCompanyId: Number(effective.clientCompanyId),
    fileNo: (effective.fileNo || '').trim(),
    declarationNo: (effective.declarationNo || '').trim(),
    recipientName: effective.recipientName,
    senderName: effective.senderName,
    warehouse: effective.warehouse,
    customsId: Number(effective.customsId),
    containerAmount: Number(effective.containerAmount),
    weight: parseFloat(effective.weight),
    carrierName: effective.carrierName,
    representativeId: Number(effective.representativeId),
    gate: effective.gate,
    declarationDate: effective.declarationDate,
    stampPaymentDate: effective.stampPaymentDate || null,
    protocol: effective.protocol,
  };
};

// ==================== BEKLEYEN DEĞİŞİKLİK ====================

const gateText = (value) => {
  const option = GATE_OPTIONS.find((item) => item.value === value);
  return option ? `${option.emoji} ${t(option.labelKey)}` : value || '';
};

/** Karşılaştırma alanları; etiketler formdakilerin aynısı. */
export const warehouseDraftFields = () => [
  { key: 'brokerCompanyId', label: t('warehouse.form.brokerLabel') },
  { key: 'clientCompanyId', label: t('warehouse.form.clientLabel') },
  { key: 'recipientName', label: t('warehouse.form.recipientName') },
  { key: 'fileNo', label: t('transactions.detail.warehouseFileNo') },
  { key: 'declarationNo', label: t('transactions.detail.warehouseDeclarationNo') },
  { key: 'gate', label: t('transaction.gate'), format: gateText },
  { key: 'senderName', label: t('transaction.sender') },
  { key: 'carrierName', label: t('cargo.fields.carrierName') },
  { key: 'warehouse', label: t('transaction.customsWarehouse') },
  { key: 'customsId', label: t('transaction.customsName') },
  { key: 'containerAmount', label: t('transaction.containerAmount'), format: draftNumberText },
  { key: 'weight', label: t('transaction.weight'), format: draftNumberText },
  { key: 'representativeId', label: t('warehouse.common.representative') },
  { key: 'declarationDate', label: t('warehouse.common.declarationDate'), format: draftDateText },
  { key: 'stampPaymentDate', label: t('warehouse.common.stampPaymentDate'), format: draftDateText },
  { key: 'protocol', label: t('warehouse.common.protocol'), format: draftBooleanText },
];

const withNames = (formData, names) => ({
  ...formData,
  brokerCompanyId: idValue(formData.brokerCompanyId, names.broker),
  clientCompanyId: idValue(formData.clientCompanyId, names.client),
  customsId: idValue(formData.customsId, names.customs),
  representativeId: idValue(formData.representativeId, names.representative),
});

/** Kaydın şimdiki hâli, karşılaştırma için */
export const warehouseRecordToFields = (declaration) => {
  const formData = createWarehouseFormData(declaration);
  return withNames(warehouseEffectiveFormData(formData, recordSearches(declaration)), {
    broker: declaration?.brokerCompany?.name,
    client: declaration?.clientCompany?.name,
    customs: declaration?.customs?.customsShortName,
    representative: getRepName(declaration?.representative),
  });
};

/** Modal açılışındaki arama kutuları — kaydın kendi değerleri */
export const recordSearches = (declaration) => ({
  clientSearch: declaration?.clientCompany?.name || '',
  senderSearch: declaration?.senderName || '',
  whSearch: declaration?.warehouse || '',
  carrierSearch: declaration?.carrierName || '',
});

const payloadSearches = (payloadLike) => ({
  clientSearch: draftText(payloadLike, 'clientSearch'),
  senderSearch: draftText(payloadLike, 'senderSearch'),
  whSearch: draftText(payloadLike, 'whSearch'),
  carrierSearch: draftText(payloadLike, 'carrierSearch'),
});

/** Taslaktaki form alanları (uygulanacak değerler) */
export const warehousePayloadToFormData = (payloadLike, declaration) =>
  mergeDraftFields(createWarehouseFormData(declaration), payloadLike?.formData);

/**
 * Kaydın şimdiki hâlinin payload karşılığı. İki yerde kullanılır ve aynı olmak zorundadır: taslak kaydedilirken
 * `payload.base`, taslak uygulanırken farkın üstüne yazılacağı taban. Bu formda gönderici, antrepo, nakliyeci ve
 * alıcı arama kutularının metninden geldiği için onlar da buradadır — yoksa fark hesabı bu alanları ıskalardı.
 */
export const warehouseRecordToPayload = (declaration) => ({
  formData: createWarehouseFormData(declaration),
  brokerSearch: declaration?.brokerCompany?.name || '',
  customsSearch: declaration?.customs?.customsShortName || '',
  repSearch: getRepName(declaration?.representative),
  ...recordSearches(declaration),
});

/** Taslaktaki (ya da taslak alındığı andaki) hâli, karşılaştırma için */
export const warehousePayloadToFields = (payloadLike, declaration) => {
  const formData = warehousePayloadToFormData(payloadLike, declaration);
  const searches = payloadSearches(payloadLike);
  const same = (value, recordValue) => String(value) === String(recordValue || '');
  return withNames(warehouseEffectiveFormData(formData, searches), {
    broker: same(formData.brokerCompanyId, declaration?.brokerCompany?.id)
      ? declaration?.brokerCompany?.name : draftText(payloadLike, 'brokerSearch'),
    client: same(formData.clientCompanyId, declaration?.clientCompany?.id)
      ? declaration?.clientCompany?.name : searches.clientSearch,
    customs: same(formData.customsId, declaration?.customs?.id)
      ? declaration?.customs?.customsShortName : draftText(payloadLike, 'customsSearch'),
    representative: same(formData.representativeId, declaration?.representative?.id)
      ? getRepName(declaration?.representative) : draftText(payloadLike, 'repSearch'),
  });
};

/** "Uygula": taslaktaki değerlerle normal güncelleme gövdesi */
export const warehouseDraftToPayload = (payloadLike, declaration) =>
  buildWarehouseUpdatePayload(warehousePayloadToFormData(payloadLike, declaration), payloadSearches(payloadLike));
