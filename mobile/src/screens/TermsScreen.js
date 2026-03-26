import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function TermsScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('settings.terms')}</Text>
      <Text style={styles.paragraph}>
        1. Acceptation des conditions\n
        En utilisant l'application Dénonciation, vous acceptez les présentes conditions d'utilisation.
      </Text>
      <Text style={styles.paragraph}>
        2. Contenu interdit\n
        Il est strictement interdit de publier :\n
        - Des images ou vidéos obscènes (nudité, actes sexuels)\n
        - Des images ou vidéos de corps sans vie, d'actes barbares ou de meurtres\n
        - Des propos homophobes, racistes, discriminatoires\n
        - Des campagnes fanatiques ou incitations à la haine
      </Text>
      <Text style={styles.paragraph}>
        3. Modération et sanctions\n
        Les signalements sont modérés. Tout contenu interdit entraînera la suppression du signalement et une suspension temporaire ou définitive du compte.
      </Text>
      <Text style={styles.paragraph}>
        4. Confidentialité\n
        Vos données personnelles sont protégées conformément à la politique de confidentialité.
      </Text>
      <Text style={styles.paragraph}>
        5. Âge minimum\n
        L'application est interdite aux mineurs de moins de 15 ans.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#e63946' },
  paragraph: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
});