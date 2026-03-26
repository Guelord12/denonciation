import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { useNavigation } from '@react-navigation/native';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePress = (item) => {
    if (!item.is_read) markAsRead(item.id);
    if (item.report_id) {
      navigation.navigate('ReportDetail', { id: item.report_id });
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'like': return '👍';
      case 'comment': return '💬';
      case 'witness': return '👁️';
      case 'reply': return '↩️';
      case 'new_report': return '📢';
      default: return '🔔';
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    return `Il y a ${days} j`;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.is_read && styles.unread]}
      onPress={() => handlePress(item)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.icon}>{getIcon(item.type)}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.content}>{item.content}</Text>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.badge} />}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#e63946" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('notifications.title')}</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAll}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {notifications.length === 0 ? (
        <Text style={styles.empty}>{t('notifications.noNotifications')}</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 20, fontWeight: 'bold' },
  markAll: { color: '#e63946' },
  card: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  unread: { backgroundColor: '#fff3e0' },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: 24, marginRight: 12 },
  textContainer: { flex: 1 },
  content: { fontSize: 14, marginBottom: 4 },
  date: { fontSize: 12, color: '#666' },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e63946', marginLeft: 8 },
  empty: { textAlign: 'center', marginTop: 50, color: '#666' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});