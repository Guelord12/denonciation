import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { reportsService } from '../services/reports';
import api from '../api/client';
import ReportCard from '../components/ReportCard';
import AssistantChatbot from '../components/AssistantChatbot';
import { useTranslation } from 'react-i18next';

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const city = user?.ville_residence || '';
      const livesRes = await api.get(`/lives/active/filtered?city=${city}`);
      setLives(livesRes.data);
      const reportsData = await reportsService.getAll(30);
      setReports(reportsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderLive = ({ item }) => (
    <TouchableOpacity style={styles.liveItem} onPress={() => navigation.navigate('Live', { id: item.id })}>
      <Text style={styles.liveTitle}>{item.titre} {item.is_premium && '⭐'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e63946" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.livesContainer}>
        <Text style={styles.sectionTitle}>🎥 {t('live.activeLives')}</Text>
        {lives.length > 0 ? (
          <FlatList horizontal data={lives} renderItem={renderLive} keyExtractor={item => item.id.toString()} showsHorizontalScrollIndicator={false} />
        ) : (
          <Text style={styles.noLives}>{t('live.noLive')}</Text>
        )}
      </View>

      <View style={styles.reportsHeader}>
        <Text style={styles.sectionTitle}>📢 {t('reports.title')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateReport')}>
          <Text style={styles.newReportBtn}>+ {t('reports.newReport')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reports}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <ReportCard report={item} onUpdate={fetchData} navigation={navigation} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e63946']} />
        }
      />

      <AssistantChatbot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  livesContainer: { backgroundColor: '#e63946', padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  liveItem: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  liveTitle: { color: '#fff' },
  noLives: { color: '#fff' },
  reportsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginVertical: 12 },
  newReportBtn: { color: '#e63946', fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});