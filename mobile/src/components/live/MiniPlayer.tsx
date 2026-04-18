import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Video } from 'expo-av';
import { X, Maximize2 } from 'lucide-react-native';

interface MiniPlayerProps {
  stream: {
    id: number;
    title: string;
    stream_url: string;
    username?: string;
  };
  onClose: () => void;
}

export default function MiniPlayer({ stream, onClose }: MiniPlayerProps) {
  const navigation = useNavigation();

  const handleExpand = () => {
    navigation.navigate('LiveStream' as never, { streamId: stream.id } as never);
    onClose();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.videoContainer} onPress={handleExpand} activeOpacity={0.9}>
        <Video
          source={{ uri: stream.stream_url }}
          style={styles.video}
          resizeMode="cover"
          shouldPlay
          isMuted
          isLooping={false}
        />
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <TouchableOpacity style={styles.info} onPress={handleExpand}>
          <Text style={styles.title} numberOfLines={1}>
            {stream.title}
          </Text>
          <Text style={styles.username}>@{stream.username}</Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity onPress={handleExpand} style={styles.actionButton}>
            <Maximize2 color="#666" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.actionButton}>
            <X color="#666" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 70,
    left: 16,
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  videoContainer: {
    position: 'relative',
    height: 120,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
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
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  username: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
});