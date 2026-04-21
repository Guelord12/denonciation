import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MapPin, Eye, Heart, MessageCircle, Lock, Globe } from 'lucide-react-native';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuthStore } from '../../stores/authStore';

interface ReportCardProps {
  report: {
    id: number;
    title: string;
    description: string;
    media_path?: string;
    category_name?: string;
    category_icon?: string;
    category_color?: string;
    city_name?: string;
    username?: string;
    user_avatar?: string;
    first_name?: string;
    last_name?: string;
    likes_count?: number;
    comments_count?: number;
    views_count?: number;
    created_at: string;
    is_anonymous?: boolean;
    visibility_mode?: 'anonymous' | 'visible';
    reporter_id?: number;
  };
}

export default function ReportCard({ report }: ReportCardProps) {
  const navigation = useNavigation();
  const { user } = useAuthStore();

  // ✅ Déterminer si on doit afficher l'identité
  const isAdmin = user?.is_admin || false;
  const currentUserId = user?.id || null;
  const isOwner = report.reporter_id === currentUserId;
  const showIdentity = !report.is_anonymous && report.visibility_mode === 'visible';
  
  // Anonymiser l'affichage selon les règles
  const displayName = (showIdentity || isOwner || isAdmin) && report.username
    ? report.username
    : 'Utilisateur anonyme';
  
  const displayAvatar = (showIdentity || isOwner || isAdmin) ? report.user_avatar : null;
  const displayInitial = displayName === 'Utilisateur anonyme' ? 'A' : displayName.charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ReportDetail' as never, { id: report.id } as never)}
    >
      {report.media_path && (
        <Image source={{ uri: report.media_path }} style={styles.image} />
      )}

      <View style={styles.content}>
        <View style={styles.categoryContainer}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: report.category_color + '20' },
            ]}
          >
            <Text style={[styles.categoryText, { color: report.category_color }]}>
              {report.category_icon} {report.category_name}
            </Text>
          </View>
          
          {/* ✅ Badge de visibilité */}
          {report.visibility_mode === 'anonymous' ? (
            <View style={[styles.visibilityBadge, { backgroundColor: '#8B5CF6' + '20' }]}>
              <Lock size={10} color="#8B5CF6" />
              <Text style={[styles.visibilityBadgeText, { color: '#8B5CF6' }]}>Anonyme</Text>
            </View>
          ) : (
            <View style={[styles.visibilityBadge, { backgroundColor: '#10B981' + '20' }]}>
              <Globe size={10} color="#10B981" />
              <Text style={[styles.visibilityBadgeText, { color: '#10B981' }]}>Visible</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {report.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {report.description}
        </Text>

        <View style={styles.meta}>
          <View style={styles.userInfo}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={[
                styles.avatarPlaceholder,
                displayName === 'Utilisateur anonyme' && styles.avatarAnonymous
              ]}>
                <Text style={styles.avatarText}>{displayInitial}</Text>
              </View>
            )}
            <View style={styles.userTextContainer}>
              <Text style={styles.username}>{displayName}</Text>
              {isOwner && (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>Vous</Text>
                </View>
              )}
            </View>
          </View>

          {report.city_name && (
            <View style={styles.location}>
              <MapPin size={12} color="#999" />
              <Text style={styles.locationText}>{report.city_name}</Text>
            </View>
          )}
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Eye size={14} color="#999" />
            <Text style={styles.statText}>{report.views_count || 0}</Text>
          </View>
          <View style={styles.stat}>
            <Heart size={14} color="#999" />
            <Text style={styles.statText}>{report.likes_count || 0}</Text>
          </View>
          <View style={styles.stat}>
            <MessageCircle size={14} color="#999" />
            <Text style={styles.statText}>{report.comments_count || 0}</Text>
          </View>
          <Text style={styles.date}>
            {formatDistance(new Date(report.created_at), new Date(), {
              addSuffix: true,
              locale: fr,
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  content: {
    padding: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  visibilityBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarAnonymous: {
    backgroundColor: '#9CA3AF',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 14,
    color: '#666',
  },
  ownerBadge: {
    backgroundColor: '#3B82F6' + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ownerBadgeText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginLeft: 'auto',
  },
});