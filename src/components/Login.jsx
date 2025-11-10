import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background">
      <div className="flex flex-1 justify-center items-center py-5">
        <div className="flex flex-col max-w-lg w-full gap-8 bg-white p-8 md:p-12 rounded-xl shadow-sm">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center h-16 w-16 bg-primary rounded-full text-white">
              <span className="material-symbols-outlined text-4xl">anchor</span>
            </div>
            <div>
              <p className="text-text-main text-3xl font-bold leading-tight tracking-tight">
                AACC Tracker Girişi
              </p>
              <p className="text-text-secondary text-base font-normal leading-normal mt-2">
                Gümrük işlemlerinizi takip etmek için giriş yapın.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <label className="flex flex-col w-full">
              <p className="text-text-main text-sm font-medium pb-2">Email</p>
              <input
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main focus:ring-0 h-12 placeholder:text-text-secondary p-3 text-base font-normal"
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
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main focus:ring-0 h-12 placeholder:text-text-secondary p-3 pr-10 text-base font-normal"
                />
                <div 
                  className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-text-secondary">
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
                  className="form-checkbox h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
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
    </div>
  );
}