/**
 * Tanıtım sayfası ölçümlemesi (Google Analytics 4).
 *
 * İKİ KURAL — ikisi de bilinçli:
 *
 * 1. YALNIZCA PAZARLAMA SAYFALARINDA. Bu modül sadece `LandingPage` ve yasal sayfalarda
 *    mount edilir. Panele giren kullanıcılar izlenmez; uygulama route'larında gtag hiç
 *    yüklenmez. Yeni bir yere eklerken bunu bozmayın.
 *
 * 2. ONAY ALINMADAN İSTEK ATILMAZ. Script, ziyaretçi açıkça kabul edene kadar sayfaya
 *    hiç eklenmez — "önce yükle, sonra sor" yapılmıyor. Analitik çerezi zorunlu çerez
 *    değildir; KVKK kapsamında açık rıza gerekir.
 */

// TODO: gerçek GA4 ölçüm kimliğiyle değiştirilecek (G- ile başlar).
const PLACEHOLDER_ID = "G-XXXXXXXXXX";
export const GA_MEASUREMENT_ID = PLACEHOLDER_ID;

const CONSENT_KEY = "cookieConsent"; // "granted" | "denied"

/**
 * Kimlik girilmiş mi? Yer tutucu desene UYDUĞU için ayrıca dışlanıyor — yoksa
 * onay bandı doldurulmadan çıkar ve kabul edildiğinde geçersiz bir ölçüm
 * kimliğiyle Google'a istek atılır.
 */
export const isConfigured = () =>
  GA_MEASUREMENT_ID !== PLACEHOLDER_ID && /^G-[A-Z0-9]{6,}$/i.test(GA_MEASUREMENT_ID);

export function readConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    // Depolama kapalıysa onay saklanamaz; her ziyarette sorulur.
    return null;
  }
}

export function writeConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* depolama kapalı — yoksay */
  }
}

let loaded = false;

/** gtag script'ini sayfaya ekler. Onay alınmadan çağrılmamalı. */
export function loadAnalytics() {
  if (loaded || !isConfigured() || typeof document === "undefined") return;
  loaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, {
    // IP'yi kısalt ve reklam sinyallerini kapat: ölçüm pazarlama hunisi için,
    // reklam hedefleme için değil. Gizlilik metnindeki beyanla uyumlu olmalı.
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}
