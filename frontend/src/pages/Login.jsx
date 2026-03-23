import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/auth';

const Login = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!username.trim()) newErrors.username = t('auth.usernameRequired');
    if (!password) newErrors.password = t('auth.passwordRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setApiError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await authService.login(username, password);
      login(response.token, response.user);
      navigate('/');
    } catch (err) {
      setApiError(err.response?.data?.error || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h1>{t('auth.loginTitle')}</h1>
        {apiError && <div className="error-message">⚠️ {apiError}</div>}
        <div className="form-group">
          <input
            type="text"
            placeholder={t('auth.username')}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (errors.username) setErrors({ ...errors, username: '' });
            }}
            autoComplete="username"
            className={errors.username ? 'input-error' : ''}
          />
          {errors.username && <div className="field-error">⚠️ {errors.username}</div>}
        </div>
        <div className="form-group">
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              autoComplete="current-password"
              className={errors.password ? 'input-error' : ''}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: 'auto', background: 'none', padding: '0.25rem' }}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {errors.password && <div className="field-error">⚠️ {errors.password}</div>}
        </div>
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? t('common.loading') : t('auth.loginTitle')}
        </button>
        <p className="text-center mt-2">
          {t('auth.noAccount')} <Link to="/register">{t('nav.register')}</Link>
        </p>
        <p className="text-center mt-2">
          <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;