import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { liveService } from '../services/live';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const CreateLive = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ titre: '', description: '', is_premium: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre) { setError('Le titre est requis'); return; }
    setLoading(true);
    setError('');
    try {
      const live = await liveService.create(form.titre, form.description, form.is_premium);
      navigate(`/live/${live.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création du live');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container">
        <form onSubmit={handleSubmit}>
          <h1>{t('live.createLive')}</h1>
          {error && <div className="error-message">{error}</div>}
          <input type="text" name="titre" placeholder={t('live.liveTitle')} value={form.titre} onChange={handleChange} required />
          <textarea name="description" placeholder={t('live.liveDescription')} value={form.description} onChange={handleChange} rows="4" />
          {user?.isPremium && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" name="is_premium" checked={form.is_premium} onChange={handleChange} />
              {t('live.premiumLive')}
            </label>
          )}
          <button type="submit" disabled={loading}>{loading ? t('common.loading') : t('live.createLive')}</button>
        </form>
      </div>
    </Layout>
  );
};

export default CreateLive;