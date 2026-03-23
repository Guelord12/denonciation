import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { reportsService } from '../services/reports';
import Layout from '../components/Layout';

const categories = [
  'Arrestation arbitraire', 'Violence policière', 'Corruption', 'Discrimination',
  'Violence domestique', 'Agression sexuelle', 'Fraude', 'Atteinte à l\'environnement',
  'Censure', 'Tracasseries', 'Viol', 'Vol', 'Harcèlement', 'Enlèvements', 'Agressions',
  'Présence militaire illégale', 'Attaque milicienne', 'Attaque rebelle',
  'Violation des droits de l\'homme', 'Exploitation minière illégale',
  'Non-respect des normes sanitaires', 'Autre'
];

const CreateReport = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    titre: '', description: '', categorie: '', preuves: [],
    ville_signalement: '', latitude: null, longitude: null
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCapture = (type) => {
    if (type === 'photo') {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.setAttribute('accept', 'image/*');
    } else if (type === 'video') {
      fileInputRef.current.setAttribute('capture', 'camcorder');
      fileInputRef.current.setAttribute('accept', 'video/*');
    } else if (type === 'audio') {
      fileInputRef.current.setAttribute('accept', 'audio/*');
    } else {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.setAttribute('accept', 'image/*,video/*,audio/*,application/pdf');
    }
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    const uploadedUrls = [];
    for (const file of files) {
      try {
        const result = await reportsService.uploadEvidence(file);
        uploadedUrls.push(result.url);
      } catch (err) {
        setError(`Erreur upload: ${err.response?.data?.error || err.message}`);
      }
    }
    setForm(prev => ({ ...prev, preuves: [...prev.preuves, ...uploadedUrls] }));
    setUploading(false);
    fileInputRef.current.value = '';
  };

  const getLocation = () => {
    if (!navigator.geolocation) { alert('Géolocalisation non supportée'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
      () => alert('Impossible d\'obtenir votre position')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre || !form.description || !form.categorie) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await reportsService.create(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création du signalement');
      if (err.response?.data?.cleanedTitre) setForm(prev => ({ ...prev, titre: err.response.data.cleanedTitre }));
      if (err.response?.data?.cleanedDescription) setForm(prev => ({ ...prev, description: err.response.data.cleanedDescription }));
    } finally {
      setLoading(false);
    }
  };

  const removeEvidence = (index) => setForm(prev => ({ ...prev, preuves: prev.preuves.filter((_, i) => i !== index) }));

  return (
    <Layout>
      <div className="container">
        <form onSubmit={handleSubmit}>
          <h1>{t('reports.newReport')}</h1>
          {error && <div className="error-message">{error}</div>}
          <input type="text" name="titre" placeholder={t('reports.reportTitle')} value={form.titre} onChange={handleChange} required />
          <textarea name="description" placeholder={t('reports.description')} value={form.description} onChange={handleChange} required />
          <select name="categorie" value={form.categorie} onChange={handleChange} required>
            <option value="">{t('reports.selectCategory')}</option>
            {categories.map(cat => <option key={cat} value={cat}>{t(`categories.${cat.replace(/ /g, '')}`, cat)}</option>)}
          </select>
          <div>
            <label>{t('reports.evidence')}</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => handleCapture('photo')}>📷 {t('reports.addPhoto')}</button>
              <button type="button" onClick={() => handleCapture('video')}>🎥 {t('reports.addVideo')}</button>
              <button type="button" onClick={() => handleCapture('audio')}>🎙️ {t('reports.addAudio')}</button>
              <button type="button" onClick={() => handleCapture('file')}>📄 {t('reports.addFile')}</button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple style={{ display: 'none' }} />
            {uploading && <p>{t('common.loading')}</p>}
            {form.preuves.length > 0 && (
              <div className="evidence-list" style={{ marginTop: '0.5rem' }}>
                {form.preuves.map((url, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <a href={url} target="_blank" rel="noopener noreferrer">Preuve {idx+1}</a>
                    <button type="button" onClick={() => removeEvidence(idx)} style={{ padding: '0.2rem 0.5rem' }}>✖</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <input type="text" name="ville_signalement" placeholder={t('reports.city')} value={form.ville_signalement} onChange={handleChange} />
            <button type="button" onClick={getLocation} style={{ marginTop: '0.5rem' }}>📍 {t('reports.useLocation')}</button>
          </div>
          <button type="submit" disabled={loading || uploading}>
            {loading ? t('common.loading') : t('reports.publish')}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default CreateReport;