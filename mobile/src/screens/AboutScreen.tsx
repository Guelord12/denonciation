import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Shield, Users, Eye, Globe, Award, Heart, Mail, Github } from 'lucide-react-native';

export default function AboutScreen() {
  const stats = [
    { icon: Users, value: '10,000+', label: 'Utilisateurs' },
    { icon: Eye, value: '5,000+', label: 'Signalements' },
    { icon: Globe, value: '20+', label: 'Pays' },
    { icon: Award, value: '89%', label: 'Résolution' },
  ];

  const values = [
    {
      icon: Shield,
      title: 'Protection',
      description: 'Nous protégeons l\'identité des lanceurs d\'alerte.',
    },
    {
      icon: Heart,
      title: 'Solidarité',
      description: 'La force collective pour dénoncer les injustices.',
    },
    {
      icon: Eye,
      title: 'Transparence',
      description: 'Chaque signalement traité avec transparence.',
    },
  ];

  const handleContact = () => {
    Linking.openURL('mailto:contact@denonciation.com');
  };

  const handleWebsite = () => {
    Linking.openURL('https://denonciation.com');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Shield color="#EF4444" size={48} />
        <Text style={styles.title}>Dénonciation</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notre Mission</Text>
        <Text style={styles.description}>
          Dénonciation est une plateforme citoyenne dédiée à la lutte contre les abus
          et les injustices. Notre mission est de donner une voix à ceux qui n'en ont pas
          et de créer un espace sûr pour signaler les violations des droits humains.
        </Text>
      </View>

      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <stat.icon color="#EF4444" size={28} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nos Valeurs</Text>
        {values.map((value, index) => (
          <View key={index} style={styles.valueItem}>
            <View style={styles.valueIcon}>
              <value.icon color="#EF4444" size={24} />
            </View>
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>{value.title}</Text>
              <Text style={styles.valueDescription}>{value.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <TouchableOpacity style={styles.contactItem} onPress={handleContact}>
          <Mail color="#666" size={20} />
          <Text style={styles.contactText}>contact@denonciation.com</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactItem} onPress={handleWebsite}>
          <Globe color="#666" size={20} />
          <Text style={styles.contactText}>www.denonciation.com</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.copyright}>
          © {new Date().getFullYear()} Dénonciation. Tous droits réservés.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 12,
  },
  version: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#F9FAFB',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  valueItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  valueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  valueContent: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  valueDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  contactText: {
    fontSize: 15,
    color: '#3B82F6',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  copyright: {
    fontSize: 12,
    color: '#999',
  },
});