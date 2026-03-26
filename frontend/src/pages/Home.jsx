import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportsService } from '../services/reports';
import api from '../services/api';
import ReportCard from '../components/ReportCard';
import Layout from '../components/Layout';
import AssistantChatbot from '../components/AssistantChatbot';
import { useTranslation } from 'react-i18next';

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const city = user?.ville_residence || '';
      const livesRes = await api.get(`/lives/active/filtered?city=${city}`);
      setLives(livesRes.data);
      const reportsData = await reportsService.getAll(30);
      setReports(reportsData);
    } catch (err) {
      console.error('Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <div className="container text-center" style={{ marginTop: '50px' }}>{t('common.loading')}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="lives-section">
        <div className="container">
          <h2>🎥 {t('live.activeLives')}</h2>
          {lives.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {lives.map(live => (
                <Link key={live.id} to={`/live/${live.id}`} style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'white', textDecoration: 'none' }}>
                  {live.titre} {live.is_premium && '⭐'}
                </Link>
              ))}
            </div>
          ) : (
            <p>{t('live.noLive')}</p>
          )}
        </div>
      </div>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
          <h2>📢 {t('reports.title')}</h2>
          <Link to="/create-report" className="btn-primary">+ {t('reports.newReport')}</Link>
        </div>
        {reports.length > 0 ? (
          reports.map(report => <ReportCard key={report.id} report={report} onUpdate={fetchData} />)
        ) : (
          <p className="text-center">{t('reports.noReports')}</p>
        )}
      </div>
      <AssistantChatbot />
    </Layout>
  );
}