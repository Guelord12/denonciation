import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { newsService } from '../services/news';
import Layout from '../components/Layout';

const regions = ['RDC', 'Afrique', 'MONDE'];

const News = () => {
  const { t } = useTranslation();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState('RDC');

  useEffect(() => {
    fetchNews();
  }, [region]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await newsService.getAll(region);
      setArticles(data);
    } catch (err) {
      console.error('Erreur chargement actualités:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container">
        <h1>{t('news.title')}</h1>
        <div style={{ marginBottom: '2rem' }}>
          <label>{t('news.region')} : </label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {loading ? <p>{t('common.loading')}</p> : articles.length > 0 ? (
          <div className="news-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '1.5rem' }}>
            {articles.map((article, idx) => (
              <div key={idx} className="news-card" style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                {article.image && <img src={article.image} alt={article.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />}
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{article.title}</h3>
                  <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{article.source}</p>
                  <a href={article.link} target="_blank" rel="noopener noreferrer" style={{ color: '#e63946', textDecoration: 'none' }}>{t('news.readMore')} →</a>
                </div>
              </div>
            ))}
          </div>
        ) : <p>{t('news.noNews')}</p>}
      </div>
    </Layout>
  );
};

export default News;