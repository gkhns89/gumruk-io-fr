// Tek seferlik kurye gönderileri için ortak yardımcılar (gümrük firması sayfası, müşteri sayfası, dashboard kartı).
// plannedAt vb. UTC ISO metinleri; gösterim tarayıcının saat diliminde ve seçili dilin biçiminde.
import { t, getCurrentLocale } from '../../locales';
import { getCourierVehicleType, isInHouseCourier } from '../../utils/constants';

export const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const pad = (value) => String(value).padStart(2, '0');

/** "14:00" */
export const formatShipmentClock = (date) =>
  date.toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit' });

/** "15.09.2026 Sal" — yıl dahil, liste satırının ikinci satırı için */
export const formatShipmentDate = (date) =>
  date.toLocaleDateString(getCurrentLocale(), { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' });

/**
 * "Bugün 14:00" / "Yarın 09:00" / "Dün 16:20" / diğer günler "15.09 Sal 09:00".
 * Ekleri (…'te, …'da) üretmiyoruz: ünlü uyumu yer tutucuyla doğru kurulamıyor.
 */
export const formatRelativeDateTime = (value, now = new Date()) => {
  const date = toDate(value);
  if (!date) return '';
  const time = formatShipmentClock(date);
  const day = startOfDay(date).getTime();
  if (day === startOfDay(now).getTime()) return t('courierShipments.time.today', { time });
  if (day === addDays(now, 1).getTime()) return t('courierShipments.time.tomorrow', { time });
  if (day === addDays(now, -1).getTime()) return t('courierShipments.time.yesterday', { time });
  const datePart = date.toLocaleDateString(getCurrentLocale(), { day: '2-digit', month: '2-digit', weekday: 'short' });
  return t('courierShipments.time.other', { date: datePart, time });
};

/** Detay için tam tarih-saat */
export const formatFullDateTime = (value) => {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleString(getCurrentLocale(), {
    day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
};

/** <input type="date"> / <input type="time"> değerleri (yerel saat) */
export const toDateInputValue = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const toTimeInputValue = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Yeni gönderi varsayılanı: yarın 09:00 */
export const defaultPlannedInputs = () => ({ date: toDateInputValue(addDays(new Date(), 1)), time: '09:00' });

/** Yerel tarih + saat girdilerinden UTC ISO metni; geçersizse null */
export const plannedInputsToIso = (date, time) => {
  if (!date || !time) return null;
  const local = new Date(`${date}T${time}`);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
};

export const companyLabel = (company) => company?.shortName || company?.name || '';

export const courierIconOf = (courier) => (isInHouseCourier(courier)
  ? (getCourierVehicleType(courier.vehicleType)?.icon || 'local_shipping')
  : 'two_wheeler');

const plannedTime = (shipment) => toDate(shipment.plannedAt)?.getTime() ?? 0;
const closedTime = (shipment) =>
  toDate(shipment.completedAt || shipment.cancelledAt || shipment.updatedAt || shipment.plannedAt)?.getTime() ?? 0;

/** Planlanan saati geçmiş ama henüz yola çıkmamış */
export const isOverdueShipment = (shipment, now = new Date()) =>
  shipment.status === 'PLANNED' && plannedTime(shipment) < now.getTime();

// Sekmeler. Gümrük firması "Bugün"ü de görür: bugüne planlananların hepsi + önceki günlerden kalan açık gönderiler.
export const BROKER_TABS = ['today', 'upcoming', 'inTransit', 'completed', 'cancelled'];
export const CLIENT_TABS = ['upcoming', 'inTransit', 'completed', 'cancelled'];

/**
 * Gönderileri sekmelere ayırır. `today` sekmesi yoksa `upcoming` tüm PLANNED gönderileri alır,
 * varsa yalnızca yarından itibaren planlananları.
 */
export const groupShipments = (shipments, tabs, now = new Date()) => {
  const todayStart = startOfDay(now).getTime();
  const tomorrowStart = addDays(now, 1).getTime();
  const groups = Object.fromEntries(tabs.map((tab) => [tab, []]));
  const hasToday = Boolean(groups.today);

  shipments.forEach((shipment) => {
    const planned = plannedTime(shipment);
    const isOpen = shipment.status === 'PLANNED' || shipment.status === 'IN_TRANSIT';

    if (hasToday && ((planned >= todayStart && planned < tomorrowStart) || (isOpen && planned < todayStart))) {
      groups.today.push(shipment);
    }
    if (shipment.status === 'PLANNED' && groups.upcoming && (!hasToday || planned >= tomorrowStart)) {
      groups.upcoming.push(shipment);
    }
    if (shipment.status === 'IN_TRANSIT' && groups.inTransit) groups.inTransit.push(shipment);
    if (shipment.status === 'DELIVERED' && groups.completed) groups.completed.push(shipment);
    if (shipment.status === 'CANCELLED' && groups.cancelled) groups.cancelled.push(shipment);
  });

  const byPlanned = (a, b) => plannedTime(a) - plannedTime(b);
  const byClosedDesc = (a, b) => closedTime(b) - closedTime(a);
  ['today', 'upcoming', 'inTransit'].forEach((tab) => groups[tab]?.sort(byPlanned));
  ['completed', 'cancelled'].forEach((tab) => groups[tab]?.sort(byClosedDesc));
  return groups;
};
