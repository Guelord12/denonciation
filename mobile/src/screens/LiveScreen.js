import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { liveService } from '../services/live';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import LiveChat from '../components/LiveChat';
import api from '../api/client';
import { Video } from 'expo-av';

export default function LiveScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { id } = route.params;
  const { user } = useAuth();
  const { joinLive, leaveLive, on, off } = useSocket();
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchLive();
    fetchFollowersInfo();
    joinLive(id);

    on('live_started', (updatedLive) => {
      if (updatedLive.id === parseInt(id)) setIsLive(true);
    });
    on('live_ended', (updatedLive) => {
      if (updatedLive.id === parseInt(id)) setIsLive(false);
    });

    return () => {
      leaveLive(id);
      off('live_started');
      off('live_ended');
    };
  }, [id]);

  useEffect(() => {
    if (live) {
      setIsLive(live.status === 'live');
      setIsOwner(live.user_id === user?.id);
      setParticipantsCount(live.participantsCount || 0);
    }
  }, [live, user]);

  const fetchLive = async () => {
    try {
      const data = await liveService.getById(id);
      setLive(data);
    } catch (err) {
      Alert.alert(t('errors.notFound'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowersInfo = async () => {
    if (!user) return;
    try {
      const response = await api.get(`/follows/${user.id}/status`);
      setFollowersCount(response.data.followersCount);
      setIsFollowing(response.data.isFollowing);
    } catch (err) {}
  };

  const handleFollow = async () => {
    if (!live) return;
    try {
      if (isFollowing) {
        await api.delete(`/follows/${live.user_id}`);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await api.post(`/follows/${live.user_id}`);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err) {}
  };

  const handleStartLive = async () => {
    try {
      await liveService.start(id);
      fetchLive();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error);
    }
  };

  const handleEndLive = async () => {
    try {
      await liveService.end(id);
      fetchLive();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error);
    }
  };

  const handleJoinLive = async () => {
    try {
      await api.post(`/lives/${id}/join`);
      fetchLive();
    } catch (err) {}
  };

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{live.titre}</Text>
          <Text>{live.description}</Text>
        </View>
        <View style={styles.stats}>
          <Text>👥 {participantsCount} {t('live.participants')}</Text>
          <TouchableOpacity onPress={handleFollow} style={styles.followBtn}>
            <Text>{isFollowing ? '✓ Abonné' : '+ S\'abonner'} ({followersCount})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {live.is_premium && <Text style={styles.premiumBadge}>⭐ {t('live.premiumLive')}</Text>}

      {isOwner && (
        <View style={styles.hostControls}>
          {!isLive ? (
            <TouchableOpacity style={styles.startBtn} onPress={handleStartLive}>
              <Text>{t('live.startLive')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.endBtn} onPress={handleEndLive}>
              <Text>{t('live.endLive')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isOwner && !isLive && (
        <View style={styles.waitingContainer}>
          <Text>{t('live.waiting')}</Text>
          <TouchableOpacity style={styles.notifyBtn} onPress={handleJoinLive}>
            <Text>🔔 Être averti</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.videoContainer}>
        {isLive ? (
          <Video
            source={{ uri: `https://denonciation-backend.onrender.com/stream/${live.stream_key}` }}
            style={styles.video}
            useNativeControls
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text>{t('live.waiting')}</Text>
          </View>
        )}
      </View>

      <LiveChat liveId={id} isHost={isOwner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: 'bold' },
  stats: { alignItems: 'flex-end' },
  followBtn: { backgroundColor: '#e63946', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  premiumBadge: { backgroundColor: '#ffc107', padding: 4, alignSelf: 'flex-start', marginHorizontal: 16, marginBottom: 8 },
  hostControls: { paddingHorizontal: 16, marginBottom: 8 },
  startBtn: { backgroundColor: '#28a745', padding: 8, borderRadius: 8, alignItems: 'center' },
  endBtn: { backgroundColor: '#dc3545', padding: 8, borderRadius: 8, alignItems: 'center' },
  waitingContainer: { alignItems: 'center', padding: 16 },
  notifyBtn: { backgroundColor: '#e63946', padding: 8, borderRadius: 8, marginTop: 8 },
  videoContainer: { height: 250, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  video: { flex: 1, width: '100%' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});