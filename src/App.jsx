import React from "react";
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
import ContactPage from "./pages/ContactPage";
import HelpPage from "./pages/HelpPage";
import ReportsPage from "./pages/management/ReportsPage";
import { useAuth } from "./hooks/useAuth";

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Yükleniyor...</p>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
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

export default function App() {
  return (
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

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}