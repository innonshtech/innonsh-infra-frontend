import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Search, Bell, ChevronRight, Languages, LogOut, AlertTriangle, AlertCircle, Clock, Info, Check } from 'lucide-react';
import ConfirmModal from '../ui/ConfirmModal';
import { notificationService } from '../../services/api';
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
};

export default function Topbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { lang, setLang } = useTranslation();
  const toast = useToast();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

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
        return <Clock className="notif-icon info" size={16} />;
      case 'OVERDUE_INVOICE':
        return <AlertCircle className="notif-icon danger" size={16} />;
      default:
        return <Info className="notif-icon success" size={16} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const currentPath = '/' + location.pathname.split('/')[1];
  const pageTitle = routeLabels[currentPath] || 'Dashboard';
  const subPath = location.pathname.split('/').slice(2).join(' / ');

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="topbar-title">{pageTitle}</h1>
        </div>

        <div className="topbar-right">
          <div className="topbar-search">
            <Search size={16} />
            <input type="text" placeholder="Search across modules..." />
          </div>

          <button 
            className="topbar-notification topbar-lang-btn" 
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            title="Switch Language"
          >
            <Languages size={14} />
            <span style={{ fontSize: '11px' }}>{lang === 'en' ? 'EN' : 'HI'}</span>
          </button>

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
                  {notifications.length === 0 ? (
                    <div className="notifications-empty">
                      <Bell size={24} className="empty-bell" />
                      <p>No notifications yet</p>
                      <span className="empty-sub">We'll alert you about stocks, rentals, and payments.</span>
                    </div>
                  ) : (
                    notifications.map((notif) => (
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
    </>
  );
}
