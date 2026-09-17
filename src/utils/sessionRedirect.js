// Oturum dışında da açılabilen sayfalar: bunlarda anahtarsız istek ya da çıkış normaldir, girişe yönlendirilmez.
export const PUBLIC_PATHS = ["/", "/login", "/kullanim-kosullari", "/gizlilik"];

export const isPublicPath = (pathname = window.location.pathname) => PUBLIC_PATHS.includes(pathname);

let redirecting = false;

/**
 * Oturum bu sekmenin dışında bittiğinde (başka sekmede çıkış, anahtar silindi) kullanıcıyı bir kez uyarıp girişe
 * gönderir. Aynı anda düşen isteklerin her biri ayrı uyarı ve yönlendirme üretmesin diye tek seferliktir.
 * Giriş paketinde: toast modülü axios.js'teki gibi dinamik yüklenir.
 */
export function redirectToLogin(message) {
  if (redirecting || window.location.pathname.includes("/login")) return;
  redirecting = true;

  if (message) {
    import("./toastUtils").then(({ showWarning }) => {
      showWarning(message, { autoClose: 3000 });
    });
  }

  // Uyarı görünsün diye kısa gecikme; açık kalan diğer isteklerin hataları sayfada birikmeden çıkılır
  setTimeout(() => {
    window.location.href = "/login";
  }, 200);
}
