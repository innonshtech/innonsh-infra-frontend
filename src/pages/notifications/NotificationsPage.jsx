import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/api';
import { Bell, ShoppingCart, IndianRupee, Users, Wrench, Package, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import './Notifications.css';

const TYPE_CONFIG = {
  OVERDUE_INVOICE: { icon: IndianRupee, color: '#ef4444', label: 'Overdue Invoice' },
  LOW_STOCK: { icon: Package, color: '#f59e0b', label: 'Low Stock' },
  IDLE_EQUIPMENT: { icon: Wrench, color: '#8b5cf6', label: 'Idle Equipment' },
  PENDING_APPROVAL: { icon: ShoppingCart, color: '#3b82f6', label: 'Pending Approval' },
  PAYROLL_DUE: { icon: Users, color: '#10b981', label: 'Payroll Due' },
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [generating, setGenerating] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await notificationService.getAll();
      setNotifs(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadNotifications(); }, []);

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) { console.error(e); }
  };

  const markRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) { console.error(e); }
  };

  const generateAlerts = async () => {
    setGenerating(true);
    try {
      const { data } = await notificationService.generate();
      alert(`Generated ${data.data?.generated || 0} new alerts`);
      loadNotifications();
    } catch (e) { alert('Failed to generate'); }
    setGenerating(false);
  };

  const filtered = filter === 'all' ? notifs : filter === 'unread' ? notifs.filter(n => !n.isRead) : notifs.filter(n => n.isRead);
  const unreadCount = notifs.filter(n => !n.isRead).length;

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <div className="notifications-page">
      <div className="labour-tab-bar">
        <button className={`labour-tab ${filter === 'all' ? 'act' : ''}`} onClick={() => setFilter('all')}>All ({notifs.length})</button>
        <button className={`labour-tab ${filter === 'unread' ? 'act' : ''}`} onClick={() => setFilter('unread')}>Unread ({unreadCount})</button>
        <button className={`labour-tab ${filter === 'read' ? 'act' : ''}`} onClick={() => setFilter('read')}>Read</button>
        <div style={{ flex: 1 }} />
        <button className="btn-bp" onClick={generateAlerts} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={14} className={generating ? 'spin' : ''} /> Scan for Alerts
        </button>
        {unreadCount > 0 && <button className="btn-gp" onClick={markAllRead}>Mark all read</button>}
      </div>

      <div className="labour-content">
        <div className="labour-page-title">Notifications</div>
        <div className="labour-page-sub">
          {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up! No unread notifications.'}
        </div>

        {loading ? (
          <div className="page-loader"><div className="spinner spinner-lg"></div></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <Bell size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No notifications. Click "Scan for Alerts" to check for overdue invoices, idle equipment, and low stock.</p>
          </div>
        ) : (
          <div className="notif-list">
            {filtered.map(n => {
              const config = TYPE_CONFIG[n.type] || { icon: Bell, color: '#6b7280', label: n.type };
              const Icon = config.icon;
              return (
                <div key={n.id} className={`notif-item ${!n.isRead ? 'unread' : ''}`} onClick={() => !n.isRead && markRead(n.id)} style={{ cursor: !n.isRead ? 'pointer' : 'default' }}>
                  <div className="notif-icon-box" style={{ background: `${config.color}15`, color: config.color }}>
                    <Icon size={18} />
                  </div>
                  <div className="notif-info">
                    <div className="notif-header">
                      <span className="notif-title">{n.title}</span>
                      <span className="notif-time">{timeAgo(n.createdAt)}</span>
                    </div>
                    <div className="notif-msg">{n.message}</div>
                    <span style={{ fontSize: 10, color: config.color, fontWeight: 500, marginTop: 2 }}>{config.label}</span>
                  </div>
                  {!n.isRead && <div className="unread-dot"></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
