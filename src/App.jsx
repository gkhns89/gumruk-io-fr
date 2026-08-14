import React, { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import TransactionsPage from "./components/transactions/TransactionsPage";  // ✅ YENİ
import CargoTrackingPage from "./components/cargo/CargoTrackingPage";  // ✅ YÜK TAKİP
import AgreementsPage from "./pages/management/AgreementsPage";  // ✅ YÖNETİM
import ClientsPage from "./pages/management/ClientsPage";  // ✅ YÖNETİM
import EmployeesPage from "./pages/management/EmployeesPage";  // ✅ YÖNETİM
import CouriersManagementPage from "./pages/management/CouriersManagementPage";  // ✅ KURYE YÖNETİMİ
import NewsPage from "./pages/NewsPage";  // ✅ HABERLER
import WarehousePage from "./pages/WarehousePage";
import ShippingPage from "./pages/ShippingPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import ContactPage from "./pages/ContactPage";
import HelpPage from "./pages/HelpPage";
import ReportsPage from "./pages/management/ReportsPage";
import SessionManagement from "./pages/SessionManagement";  // ✅ SESSION YÖNETİMİ
import PaymentSubmitPage from "./pages/payment/PaymentSubmitPage";
import PaymentManagementPage from "./pages/management/PaymentManagementPage";
import BrokerSubscriptionsPage from "./pages/management/BrokerSubscriptionsPage";
import AddonCatalogPage from "./pages/management/AddonCatalogPage";
import PlanManagementPage from "./pages/management/PlanManagementPage";
import FeedbackTasksPage from "./pages/management/FeedbackTasksPage";
import PaymentWarningModal from "./components/payment/PaymentWarningModal";
import { usePaymentRestriction } from "./context/PaymentRestrictionProvider";
import { useAuth } from "./hooks/useAuth";

// Tanıtım ve yasal sayfalar ana bundle'a girmesin — ziyaretçi uygulama kodunun tamamını indirmemeli
const LandingPage = lazy(() => import("./pages/landing/LandingPage"));
const TermsPage = lazy(() => import("./pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage"));

// Giriş gerektirmeyen, ayrı chunk'tan gelen sayfalar için ortak sarmalayıcı
function PublicPage({ element }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-brand-navy">
          <p className="text-text-secondary">Yükleniyor...</p>
        </div>
      }
    >
      {element}
    </Suspense>
  );
}

// Protected Route Component with Role Support
function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role kontrolü - eğer belirli bir rol gerekiyorsa ve kullanıcının rolü uyuşmuyorsa
  if (requiredRole && user?.globalRole !== requiredRole) {
    console.warn(`Yetkisiz erişim: ${user?.globalRole} kullanıcısı ${requiredRole} gerekli sayfaya erişmeye çalıştı`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Public Route Component
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Yükleniyor...</p>
      </div>
    );
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
}

function PaymentRestrictionModalController() {
  const { restrictionLevel, daysOverdue, isWarning, isWriteBlocked, isFullReadOnly } = usePaymentRestriction();
  const [modal, setModal] = useState(null);

  // 403 PAYMENT_RESTRICTION hatası geldiğinde modal aç
  useEffect(() => {
    const handler = (e) => {
      setModal({ level: e.detail.level, daysOverdue: e.detail.daysOverdue });
    };
    window.addEventListener('paymentRestrictionDetected', handler);
    return () => window.removeEventListener('paymentRestrictionDetected', handler);
  }, []);

  if (!modal) return null;

  return (
    <PaymentWarningModal
      level={modal.level}
      daysOverdue={modal.daysOverdue}
      onClose={() => setModal(null)}
    />
  );
}

export default function App() {
  return (
    <>
    <PaymentRestrictionModalController />
    <Routes>
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* ✅ YENİ: İşlem Takip Route */}
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ YÜK TAKİP: Yük Takip Route */}
      <Route
        path="/cargo"
        element={
          <ProtectedRoute>
            <CargoTrackingPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ YÖNETİM: Vekalet Yönetimi */}
      <Route
        path="/management/agreements"
        element={
          <ProtectedRoute>
            <AgreementsPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ YÖNETİM: Müşteri Firmaları */}
      <Route
        path="/management/clients"
        element={
          <ProtectedRoute>
            <ClientsPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ YÖNETİM: Çalışan Yönetimi */}
      <Route
        path="/management/employees"
        element={
          <ProtectedRoute>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ YÖNETİM: Kurye Yönetimi */}
      <Route
        path="/management/couriers"
        element={
          <ProtectedRoute>
            <CouriersManagementPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ HABERLER: Gümrük Haberleri */}
      <Route
        path="/news"
        element={
          <ProtectedRoute>
            <NewsPage />
          </ProtectedRoute>
        }
      />

      {/* Antrepo Takip */}
      <Route
        path="/warehouse"
        element={
          <ProtectedRoute>
            <WarehousePage />
          </ProtectedRoute>
        }
      />

      {/* Yük Takip */}
      <Route
        path="/shipping"
        element={
          <ProtectedRoute>
            <ShippingPage />
          </ProtectedRoute>
        }
      />

      {/* Duyurular */}
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <AnnouncementsPage />
          </ProtectedRoute>
        }
      />

      {/* Profil */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Ayarlar */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Firma Ayarları (SUPER_ADMIN + BROKER_ADMIN — sayfa içinde yetki kontrolü) */}
      <Route
        path="/company-settings"
        element={
          <ProtectedRoute>
            <CompanySettingsPage />
          </ProtectedRoute>
        }
      />

      {/* İletişim */}
      <Route
        path="/contact"
        element={
          <ProtectedRoute>
            <ContactPage />
          </ProtectedRoute>
        }
      />

      {/* Yardım */}
      <Route
        path="/help"
        element={
          <ProtectedRoute>
            <HelpPage />
          </ProtectedRoute>
        }
      />

      {/* YÖNETİM: Raporlar */}
      <Route
        path="/management/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ SESSION YÖNETİMİ: SUPER_ADMIN Only */}
      <Route
        path="/session-management"
        element={
          <ProtectedRoute requiredRole="SUPER_ADMIN">
            <SessionManagement />
          </ProtectedRoute>
        }
      />

      {/* ✅ ÖDEME: Ödeme Bildir */}
      <Route
        path="/payment/submit"
        element={
          <ProtectedRoute>
            <PaymentSubmitPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ YÖNETİM: Ödeme Yönetimi (SUPER_ADMIN) */}
      <Route
        path="/management/payments"
        element={
          <ProtectedRoute requiredRole="SUPER_ADMIN">
            <PaymentManagementPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ YÖNETİM: Abonelik Yönetimi (SUPER_ADMIN) */}
      <Route
        path="/management/broker-subscriptions"
        element={
          <ProtectedRoute requiredRole="SUPER_ADMIN">
            <BrokerSubscriptionsPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ YÖNETİM: Hizmet Kataloğu (SUPER_ADMIN) */}
      <Route
        path="/management/addon-catalog"
        element={
          <ProtectedRoute requiredRole="SUPER_ADMIN">
            <AddonCatalogPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ YÖNETİM: Plan Yönetimi (SUPER_ADMIN) */}
      <Route
        path="/management/plans"
        element={
          <ProtectedRoute requiredRole="SUPER_ADMIN">
            <PlanManagementPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ YÖNETİM: Feedback Taskları (SUPER_ADMIN) */}
      <Route
        path="/management/feedback-tasks"
        element={
          <ProtectedRoute requiredRole="SUPER_ADMIN">
            <FeedbackTasksPage />
          </ProtectedRoute>
        }
      />

      {/* Tanıtım ve yasal sayfalar — public, PublicRoute ile sarmalanmaz */}
      <Route path="/" element={<PublicPage element={<LandingPage />} />} />
      <Route
        path="/kullanim-kosullari"
        element={<PublicPage element={<TermsPage />} />}
      />
      <Route path="/gizlilik" element={<PublicPage element={<PrivacyPage />} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}