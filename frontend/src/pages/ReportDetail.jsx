import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { reportsService } from '../services/reports';
import ReportCard from '../components/ReportCard';
import CommentSection from '../components/CommentSection';
import Layout from '../components/Layout';

const ReportDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const data = await reportsService.getById(id);
      setReport(data);
    } catch (err) {
      setError(t('errors.notFound'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout><div className="container text-center">{t('common.loading')}</div></Layout>;
  if (error || !report) return <Layout><div className="container text-center"><p>{error || t('errors.notFound')}</p><button onClick={() => navigate('/')}>{t('common.back')}</button></div></Layout>;

  return (
    <Layout>
      <div className="container">
        <ReportCard report={report} onUpdate={fetchReport} />
        <CommentSection reportId={id} />
      </div>
    </Layout>
  );
};

export default ReportDetail;