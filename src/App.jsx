import React, { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import PaymentWarningModal from "./components/payment/PaymentWarningModal";
import { useAuth } from "./hooks/useAuth";

/**
 * TÜM sayfalar rota bazında ayrı chunk'a alınıyor.
 *
 * Sebep tanıtım sayfası: statik import edildiklerinde ziyaretçi paneli hiç görmeden
 * uygulamanın tamamını (2,5 MB, içinde maplibre-gl) indiriyordu. Bu, Core Web Vitals
 * üzerinden arama sıralamasını da düşürüyor.
 *
 * KURAL: buraya yeni bir sayfa eklerken `lazy()` kullanın; statik `import` yazmak
 * o sayfanın tüm bağımlılıklarını ana bundle'a geri taşır.
 */
const LandingPage = lazy(() => import("./pages/landing/LandingPage"));
const TermsPage = lazy(() => import("./pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage"));
const Login = lazy(() => import("./components/Login"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const TransactionsPage = lazy(() => import("./components/transactions/TransactionsPage"));
const CargoTrackingPage = lazy(() => import("./components/cargo/CargoTrackingPage"));
const AgreementsPage = lazy(() => import("./pages/management/AgreementsPage"));
const ClientsPage = lazy(() => import("./pages/management/ClientsPage"));
const EmployeesPage = lazy(() => import("./pages/management/EmployeesPage"));
const CouriersManagementPage = lazy(() => import("./pages/management/CouriersManagementPage"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const WarehousePage = lazy(() => import("./pages/WarehousePage"));
const ShippingPage = lazy(() => import("./pages/ShippingPage"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CompanySettingsPage = lazy(() => import("./pages/CompanySettingsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const ReportsPage = lazy(() => import("./pages/management/ReportsPage"));
const SessionManagement = lazy(() => import("./pages/SessionManagement"));
const PaymentSubmitPage = lazy(() => import("./pages/payment/PaymentSubmitPage"));
const PaymentManagementPage = lazy(() => import("./pages/management/PaymentManagementPage"));
const BrokerSubscriptionsPage = lazy(() => import("./pages/management/BrokerSubscriptionsPage"));
const AddonCatalogPage = lazy(() => import("./pages/management/AddonCatalogPage"));
const PlanManagementPage = lazy(() => import("./pages/management/PlanManagementPage"));
const FeedbackTasksPage = lazy(() => import("./pages/management/FeedbackTasksPage"));

/** Chunk inerken gösterilen ekran — tema rengine uyar, ani beyaz parlama olmaz */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-brand-navy">
      <p className="text-text-secondary">Yükleniyor...</p>
    </div>
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

  // Role kontrolü - tek rol ya da rol listesi verilebilir
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user?.globalRole)) {
      console.warn(`Yetkisiz erişim: ${user?.globalRole} kullanıcısı ${allowedRoles.join(' veya ')} gerekli sayfaya erişmeye çalıştı`);
      return <Navigate to="/dashboard" replace />;
    }
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
    <ScrollToTop />
    <PaymentRestrictionModalController />
    {/* Tek bir Suspense tüm rotaları kapsıyor; her rota kendi chunk'ını indirirken
        aynı ekranı gösteriyor. Rota bazlı ayrı sarmalayıcıya gerek yok. */}
    <Suspense fallback={<RouteFallback />}>
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
          <ProtectedRoute requiredRole={["SUPER_ADMIN", "BROKER_ADMIN"]}>
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
      <Route path="/" element={<LandingPage />} />
      <Route path="/kullanim-kosullari" element={<TermsPage />} />
      <Route path="/gizlilik" element={<PrivacyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </>
  );
}