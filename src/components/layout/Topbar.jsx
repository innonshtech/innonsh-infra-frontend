import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { Search, Bell, ChevronRight, Languages } from 'lucide-react';
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
  const { user } = useAuth();
  const { lang, setLang } = useTranslation();
  
  const currentPath = '/' + location.pathname.split('/')[1];
  const pageTitle = routeLabels[currentPath] || 'Dashboard';
  const subPath = location.pathname.split('/').slice(2).join(' / ');

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-breadcrumb">
          <span className="breadcrumb-root">Innonsh Infra</span>
          <ChevronRight size={14} className="breadcrumb-sep" />
          <span className="breadcrumb-current">{pageTitle}</span>
          {subPath && (
            <>
              <ChevronRight size={14} className="breadcrumb-sep" />
              <span className="breadcrumb-sub">{subPath}</span>
            </>
          )}
        </div>
        <h1 className="topbar-title">{pageTitle}</h1>
      </div>

      <div className="topbar-right">
        <div className="topbar-search">
          <Search size={16} />
          <input type="text" placeholder="Search across modules..." />
        </div>

        <button 
          className="topbar-notification" 
          onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          title="Switch Language"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px' }}
        >
          <Languages size={18} />
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{lang === 'en' ? 'EN' : 'HI'}</span>
        </button>

        <button className="topbar-notification">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        <div className="topbar-divider" />

        <div className="topbar-user-brief">
          <span className="topbar-greeting">
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}
          </span>
          <span className="topbar-user-name">{user?.firstName}</span>
        </div>
      </div>
    </header>
  );
}
