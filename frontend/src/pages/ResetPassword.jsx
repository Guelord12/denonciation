import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Layout from '../components/Layout';

const ResetPassword = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError(t('auth.passwordsDoNotMatch')); return; }
    if (newPassword.length < 6) { setError(t('auth.passwordMinLength')); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      await api.post('/auth/reset-password', { code, newPassword });
      setMessage(t('auth.passwordResetSuccess'));
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('errors.generic'));
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="container">
        <form onSubmit={handleSubmit} className="auth-form">
          <h1>{t('auth.resetPassword')}</h1>
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}
          <input type="password" placeholder={t('auth.newPassword')} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          <input type="password" placeholder={t('auth.confirmNewPassword')} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? t('common.loading') : t('auth.resetPassword')}</button>
        </form>
      </div>
    </Layout>
  );
};

export default ResetPassword;