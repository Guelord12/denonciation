import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import DarkModeToggle from './DarkModeToggle';
import api from '../services/api';
import io from 'socket.io-client';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { darkMode } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
    socket.on('new_notification', () => fetchUnreadCount());
    return () => socket.disconnect();
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Erreur compteur notifs:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="logo" onClick={() => navigate('/')}>
        <img src="/logo.png" alt="Dénonciation" />
      </div>
      <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>{t('nav.home')}</Link>
        <Link to="/my-reports" onClick={() => setMenuOpen(false)}>{t('nav.myReports')}</Link>
        <Link to="/create-report" onClick={() => setMenuOpen(false)}>{t('nav.newReport')}</Link>
        <Link to="/statistics" onClick={() => setMenuOpen(false)}>{t('nav.statistics')}</Link>
        <Link to="/news" onClick={() => setMenuOpen(false)}>{t('nav.news')}</Link>
        <Link to="/create-live" onClick={() => setMenuOpen(false)}>{t('nav.createLive')}</Link>
        <Link to="/notifications" onClick={() => setMenuOpen(false)} className="notification-icon">
          🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </Link>
        <Link to="/settings" onClick={() => setMenuOpen(false)}>{t('nav.settings')}</Link>
        <DarkModeToggle />
        {user && (
          <div className="user-info">
            <img src={user.avatar || '/default-avatar.png'} alt="avatar" className="user-avatar" />
            <span>{user.username}</span>
            <button onClick={handleLogout} className="btn-outline">{t('nav.logout')}</button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;