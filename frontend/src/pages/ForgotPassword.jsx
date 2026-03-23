import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Layout from '../components/Layout';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    try {
      await api.post('/auth/forgot-password', { identifier });
      setMessage(t('auth.resetCodeSent'));
    } catch (err) {
      setError(err.response?.data?.error || t('errors.generic'));
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="container">
        <form onSubmit={handleSubmit} className="auth-form">
          <h1>{t('auth.forgotPassword')}</h1>
          <p>{t('auth.forgotPasswordInstructions')}</p>
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}
          <input type="text" placeholder={t('auth.emailOrUsername')} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? t('common.loading') : t('auth.sendResetCode')}</button>
          <p className="text-center mt-2"><Link to="/login">{t('auth.backToLogin')}</Link></p>
        </form>
      </div>
    </Layout>
  );
};

export default ForgotPassword;