import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { reportsService } from '../services/reports';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function ReportCard({ report, onUpdate, navigation }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [witnessed, setWitnessed] = useState(false);
  const [shared, setShared] = useState(false);
  const [likeCount, setLikeCount] = useState(report.likes_count || 0);
  const [dislikeCount, setDislikeCount] = useState(report.dislikes_count || 0);
  const [witnessCount, setWitnessCount] = useState(report.witnesses_count || 0);
  const [sharesCount, setSharesCount] = useState(report.shares_count || 0);

  useEffect(() => {
    if (user) {
      loadInteractionStatus();
      loadShareStatus();
    }
  }, [user, report.id]);

  const loadInteractionStatus = async () => {
    try {
      const likeStatus = await reportsService.getLikeStatus(report.id);
      setLiked(likeStatus.liked);
      setDisliked(likeStatus.disliked);
      const witnessStatus = await reportsService.hasWitnessed(report.id);
      setWitnessed(witnessStatus.hasWitnessed);
    } catch (err) {}
  };

  const loadShareStatus = async () => {
    try {
      const response = await api.get(`/shares/reports/${report.id}/count`);
      setSharesCount(response.data.sharesCount);
      setShared(response.data.hasShared);
    } catch (err) {}
  };

  const handleLike = async () => {
    if (liked) return;
    try {
      const result = await reportsService.like(report.id, 'like');
      setLikeCount(result.likes);
      setDislikeCount(result.dislikes);
      setLiked(true);
      if (disliked) setDisliked(false);
      onUpdate();
    } catch (err) {}
  };

  const handleDislike = async () => {
    if (disliked) return;
    try {
      const result = await reportsService.like(report.id, 'dislike');
      setLikeCount(result.likes);
      setDislikeCount(result.dislikes);
      setDisliked(true);
      if (liked) setLiked(false);
      onUpdate();
    } catch (err) {}
  };

  const handleWitness = async () => {
    if (witnessed) return;
    try {
      const result = await reportsService.witness(report.id);
      setWitnessCount(result.witnesses);
      setWitnessed(true);
      onUpdate();
    } catch (err) {}
  };

  const handleShare = async () => {
    if (shared) return;
    try {
      const response = await api.post(`/shares/reports/${report.id}`);
      setSharesCount(response.data.sharesCount);
      setShared(true);
      // Share via native sharing
      const url = `https://denonciation-frontend.onrender.com/report/${report.id}`;
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(url);
        Alert.alert('Lien copié');
      } else {
        const { Share } = require('react-native');
        await Share.share({ title: report.titre, message: report.description, url });
      }
    } catch (err) {}
  };

  const getMediaType = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
    return 'file';
  };

  const renderEvidence = (url, idx) => {
    let cleanUrl = url;
    if (cleanUrl.startsWith('http://')) cleanUrl = cleanUrl.replace('http://', 'https://');
    const type = getMediaType(cleanUrl);
    if (type === 'image') {
      return <Image key={idx} source={{ uri: cleanUrl }} style={styles.evidenceImage} />;
    } else if (type === 'video') {
      return (
        <View key={idx} style={styles.evidenceVideo}>
          <Text style={styles.videoPlaceholder}>🎬 Vidéo</Text>
          {/* Optionally use Video component from expo-av if installed */}
        </View>
      );
    } else {
      return (
        <View key={idx} style={styles.evidenceFile}>
          <Text>📄 Fichier joint {idx+1}</Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image source={require('../../assets/anonymous-avatar.png')} style={styles.avatar} />
        <Text style={styles.username}>Anonyme</Text>
        <Text style={styles.date}>{new Date(report.created_at).toLocaleString('fr-FR')}</Text>
      </View>
      <Text style={styles.title}>{report.titre}</Text>
      <Text style={styles.description}>{report.description}</Text>
      {report.preuves && report.preuves.length > 0 && (
        <View style={styles.evidenceContainer}>
          {report.preuves.map((url, idx) => renderEvidence(url, idx))}
        </View>
      )}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
          <Text>👍 {likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDislike} style={styles.actionBtn}>
          <Text>👎 {dislikeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleWitness} style={styles.actionBtn}>
          <Text>👁️ {witnessCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
          <Text>📤 {sharesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ReportDetail', { id: report.id })} style={styles.actionBtn}>
          <Text>💬 Commenter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 8, padding: 12, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  username: { fontWeight: 'bold', marginRight: 8 },
  date: { color: '#666', fontSize: 12 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, color: '#e63946' },
  description: { marginBottom: 8 },
  evidenceContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  evidenceImage: { width: 100, height: 100, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  evidenceVideo: { width: 100, height: 100, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  videoPlaceholder: { fontSize: 12 },
  evidenceFile: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8, marginRight: 8, marginBottom: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 },
  actionBtn: { paddingHorizontal: 8 },
});