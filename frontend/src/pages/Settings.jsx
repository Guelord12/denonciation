import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Layout from '../components/Layout';

const Settings = () => {
  const { user, logout, updateUser } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [premiumStatus, setPremiumStatus] = useState({ isPremium: false, expiresAt: null });
  
  const [profileForm, setProfileForm] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
    ville_residence: user?.ville_residence || '',
    pays_residence: user?.pays_residence || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Récupérer le statut premium actuel
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        const res = await api.get('/subscriptions/status');
        setPremiumStatus(res.data);
      } catch (err) {
        console.error('Erreur statut premium:', err);
      }
    };
    if (user) fetchPremiumStatus();
  }, [user]);

  const handleProfileChange = (e) => setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.put('/users/me', profileForm);
      updateUser(response.data);
      setSuccess(t('common.success'));
    } catch (err) {
      setError(err.response?.data?.error || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/users/me/password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      setSuccess(t('common.success'));
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('settings.deleteWarning'))) return;
    setLoading(true);
    try {
      await api.delete('/users/me');
      logout();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || t('errors.generic'));
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Layout>
      <div className="container">
        <h1>{t('settings.title')}</h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Thème */}
        <div style={{ marginBottom: '2rem' }}>
          <h2>{t('settings.theme')}</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
            {t('settings.darkMode')}
          </label>
        </div>

        {/* Langue */}
        <div style={{ marginBottom: '2rem' }}>
          <h2>{t('settings.language')}</h2>
          <select value={language} onChange={(e) => changeLanguage(e.target.value)}>
            <option value="fr">{t('settings.french')}</option>
            <option value="en">{t('settings.english')}</option>
          </select>
        </div>

        {/* Statut premium */}
        <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <h2>🌟 {t('settings.premium')}</h2>
          {premiumStatus.isPremium ? (
            <p>
              ✅ {t('settings.premiumActive')} <br />
              📅 {t('settings.expiresAt')} : {formatDate(premiumStatus.expiresAt)}
            </p>
          ) : (
            <p>
              🔒 {t('settings.premiumInactive')} <br />
              <Link to="/subscribe" style={{ color: '#e63946' }}>
                {t('settings.upgradePremium')}
              </Link>
            </p>
          )}
        </div>

        {/* Contact */}
        <div style={{ marginBottom: '2rem' }}>
          <h2>{t('settings.contact')}</h2>
          <p>
            {t('settings.contactText')}{' '}
            <a href="mailto:denonciation.rdc@gmail.com">denonciation.rdc@gmail.com</a>
          </p>
        </div>

        {/* Profil */}
        <div style={{ marginBottom: '2rem' }}>
          <h2>{t('settings.profile')}</h2>
          <form onSubmit={handleUpdateProfile}>
            <input
              type="text"
              name="nom"
              placeholder={t('register.lastName')}
              value={profileForm.nom}
              onChange={handleProfileChange}
            />
            <input
              type="text"
              name="prenom"
              placeholder={t('register.firstName')}
              value={profileForm.prenom}
              onChange={handleProfileChange}
            />
            <input
              type="email"
              name="email"
              placeholder={t('register.email')}
              value={profileForm.email}
              onChange={handleProfileChange}
            />
            <input
              type="tel"
              name="telephone"
              placeholder={t('register.phone')}
              value={profileForm.telephone}
              onChange={handleProfileChange}
            />
            <input
              type="text"
              name="ville_residence"
              placeholder={t('register.city')}
              value={profileForm.ville_residence}
              onChange={handleProfileChange}
            />
            <input
              type="text"
              name="pays_residence"
              placeholder={t('register.country')}
              value={profileForm.pays_residence}
              onChange={handleProfileChange}
            />
            <button type="submit" disabled={loading}>
              {t('settings.updateProfile')}
            </button>
          </form>
        </div>

        {/* Changement mot de passe */}
        <div style={{ marginBottom: '2rem' }}>
          <h2>{t('settings.changePassword')}</h2>
          <form onSubmit={handleChangePassword}>
            <input
              type="password"
              name="oldPassword"
              placeholder={t('settings.oldPassword')}
              value={passwordForm.oldPassword}
              onChange={handlePasswordChange}
              required
            />
            <input
              type="password"
              name="newPassword"
              placeholder={t('settings.newPassword')}
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              required
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder={t('settings.confirmNewPassword')}
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
            <button type="submit" disabled={loading}>
              {t('settings.changePassword')}
            </button>
          </form>
        </div>

        {/* Règles et confidentialité */}
        <div style={{ marginBottom: '2rem' }}>
          <h2>{t('settings.terms')}</h2>
          <p><Link to="/terms">{t('settings.readTerms')}</Link></p>
          <h2>{t('settings.privacy')}</h2>
          <p><Link to="/privacy">{t('settings.readPrivacy')}</Link></p>
        </div>

        {/* Suppression de compte */}
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#ffeeee', borderRadius: '8px' }}>
          <h2 style={{ color: '#dc3545' }}>⚠️ {t('settings.deleteAccount')}</h2>
          <p>{t('settings.deleteWarning')}</p>
          <button onClick={handleDeleteAccount} style={{ background: '#dc3545' }} disabled={loading}>
            {t('settings.deleteAccount')}
          </button>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <button onClick={logout} style={{ background: '#6c757d' }}>
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;