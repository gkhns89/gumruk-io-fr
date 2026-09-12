/**
 * Giriş paketi (entry chunk) için hafif çeviri köprüsü.
 *
 * `axios.js`, `errorUtils.js` ve sağlayıcıların (Auth / PaymentRestriction / FeatureFlag) kullandığı servisler
 * tanıtım sayfasıyla aynı pakette yüklenir. Bunlar `./index.js`'i statik import ederse iki sözlük de
 * tanıtım sayfasını açan herkese indirilir. Bu modüller `t`'yi buradan alır; sözlük modülü yüklenince
 * (giriş/uygulama sayfalarının lazy chunk'ları onu import eder, oturum varsa `main.jsx` açılışta yükler)
 * kendini `registerTranslator` ile kaydeder.
 *
 * Bu modüller `t`'yi yalnızca bir API çağrısından sonra kullanır; o anda sözlük yüklü olur. Yüklü değilse
 * anahtarın kendisi döner — görünür ama zararsız bir hata.
 */

let translate = null;

export const registerTranslator = (fn) => {
  translate = fn;
};

export const t = (key, params) => (translate ? translate(key, params) : key);

export const loadTranslations = () => import('./index.js');
