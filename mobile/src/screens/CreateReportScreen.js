import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { reportsService } from '../services/reports';
import api from '../api/client';

const categories = [
  'Arrestation arbitraire', 'Violence policière', 'Corruption', 'Discrimination',
  'Violence domestique', 'Agression sexuelle', 'Fraude', 'Atteinte à l\'environnement',
  'Censure', 'Tracasseries', 'Viol', 'Vol', 'Harcèlement', 'Enlèvements', 'Agressions',
  'Présence militaire illégale', 'Attaque milicienne', 'Attaque rebelle',
  'Violation des droits de l\'homme', 'Exploitation minière illégale',
  'Non-respect des normes sanitaires', 'Autre'
];

export default function CreateReportScreen({ navigation }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    titre: '',
    description: '',
    categorie: '',
    preuves: [],
    ville_signalement: '',
    latitude: null,
    longitude: null,
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState([]);

  const pickMedia = async (type) => {
    let result;
    if (type === 'photo') {
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    } else if (type === 'video') {
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8 });
    } else if (type === 'gallery') {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
    }
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setPreviews(prev => [...prev, uri]);
      setUploading(true);
      try {
        const file = { uri, name: uri.split('/').pop(), type: 'image/jpeg' };
        const formData = new FormData();
        formData.append('evidence', file);
        const uploadRes = await api.post('/reports/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setForm(prev => ({ ...prev, preuves: [...prev.preuves, uploadRes.data.url] }));
      } catch (err) {
        Alert.alert('Erreur', 'Impossible d\'uploader le fichier');
      } finally {
        setUploading(false);
      }
    }
  };

  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'La géolocalisation est nécessaire pour cette fonction');
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    setForm(prev => ({
      ...prev,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    }));
    // Optionally reverse geocode
  };

  const handleSubmit = async () => {
    if (!form.titre || !form.description || !form.categorie) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await reportsService.create(form);
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const removePreview = (index) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setForm(prev => ({ ...prev, preuves: prev.preuves.filter((_, i) => i !== index) }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder={t('reports.reportTitle')}
          value={form.titre}
          onChangeText={text => setForm({ ...form, titre: text })}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('reports.description')}
          multiline
          numberOfLines={4}
          value={form.description}
          onChangeText={text => setForm({ ...form, description: text })}
        />
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>{t('reports.category')}</Text>
          <View style={styles.categoryRow}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, form.categorie === cat && styles.categoryChipActive]}
                onPress={() => setForm({ ...form, categorie: cat })}
              >
                <Text style={styles.categoryText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.label}>{t('reports.evidence')}</Text>
        <View style={styles.evidenceButtons}>
          <TouchableOpacity style={styles.evidenceBtn} onPress={() => pickMedia('photo')}>
            <Text>📷 {t('reports.addPhoto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.evidenceBtn} onPress={() => pickMedia('video')}>
            <Text>🎥 {t('reports.addVideo')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.evidenceBtn} onPress={() => pickMedia('gallery')}>
            <Text>🖼️ {t('reports.addFile')}</Text>
          </TouchableOpacity>
        </View>

        {previews.length > 0 && (
          <View style={styles.previews}>
            {previews.map((uri, idx) => (
              <View key={idx} style={styles.previewItem}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removePreview} onPress={() => removePreview(idx)}>
                  <Text style={{ color: '#fff' }}>✖</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder={t('reports.city')}
          value={form.ville_signalement}
          onChangeText={text => setForm({ ...form, ville_signalement: text })}
        />
        <TouchableOpacity style={styles.locationBtn} onPress={getLocation}>
          <Text>📍 {t('reports.useLocation')}</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading || uploading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('reports.publish')}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { padding: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  pickerContainer: { marginBottom: 12 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap' },
  categoryChip: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  categoryChipActive: { backgroundColor: '#e63946' },
  categoryText: { color: '#333' },
  evidenceButtons: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  evidenceBtn: { backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  previews: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  previewItem: { position: 'relative', marginRight: 8, marginBottom: 8 },
  previewImage: { width: 80, height: 80, borderRadius: 8 },
  removePreview: { position: 'absolute', top: -8, right: -8, backgroundColor: '#dc3545', borderRadius: 12, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  locationBtn: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  error: { color: '#dc3545', marginBottom: 12 },
  submitBtn: { backgroundColor: '#e63946', padding: 12, borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold' },
});