import { VEHICLE_TYPES, CURRENCY_OPTIONS, PAYMENT_STATUS_OPTIONS, DOCUMENT_DELIVERY_TYPES } from '../../utils/constants';
import { transformFormData, CARGO_UPPERCASE_FIELDS } from '../../utils/textUtils';
import { mergeDraftFields, draftText } from '../../utils/drafts';
import { idValue, draftDateText, draftNumberText } from '../../utils/draftDiff';
import { t } from '../../locales';

/**
 * Yük Takip formunun taslak tarafı (todo 16, aşama 3). `EditCargoModal` hem formu doldururken hem kaydederken
 * buradan geçer; bekleyen değişikliğin karşılaştırması ve "Uygula"sı da aynı işlevleri kullanır.
 *
 * G-Radar önizlemesi ve takip kimliği taslağa alınmaz (kredi ve süre bağlı, aşama 2 kararı), bu yüzden
 * karşılaştırmada da yer almaz.
 */

/** Kaydı form alanlarına çevirir (modalın açılış değeri). */
export const createCargoFormData = (cargo) => ({
  status: cargo?.status || 'TRACKING',
  vehicleType: cargo?.vehicleType || '',
  clientCompanyId: cargo?.clientCompany?.id || '',
  senderCompany: cargo?.senderCompany || '',
  containerCount: cargo?.containerCount || '',
  weightKg: cargo?.weightKg || '',
  lokalAmount: cargo?.lokalAmount || '',
  lokalCurrency: cargo?.lokalCurrency || 'TRY',
  depositoAmount: cargo?.depositoAmount || '',
  depositoCurrency: cargo?.depositoCurrency || 'TRY',
  ordinoAmount: cargo?.ordinoAmount || '',
  ordinoCurrency: cargo?.ordinoCurrency || 'TRY',
  paymentStatus: cargo?.paymentStatus || 'NO_PAYMENT',
  carrierName: cargo?.carrierName || '',
  billOfLading: cargo?.billOfLading || '',
  licensePlate: cargo?.licensePlate || '',
  consignmentNumber: cargo?.consignmentNumber || '',
  containerNumbers: cargo?.containerNumbers || [],
  transportInfo: cargo?.transportInfo || '',
  documentDeliveryType: cargo?.documentDeliveryType || null,
  documentReceiver: cargo?.documentReceiver || '',
  documentDeliveryDate: cargo?.documentDeliveryDate || '',
  estimatedArrivalDate: cargo?.estimatedArrivalDate || '',
  cargoArrivalDate: cargo?.cargoArrivalDate || '',
});

/**
 * Güncelleme ucunun gövdesi. Araç tipi ve müşteri yalnızca yöneticinin düzenleyebildiği alanlar; yetkisi yoksa
 * gövdeye hiç konmaz (sunucu da kontrol ediyor).
 */
export const buildCargoUpdatePayload = (formData, { canEditVehicleType = false, canEditClientCompany = false } = {}) => {
  const transformed = transformFormData(formData, CARGO_UPPERCASE_FIELDS);
  return {
    ...transformed,
    containerCount: transformed.containerCount ? parseInt(transformed.containerCount, 10) : null,
    weightKg: transformed.weightKg ? parseFloat(transformed.weightKg) : null,
    // costsAmount artık bir form alanı değil (lokal/depozito/ordino üçlüsü geldi) ama gövdede kalıyor: bugünkü
    // davranış bu ve sessizce değiştirmek kaydın masraf alanını etkileyebilir.
    costsAmount: transformed.costsAmount ? parseFloat(transformed.costsAmount) : null,
    ...(canEditVehicleType && { vehicleType: transformed.vehicleType }),
    ...(canEditClientCompany && { clientCompanyId: transformed.clientCompanyId }),
  };
};

// ==================== BEKLEYEN DEĞİŞİKLİK ====================

const optionText = (options, value, getLabel) => {
  const option = options.find((item) => item.value === value);
  return option ? getLabel(option) : value || '';
};

const vehicleTypeText = (value) => optionText(VEHICLE_TYPES, value, (option) => option.displayName);
const currencyText = (value) => optionText(CURRENCY_OPTIONS, value, (option) => `${option.symbol} ${option.label}`);
const paymentStatusText = (value) => optionText(PAYMENT_STATUS_OPTIONS, value, (option) => option.label);
const deliveryTypeText = (value) => optionText(DOCUMENT_DELIVERY_TYPES, value, (option) => option.label);

/**
 * Karşılaştırma alanları; etiketler formdakilerin aynısı. Para birimi seçicilerinin kendi etiketi yok, tutarın
 * etiketini paylaşıyorlar — karşılaştırmada ayırt edilsin diye "(para birimi)" eklenir.
 * `status` formda düzenlenmiyor ama gövdeyle gidiyor; taslakta da kaydın kendi değeriyle kalır, bu yüzden listede yok.
 */
export const cargoDraftFields = () => [
  { key: 'vehicleType', label: t('cargo.fields.vehicleType'), format: vehicleTypeText },
  { key: 'clientCompanyId', label: t('cargo.fields.clientCompany') },
  { key: 'senderCompany', label: t('cargo.fields.senderCompany') },
  { key: 'carrierName', label: t('cargo.fields.carrierName') },
  { key: 'containerCount', label: t('cargo.fields.containerCount'), format: draftNumberText },
  { key: 'weightKg', label: t('cargo.fields.weight'), format: draftNumberText },
  { key: 'lokalAmount', label: t('cargo.fields.lokalCosts'), format: draftNumberText },
  { key: 'lokalCurrency', label: `${t('cargo.fields.lokalCosts')} (${t('drafts.pending.currency')})`, format: currencyText },
  { key: 'depositoAmount', label: t('cargo.fields.depositoCosts'), format: draftNumberText },
  { key: 'depositoCurrency', label: `${t('cargo.fields.depositoCosts')} (${t('drafts.pending.currency')})`, format: currencyText },
  { key: 'ordinoAmount', label: t('cargo.fields.ordinoCosts'), format: draftNumberText },
  { key: 'ordinoCurrency', label: `${t('cargo.fields.ordinoCosts')} (${t('drafts.pending.currency')})`, format: currencyText },
  { key: 'licensePlate', label: t('cargo.fields.licensePlate') },
  { key: 'consignmentNumber', label: t('cargo.fields.consignmentNumber') },
  { key: 'billOfLading', label: t('cargoTracking.common.billOfLading') },
  { key: 'containerNumbers', label: t('cargo.fields.containerNumbers') },
  { key: 'estimatedArrivalDate', label: t('cargo.fields.estimatedArrivalDate'), format: draftDateText },
  { key: 'transportInfo', label: t('cargo.fields.transportInfo') },
  { key: 'paymentStatus', label: t('cargo.fields.paymentStatus'), format: paymentStatusText },
  { key: 'cargoArrivalDate', label: t('cargo.fields.cargoArrivalDate'), format: draftDateText },
  { key: 'documentDeliveryType', label: t('cargoTracking.form.documentDeliveryType'), format: deliveryTypeText },
  { key: 'documentReceiver', label: t('cargoTracking.form.documentsReceivedBy') },
  { key: 'documentDeliveryDate', label: t('cargo.fields.documentDeliveryDate'), format: draftDateText },
];

const withNames = (formData, clientName) => ({
  ...formData,
  clientCompanyId: idValue(formData.clientCompanyId, clientName),
});

/** Kaydın şimdiki hâli, karşılaştırma için */
export const cargoRecordToFields = (cargo) => withNames(createCargoFormData(cargo),
  cargo?.clientCompany?.shortName || cargo?.clientCompany?.name);

/** Taslaktaki form alanları (uygulanacak değerler) */
export const cargoPayloadToFormData = (payloadLike, cargo) =>
  mergeDraftFields(createCargoFormData(cargo), payloadLike?.formData);

/**
 * Kaydın şimdiki hâlinin payload karşılığı. İki yerde kullanılır ve aynı olmak zorundadır: taslak kaydedilirken
 * `payload.base`, taslak uygulanırken farkın üstüne yazılacağı taban. G-Radar önizlemesi ve takip kimliği burada
 * da yok; `createCargoFormData` bu alanları taşımadığı için fark hesabına hiç girmezler.
 */
export const cargoRecordToPayload = (cargo) => ({
  formData: createCargoFormData(cargo),
  clientSearchTerm: cargo?.clientCompany?.name || '',
  senderSearchTerm: cargo?.senderCompany || '',
  carrierSearchTerm: cargo?.carrierName || '',
});

/** Taslaktaki (ya da taslak alındığı andaki) hâli, karşılaştırma için */
export const cargoPayloadToFields = (payloadLike, cargo) => {
  const formData = cargoPayloadToFormData(payloadLike, cargo);
  const sameClient = String(formData.clientCompanyId) === String(cargo?.clientCompany?.id || '');
  return withNames(formData, sameClient
    ? (cargo?.clientCompany?.shortName || cargo?.clientCompany?.name)
    : draftText(payloadLike, 'clientSearchTerm'));
};
