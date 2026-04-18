import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'react-native-paper';
import { api } from '../services/api';
import { Shield, Megaphone, Flag, Video, TrendingUp, Bell } from 'lucide-react-native';
import ReportCard from '../components/reports/ReportCard';
import LiveCard from '../components/live/LiveCard';
import ChatbotWidget from '../components/chatbot/ChatbotWidget'; // ✅ Import du chatbot

export default function HomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = makeStyles(theme);

  const { data: reportsData } = useQuery({
    queryKey: ['home-reports'],
    queryFn: () => api.get('/reports', { params: { page: 1, limit: 5, status: 'approved' } }),
  });

  const { data: streamsData } = useQuery({
    queryKey: ['home-streams'],
    queryFn: () => api.get('/live', { params: { page: 1, limit: 5 } }),
  });

  const reports = reportsData?.data?.reports || [];
  const streams = streamsData?.data?.streams || [];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header avec Mégaphone */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIconContainer}>
              <Shield color="#EF4444" size={32} />
              <Megaphone 
                color="#EF4444" 
                size={18} 
                style={styles.megaphoneIcon} 
                strokeWidth={2.5}
              />
            </View>
            <Text style={styles.headerTitle}>Dénonciation</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications' as never)}>
            <Bell color={theme.colors.text} size={24} />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.hero}>
          <Shield color={theme.colors.primary} size={48} />
          <Text style={styles.heroTitle}>Dénonciation</Text>
          <Text style={styles.heroSubtitle}>
            Signalez les abus, protégez les victimes
          </Text>
          <TouchableOpacity
            style={[styles.heroButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('CreateReport' as never)}
          >
            <Text style={styles.heroButtonText}>Signaler un abus</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Flag color={theme.colors.primary} size={24} />
            <Text style={styles.statValue}>1,234</Text>
            <Text style={styles.statLabel}>Signalements</Text>
          </View>
          <View style={styles.statItem}>
            <Video color={theme.colors.success} size={24} />
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Lives</Text>
          </View>
          <View style={styles.statItem}>
            <TrendingUp color={theme.colors.info} size={24} />
            <Text style={styles.statValue}>89%</Text>
            <Text style={styles.statLabel}>Résolus</Text>
          </View>
        </View>

        {/* Recent Reports */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Signalements récents</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ReportsTab' as never)}>
              <Text style={[styles.seeAll, { color: theme.colors.primary }]}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          {reports.map((report: any) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </View>

        {/* Live Streams */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>En direct</Text>
            <TouchableOpacity onPress={() => navigation.navigate('LiveTab' as never)}>
              <Text style={[styles.seeAll, { color: theme.colors.primary }]}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {streams.map((stream: any) => (
              <LiveCard key={stream.id} stream={stream} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* ✅ Chatbot Widget */}
      <ChatbotWidget />
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconContainer: {
    position: 'relative',
    marginRight: 8,
  },
  megaphoneIcon: {
    position: 'absolute',
    top: -4,
    right: -6,
    transform: [{ rotate: '15deg' }],
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  hero: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  heroButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  heroButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: theme.colors.surface,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  seeAll: {
    fontSize: 14,
  },
});