import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

export default function SettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.theme')}</Text>
          <View style={styles.row}>
            <Text>{t('settings.darkMode')}</Text>
            <Switch value={darkMode} onValueChange={toggleDarkMode} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={() => setLanguage('fr')} style={[styles.langBtn, language === 'fr' && styles.activeLang]}>
              <Text>Français</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLanguage('en')} style={[styles.langBtn, language === 'en' && styles.activeLang]}>
              <Text>English</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.contact')}</Text>
          <Text>{t('settings.contactText')} denonciation.rdc@gmail.com</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
          <Text>Nom: {user?.nom} {user?.prenom}</Text>
          <Text>Email: {user?.email}</Text>
          <Text>Téléphone: {user?.telephone}</Text>
          <Text>Ville: {user?.ville_residence}</Text>
        </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  langBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f0f0f0', marginRight: 12 },
  activeLang: { backgroundColor: '#e63946' },
  link: { color: '#e63946', marginTop: 4 },
  dangerZone: { marginTop: 16, padding: 12, backgroundColor: '#ffeeee', borderRadius: 8 },
  dangerTitle: { color: '#dc3545', fontWeight: 'bold', marginBottom: 8 },
  deleteBtn: { backgroundColor: '#dc3545', padding: 12, borderRadius: 8, alignItems: 'center' },
  deleteText: { color: '#fff', fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#6c757d', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  logoutText: { color: '#fff', fontWeight: 'bold' },
});