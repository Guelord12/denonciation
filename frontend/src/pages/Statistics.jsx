import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Layout from '../components/Layout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  Filler
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  Filler
);

const Statistics = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('daily');
  const [temporalData, setTemporalData] = useState({ labels: [], counts: [] });
  const [categories, setCategories] = useState([]);
  const [topReports, setTopReports] = useState([]);
  const [cityStats, setCityStats] = useState([]);
  const [generalStats, setGeneralStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [temporalRes, categoriesRes, topRes, cityRes, generalRes] = await Promise.all([
        api.get(`/stats/temporal?period=${period}`),
        api.get('/stats/categories'),
        api.get('/stats/top?limit=10'),
        api.get('/stats/cities'),
        api.get('/stats')
      ]);
      setTemporalData(temporalRes.data.data);
      setCategories(categoriesRes.data);
      setTopReports(topRes.data);
      setCityStats(cityRes.data);
      setGeneralStats(generalRes.data);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
      // Afficher l'erreur sans rediriger
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const lineChartData = {
    labels: temporalData.labels,
    datasets: [{
      label: t('statistics.totalReports'),
      data: temporalData.counts,
      borderColor: '#e63946',
      backgroundColor: 'rgba(230,57,70,0.2)',
      tension: 0.3,
      fill: true
    }]
  };

  const barChartData = {
    labels: categories.map(c => c.categorie),
    datasets: [{
      label: t('statistics.totalReports'),
      data: categories.map(c => c.count),
      backgroundColor: '#e63946'
    }]
  };

  const pieChartData = {
    labels: categories.map(c => c.categorie),
    datasets: [{
      data: categories.map(c => c.count),
      backgroundColor: ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#264653', '#e76f51', '#8ecae6', '#219ebc', '#ffb703', '#fb8500']
    }]
  };

  if (loading) {
    return (
      <Layout>
        <div className="container text-center" style={{ marginTop: '50px' }}>{t('common.loading')}</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container text-center" style={{ marginTop: '50px' }}>
          <p className="error-message">{error}</p>
          <button onClick={fetchData}>{t('common.retry')}</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container">
        <h1>{t('statistics.title')}</h1>

        <div className="stats-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="stat-card" style={{ background: '#e63946', color: 'white', padding: '1rem', borderRadius: '8px' }}>
            <h3>{t('statistics.totalReports')}</h3>
            <p style={{ fontSize: '2rem' }}>{generalStats?.totalReports || 0}</p>
          </div>
          <div className="stat-card" style={{ background: '#2c3e50', color: 'white', padding: '1rem', borderRadius: '8px' }}>
            <h3>{t('statistics.totalUsers')}</h3>
            <p style={{ fontSize: '2rem' }}>{generalStats?.totalUsers || 0}</p>
          </div>
          <div className="stat-card" style={{ background: '#27ae60', color: 'white', padding: '1rem', borderRadius: '8px' }}>
            <h3>{t('statistics.totalLikes')}</h3>
            <p style={{ fontSize: '2rem' }}>{generalStats?.totalLikes || 0}</p>
          </div>
          <div className="stat-card" style={{ background: '#f39c12', color: 'white', padding: '1rem', borderRadius: '8px' }}>
            <h3>{t('statistics.totalWitnesses')}</h3>
            <p style={{ fontSize: '2rem' }}>{generalStats?.totalWitnesses || 0}</p>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="period">{t('statistics.period')} : </label>
          <select id="period" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="daily">{t('statistics.daily')}</option>
            <option value="weekly">{t('statistics.weekly')}</option>
            <option value="monthly">{t('statistics.monthly')}</option>
            <option value="quarterly">{t('statistics.quarterly')}</option>
            <option value="semester">{t('statistics.semester')}</option>
            <option value="yearly">{t('statistics.yearly')}</option>
          </select>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2>{t('statistics.evolution')}</h2>
          <Line data={lineChartData} options={{ responsive: true }} />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2>{t('statistics.byCategory')}</h2>
          <Bar data={barChartData} options={{ responsive: true }} />
        </div>

        <div style={{ marginBottom: '2rem', maxWidth: '500px', margin: 'auto' }}>
          <h2>{t('statistics.categoryDistribution')}</h2>
          <Pie data={pieChartData} options={{ responsive: true }} />
        </div>

        <h2>{t('statistics.topReports')}</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
          <thead>
            <tr style={{ background: '#e63946', color: 'white' }}>
              <th style={{ padding: '0.5rem' }}>{t('reports.reportTitle')}</th>
              <th>{t('reports.category')}</th>
              <th>{t('reports.city')}</th>
              <th>{t('statistics.interactions')}</th>
              <th>%</th>
             </tr>
          </thead>
          <tbody>
            {topReports.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '0.5rem' }}>{r.titre}</td>
                <td style={{ padding: '0.5rem' }}>{r.categorie}</td>
                <td style={{ padding: '0.5rem' }}>{r.ville_signalement || 'N/A'}</td>
                <td style={{ padding: '0.5rem' }}>{r.total_interactions}</td>
                <td style={{ padding: '0.5rem' }}>{r.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>{t('statistics.topCities')}</h2>
        <ul>
          {cityStats.map(c => <li key={c.ville_signalement}>{c.ville_signalement}: {c.count} signalements</li>)}
        </ul>
      </div>
    </Layout>
  );
};

export default Statistics;