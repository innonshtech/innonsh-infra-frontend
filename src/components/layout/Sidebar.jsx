import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  LayoutDashboard, FolderKanban, Calculator, ShoppingCart,
  Package, IndianRupee, Building2, Grid3X3, BookOpen,
  FileText, Users, Users2, Scale, ClipboardList, BarChart3,
  Settings, ChevronLeft, ChevronRight, HardHat, LogOut, Wrench, Bell, Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import './Sidebar.css';
import ConfirmModal from '../ui/ConfirmModal';

const contractorMenu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'AI Board', icon: Sparkles, path: '/ai-board' },
  { label: 'Projects', icon: FolderKanban, path: '/projects' },
  { label: 'My Tasks', icon: ClipboardList, path: '/my-tasks' },
  { label: 'Estimation & BOQ', icon: Calculator, path: '/estimation' },
  { label: 'Procurement', icon: ShoppingCart, path: '/procurement' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Labour', icon: Users2, path: '/labour' },
  { label: 'Equipment', icon: Wrench, path: '/equipment' },
  { label: 'Finance', icon: IndianRupee, path: '/finance' },
  { label: 'Contracts', icon: FileText, path: '/contracts' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Organization', icon: Building2, path: '/settings' },
];

const builderMenu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'AI Board', icon: Sparkles, path: '/ai-board' },
  { label: 'Projects', icon: FolderKanban, path: '/projects' },
  { label: 'My Tasks', icon: ClipboardList, path: '/my-tasks' },
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
  { label: 'Organization', icon: Building2, path: '/settings' },
];

const permissionMapping = {
  '/ai-board': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.permissions?.includes('aiBoard.view');
  },
  '/dashboard': (user) => {
    const role = user?.role?.toUpperCase();
    return role === 'OWNER' || role === 'FINANCE' || user?.permissions?.includes('*') || user?.permissions?.includes('dashboard.view');
  },
  '/projects': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.permissions?.some(p => p.startsWith('projects.'));
  },
  '/my-tasks': () => true, // Accessible to all logged-in members
  '/estimation': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.permissions?.some(p => p.startsWith('estimations.'));
  },
  '/procurement': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.permissions?.some(p => p.startsWith('procurement.'));
  },
  '/inventory': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.permissions?.some(p => p.startsWith('inventory.'));
  },
  '/labour': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.permissions?.some(p => p.startsWith('hr.') || p.startsWith('labour.'));
  },
  '/equipment': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.permissions?.some(p => p.startsWith('equipment.'));
  },
  '/finance': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.role?.toUpperCase() === 'FINANCE' ||
           user?.permissions?.some(p => p.startsWith('finance.'));
  },
  '/contracts': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.permissions?.some(p => p.startsWith('contracts.'));
  },
  '/reports': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.permissions?.some(p => p.startsWith('reports.'));
  },
  '/settings': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.permissions?.some(p => p.startsWith('settings.') || p.startsWith('organization.'));
  },
  '/units': (user) => {
    return user?.permissions?.includes('*') || user?.role?.toUpperCase() === 'OWNER' || user?.permissions?.some(p => p.startsWith('units.'));
  },
  '/bookings': (user) => {
    return user?.permissions?.includes('*') || user?.role?.toUpperCase() === 'OWNER' || user?.permissions?.some(p => p.startsWith('bookings.'));
  },
  '/billing': (user) => {
    return user?.permissions?.includes('*') || user?.role?.toUpperCase() === 'OWNER' || user?.permissions?.some(p => p.startsWith('billing.'));
  },
  '/crm': (user) => {
    return user?.permissions?.includes('*') || user?.role?.toUpperCase() === 'OWNER' || user?.permissions?.some(p => p.startsWith('crm.'));
  },
  '/lease': (user) => {
    return user?.permissions?.includes('*') || user?.role?.toUpperCase() === 'OWNER' || user?.permissions?.some(p => p.startsWith('lease.'));
  },
  '/legal': (user) => {
    return user?.permissions?.includes('*') || user?.role?.toUpperCase() === 'OWNER' || user?.permissions?.some(p => p.startsWith('legal.'));
  }
};

export default function Sidebar() {
  const { erpType, user, company, logout } = useAuth();
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
  
  // Filter sidebar tabs dynamically based on user role and permissions!
  const filteredMenu = menu.filter(item => {
    const checker = permissionMapping[item.path];
    if (checker) {
      return checker(user);
    }
    return true;
  });

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U';
  const logoUrl = company?.logo || user?.company?.logo;

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
          ) : (
            <HardHat size={24} />
          )}
        </div>
        {!collapsed && (
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name" title={user?.company?.name || 'Innonsh Infra'}>
              {user?.company?.name || 'Innonsh Infra'}
            </span>
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
        {filteredMenu.map((item) => (
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
            {location.pathname === item.path && (
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
