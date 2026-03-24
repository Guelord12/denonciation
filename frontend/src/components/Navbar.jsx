import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DarkModeToggle from './DarkModeToggle';
import { useTranslation } from 'react-i18next';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { darkMode } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      {/* Logo supprimé - remplacé par un titre simple */}
      <div className="navbar-brand" onClick={() => navigate('/')}>
        <span className="brand-text">Dénonciation</span>
      </div>

      <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </button>

      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>{t('nav.home')}</Link>
        <Link to="/my-reports" onClick={() => setMenuOpen(false)}>{t('nav.myReports')}</Link>
        <Link to="/create-report" onClick={() => setMenuOpen(false)}>{t('nav.newReport')}</Link>
        <Link to="/statistics" onClick={() => setMenuOpen(false)}>{t('nav.statistics')}</Link>
        <Link to="/news" onClick={() => setMenuOpen(false)}>{t('nav.news')}</Link>
        <Link to="/create-live" onClick={() => setMenuOpen(false)}>{t('nav.createLive')}</Link>
        <Link to="/notifications" onClick={() => setMenuOpen(false)}>{t('nav.notifications')}</Link>
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