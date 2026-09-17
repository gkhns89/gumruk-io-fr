import { confirmDialog } from './confirmDialog';
import { showWarning } from './toastUtils';
import { t } from '../locales';

/**
 * "G-Radar kredisi yetmedi" yönlendirmesi. Sunucu kredi yetersizliğini sabit bir kodla bildirir:
 * hata zarfında `code` (fetch, önizleme), onay yanıtında `fetchFailureCode` (Onayla + Bilgileri Getir).
 *
 * Kredi satın alma yalnızca Broker Yöneticisine açık (backend `/g-radar/purchase/*` hasRole BROKER_ADMIN;
 * ödeme sayfasındaki G-Radar sekmesi de yalnızca ona görünür). Ödeme sorumlusu bir Broker Kullanıcısı abonelik
 * ödemesi bildirebilir ama G-Radar kredisi alamaz; o yüzden satın alma eylemi yalnızca BROKER_ADMIN'e çıkar.
 */
export const GRADAR_INSUFFICIENT_CREDITS = 'GRADAR_INSUFFICIENT_CREDITS';

/** Ödeme sayfasının G-Radar Kredisi sekmesi (PaymentSubmitPage `?tab=g-radar` ile açar). */
export const GRADAR_CREDIT_PURCHASE_PATH = '/payment/submit?tab=g-radar';

export const canPurchaseGRadarCredits = (user) => user?.globalRole === 'BROKER_ADMIN';

export const isGRadarCreditShortage = (code) => code === GRADAR_INSUFFICIENT_CREDITS;

/**
 * Kredi yetersizliğini kullanıcının rolüne göre anlatır.
 *  - Broker Yöneticisi: nedeni ve "Kredi satın al" düğmesi olan bir uyarı penceresi; düğme satın alma sekmesine götürür.
 *  - Süper Admin: yalnızca nedeni söyleyen uyarı (satın alamaz, başka bir brokerın cüzdanı).
 *  - Diğerleri (Broker Kullanıcısı): yöneticiden kredi istemesini söyleyen uyarı, bağlantı yok.
 *
 * @param {object}   options
 * @param {object}   options.user
 * @param {Function} [options.navigate]  React Router navigate; pencere router dışında açıldığı için çağıran verir.
 * @param {'fetch'|'approved'|'restarted'|'preview'} [options.context='fetch']
 *   `approved`/`restarted`: işlem kaydedildi, yalnızca bilgiler çekilemedi. `preview`: form açık, satın alma
 *   sayfası yeni sekmede açılır ki girilen bilgiler kaybolmasın.
 * @returns {Promise<void>}
 */
export async function showGRadarCreditShortage({ user, navigate, context = 'fetch' }) {
  if (!canPurchaseGRadarCredits(user)) {
    if (user?.globalRole === 'SUPER_ADMIN') {
      showWarning(t(context === 'approved'
        ? 'gRadar.creditShortage.brokerShortApproved'
        : 'gRadar.creditShortage.brokerShort'));
    } else {
      showWarning(t('gRadar.creditShortage.askAdmin'), { autoClose: 7000 });
    }
    return;
  }

  const note = {
    approved: 'gRadar.creditShortage.approvedNote',
    restarted: 'gRadar.creditShortage.restartedNote',
    preview: 'gRadar.creditShortage.previewNote',
  }[context];

  const ok = await confirmDialog({
    title: t('gRadar.creditShortage.title'),
    message: t('gRadar.creditShortage.message'),
    details: note ? [t(note)] : undefined,
    intent: 'warning',
    icon: 'toll',
    confirmText: t('gRadar.creditShortage.buy'),
    cancelText: t('gRadar.creditShortage.close'),
  });
  if (!ok) return;

  if (context === 'preview' || !navigate) {
    window.open(GRADAR_CREDIT_PURCHASE_PATH, '_blank', 'noopener');
  } else {
    navigate(GRADAR_CREDIT_PURCHASE_PATH);
  }
}
