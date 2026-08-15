import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "./common/ThemeToggle";
import LoginScene from "./LoginScene";
import { getLoginProfile } from "../utils/imageUtils";
import lockupLight from "../assets/brand/lockup-light.png";
import lockupDark from "../assets/brand/lockup-dark.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Bu makinede daha önce giriş yapılmışsa, mail girilince lokal profil ön-dolar
  const [prefill, setPrefill] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Tanıtım sayfasında aşağı inip "Sisteme Giriş"e basıldığında React Router kaydırma
  // konumunu koruyor; sayfa ortadan açılmasın diye başa alıyoruz (bkz. LegalLayout).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Mail değişince (kısa debounce) bu makinedeki localStorage'dan profil ara
  useEffect(() => {
    const t = setTimeout(() => {
      setPrefill(email.includes("@") ? getLoginProfile(email) : null);
    }, 200);
    return () => clearTimeout(t);
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      sessionStorage.setItem('justLoggedIn', '1');
      navigate("/dashboard");
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background dark:bg-background-dark transition-colors duration-300">
      {/* Login Page Header */}
      <header className="w-full bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo ve Başlık — logo tanıtım sayfasına döner */}
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Tanıtım sayfasına dön"
          >
            <img
              src={lockupLight}
              alt="Gümrük.io"
              className="h-9 w-auto flex-shrink-0 dark:hidden"
            />
            <img
              src={lockupDark}
              alt="Gümrük.io"
              className="hidden h-9 w-auto flex-shrink-0 dark:block"
            />
          </Link>

          {/* Tema Toggle */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1 justify-center items-center py-5">
        <div className="flex flex-col max-w-lg w-full gap-8 bg-white dark:bg-background-dark p-8 md:p-12 rounded-xl shadow-sm transition-colors duration-300">

          {/* Header */}
          <div className="flex flex-col items-center text-center gap-4">
            <LoginScene />
            <div>
              <p className="text-text-main text-3xl font-bold leading-tight tracking-tight">
                Sisteme Giriş
              </p>
              <p className="text-text-secondary text-base font-normal leading-normal mt-2">
                Gümrük işlemlerinizi takip etmek için giriş yapın.
              </p>
            </div>
          </div>

          {/* Bu makinede tanınan kullanıcı — lokal ön-doldurma kartı */}
          {prefill && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 px-4 py-3 transition-colors">
              {prefill.logoDataUrl ? (
                <img
                  src={prefill.logoDataUrl}
                  alt={prefill.companyName || "Firma"}
                  className="h-10 w-auto max-w-[80px] object-contain rounded"
                />
              ) : null}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0 overflow-hidden">
                  {prefill.avatarDataUrl ? (
                    <img src={prefill.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span>{prefill.username?.charAt(0).toUpperCase() || "U"}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-main truncate">
                    Tekrar hoş geldin{prefill.username ? `, ${prefill.username}` : ""}
                  </p>
                  {prefill.companyName && (
                    <p className="text-xs text-text-secondary truncate">{prefill.companyName}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg transition-colors duration-300">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <label className="flex flex-col w-full">
              <p className="text-text-main text-sm font-medium pb-2">E-Posta</p>
              <input
                type="email"
                placeholder="ornek@firma.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600 focus:ring-0 h-12 placeholder:text-text-secondary dark:placeholder:text-gray-400 p-3 text-base font-normal transition-colors"
              />
            </label>

            <label className="flex flex-col w-full">
              <p className="text-text-main text-sm font-medium pb-2">Şifre</p>
              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Şifrenizi girin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600 focus:ring-0 h-12 placeholder:text-text-secondary dark:placeholder:text-gray-400 p-3 pr-10 text-base font-normal transition-colors"
                />
                <div
                  className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </div>
              </div>
            </label>

            {/* Options */}
            <div className="flex flex-wrap justify-between items-center gap-4">
              <label className="flex items-center gap-x-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="form-checkbox h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary dark:bg-gray-800 transition-colors"
                />
                <p className="text-text-main text-sm font-normal">Beni Hatırla</p>
              </label>
              <a className="text-sm font-medium text-primary hover:underline" href="#">
                Şifremi Unuttum?
              </a>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-full bg-primary text-white font-bold h-12 rounded-lg text-base leading-normal transition-colors hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>

          {/* Signup */}
          <div className="text-center">
            <p className="text-text-secondary text-sm">
              Hesabınız yok mu?{" "}
              <a className="font-medium text-primary hover:underline" href="#">
                Kayıt Ol
              </a>
            </p>
          </div>

          {/* Help */}
          <div className="text-center mt-6">
            <a className="text-text-secondary text-sm font-medium hover:text-primary transition-colors" href="#">
              Yardım mı lazım?
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-white dark:bg-background-dark border-t border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-xs text-text-secondary">
            © {new Date().getFullYear()} Gümrük.io. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
}
