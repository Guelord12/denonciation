import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { liveService } from '../services/live';
import { useAuth } from '../contexts/AuthContext';

export default function CreateLiveScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [form, setForm] = useState({ titre: '', description: '', is_premium: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.titre) {
      setError('Le titre est requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const live = await liveService.create(form.titre, form.description, form.is_premium);
      navigation.replace('Live', { id: live.id });
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={t('live.liveTitle')}
        value={form.titre}
        onChangeText={text => setForm({ ...form, titre: text })}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder={t('live.liveDescription')}
        value={form.description}
        onChangeText={text => setForm({ ...form, description: text })}
        multiline
      />
      {user?.isPremium && (
        <View style={styles.checkboxRow}>
          <TouchableOpacity onPress={() => setForm({ ...form, is_premium: !form.is_premium })}>
            <Text>{form.is_premium ? '☑️' : '⬜️'}</Text>
          </TouchableOpacity>
          <Text>{t('live.premiumLive')}</Text>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('live.createLive')}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12 },
  textArea: { minHeight: 100 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  error: { color: '#dc3545', marginBottom: 12 },
  submitBtn: { backgroundColor: '#e63946', padding: 12, borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold' },
});