import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { reportsService } from '../services/reports';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

export default function CommentSection({ reportId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadComments();
  }, [reportId]);

  const loadComments = async () => {
    try {
      const data = await reportsService.getComments(reportId);
      setComments(data);
    } catch (err) {
      console.error(err);
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const comment = await reportsService.addComment(reportId, newComment, replyTo?.id);
      if (replyTo) {
        setComments(prev =>
          prev.map(c =>
            c.id === replyTo.id
              ? { ...c, replies: [...(c.replies || []), comment] }
              : c
          )
        );
        setReplyTo(null);
      } else {
        setComments(prev => [comment, ...prev]);
      }
      setNewComment('');
    } catch (err) {
      setError(err.response?.data?.error || t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => new Date(date).toLocaleString('fr-FR');

  const renderComment = ({ item }) => (
    <View style={styles.comment}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentUsername}>Anonyme</Text>
        <Text style={styles.commentDate}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={styles.commentContent}>{item.contenu}</Text>
      <TouchableOpacity onPress={() => setReplyTo(item)}>
        <Text style={styles.replyBtn}>{t('comments.reply')}</Text>
      </TouchableOpacity>
      {item.replies && item.replies.length > 0 && (
        <View style={styles.replies}>
          {item.replies.map(reply => (
            <View key={reply.id} style={styles.reply}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentUsername}>Anonyme</Text>
                <Text style={styles.commentDate}>{formatDate(reply.created_at)}</Text>
              </View>
              <Text>{reply.contenu}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) return <ActivityIndicator />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('comments.addComment')} ({comments.length})</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {replyTo && (
        <View style={styles.replyBar}>
          <Text>{t('comments.replyTo')} : Anonyme</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.cancelReply}>✖</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={replyTo ? t('comments.reply') : t('comments.writeComment')}
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitText}>{t('comments.addComment')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={comments}
        keyExtractor={item => item.id.toString()}
        renderItem={renderComment}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  error: { color: '#dc3545', marginBottom: 8 },
  replyBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f0f0f0', padding: 8, borderRadius: 8, marginBottom: 8 },
  cancelReply: { color: '#e63946' },
  inputContainer: { flexDirection: 'row', marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginRight: 8, minHeight: 40 },
  submitBtn: { backgroundColor: '#e63946', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  submitText: { color: '#fff' },
  comment: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentUsername: { fontWeight: 'bold' },
  commentDate: { fontSize: 12, color: '#666' },
  commentContent: { marginBottom: 4 },
  replyBtn: { color: '#e63946', fontSize: 12, marginTop: 4 },
  replies: { marginLeft: 16, marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#eee' },
  reply: { marginBottom: 8 },
});