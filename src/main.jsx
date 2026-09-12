import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ThemeProvider from './context/ThemeProvider'
import AuthProvider from './context/AuthProvider'
import PaymentRestrictionProvider from './context/PaymentRestrictionProvider'
import FeatureFlagProvider from './context/FeatureFlagProvider'
import { tokenManager } from './utils/tokenManager'
import { loadTranslations } from './locales/runtime'
import './index.css'
import App from './App.jsx'

const render = () => createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PaymentRestrictionProvider>
          <FeatureFlagProvider>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            pauseOnHover
            draggable
            limit={3}
          />
          </FeatureFlagProvider>
          </PaymentRestrictionProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Oturum varsa sağlayıcılar açılışta API çağırıp mesajlarını çevirir: önce sözlükleri yükle. Oturumsuz ziyaretçi
// (tanıtım sayfası) sözlükleri indirmez; giriş ve uygulama sayfaları onları kendi lazy chunk'larıyla getirir.
if (tokenManager.getToken()) {
  loadTranslations().finally(render)
} else {
  render()
}