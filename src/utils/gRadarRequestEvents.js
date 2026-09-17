/**
 * Bildirim merkezi ile başlıktaki G-Radar talep zilini bağlayan pencere olayları.
 *
 * Zil listeyi 10 dakikada bir yeniliyor, bildirim merkezi ise çok daha sık bakıyor: talep bildirimi geldiği hâlde zil
 * eski listeyi gösteriyordu ve yönetici sayfayı yenilemeden talebi göremiyordu. Bildirim merkezi yeni bildirim
 * gördüğünde zile haber veriyor; talep bildirimine tıklandığında da zil güncel listeyle açılıyor.
 */
export const GRADAR_REQUESTS_CHANGED_EVENT = 'gRadarRequestsChanged';
export const OPEN_GRADAR_REQUESTS_EVENT = 'openGRadarRequests';

/** Yeni bildirim geldi: zil bekleyen talepleri yeniden çeksin. */
export function notifyGRadarRequestsChanged() {
  window.dispatchEvent(new CustomEvent(GRADAR_REQUESTS_CHANGED_EVENT));
}

/** Talep bildirimine tıklandı: zil açılsın, liste tazelensin, ilgili talep vurgulansın. */
export function openGRadarRequests(requestId = null) {
  window.dispatchEvent(new CustomEvent(OPEN_GRADAR_REQUESTS_EVENT, { detail: { requestId } }));
}
