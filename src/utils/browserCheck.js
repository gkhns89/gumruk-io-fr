/**
 * Tarayıcı bilgilerini tespit eder
 * @returns {Object} { name: string, version: number }
 */
export function getBrowserInfo() {
  const ua = navigator.userAgent;
  const browser = { name: 'unknown', version: 0 };

  // Chrome (Edge değil)
  if (/Chrome\/(\d+)/.test(ua) && !/Edg\//.test(ua)) {
    browser.name = 'Chrome';
    browser.version = parseInt(ua.match(/Chrome\/(\d+)/)[1]);
  }
  // Safari (iOS değil)
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua)) {
    const match = ua.match(/Version\/(\d+)/);
    if (match) {
      browser.name = 'Safari';
      browser.version = parseInt(match[1]);
    }
  }
  // iOS Safari
  else if (/iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua)) {
    const match = ua.match(/Version\/(\d+)/);
    if (match) {
      browser.name = 'iOS Safari';
      browser.version = parseInt(match[1]);
    }
  }
  // Samsung Internet
  else if (/SamsungBrowser\/(\d+)/.test(ua)) {
    browser.name = 'Samsung Internet';
    browser.version = parseInt(ua.match(/SamsungBrowser\/(\d+)/)[1]);
  }

  return browser;
}

/**
 * Minimum tarayıcı gereksinimlerini döndürür
 * @returns {Object} { browserName: minVersion }
 */
export function getBrowserRequirements() {
  return {
    'Chrome': 113,
    'Safari': 27,
    'iOS Safari': 27,
    'Samsung Internet': 29
  };
}

/**
 * Mevcut tarayıcının desteklenip desteklenmediğini kontrol eder
 * @returns {boolean} true ise desteklenmiyor
 */
export function isUnsupportedBrowser() {
  const browser = getBrowserInfo();
  const requirements = getBrowserRequirements();

  if (requirements[browser.name]) {
    return browser.version < requirements[browser.name];
  }

  return false; // Bilinmeyen tarayıcılar için false
}

/**
 * Kullanıcının uyarıyı dismiss edip etmediğini kontrol eder
 * @returns {boolean}
 */
export function isWarningDismissed() {
  return localStorage.getItem('browserWarningDismissed') === 'true';
}

/**
 * Uyarı dismiss durumunu ayarlar
 * @param {boolean} dismissed
 */
export function setWarningDismissed(dismissed = true) {
  localStorage.setItem('browserWarningDismissed', dismissed.toString());
}
