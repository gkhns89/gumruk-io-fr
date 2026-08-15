import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Rota değişiminde sayfayı başa alır.
 *
 * React Router kaydırma konumunu varsayılan olarak korur; tanıtım sayfasında aşağı inip
 * "Sisteme Giriş"e basınca login ekranı ortadan açılıyordu. Daha önce bu, Login ve
 * LegalLayout içinde ayrı ayrı çözülüyordu — artık tek yerden.
 *
 * Kapsam notları:
 * - Yalnızca `pathname` değiştiğinde çalışır; `?edit=` gibi arama parametreleri sayfayı zıplatmaz.
 * - `#bolum` bağlantılarında devre dışı kalır, tarayıcı kendi hedefine kaysın.
 * - Uygulama içi sayfalar pencereyi değil `#main-scroll-area` kabını kaydırdığı için orada
 *   etkisizdir; panel akışlarına (örn. PaymentSubmitPage'in bölüme kaydırması) dokunmaz.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
