import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  LayoutDashboard, FolderKanban, Calculator, ShoppingCart,
  Package, IndianRupee, Building2, Grid3X3, BookOpen,
  FileText, Users, Users2, Scale, ClipboardList, BarChart3,
  Settings, ChevronLeft, ChevronRight, HardHat, LogOut, Wrench, Bell,
} from 'lucide-react';
import { useState } from 'react';
import './Sidebar.css';
import ConfirmModal from '../ui/ConfirmModal';

const contractorMenu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Projects', icon: FolderKanban, path: '/projects' },
  { label: 'Estimation & BOQ', icon: Calculator, path: '/estimation' },
  { label: 'Procurement', icon: ShoppingCart, path: '/procurement' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Labour', icon: Users2, path: '/labour' },
  { label: 'Equipment', icon: Wrench, path: '/equipment' },
  { label: 'Finance', icon: IndianRupee, path: '/finance' },
  { label: 'Contracts', icon: FileText, path: '/contracts' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const builderMenu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Projects', icon: FolderKanban, path: '/projects' },
  { label: 'Units', icon: Grid3X3, path: '/units' },
  { label: 'Bookings', icon: BookOpen, path: '/bookings' },
  { label: 'Billing', icon: FileText, path: '/billing' },
  { label: 'CRM / Brokers', icon: Users, path: '/crm' },
  { label: 'Lease Mgmt', icon: Building2, path: '/lease' },
  { label: 'Legal', icon: Scale, path: '/legal' },
  { label: 'Procurement', icon: ShoppingCart, path: '/procurement' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Finance', icon: IndianRupee, path: '/finance' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  const { erpType, user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const toast = useToast();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    toast.success('Logged out successfully!');
  };

  const menu = erpType === 'BUILDER' ? builderMenu : contractorMenu;
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U';

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <HardHat size={24} />
        </div>
        {!collapsed && (
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Innonsh Infra</span>
            <span className="sidebar-brand-type">{erpType}</span>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && location.pathname === item.path && (
              <div className="sidebar-active-indicator" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
          )}
        </div>
        <button className="sidebar-logout" onClick={() => setShowLogoutModal(true)} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title="Sign Out"
        message="Are you sure you want to end your current session and securely sign out?"
        confirmText="Sign Out"
      />
    </>
  );
}
