import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Layout from '../components/Layout';

const Notifications = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) { console.error(err); }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'like': return '👍'; case 'comment': return '💬'; case 'witness': return '👁️';
      case 'reply': return '↩️'; case 'welcome': return '👋'; default: return '🔔';
    }
  };

  const formatDate = (date) => {
    const d = new Date(date), now = new Date(), diff = now - d, minutes = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    return `Il y a ${days} j`;
  };

  if (loading) return <Layout><div className="container text-center">{t('common.loading')}</div></Layout>;

  return (
    <Layout>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>{t('notifications.title')} {unreadCount > 0 && `(${unreadCount} ${t('notifications.unread')})`}</h1>
          {notifications.length > 0 && <button onClick={markAllAsRead}>{t('notifications.markAllRead')}</button>}
        </div>
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div key={n.id} style={{ padding: '1rem', marginBottom: '0.5rem', background: n.is_read ? '#f5f5f5' : '#fff3e0', borderRadius: '8px', cursor: 'pointer', borderLeft: `4px solid ${n.is_read ? '#ccc' : '#e63946'}` }} onClick={() => !n.is_read && markAsRead(n.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{getIcon(n.type)}</span>
                <div style={{ flex: 1 }}><p style={{ margin: 0 }}>{n.content}</p><small style={{ color: '#666' }}>{formatDate(n.created_at)}</small></div>
                {!n.is_read && <span style={{ background: '#e63946', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.75rem' }}>{t('notifications.unread')}</span>}
              </div>
            </div>
          ))
        ) : <p className="text-center">{t('notifications.noNotifications')}</p>}
      </div>
    </Layout>
  );
};

export default Notifications;