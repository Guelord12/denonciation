import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import useSocket from '../hooks/useSocket';
import {
  Heart,
  MessageCircle,
  Share2,
  Gift,
  Crown,
  Music2,
  Send,
  X,
  Plus,
  Lock,
  Users,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

interface LiveStream {
  id: number;
  title: string;
  description?: string;
  username: string;
  avatar?: string;
  viewer_count: number;
  like_count: number;
  is_premium: boolean;
  price?: number;
  status: string;
  current_viewers: number;
  tags?: string[];
  category?: string;
  user_id?: number;
}

interface GiftItem {
  id: number;
  name: string;
  icon: string;
  price: number;
}

export default function LiveFeedScreen(){
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuthStore();
  const { socket } = useSocket();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['tiktok-feed'],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/live/feed', { params: { page: pageParam, limit: 10 } }).then(res => res.data),
    getNextPageParam: (lastPage) => lastPage.has_more ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  const streams = data?.pages.flatMap(page => page.streams) || [];

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  if (streams.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <VideoIcon size={80} color="#666" />
        <Text style={styles.emptyTitle}>Aucun live en cours</Text>
        <Text style={styles.emptySubtitle}>Soyez le premier à lancer un live !</Text>
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateLive' as never)}
          >
            <Plus color="#FFF" size={24} />
            <Text style={styles.createButtonText}>Démarrer un live</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={streams}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <LiveStreamItem stream={item} />}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
      />

      {/* Indicateur de position */}
      <View style={styles.positionIndicator}>
        {streams.map((_, index) => (
          <View
            key={index}
            style={[
              styles.positionDot,
              index === currentIndex && styles.positionDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function LiveStreamItem({ stream }: { stream: LiveStream }) {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuthStore();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [likeCount, setLikeCount] = useState(stream.like_count || 0);
  const [viewerCount, setViewerCount] = useState(stream.current_viewers || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);

  useEffect(() => {
    api.get('/live/gifts').then(res => setGifts(res.data.gifts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_stream', stream.id);

    socket.on('new_chat_message', (msg: any) => setMessages(prev => [...prev, msg]));
    socket.on('viewer_count_update', (data: any) => setViewerCount(data.count));
    socket.on('like_update', (data: any) => setLikeCount(data.count));

    return () => {
      socket.emit('leave_stream', stream.id);
      socket.off('new_chat_message');
      socket.off('viewer_count_update');
      socket.off('like_update');
    };
  }, [socket, stream.id]);

  const handleLike = () => {
    if (!isAuthenticated) return;
    socket?.emit('like_stream', { streamId: stream.id, userId: user?.id });
    setIsLiked(true);
    setTimeout(() => setIsLiked(false), 500);
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !isAuthenticated) return;
    socket?.emit('chat_message', { streamId: stream.id, message: inputMessage.trim() });
    setInputMessage('');
  };

  const handleSendGift = (gift: GiftItem) => {
    if (!isAuthenticated) return;
    socket?.emit('send_gift', { streamId: stream.id, gift_id: gift.id, amount: 1 });
    Toast.show({ type: 'success', text1: `${gift.icon} Cadeau envoyé !` });
    setShowGifts(false);
  };

  if (stream.is_premium && stream.user_id !== user?.id) {
    return (
      <View style={styles.streamContainer}>
        <View style={styles.premiumOverlay}>
          <Lock color="#F59E0B" size={48} />
          <Text style={styles.premiumTitle}>Stream Premium</Text>
          <Text style={styles.premiumPrice}>{stream.price} €</Text>
          <TouchableOpacity style={styles.subscribeButton}>
            <Text style={styles.subscribeButtonText}>S'abonner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.streamContainer}>
      {/* Fond vidéo placeholder */}
      <View style={styles.videoPlaceholder}>
        <VideoIcon size={80} color="#444" />
      </View>

      {/* Overlay gradient */}
      <View style={styles.bottomGradient} />

      {/* Badge LIVE */}
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
        <Text style={styles.viewerCount}>{viewerCount}</Text>
      </View>

      {/* Infos streamer */}
      <View style={styles.streamerInfo}>
        <View style={styles.streamerRow}>
          <Image
            source={{ uri: stream.avatar || `https://ui-avatars.com/api/?name=${stream.username}` }}
            style={styles.avatar}
          />
          <View style={styles.streamerText}>
            <Text style={styles.username}>@{stream.username}</Text>
            <Text style={styles.title}>{stream.title}</Text>
          </View>
          <TouchableOpacity style={styles.followButton}>
            <Text style={styles.followButtonText}>Suivre</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description} numberOfLines={2}>{stream.description}</Text>
        <View style={styles.musicRow}>
          <Music2 size={16} color="#FFF" />
          <Text style={styles.musicText}>Son original - @{stream.username}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
          <Heart size={32} color={isLiked ? '#EF4444' : '#FFF'} fill={isLiked ? '#EF4444' : 'none'} />
          <Text style={styles.actionText}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowChat(!showChat)} style={styles.actionButton}>
          <MessageCircle size={32} color="#FFF" />
          <Text style={styles.actionText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowGifts(!showGifts)} style={styles.actionButton}>
          <Gift size={32} color="#F59E0B" />
          <Text style={styles.actionText}>Cadeau</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Share2 size={32} color="#FFF" />
          <Text style={styles.actionText}>Partager</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Modal */}
      <Modal visible={showChat} transparent animationType="slide">
        <View style={styles.chatModal}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Chat en direct</Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <X size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.chatMessages}>
            {messages.map((msg, i) => (
              <View key={i} style={styles.chatMessage}>
                <Text style={styles.chatUsername}>@{msg.username}:</Text>
                <Text style={styles.chatText}> {msg.message}</Text>
              </View>
            ))}
          </View>
          {isAuthenticated && (
            <View style={styles.chatInput}>
              <TextInput
                style={styles.chatTextInput}
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="Message..."
                placeholderTextColor="#666"
              />
              <TouchableOpacity onPress={sendMessage}>
                <Send size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Gifts Modal */}
      <Modal visible={showGifts} transparent animationType="slide">
        <View style={styles.giftsModal}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Envoyer un cadeau</Text>
            <TouchableOpacity onPress={() => setShowGifts(false)}>
              <X size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.giftsGrid}>
            {gifts.map((gift) => (
              <TouchableOpacity
                key={gift.id}
                style={styles.giftItem}
                onPress={() => handleSendGift(gift)}
              >
                <Text style={styles.giftIcon}>{gift.icon}</Text>
                <Text style={styles.giftName}>{gift.name}</Text>
                <Text style={styles.giftPrice}>{gift.price} €</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 },
  emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  emptySubtitle: { color: '#999', fontSize: 16, marginTop: 8, textAlign: 'center' },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, marginTop: 24, gap: 8 },
  createButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  streamContainer: { width, height, backgroundColor: '#000' },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 300, zIndex: 1 },
  liveBadge: { position: 'absolute', top: 60, left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, zIndex: 10 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF', marginRight: 6 },
  liveText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  viewerCount: { color: '#FFF', fontSize: 12, marginLeft: 4 },
  streamerInfo: { position: 'absolute', bottom: 100, left: 16, right: 100, zIndex: 10 },
  streamerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#EF4444' },
  streamerText: { flex: 1 },
  username: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  title: { color: '#CCC', fontSize: 14 },
  followButton: { backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  followButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  description: { color: '#AAA', fontSize: 12, marginLeft: 60, marginBottom: 8 },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 60 },
  musicText: { color: '#FFF', fontSize: 12 },
  actions: { position: 'absolute', right: 8, bottom: 120, zIndex: 10, gap: 20 },
  actionButton: { alignItems: 'center', gap: 4 },
  actionText: { color: '#FFF', fontSize: 10 },
  premiumOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20 },
  premiumTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  premiumPrice: { color: '#F59E0B', fontSize: 32, fontWeight: 'bold', marginTop: 16, marginBottom: 24 },
  subscribeButton: { backgroundColor: '#F59E0B', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30 },
  subscribeButtonText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  chatModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', marginTop: 200, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  chatTitle: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  chatMessages: { flex: 1, padding: 12 },
  chatMessage: { flexDirection: 'row', marginBottom: 8 },
  chatUsername: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  chatText: { color: '#FFF', fontSize: 12, flex: 1 },
  chatInput: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#333', gap: 12 },
  chatTextInput: { flex: 1, backgroundColor: '#333', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, color: '#FFF', fontSize: 14 },
  giftsModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', marginTop: 300, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  giftsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  giftItem: { width: '22%', alignItems: 'center', padding: 12, backgroundColor: '#222', borderRadius: 12 },
  giftIcon: { fontSize: 32 },
  giftName: { color: '#FFF', fontSize: 10, marginTop: 4 },
  giftPrice: { color: '#F59E0B', fontSize: 10 },
  positionIndicator: { position: 'absolute', left: 8, top: '50%', transform: [{ translateY: -50 }], zIndex: 20, gap: 6 },
  positionDot: { width: 3, height: 16, borderRadius: 2, backgroundColor: '#666' },
  positionDotActive: { height: 32, backgroundColor: '#EF4444' },
});

const VideoIcon = ({ size, color }: { size: number; color: string }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: size, color }}>📹</Text>
  </View>
);