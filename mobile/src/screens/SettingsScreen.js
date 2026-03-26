import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

export default function SettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
    ville_residence: user?.ville_residence || '',
    pays_residence: user?.pays_residence || '',
  });

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const response = await api.put('/users/me', profileForm);
      updateUser(response.data);
      Alert.alert('Succès', 'Profil mis à jour');
      setEditMode(false);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.delete('/users/me');
              await logout();
              navigation.replace('Login');
            } catch (err) {
              Alert.alert('Erreur', err.response?.data?.error || t('errors.generic'));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('settings.title')}</Text>

      {/* Theme */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.theme')}</Text>
        <View style={styles.row}>
          <Text>{t('settings.darkMode')}</Text>
          <Switch value={darkMode} onValueChange={toggleDarkMode} />
        </View>
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => setLanguage('fr')} style={[styles.langBtn, language === 'fr' && styles.activeLang]}>
            <Text>{t('settings.french')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setLanguage('en')} style={[styles.langBtn, language === 'en' && styles.activeLang]}>
            <Text>{t('settings.english')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.contact')}</Text>
        <Text>{t('settings.contactText')} denonciation.rdc@gmail.com</Text>
      </View>

      {/* Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
        {!editMode ? (
          <>
            <Text>Nom: {user?.nom} {user?.prenom}</Text>
            <Text>Email: {user?.email}</Text>
            <Text>Téléphone: {user?.telephone || 'Non renseigné'}</Text>
            <Text>Ville: {user?.ville_residence}</Text>
            <Text>Pays: {user?.pays_residence}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
              <Text style={styles.editText}>Modifier</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={profileForm.prenom}
              onChangeText={text => setProfileForm({ ...profileForm, prenom: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Nom"
              value={profileForm.nom}
              onChangeText={text => setProfileForm({ ...profileForm, nom: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
              value={profileForm.email}
              onChangeText={text => setProfileForm({ ...profileForm, email: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Téléphone"
              keyboardType="phone-pad"
              value={profileForm.telephone}
              onChangeText={text => setProfileForm({ ...profileForm, telephone: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Ville"
              value={profileForm.ville_residence}
              onChangeText={text => setProfileForm({ ...profileForm, ville_residence: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Pays"
              value={profileForm.pays_residence}
              onChangeText={text => setProfileForm({ ...profileForm, pays_residence: text })}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Enregistrer</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditMode(false)}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Terms and Privacy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.terms')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
          <Text style={styles.link}>{t('settings.readTerms')}</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>{t('settings.privacy')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
          <Text style={styles.link}>{t('settings.readPrivacy')}</Text>
        </TouchableOpacity>
      </View>

      {/* Danger zone */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>⚠️ {t('settings.deleteAccount')}</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} disabled={loading}>
          <Text style={styles.deleteText}>{t('settings.deleteAccount')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>{t('nav.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#e63946', textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  langBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f0f0f0', marginRight: 12 },
  activeLang: { backgroundColor: '#e63946' },
  editBtn: { backgroundColor: '#e63946', padding: 8, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  editText: { color: '#fff', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 16 },
  saveBtn: { backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  saveText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: { alignItems: 'center', padding: 8 },
  cancelText: { color: '#666' },
  link: { color: '#e63946', marginTop: 4 },
  dangerZone: { marginTop: 16, padding: 12, backgroundColor: '#ffeeee', borderRadius: 8 },
  dangerTitle: { color: '#dc3545', fontWeight: 'bold', marginBottom: 8 },
  deleteBtn: { backgroundColor: '#dc3545', padding: 12, borderRadius: 8, alignItems: 'center' },
  deleteText: { color: '#fff', fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#6c757d', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  logoutText: { color: '#fff', fontWeight: 'bold' },
});