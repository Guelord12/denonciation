import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

export default function NewsScreen() {
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
      const res = await api.get(`/news?region=${region}&limit=20`);
      setArticles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url) => {
    Linking.openURL(url);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openLink(item.link)}>
      {item.image && <Image source={{ uri: item.image }} style={styles.image} />}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.source}>{item.source}</Text>
      </View>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('news.title')}</Text>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>{t('news.region')} : </Text>
          <View style={styles.regionButtons}>
            {['RDC', 'Afrique', 'MONDE'].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.regionButton, region === r && styles.activeRegion]}
                onPress={() => setRegion(r)}
              >
                <Text style={styles.regionText}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      {articles.length === 0 ? (
        <Text style={styles.centerText}>{t('news.noNews')}</Text>
      ) : (
        <FlatList data={articles} keyExtractor={(item, idx) => idx.toString()} renderItem={renderItem} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  filterRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  filterLabel: { fontSize: 16, marginRight: 8 },
  regionButtons: { flexDirection: 'row' },
  regionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8 },
  activeRegion: { backgroundColor: '#e63946' },
  regionText: { color: '#333' },
  card: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  image: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
  textContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  source: { fontSize: 12, color: '#666' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerText: { textAlign: 'center', marginTop: 50 },
});