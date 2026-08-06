import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Search, Bell, ChevronRight, LogOut, AlertTriangle, AlertCircle, Clock, Info, Check, Lock, Eye, EyeOff, X, Sparkles, Menu } from 'lucide-react';
import ConfirmModal from '../ui/ConfirmModal';
import { notificationService, authService, projectService } from '../../services/api';
import './Topbar.css';

const routeLabels = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/estimation': 'Estimation & BOQ',
  '/procurement': 'Procurement',
  '/inventory': 'Inventory',
  '/finance': 'Finance',
  '/units': 'Unit Management',
  '/bookings': 'Bookings',
  '/billing': 'Billing',
  '/crm': 'CRM / Brokers',
  '/lease': 'Lease Management',
  '/legal': 'Legal & Compliance',
  '/reports': 'Reports & Analytics',
  '/settings': 'Settings',
  '/ai-board': 'AI Board',
};

const permissionMapping = {
  '/dashboard': (user) => {
    const role = user?.role?.toUpperCase();
    return role === 'OWNER' || role === 'FINANCE' || user?.permissions?.includes('*');
  },
  '/projects': (user) => {
    return user?.permissions?.includes('*') || 
           user?.role?.toUpperCase() === 'OWNER' ||
           user?.permissions?.some(p => p.startsWith('projects.'));
  },
  '/my-tasks': () => true,
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

const searchableTabs = [
  { label: 'Dashboard', path: '/dashboard', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'AI Board', path: '/ai-board', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'Projects', path: '/projects', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'My Tasks', path: '/my-tasks', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'Estimation & BOQ', path: '/estimation', erp: ['CONTRACTOR'] },
  { label: 'Procurement', path: '/procurement', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'Inventory', path: '/inventory', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'Labour / HR', path: '/labour', erp: ['CONTRACTOR'] },
  { label: 'Equipment', path: '/equipment', erp: ['CONTRACTOR'] },
  { label: 'Finance', path: '/finance', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'Contracts', path: '/contracts', erp: ['CONTRACTOR'] },
  { label: 'Reports & Analytics', path: '/reports', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'Units', path: '/units', erp: ['BUILDER'] },
  { label: 'Bookings', path: '/bookings', erp: ['BUILDER'] },
  { label: 'Billing', path: '/billing', erp: ['BUILDER'] },
  { label: 'CRM / Brokers', path: '/crm', erp: ['BUILDER'] },
  { label: 'Lease Mgmt', path: '/lease', erp: ['BUILDER'] },
  { label: 'Legal & Compliance', path: '/legal', erp: ['BUILDER'] },
  { label: 'Settings', path: '/settings', erp: ['CONTRACTOR', 'BUILDER'] },

  // Project Sub-tabs
  { label: 'Project WBS / Jobs', path: '/projects', erp: ['CONTRACTOR', 'BUILDER'], isSubTab: true, parentModule: 'projects', subTabKey: 'wbs' },
  { label: 'Project Planning', path: '/projects', erp: ['CONTRACTOR', 'BUILDER'], isSubTab: true, parentModule: 'projects', subTabKey: 'planning' },
  { label: 'Project Team / Members', path: '/projects', erp: ['CONTRACTOR', 'BUILDER'], isSubTab: true, parentModule: 'projects', subTabKey: 'team' },
  { label: 'Project Financials', path: '/projects', erp: ['CONTRACTOR', 'BUILDER'], isSubTab: true, parentModule: 'projects', subTabKey: 'finance' },
  { label: 'Project Files', path: '/projects', erp: ['CONTRACTOR', 'BUILDER'], isSubTab: true, parentModule: 'projects', subTabKey: 'files' },
  { label: 'Project Overview', path: '/projects', erp: ['CONTRACTOR', 'BUILDER'], isSubTab: true, parentModule: 'projects', subTabKey: 'overview' },

  // Settings Sub-tabs
  { label: 'Branches (Settings)', path: '/settings?tab=branches', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'Departments (Settings)', path: '/settings?tab=departments', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'Designations (Settings)', path: '/settings?tab=designations', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'Documents Vault (Settings)', path: '/settings?tab=documents', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'Team Members (Settings)', path: '/settings?tab=team', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'Company Profile (Settings)', path: '/settings?tab=profile', erp: ['CONTRACTOR', 'BUILDER'] },
  { label: 'WBS Templates (Settings)', path: '/settings/wbs-templates', erp: ['CONTRACTOR', 'BUILDER'] },
];

export default function Topbar({ toggleMobileSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, erpType, logout } = useAuth();
  const { lang, setLang } = useTranslation();
  const toast = useToast();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotificationsModal, setShowAllNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Navigation search states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef(null);

  // Load and auto-generate notifications on mount
  const loadNotifications = async () => {
    try {
      const { data } = await notificationService.getAll();
      if (data?.success) {
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  useEffect(() => {
    const initNotifications = async () => {
      try {
        await notificationService.generate();
      } catch (err) {
        console.warn('Auto-generation failed:', err);
      }
      loadNotifications();
    };

    if (user) {
      initNotifications();
    }
  }, [user]);

  // Click outside listener for search suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setActiveIndex(-1);

    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter based on ERP type and permissions mapping
    const filtered = searchableTabs.filter(item => {
      // 1. ERP Type check
      const currentErp = erpType || user?.company?.erpType;
      const matchesErp = item.erp.includes(currentErp);
      if (!matchesErp) return false;

      // 2. Permission check
      const checker = permissionMapping[item.path];
      if (checker && !checker(user)) return false;

      // 3. String query match
      return item.label.toLowerCase().includes(query.toLowerCase());
    });

    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  const handleNavigate = async (item) => {
    let path = item.path;
    
    // Check if it's a project sub-tab
    if (item.isSubTab && item.parentModule === 'projects') {
      const lastProjectId = localStorage.getItem('lastProjectId');
      if (lastProjectId) {
        path = `/projects/${lastProjectId}?tab=${item.subTabKey}`;
      } else {
        // Fallback to first project or projects list
        try {
          const res = await projectService.getAll();
          const projects = res.data?.data || [];
          if (projects.length > 0) {
            path = `/projects/${projects[0].id}?tab=${item.subTabKey}`;
          } else {
            path = '/projects';
          }
        } catch (err) {
          console.error('Failed to resolve project for search navigation:', err);
          path = '/projects';
        }
      }
    }
    
    navigate(path);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const index = activeIndex >= 0 ? activeIndex : 0;
      if (suggestions[index]) {
        handleNavigate(suggestions[index]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  // Close dropdowns on clicking outside
  useEffect(() => {
    const handleClose = () => {
      setShowDropdown(false);
      setShowNotifications(false);
    };
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    setShowDropdown(false);
    await logout();
    toast.success('Logged out successfully!');
  };

  const handleToggleNotifications = (e) => {
    e.stopPropagation();
    setShowDropdown(false);
    const nextShow = !showNotifications;
    setShowNotifications(nextShow);
    if (nextShow) {
      loadNotifications();
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async (e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'LOW_STOCK':
        return <AlertTriangle className="notif-icon warning" size={16} />;
      case 'IDLE_EQUIPMENT':
      case 'PENDING_APPROVAL':
        return <Clock className="notif-icon info" size={16} />;
      case 'OVERDUE_INVOICE':
      case 'REQUEST_REJECTED':
        return <AlertCircle className="notif-icon danger" size={16} />;
      case 'REQUEST_APPROVED':
        return <Check className="notif-icon success" size={16} />;
      default:
        return <Info className="notif-icon success" size={16} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const isToday = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const todayNotifications = notifications.filter(n => isToday(n.createdAt));
  
  const currentPath = '/' + location.pathname.split('/')[1];
  const pageTitle = routeLabels[currentPath] || 'Dashboard';
  const subPath = location.pathname.split('/').slice(2).join(' / ');

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <button className="topbar-menu-toggle" onClick={toggleMobileSidebar} aria-label="Toggle Sidebar">
            <Menu size={20} />
          </button>
          <h1 className="topbar-title">{pageTitle}</h1>
        </div>

        <div className="topbar-right">
          <div className="topbar-search-container" ref={searchRef}>
            <div className="topbar-search">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search across modules..." 
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="topbar-search-dropdown">
                {suggestions.map((item, idx) => (
                  <div 
                    key={`${item.path}-${item.subTabKey || ''}`} 
                    className={`topbar-search-item ${idx === activeIndex ? 'active' : ''}`}
                    onClick={() => handleNavigate(item)}
                  >
                    <span className="search-item-label">{item.label}</span>
                    <span className="search-item-shortcut">Go</span>
                  </div>
                ))}
              </div>
            )}
          </div>


          <div className="topbar-notification-container">
            <button 
              className={`topbar-notification ${showNotifications ? 'active' : ''}`}
              onClick={handleToggleNotifications}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="notification-count-badge">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="notifications-dropdown" onClick={e => e.stopPropagation()}>
                <div className="notifications-header">
                  <div className="notifications-title-area">
                    <h3>Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="unread-badge">{unreadCount} New</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button className="btn-mark-all" onClick={handleMarkAllRead}>
                      <Check size={12} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="notifications-list">
                  {todayNotifications.length === 0 ? (
                    <div className="notifications-empty">
                      <Bell size={24} className="empty-bell" />
                      <p>No notifications today</p>
                      <span className="empty-sub">We'll alert you about stocks, rentals, and payments.</span>
                    </div>
                  ) : (
                    todayNotifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                      >
                        <div className="notification-icon-container">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="notification-content">
                          <h4 className="notification-item-title">{notif.title}</h4>
                          <p className="notification-item-message">{notif.message}</p>
                          <span className="notification-time">
                            {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {!notif.isRead && <span className="unread-indicator-dot" />}
                      </div>
                    ))
                  )}
                </div>

                <div 
                  className="notifications-dropdown-footer" 
                  style={{
                    padding: '10px 16px',
                    borderTop: '1px solid var(--border-primary)',
                    textAlign: 'center',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    justifyContent: 'center'
                  }}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNotifications(false);
                      setShowAllNotificationsModal(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary, #10b981)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '4px 0',
                      transition: 'opacity 150ms ease',
                      width: '100%'
                    }}
                    className="btn-view-all"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="topbar-divider" />

          <div 
            className="topbar-profile-container" 
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
            }}
            title="Profile Menu"
          >
            <div className="topbar-user-brief">
              <span className="topbar-user-name">{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="topbar-user-avatar" title={`${user?.firstName || ''} ${user?.lastName || ''}`}>
              {user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'}
            </div>

            {/* Premium Profile Dropdown Menu */}
            {showDropdown && (
              <div className="profile-dropdown" onClick={e => e.stopPropagation()}>
                <div className="dropdown-header">
                  <div className="dropdown-user-avatar">
                    {user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'}
                  </div>
                  <div className="dropdown-user-info">
                    <span className="dropdown-name">{user?.firstName} {user?.lastName}</span>
                    <span className="dropdown-role">{user?.role || 'Member'}</span>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setShowDropdown(false);
                    setShowChangePasswordModal(true);
                  }}
                >
                  <Lock size={16} />
                  <span>Change Password</span>
                </button>
                <div className="dropdown-divider" />
                <button 
                  className="dropdown-item text-danger" 
                  onClick={() => {
                    setShowDropdown(false);
                    setShowLogoutModal(true);
                  }}
                >
                  <LogOut size={16} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog Modal */}
      <ConfirmModal 
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out of your account? Any unsaved sessions will end."
        confirmText="Logout"
      />

      {/* Change Password Dialog Modal */}
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* All Notifications Modal */}
      <NotificationsModal
        isOpen={showAllNotificationsModal}
        onClose={() => setShowAllNotificationsModal(false)}
        notifications={notifications}
        onMarkRead={handleMarkAsRead}
        onMarkAllRead={handleMarkAllRead}
        getNotificationIcon={getNotificationIcon}
      />
    </>
  );
}

function ChangePasswordModal({ isOpen, onClose }) {
  const { logout } = useAuth();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.warning('Please fill in all fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.warning('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success('Password updated successfully! Logging out...');
      setTimeout(async () => {
        await logout();
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password. Verify your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3>Change Your Password</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose} disabled={loading}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '40px' }}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '40px' }}
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '40px' }}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NotificationsModal({ isOpen, onClose, notifications, onMarkRead, onMarkAllRead, getNotificationIcon }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen) return null;
  
  const filteredNotifications = notifications.filter(notif => 
    notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notif.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGroup = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateZero = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = todayZero.getTime() - dateZero.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return 'Earlier';
  };

  const groups = {
    Today: [],
    Yesterday: [],
    Earlier: []
  };

  filteredNotifications.forEach(notif => {
    const groupName = getGroup(notif.createdAt);
    groups[groupName].push(notif);
  });

  const hasAnyNotifs = filteredNotifications.length > 0;
  const unreadCount = filteredNotifications.filter(n => !n.isRead).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90vw' }}>
        <div className="modal-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} className="text-accent" style={{ color: 'var(--accent-primary, #10b981)' }} />
            <h3 style={{ margin: 0 }}>All Notifications</h3>
            {unreadCount > 0 && <span className="unread-badge">{unreadCount} New</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && (
              <button 
                className="btn btn-ghost" 
                onClick={onMarkAllRead}
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                Mark all read
              </button>
            )}
            <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        
        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '16px' }}>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search notifications..." 
              className="form-input" 
              style={{ paddingLeft: '36px', height: '36px', fontSize: '13px', width: '100%' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {!hasAnyNotifs ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Bell size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0 }}>No notifications found</p>
            </div>
          ) : (
            Object.entries(groups).map(([groupName, list]) => {
              if (list.length === 0) return null;
              return (
                <div key={groupName} style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '4px' }}>
                    {groupName}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {list.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={() => onMarkRead(notif.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px',
                          background: notif.isRead ? 'var(--bg-hover)' : 'rgba(var(--accent-primary-rgb, 16, 185, 129), 0.05)',
                          borderRadius: '8px',
                          border: `1px solid ${notif.isRead ? 'transparent' : 'var(--border-secondary)'}`,
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                          position: 'relative'
                        }}
                        className="notif-modal-item"
                      >
                        <div className="notification-icon-container" style={{ flexShrink: 0 }}>
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                          <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: notif.isRead ? '600' : '700', color: 'var(--text-primary)' }}>
                            {notif.title}
                          </h5>
                          <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                            {notif.message}
                          </p>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {!notif.isRead && (
                          <span 
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#10b981',
                              alignSelf: 'center',
                              flexShrink: 0
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
