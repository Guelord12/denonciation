import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Camera, CameraType, CameraView } from 'expo-camera';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import useSocket from '../hooks/useSocket';
import { 
  Heart, Share2, Flag, Send, Users, X, Lock, MessageCircle,
  Camera as CameraIcon, RotateCcw, Mic, MicOff, Video as VideoIcon,
  VideoOff, MoreVertical, Ban,
} from 'lucide-react-native';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import Toast from 'react-native-toast-message';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  avatar: string | null;
  message: string;
  timestamp: string;
}

interface Viewer {
  userId: number;
  username: string;
  avatar: string | null;
}

// ✅ URL du serveur HLS
const HLS_SERVER_URL = 'http://192.168.176.90:8000/live';

export default function LiveStreamScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { streamId } = route.params as { streamId: string };
  const { user, isAuthenticated } = useAuthStore();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const videoRef = useRef<Video>(null);
  const cameraRef = useRef<CameraView>(null);
  const chatListRef = useRef<FlatList>(null);
  
  const [stream, setStream] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [showStreamerMenu, setShowStreamerMenu] = useState(false);
  const [videoStatus, setVideoStatus] = useState<{ isLoaded: boolean; error: string | null }>({
    isLoaded: false,
    error: null,
  });
  
  const [isStreamer, setIsStreamer] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>('front');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');

  const { data: streamData, refetch } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => api.get(`/live/${streamId}`).then(res => res.data),
    onSuccess: (data) => {
      setStream(data);
      setViewerCount(data.current_viewers || 0);
      setLikeCount(data.like_count || 0);
      setHasAccess(data.hasAccess !== false);
      setMessages(data.messages || []);
      setIsStreamer(data.user_id === user?.id);
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
      Alert.alert('Erreur', 'Impossible de charger le stream');
      navigation.goBack();
    }
  });

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/live/${streamId}/like`),
    onSuccess: (response) => setLikeCount(response.data.like_count),
  });

  const subscribeMutation = useMutation({
    mutationFn: () => api.post(`/live/${streamId}/subscribe`),
    onSuccess: () => {
      setHasAccess(true);
      queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
      Toast.show({ type: 'success', text1: 'Abonnement réussi !' });
    },
  });

  const endStreamMutation = useMutation({
    mutationFn: () => api.post(`/live/${streamId}/end`),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Stream terminé' });
      navigation.goBack();
    },
  });

  useEffect(() => {
    if (isStreamer) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        const { status: audioStatus } = await Camera.requestMicrophonePermissionsAsync();
        setHasPermission(status === 'granted' && audioStatus === 'granted');
      })();
    }
  }, [isStreamer]);

  useEffect(() => {
    if (!socket || !streamId) return;

    socket.emit('join_stream', streamId);

    socket.on('viewer_count_update', (data: { streamId: string; count: number }) => {
      if (data.streamId === streamId) setViewerCount(data.count);
    });

    socket.on('new_chat_message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socket.on('like_update', (data: { count: number }) => setLikeCount(data.count));

    socket.on('stream_ended', () => {
      Toast.show({ type: 'error', text1: 'Stream terminé' });
      navigation.goBack();
    });

    socket.on('viewers_list', (data: { viewers: Viewer[] }) => setViewers(data.viewers));

    return () => {
      socket.emit('leave_stream', streamId);
      socket.off('viewer_count_update');
      socket.off('new_chat_message');
      socket.off('like_update');
      socket.off('stream_ended');
      socket.off('viewers_list');
    };
  }, [socket, streamId]);

  const startBroadcasting = () => {
    setIsBroadcasting(true);
    socket?.emit('start_broadcast', { streamId });
    Toast.show({ type: 'success', text1: 'Diffusion en direct démarrée !' });
  };

  const stopBroadcasting = () => {
    setIsBroadcasting(false);
    socket?.emit('end_broadcast', { streamId });
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    socket?.emit('chat_message', { streamId, message: inputMessage.trim() });
    setInputMessage('');
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login' as never);
      return;
    }
    likeMutation.mutate();
    setIsLiked(true);
    setTimeout(() => setIsLiked(false), 500);
  };

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login' as never);
      return;
    }
    setIsSubscribing(true);
    subscribeMutation.mutate(undefined, {
      onSettled: () => setIsSubscribing(false),
    });
  };

  const handleShare = async () => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(undefined, { dialogTitle: 'Partager le stream' });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleEndStream = () => {
    Alert.alert('Terminer le live', 'Voulez-vous vraiment terminer ce live ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Terminer', style: 'destructive', onPress: () => {
        stopBroadcasting();
        endStreamMutation.mutate();
      }},
    ]);
  };

  const showViewers = () => {
    socket?.emit('get_viewers', { streamId });
    setShowViewersModal(true);
  };

  // ✅ URL HLS complète
  const hlsUrl = stream?.stream_key ? `${HLS_SERVER_URL}/${stream.stream_key}/index.m3u8` : null;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Chargement du stream...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={styles.premiumContainer}>
        <Lock size={64} color="#F59E0B" />
        <Text style={styles.premiumTitle}>Stream Premium</Text>
        <Text style={styles.premiumDescription}>Ce stream nécessite un abonnement premium</Text>
        <Text style={styles.premiumPrice}>{stream?.price} €</Text>
        <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe} disabled={isSubscribing}>
          {isSubscribing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.subscribeButtonText}>S'abonner</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isStreamer && hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <CameraIcon size={64} color="#EF4444" />
        <Text style={styles.permissionTitle}>Accès à la caméra refusé</Text>
        <Text style={styles.permissionText}>Autorisez l'accès à la caméra et au micro pour diffuser.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={() => navigation.goBack()}>
          <Text style={styles.permissionButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {isStreamer && hasPermission ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraType}
            enableTorch={flashMode === 'on'}
            mode="video"
            mute={isMuted}
          >
            {!isVideoEnabled && (
              <View style={styles.videoDisabledOverlay}>
                <VideoOff size={48} color="#FFF" />
                <Text style={styles.videoDisabledText}>Caméra désactivée</Text>
              </View>
            )}
          </CameraView>
        ) : hlsUrl ? (
          <>
            {!videoStatus.isLoaded && !videoStatus.error && (
              <View style={styles.videoLoading}>
                <ActivityIndicator size="large" color="#EF4444" />
                <Text style={styles.videoLoadingText}>Connexion au stream...</Text>
              </View>
            )}
            <Video
              ref={videoRef}
              source={{ uri: hlsUrl }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
              useNativeControls={false}
              onLoad={() => {
                console.log('✅ Video loaded');
                setVideoStatus({ isLoaded: true, error: null });
              }}
              onError={(error) => {
                console.error('❌ Video error:', error);
                setVideoStatus({ isLoaded: false, error: 'Erreur de lecture' });
              }}
            />
          </>
        ) : (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color="#EF4444" />
            <Text style={styles.waitingText}>En attente du stream...</Text>
          </View>
        )}

        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <X size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.streamInfo}>
            <Text style={styles.streamTitle} numberOfLines={1}>{stream?.title}</Text>
            <Text style={styles.streamerName}>@{stream?.username}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={showViewers}>
              <Users size={20} color="#FFF" />
              <Text style={styles.viewerCountText}>{viewerCount}</Text>
            </TouchableOpacity>
            {isStreamer && (
              <TouchableOpacity style={styles.headerButton} onPress={() => setShowStreamerMenu(true)}>
                <MoreVertical size={20} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        {isStreamer && isBroadcasting && (
          <View style={styles.streamerControls}>
            <TouchableOpacity style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]} onPress={() => setIsVideoEnabled(!isVideoEnabled)}>
              {isVideoEnabled ? <VideoIcon size={22} color="#FFF" /> : <VideoOff size={22} color="#EF4444" />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, isMuted && styles.controlButtonActive]} onPress={() => setIsMuted(!isMuted)}>
              {isMuted ? <MicOff size={22} color="#EF4444" /> : <Mic size={22} color="#FFF" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => setCameraType(c => c === 'back' ? 'front' : 'back')}>
              <RotateCcw size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={handleEndStream}>
              <X size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {isStreamer && !isBroadcasting && (
          <TouchableOpacity style={styles.startStreamButton} onPress={startBroadcasting}>
            <VideoIcon size={24} color="#FFF" />
            <Text style={styles.startStreamText}>Démarrer la diffusion</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.chatToggle} onPress={() => setShowChat(!showChat)}>
          {showChat ? <X size={24} color="#FFF" /> : <MessageCircle size={24} color="#FFF" />}
        </TouchableOpacity>
      </View>

      {showChat && (
        <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Chat en direct</Text>
            <View style={styles.chatActions}>
              <TouchableOpacity onPress={handleShare}><Share2 size={20} color="#FFF" /></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowChat(false)}><X size={20} color="#FFF" /></TouchableOpacity>
            </View>
          </View>
          
          <FlatList
            ref={chatListRef}
            data={messages}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            renderItem={({ item }) => (
              <View style={styles.messageItem}>
                <Image source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${item.username}&background=EF4444&color=fff` }} style={styles.messageAvatar} />
                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.messageUsername}>{item.username}</Text>
                    <Text style={styles.messageTime}>{formatDistance(new Date(item.timestamp), new Date(), { addSuffix: true, locale: fr })}</Text>
                  </View>
                  <Text style={styles.messageText}>{item.message}</Text>
                </View>
              </View>
            )}
            inverted
            style={styles.messageList}
          />
          
          {isAuthenticated ? (
            <View style={styles.chatInputContainer}>
              <TextInput style={styles.chatInput} value={inputMessage} onChangeText={setInputMessage} placeholder="Écrivez un message..." placeholderTextColor="#999" multiline />
              <TouchableOpacity onPress={sendMessage} style={[styles.sendButton, !inputMessage.trim() && styles.sendButtonDisabled]} disabled={!inputMessage.trim()}>
                <Send size={20} color={inputMessage.trim() ? '#EF4444' : '#666'} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.loginPrompt} onPress={() => navigation.navigate('Login' as never)}>
              <Text style={styles.loginPromptText}>Connectez-vous pour participer au chat</Text>
            </TouchableOpacity>
          )}
        </KeyboardAvoidingView>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Heart size={32} color={isLiked ? '#EF4444' : '#FFF'} fill={isLiked ? '#EF4444' : 'none'} />
          <Text style={styles.actionText}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Share2 size={28} color="#FFF" />
          <Text style={styles.actionText}>Partager</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showViewersModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Spectateurs ({viewers.length})</Text>
              <TouchableOpacity onPress={() => setShowViewersModal(false)}><X size={24} color="#666" /></TouchableOpacity>
            </View>
            <FlatList
              data={viewers}
              keyExtractor={(item) => item.userId.toString()}
              renderItem={({ item }) => (
                <View style={styles.viewerItem}>
                  <Image source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${item.username}&background=EF4444&color=fff` }} style={styles.viewerAvatar} />
                  <Text style={styles.viewerName}>@{item.username}</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showStreamerMenu} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Options du stream</Text>
              <TouchableOpacity onPress={() => setShowStreamerMenu(false)}><X size={24} color="#666" /></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowStreamerMenu(false); showViewers(); }}>
              <Users size={20} color="#666" />
              <Text style={styles.menuItemText}>Voir les spectateurs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={() => { setShowStreamerMenu(false); handleEndStream(); }}>
              <X size={20} color="#EF4444" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Terminer le live</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { color: '#FFF', marginTop: 12, fontSize: 16 },
  videoContainer: { flex: 1, position: 'relative' },
  video: { ...StyleSheet.absoluteFillObject },
  videoLoading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 5 },
  videoLoadingText: { color: '#FFF', marginTop: 12, fontSize: 14 },
  camera: { ...StyleSheet.absoluteFillObject },
  videoDisabledOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  videoDisabledText: { color: '#FFF', marginTop: 12, fontSize: 16 },
  waitingContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2937' },
  waitingText: { color: '#FFF', marginTop: 12, fontSize: 16 },
  header: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, zIndex: 10 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  streamInfo: { flex: 1, marginHorizontal: 12 },
  streamTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  streamerName: { color: '#CCC', fontSize: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewerCountText: { color: '#FFF', marginLeft: 4, fontSize: 12 },
  liveBadge: { position: 'absolute', top: Platform.OS === 'ios' ? 100 : 80, left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, zIndex: 10 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF', marginRight: 6 },
  liveText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  streamerControls: { position: 'absolute', bottom: 100, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 12, zIndex: 10 },
  controlButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  controlButtonActive: { backgroundColor: 'rgba(239,68,68,0.6)' },
  endButton: { backgroundColor: '#EF4444' },
  startStreamButton: { position: 'absolute', bottom: 100, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, gap: 10, zIndex: 10 },
  startStreamText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  chatToggle: { position: 'absolute', right: 16, bottom: 100, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  chatContainer: { position: 'absolute', right: 0, top: Platform.OS === 'ios' ? 140 : 120, bottom: 100, width: width * 0.75, backgroundColor: 'rgba(0,0,0,0.95)', borderTopLeftRadius: 12, borderBottomLeftRadius: 12, zIndex: 20 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  chatTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  chatActions: { flexDirection: 'row', gap: 8 },
  messageList: { flex: 1 },
  messageItem: { flexDirection: 'row', marginBottom: 12, paddingHorizontal: 12 },
  messageAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  messageContent: { flex: 1 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  messageUsername: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  messageTime: { color: '#666', fontSize: 10 },
  messageText: { color: '#FFF', fontSize: 13, marginTop: 2 },
  chatInputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#333' },
  chatInput: { flex: 1, backgroundColor: '#333', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, paddingRight: 40, color: '#FFF', fontSize: 14, maxHeight: 100 },
  sendButton: { position: 'absolute', right: 20, bottom: 20 },
  sendButtonDisabled: { opacity: 0.5 },
  loginPrompt: { padding: 16, borderTopWidth: 1, borderTopColor: '#333', alignItems: 'center' },
  loginPromptText: { color: '#EF4444', fontSize: 14 },
  actions: { position: 'absolute', left: 16, bottom: 40, alignItems: 'center', zIndex: 10 },
  actionButton: { alignItems: 'center', marginVertical: 8 },
  actionText: { color: '#FFF', fontSize: 12, marginTop: 4 },
  premiumContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 },
  premiumTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  premiumDescription: { color: '#CCC', fontSize: 16, textAlign: 'center', marginTop: 10 },
  premiumPrice: { color: '#F59E0B', fontSize: 32, fontWeight: 'bold', marginTop: 20 },
  subscribeButton: { backgroundColor: '#F59E0B', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 25, marginTop: 30 },
  subscribeButtonText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  backButton: { marginTop: 20 },
  backButtonText: { color: '#999', fontSize: 16 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 },
  permissionTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  permissionText: { color: '#CCC', fontSize: 16, textAlign: 'center', marginTop: 10, marginBottom: 30 },
  permissionButton: { backgroundColor: '#EF4444', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 25 },
  permissionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  viewerItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  viewerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  viewerName: { flex: 1, fontSize: 16, color: '#1F2937' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 12 },
  menuItemDanger: { borderBottomWidth: 0 },
  menuItemText: { fontSize: 16, color: '#1F2937' },
  menuItemTextDanger: { color: '#EF4444' },
});