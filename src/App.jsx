import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

import AppLayout from './components/layout/AppLayout';
import SuperadminLayout from './components/layout/SuperadminLayout';
import SubscriptionGuard from './components/layout/SubscriptionGuard';
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SuperadminDashboard from './pages/superadmin/SuperadminDashboard';
import ProjectListPage from './pages/projects/ProjectListPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import EstimationPage from './pages/estimation/EstimationPage';
import ProcurementPage from './pages/procurement/ProcurementPage';
import InventoryPage from './pages/inventory/InventoryPage';
import FinancePage from './pages/finance/FinancePage';
import SettingsPage from './pages/settings/SettingsPage';
import UnitsPage from './pages/builder/UnitsPage';
import BookingsPage from './pages/builder/BookingsPage';
import BillingPage from './pages/builder/BillingPage';
import CRMPage from './pages/builder/CRMPage';
import WBSTemplatesPage from './pages/settings/WBSTemplatesPage';
import LabourPage from './pages/labour/LabourPage';
import EquipmentPage from './pages/equipment/EquipmentPage';
import ReportsHub from './pages/reports/ReportsHub';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ContractsPage from './pages/contracts/ContractsPage';

// Basic wrapper for protected routes
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="page-loader"><div className="spinner spinner-lg"></div></div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
const IndexRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="page-loader"><div className="spinner spinner-lg"></div></div>;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<IndexRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route element={<ProtectedRoute />}>
        {/* SaaS Superadmin Layer */}
        <Route path="/superadmin" element={<SuperadminLayout />}>
          <Route index element={<SuperadminDashboard />} />
          <Route path="tenants" element={<div className="page-wrapper"><div className="empty-state"><h2>Tenants coming soon</h2></div></div>} />
          <Route path="billing" element={<div className="page-wrapper"><div className="empty-state"><h2>Billing coming soon</h2></div></div>} />
          <Route path="settings" element={<div className="page-wrapper"><div className="empty-state"><h2>Settings coming soon</h2></div></div>} />
        </Route>

        {/* Standard Tenant Layer (Builder / Contractor) */}
        <Route element={<SubscriptionGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            
            {/* Core Contractor Modules */}
            <Route path="/estimation" element={<EstimationPage />} />
            <Route path="/procurement" element={<ProcurementPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/labour" element={<LabourPage />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            
            {/* Builder Modules — share same pages but API calls adapt per erpType */}
            <Route path="/units" element={<UnitsPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/settings/wbs-templates" element={<WBSTemplatesPage />} />
            <Route path="/lease" element={<div className="page-wrapper"><div className="empty-state"><h2>Lease Mgmt Module Coming Soon</h2></div></div>} />
            <Route path="/legal" element={<div className="page-wrapper"><div className="empty-state"><h2>Legal Module Coming Soon</h2></div></div>} />
            <Route path="/reports" element={<ReportsHub />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
