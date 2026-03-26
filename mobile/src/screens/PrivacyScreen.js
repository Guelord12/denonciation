import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('settings.privacy')}</Text>
      <Text style={styles.paragraph}>
        Collecte des données\n
        Nous collectons les informations que vous fournissez lors de l'inscription (nom, email, etc.) et les signalements que vous publiez.
      </Text>
      <Text style={styles.paragraph}>
        Utilisation des données\n
        Les données sont utilisées pour faire fonctionner l'application et pour des statistiques anonymes.
      </Text>
      <Text style={styles.paragraph}>
        Partage des données\n
        Nous ne partageons pas vos données personnelles avec des tiers sans votre consentement.
      </Text>
      <Text style={styles.paragraph}>
        Sécurité\n
        Nous mettons en œuvre des mesures de sécurité pour protéger vos données.
      </Text>
      <Text style={styles.paragraph}>
        Vos droits\n
        Vous pouvez demander la suppression de vos données à tout moment.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#e63946' },
  paragraph: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
});