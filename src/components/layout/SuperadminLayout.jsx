import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LayoutDashboard, Users, CreditCard, Building, Settings, LogOut, HardHat, Search, Bell } from 'lucide-react';
import '../../components/layout/Sidebar.css';
import '../../components/layout/Topbar.css';
import '../../components/layout/AppLayout.css';
import ConfirmModal from '../ui/ConfirmModal';

const superadminMenu = [
  { label: 'SaaS Overview', icon: LayoutDashboard, path: '/superadmin' },
  { label: 'Tenants & Companies', icon: Building, path: '/superadmin/tenants' },
  { label: 'Billing & Plans', icon: CreditCard, path: '/superadmin/billing' },
  { label: 'Global Settings', icon: Settings, path: '/superadmin/settings' },
];

export default function SuperadminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    toast.success('Logged out successfully!');
  };

  return (
    <div className="app-layout">
      {/* Superadmin Sidebar - A specialized red/purple tinted sidebar to distinguish environment */}
      <aside className="sidebar" style={{ background: 'rgba(26, 20, 42, 0.95)', borderRightColor: 'rgba(139, 92, 246, 0.2)' }}>
        <div className="sidebar-brand">
          <div className="sidebar-logo" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ef4444)' }}>
            <HardHat size={24} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">ConstructERP</span>
            <span className="sidebar-brand-type" style={{ color: '#8b5cf6' }}>SUPERADMIN</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {superadminMenu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/superadmin'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {location.pathname === item.path && <div className="sidebar-active-indicator" style={{ background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }}/>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{ background: '#ef4444' }}>S</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">Super Admin</span>
              <span className="sidebar-user-email">{user?.email || 'admin@saas.com'}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={() => setShowLogoutModal(true)}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="app-main">
        {/* Superadmin Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">Platform Administration</h1>
          </div>
          <div className="topbar-right">
            <button className="topbar-notification">
              <Bell size={18} />
              <span className="notification-dot" style={{ background: '#ef4444' }} />
            </button>
          </div>
        </header>
        
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title="Sign Out"
        message="Are you sure you want to securely sign out of your Platform Administration console?"
        confirmText="Sign Out"
      />
    </div>
  );
}
