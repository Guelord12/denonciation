import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function LiveChat({ liveId, isHost }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { sendLiveMessage, on, off } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [error, setError] = useState('');
  const flatListRef = useRef();

  useEffect(() => {
    on('new-message', (msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    on('message-rejected', (data) => {
      setError(`Message rejeté: ${data.reason}`);
      setTimeout(() => setError(''), 3000);
    });
    on('participant-joined', (data) => setParticipantsCount(data.participantsCount));
    on('participant-left', (data) => setParticipantsCount(data.participantsCount));

    return () => {
      off('new-message');
      off('message-rejected');
      off('participant-joined');
      off('participant-left');
    };
  }, []);

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    sendLiveMessage(liveId, inputMessage, replyTo?.id);
    setInputMessage('');
    setReplyTo(null);
  };

  const formatTime = (date) => new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item }) => (
    <View style={[styles.message, item.isHost && styles.hostMessage]}>
      <View style={styles.messageHeader}>
        <Text style={styles.username}>{item.isHost ? '🎙️ Hôte' : 'Anonyme'}</Text>
        <Text style={styles.time}>{formatTime(item.created_at)}</Text>
      </View>
      {item.replyTo && (
        <View style={styles.replyIndicator}>
          <Text style={styles.replyText}>↳ Réponse à : {item.replyTo.username}</Text>
        </View>
      )}
      <Text>{item.message}</Text>
      <TouchableOpacity onPress={() => setReplyTo(item)}>
        <Text style={styles.replyBtn}>↩️ {t('live.reply')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <Text>👥 {participantsCount} {t('live.participants')}</Text>
        {isHost && <Text style={styles.hostBadge}>🎥 Hôte</Text>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {replyTo && (
        <View style={styles.replyBar}>
          <Text>Réponse à : {replyTo.username}</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.cancelReply}>✖</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={renderMessage}
        style={styles.messagesList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={replyTo ? `Répondre à ${replyTo.username}...` : t('live.writeMessage')}
          value={inputMessage}
          onChangeText={setInputMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  hostBadge: { backgroundColor: '#e63946', paddingHorizontal: 8, borderRadius: 20, color: '#fff' },
  error: { color: '#dc3545', padding: 8, textAlign: 'center' },
  replyBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: '#f0f0f0' },
  cancelReply: { color: '#e63946' },
  messagesList: { flex: 1, padding: 8 },
  message: { marginBottom: 8, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 8 },
  hostMessage: { backgroundColor: '#e63946', color: '#fff' },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  username: { fontWeight: 'bold' },
  time: { fontSize: 10, color: '#666' },
  replyIndicator: { marginBottom: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#ccc' },
  replyText: { fontSize: 12, color: '#666' },
  replyBtn: { fontSize: 12, color: '#e63946', marginTop: 4, alignSelf: 'flex-start' },
  inputContainer: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginRight: 8 },
  sendBtn: { backgroundColor: '#e63946', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  sendText: { color: '#fff' },
});