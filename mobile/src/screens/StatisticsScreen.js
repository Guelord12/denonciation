import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity, // Import manquant
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import api from '../api/client';

const screenWidth = Dimensions.get('window').width;

export default function StatisticsScreen() {
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
        api.get('/stats'),
      ]);
      setTemporalData(temporalRes.data.data);
      setCategories(categoriesRes.data);
      setTopReports(topRes.data);
      setCityStats(cityRes.data);
      setGeneralStats(generalRes.data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e63946" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const lineData = {
    labels: temporalData.labels,
    datasets: [{ data: temporalData.counts, color: () => '#e63946', strokeWidth: 2 }],
  };

  const barData = {
    labels: categories.map(c => c.categorie.substring(0, 10)),
    datasets: [{ data: categories.map(c => c.count) }],
  };

  const pieData = categories.slice(0, 5).map(c => ({
    name: c.categorie.substring(0, 12),
    population: c.count,
    color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    legendFontColor: '#333',
  }));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('statistics.title')}</Text>

      <View style={styles.statsCards}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('statistics.totalReports')}</Text>
          <Text style={styles.cardValue}>{generalStats?.totalReports || 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('statistics.totalUsers')}</Text>
          <Text style={styles.cardValue}>{generalStats?.totalUsers || 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('statistics.totalLikes')}</Text>
          <Text style={styles.cardValue}>{generalStats?.totalLikes || 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('statistics.totalWitnesses')}</Text>
          <Text style={styles.cardValue}>{generalStats?.totalWitnesses || 0}</Text>
        </View>
      </View>

      <View style={styles.periodSelector}>
        {['daily', 'weekly', 'monthly', 'quarterly', 'semester', 'yearly'].map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.activePeriod]}
            onPress={() => setPeriod(p)}
          >
            <Text style={styles.periodText}>{t(`statistics.${p}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.subtitle}>{t('statistics.evolution')}</Text>
      <LineChart
        data={lineData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
      />

      <Text style={styles.subtitle}>{t('statistics.byCategory')}</Text>
      <BarChart
        data={barData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
      />

      <Text style={styles.subtitle}>{t('statistics.categoryDistribution')}</Text>
      <PieChart
        data={pieData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
      />

      <Text style={styles.subtitle}>{t('statistics.topReports')}</Text>
      {topReports.map(r => (
        <View key={r.id} style={styles.topItem}>
          <Text>{r.titre}</Text>
          <Text>{r.total_interactions} interactions ({r.percent}%)</Text>
        </View>
      ))}

      <Text style={styles.subtitle}>{t('statistics.topCities')}</Text>
      {cityStats.map(c => (
        <Text key={c.ville_signalement}>{c.ville_signalement}: {c.count} signalements</Text>
      ))}
    </ScrollView>
  );
}

const chartConfig = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(230, 57, 70, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: { borderRadius: 16 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#e63946' },
  statsCards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  card: { width: '48%', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 8 },
  cardTitle: { fontSize: 14, color: '#666' },
  cardValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  periodSelector: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8, marginBottom: 8 },
  activePeriod: { backgroundColor: '#e63946' },
  periodText: { color: '#333' },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 12 },
  chart: { marginVertical: 8, borderRadius: 16 },
  topItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#dc3545' },
});