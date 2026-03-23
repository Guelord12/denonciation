import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { reportsService } from '../services/reports';
import ReportCard from '../components/ReportCard';
import Layout from '../components/Layout';

const MyReports = () => {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await reportsService.getMyReports();
      setReports(data);
    } catch (err) {
      console.error('Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout><div className="container text-center">{t('common.loading')}</div></Layout>;

  return (
    <Layout>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
          <h1>{t('nav.myReports')}</h1>
          <Link to="/create-report" className="btn-primary">+ {t('reports.newReport')}</Link>
        </div>
        {reports.length > 0 ? (
          reports.map(report => <ReportCard key={report.id} report={report} onUpdate={fetchReports} />)
        ) : (
          <p className="text-center">{t('reports.noReports')}</p>
        )}
      </div>
    </Layout>
  );
};

export default MyReports;