import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

export default function AssistantChatbot() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const response = await api.post('/assistant/ask', {
        question,
        language: i18n.language
      });
      setAnswer(response.data.answer);
    } catch (err) {
      setError(t('assistant.unavailable'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setIsOpen(true)}>
        <Text style={styles.fabText}>💬</Text>
      </TouchableOpacity>
      <Modal visible={isOpen} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('assistant.title')}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={styles.close}>✖</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('assistant.placeholder')}
              value={question}
              onChangeText={setQuestion}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={handleAsk} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('assistant.ask')}</Text>}
            </TouchableOpacity>
            {error && <Text style={styles.error}>{error}</Text>}
            {answer && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerTitle}>{t('assistant.response')} :</Text>
                <Text style={styles.answer}>{answer}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#e63946',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: { fontSize: 24, color: '#fff' },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#e63946' },
  close: { fontSize: 18, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 80, marginBottom: 12, textAlignVertical: 'top' },
  button: { backgroundColor: '#e63946', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  error: { color: '#dc3545', marginTop: 8 },
  answerContainer: { marginTop: 12, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 8 },
  answerTitle: { fontWeight: 'bold', marginBottom: 4 },
  answer: { fontSize: 14 },
});