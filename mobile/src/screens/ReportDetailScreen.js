import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { reportsService } from '../services/reports';
import ReportCard from '../components/ReportCard';
import CommentSection from '../components/CommentSection';

export default function ReportDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { id } = route.params;
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

  if (loading) return <ActivityIndicator style={styles.center} />;
  if (error) return <Text style={styles.center}>{error}</Text>;

  return (
    <ScrollView>
      <ReportCard report={report} onUpdate={fetchReport} navigation={navigation} />
      <CommentSection reportId={id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
});