import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Users, Heart, Lock } from 'lucide-react-native';

interface LiveCardProps {
  stream: {
    id: number;
    title: string;
    thumbnail_path?: string;
    username?: string;
    avatar?: string;
    viewer_count?: number;
    like_count?: number;
    is_premium?: boolean;
    current_viewers?: number;
  };
}

export default function LiveCard({ stream }: LiveCardProps) {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('LiveStream' as never, { streamId: stream.id } as never)}
    >
      <View style={styles.thumbnailContainer}>
        {stream.thumbnail_path ? (
          <Image source={{ uri: stream.thumbnail_path }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailText}>EN DIRECT</Text>
          </View>
        )}

        {/* Live Badge */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        {/* Premium Badge */}
        {stream.is_premium && (
          <View style={styles.premiumBadge}>
            <Lock size={12} color="#FFF" />
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}

        {/* Viewer Count */}
        <View style={styles.viewerCount}>
          <Users size={12} color="#FFF" />
          <Text style={styles.viewerText}>
            {stream.current_viewers || stream.viewer_count || 0}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {stream.title}
        </Text>

        <View style={styles.footer}>
          <View style={styles.streamerInfo}>
            {stream.avatar ? (
              <Image source={{ uri: stream.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {stream.username?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.username}>@{stream.username}</Text>
          </View>

          <View style={styles.likes}>
            <Heart size={14} color="#EF4444" />
            <Text style={styles.likesText}>{stream.like_count || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    height: 160,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginRight: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  premiumText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  viewerCount: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewerText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streamerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  likes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});