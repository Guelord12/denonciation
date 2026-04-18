import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Settings,
  LogOut,
  Flag,
  MessageCircle,
  Heart,
  Video,
  ChevronRight,
  Shield,
  AlertCircle,
} from 'lucide-react-native';
import { useState } from 'react';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  // ✅ Requête avec gestion d'erreur complète
  const { data: userStats, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      try {
        console.log('📊 Fetching user stats for user:', user?.id);
        const response = await api.get(`/users/stats/${user?.id}`);
        console.log('✅ User stats fetched:', response.data);
        return response.data;
      } catch (err: any) {
        console.error('❌ Failed to fetch user stats:', err.message);
        console.error('   Status:', err.response?.status);
        console.error('   Data:', err.response?.data);
        setError(err.response?.data?.error || 'Erreur lors du chargement des statistiques');
        throw err;
      }
    },
    enabled: !!user?.id,
    retry: 2,
    retryDelay: 1000,
  });

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive', 
          onPress: async () => {
            console.log('📝 Logging out...');
            await logout();
          }
        }
      ]
    );
  };

  const handleRetry = () => {
    setError(null);
    refetch();
  };

  // ✅ Valeurs par défaut si les stats ne sont pas encore chargées
  const stats = userStats || {};
  const totalReports = stats.total_reports || 0;
  const totalComments = stats.total_comments || 0;
  const totalLikesReceived = stats.total_stream_likes_received || stats.total_likes_received || 0;
  const totalStreams = stats.total_streams || 0;

  const menuItems = [
    {
      icon: Flag,
      label: 'Mes signalements',
      value: totalReports,
      onPress: () => navigation.navigate('MyReports' as never),
    },
    {
      icon: MessageCircle,
      label: 'Mes commentaires',
      value: totalComments,
      onPress: () => {},
    },
    {
      icon: Heart,
      label: 'Likes reçus',
      value: totalLikesReceived,
      onPress: () => {},
    },
    {
      icon: Video,
      label: 'Mes lives',
      value: totalStreams,
      onPress: () => navigation.navigate('MyStreams' as never),
    },
  ];

  const settingsItems = [
    {
      icon: Settings,
      label: 'Paramètres',
      onPress: () => navigation.navigate('Settings' as never),
    },
    {
      icon: Shield,
      label: 'Confidentialité',
      onPress: () => navigation.navigate('Privacy' as never),
    },
    {
      icon: LogOut,
      label: 'Déconnexion',
      onPress: handleLogout,
      color: '#EF4444',
    },
  ];

  // ✅ Affichage du chargement
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  // ✅ Affichage de l'erreur
  if (isError && error) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings' as never)}>
          <Settings color="#1F2937" size={24} />
        </TouchableOpacity>
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.username}>@{user?.username || 'utilisateur'}</Text>
        
        {(user?.first_name || user?.last_name) && (
          <Text style={styles.name}>
            {user?.first_name || ''} {user?.last_name || ''}
          </Text>
        )}
        
        <Text style={styles.email}>{user?.email || ''}</Text>
        
        {user?.phone && (
          <Text style={styles.phone}>{user?.phone}</Text>
        )}
        
        {user?.country && user?.city && (
          <Text style={styles.location}>
            {user?.city}, {user?.country}
          </Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.statItem}
            onPress={item.onPress}
            disabled={item.value === 0 && item.label !== 'Mes signalements'}
          >
            <item.icon color="#EF4444" size={24} />
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.menuTitle}>Paramètres du compte</Text>
        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <item.icon color={item.color || '#666'} size={20} />
              <Text style={[styles.menuItemLabel, item.color && { color: item.color }]}>
                {item.label}
              </Text>
            </View>
            <ChevronRight color="#CCC" size={20} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Account Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          Membre depuis {user?.created_at 
            ? new Date(user.created_at).toLocaleDateString('fr-FR')
            : new Date().toLocaleDateString('fr-FR')}
        </Text>
        {user?.is_admin && (
          <View style={styles.adminBadge}>
            <Shield color="#FFF" size={14} />
            <Text style={styles.adminText}>Administrateur</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    color: '#FFF',
    fontWeight: 'bold',
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  name: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  email: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  phone: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  location: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFF',
    paddingVertical: 20,
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: '#FFF',
    marginTop: 12,
    paddingVertical: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  infoSection: {
    padding: 20,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#999',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  adminText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});