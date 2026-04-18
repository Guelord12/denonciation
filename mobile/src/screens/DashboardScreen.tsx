import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'react-native-paper';
import { api } from '../services/api';
import {
  Flag,
  MessageCircle,
  Heart,
  Video,
  Settings,
  ChevronRight,
  Bell,
  Shield,
  LogOut,
} from 'lucide-react-native';
import ChatbotWidget from '../components/chatbot/ChatbotWidget'; // ✅ Import du chatbot

export default function DashboardScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { user, logout } = useAuthStore();

  const { data: userStats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: () => api.get(`/users/stats/${user?.id}`).then(res => res.data),
    enabled: !!user?.id,
  });

  const { data: myReports } = useQuery({
    queryKey: ['my-reports', user?.id],
    queryFn: () => api.get('/reports', { params: { user_id: user?.id, limit: 5 } }).then(res => res.data),
    enabled: !!user?.id,
  });

  const stats = userStats || {};
  const reports = myReports?.reports || [];

  const menuItems = [
    {
      icon: Flag,
      label: 'Mes signalements',
      value: stats.total_reports || 0,
      color: '#EF4444',
      onPress: () => navigation.navigate('MyReports' as never),
    },
    {
      icon: MessageCircle,
      label: 'Mes commentaires',
      value: stats.total_comments || 0,
      color: '#3B82F6',
      onPress: () => {},
    },
    {
      icon: Heart,
      label: 'Likes reçus',
      value: stats.total_likes_received || 0,
      color: '#EC4899',
      onPress: () => {},
    },
    {
      icon: Video,
      label: 'Mes lives',
      value: stats.total_streams || 0,
      color: '#10B981',
      onPress: () => {},
    },
  ];

  const settingsItems = [
    {
      icon: Bell,
      label: 'Notifications',
      onPress: () => navigation.navigate('Notifications' as never),
    },
    {
      icon: Shield,
      label: 'Confidentialité',
      onPress: () => {},
    },
    {
      icon: Settings,
      label: 'Paramètres',
      onPress: () => navigation.navigate('Settings' as never),
    },
    {
      icon: Shield,
      label: 'Informations',
      onPress: () => navigation.navigate('Information' as never),
    },
  ];

  if (user?.is_admin) {
    settingsItems.unshift({
      icon: Shield,
      label: 'Administration',
      onPress: () => navigation.navigate('Admin' as never),
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tableau de bord</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications' as never)}>
            <Bell color={theme.colors.text} size={24} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <View style={styles.profileInfo}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.avatarText}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.profileText}>
              <Text style={[styles.profileName, { color: theme.colors.text }]}>
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
              </Text>
              <Text style={[styles.profileUsername, { color: theme.colors.textSecondary }]}>
                @{user?.username}
              </Text>
            </View>
          </View>
          <ChevronRight color={theme.colors.textSecondary} size={20} />
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('CreateReport' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEE2E2' }]}>
              <Flag color="#EF4444" size={24} />
            </View>
            <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Signaler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('CreateLive' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#D1FAE5' }]}>
              <Video color="#10B981" size={24} />
            </View>
            <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Go Live</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
              onPress={item.onPress}
            >
              <View style={[styles.statIcon, { backgroundColor: item.color + '20' }]}>
                <item.icon color={item.color} size={24} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{item.value}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Reports */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Signalements récents
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('MyReports' as never)}>
              <Text style={[styles.seeAll, { color: theme.colors.primary }]}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {reports.slice(0, 3).map((report: any) => (
            <TouchableOpacity
              key={report.id}
              style={[styles.reportItem, { borderBottomColor: theme.colors.border }]}
              onPress={() => navigation.navigate('ReportDetail' as never, { id: report.id } as never)}
            >
              <View style={styles.reportHeader}>
                <View
                  style={[
                    styles.reportStatus,
                    {
                      backgroundColor:
                        report.status === 'approved'
                          ? '#D1FAE5'
                          : report.status === 'pending'
                          ? '#FEF3C7'
                          : '#FEE2E2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.reportStatusText,
                      {
                        color:
                          report.status === 'approved'
                            ? '#10B981'
                            : report.status === 'pending'
                            ? '#F59E0B'
                            : '#EF4444',
                      },
                    ]}
                  >
                    {report.status === 'approved'
                      ? 'Approuvé'
                      : report.status === 'pending'
                      ? 'En attente'
                      : 'Rejeté'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.reportTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {report.title}
              </Text>
              <Text style={[styles.reportDate, { color: theme.colors.textSecondary }]}>
                {report.created_at ? new Date(report.created_at).toLocaleDateString('fr-FR') : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Paramètres</Text>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.settingsItem, { borderBottomColor: theme.colors.border }]}
              onPress={item.onPress}
            >
              <View style={styles.settingsItemLeft}>
                <item.icon color={theme.colors.textSecondary} size={20} />
                <Text style={[styles.settingsItemLabel, { color: theme.colors.text }]}>
                  {item.label}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textSecondary} size={20} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <LogOut color="#EF4444" size={20} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
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
    paddingBottom: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  profileCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
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
  },
  seeAll: {
    fontSize: 14,
  },
  reportItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reportStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reportStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsItemLabel: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
});