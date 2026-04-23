import { useState, useEffect, useRef, useCallback } from 'react';
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
  Heart, Share2, Send, Users, X, Lock, MessageCircle,
  Camera as CameraIcon, RotateCcw, Mic, MicOff, Video as VideoIcon,
  VideoOff, MoreVertical, Wifi, WifiOff, RefreshCw, AlertTriangle,
} from 'lucide-react-native';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import Toast from 'react-native-toast-message';
import * as Sharing from 'expo-sharing';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  RTCView,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';

const { width, height } = Dimensions.get('window');

// =====================================================
// CONSTANTES
// =====================================================
const CONFIG = {
  WEBRTC_CONNECTION_TIMEOUT: 30000,
  HEARTBEAT_INTERVAL: 10000,
  MAX_RECONNECT_ATTEMPTS: 3,
  STREAM_CHUNK_INTERVAL: 1000,
};

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const HLS_SERVER_URL = 'http://192.168.176.90:8000/live';

// =====================================================
// TYPES
// =====================================================
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

interface StreamData {
  id: number;
  title: string;
  description?: string;
  user_id: number;
  username: string;
  avatar?: string;
  stream_key?: string;
  hls_url?: string;
  is_premium?: boolean;
  price?: number;
  current_viewers?: number;
  like_count?: number;
  hasAccess?: boolean;
  messages?: ChatMessage[];
  status?: string;
}

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
export default function LiveStreamScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { streamId } = route.params as { streamId: string };
  const { user, isAuthenticated } = useAuthStore();
  const { socket, isConnected: socketConnected } = useSocket();
  const queryClient = useQueryClient();
  
  // Refs
  const videoRef = useRef<Video>(null);
  const cameraRef = useRef<CameraView>(null);
  const chatListRef = useRef<FlatList>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // États du stream
  const [stream, setStream] = useState<StreamData | null>(null);
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
  
  // États WebRTC
  const [streamType, setStreamType] = useState<'hls' | 'webrtc' | 'unknown'>('unknown');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
  const [broadcasterReady, setBroadcasterReady] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectAttemptsRef = useRef(0);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // États du streamer
  const [isStreamer, setIsStreamer] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>('front');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // =====================================================
  // REQUÊTE PRINCIPALE
  // =====================================================
  const { data: streamData, refetch } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => api.get(`/live/${streamId}`).then(res => res.data),
    onSuccess: (data: StreamData) => {
      setStream(data);
      setViewerCount(data.current_viewers || 0);
      setLikeCount(data.like_count || 0);
      setHasAccess(data.hasAccess !== false);
      setMessages(data.messages || []);
      setIsStreamer(data.user_id === user?.id);
      setIsLoading(false);
      
      if (data.hls_url) {
        setStreamType('hls');
        console.log('📺 Stream type: HLS');
      } else {
        setStreamType('webrtc');
        console.log('📡 Stream type: WebRTC');
        if (data.user_id !== user?.id) {
          initializeWebRTC();
        }
      }
    },
    onError: () => {
      setIsLoading(false);
      Alert.alert('Erreur', 'Impossible de charger le stream');
      navigation.goBack();
    },
  });

  // =====================================================
  // MUTATIONS
  // =====================================================
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

  // =====================================================
  // ✅ CORRECTION : INITIALISATION WEBRTC (SPECTATEUR)
  // =====================================================
  const initializeWebRTC = useCallback(() => {
    if (!socket || !streamId || isStreamer) return;
    
    console.log('📡 Initializing WebRTC for stream:', streamId);
    setConnectionStatus('connecting');
    setBroadcasterReady(false);
    
    socket.emit('join_stream', streamId);
    
    connectionTimeoutRef.current = setTimeout(() => {
      if (connectionStatus === 'connecting' && !broadcasterReady) {
        console.warn('⏰ WebRTC connection timeout');
        setConnectionStatus('disconnected');
        setVideoStatus({ isLoaded: false, error: 'Délai de connexion dépassé. Le streamer n\'a pas encore démarré.' });
      }
    }, CONFIG.WEBRTC_CONNECTION_TIMEOUT);
    
    startHeartbeat();
    
  }, [socket, streamId, isStreamer, connectionStatus, broadcasterReady]);

  const createPeerConnection = useCallback(async (broadcasterId: string) => {
    try {
      console.log('🔗 Creating peer connection...');
      
      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });
      
      pc.ontrack = (event) => {
        console.log('🎥 Received remote track');
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setConnectionStatus('connected');
          setVideoStatus({ isLoaded: true, error: null });
        }
      };
      
      pc.onconnectionstatechange = () => {
        console.log('📊 WebRTC state:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            setConnectionStatus('connected');
            setVideoStatus({ isLoaded: true, error: null });
            break;
          case 'disconnected':
          case 'failed':
            setConnectionStatus('disconnected');
            attemptReconnect();
            break;
          case 'connecting':
            setConnectionStatus('connecting');
            break;
        }
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc_ice_candidate', {
            targetId: broadcasterId,
            candidate: event.candidate,
          });
        }
      };
      
      peerConnectionRef.current = pc;
      
      socket?.emit('webrtc_connection_status', {
        streamId,
        status: 'connecting',
      });
      
      return pc;
    } catch (error) {
      console.error('❌ Failed to create peer connection:', error);
      return null;
    }
  }, [socket, streamId]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (socket && socket.connected) {
        socket.emit('heartbeat');
      } else {
        setConnectionStatus('disconnected');
      }
    }, CONFIG.HEARTBEAT_INTERVAL);
  }, [socket]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      setVideoStatus({ isLoaded: false, error: 'Impossible de se reconnecter' });
      return;
    }
    
    reconnectAttemptsRef.current++;
    setReconnectAttempts(reconnectAttemptsRef.current);
    setConnectionStatus('reconnecting');
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setRemoteStream(null);
    
    setTimeout(() => {
      initializeWebRTC();
    }, 2000);
  }, [initializeWebRTC]);

  const handleManualReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    setVideoStatus({ isLoaded: false, error: null });
    setRemoteStream(null);
    initializeWebRTC();
  }, [initializeWebRTC]);

  // =====================================================
  // ✅ CORRECTION : DÉMARRER LA DIFFUSION (STREAMER)
  // =====================================================
  const startBroadcasting = useCallback(async () => {
    try {
      setBroadcastError(null);
      console.log('🎥 Starting broadcast...');
      
      // Récupérer le flux de la caméra via WebRTC
      const stream = await mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: cameraType === 'front' ? 'user' : 'environment',
          frameRate: 30,
        },
        audio: !isMuted,
      });
      
      localStreamRef.current = stream;
      console.log('✅ Local stream obtained');
      
      // Créer une connexion peer pour chaque spectateur
      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });
      
      // Ajouter toutes les tracks du flux local
      stream.getTracks().forEach(track => {
        if (pc && localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current);
          console.log('➕ Track added:', track.kind);
        }
      });
      
      // Gérer les candidats ICE
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc_ice_candidate', {
            targetId: 'broadcaster',
            candidate: event.candidate,
          });
          console.log('🧊 ICE candidate sent');
        }
      };
      
      // Gérer l'état de la connexion
      pc.onconnectionstatechange = () => {
        console.log('📊 Broadcaster PC state:', pc.connectionState);
      };
      
      peerConnectionRef.current = pc;
      
      // Notifier le serveur que le broadcast démarre
      socket?.emit('start_broadcast', { streamId, userId: user?.id });
      
      setIsBroadcasting(true);
      setConnectionStatus('connected');
      Toast.show({ type: 'success', text1: 'Diffusion en direct démarrée ! 🎥' });
      
      console.log('✅ Broadcast started successfully');
      
    } catch (error: any) {
      console.error('❌ Broadcast error:', error);
      setBroadcastError(error.message || 'Erreur lors du démarrage');
      
      if (error.message?.includes('permission')) {
        Alert.alert(
          'Permissions refusées',
          'Autorisez l\'accès à la caméra et au micro dans les paramètres.',
          [{ text: 'OK' }]
        );
      } else {
        Toast.show({ type: 'error', text1: 'Erreur', text2: error.message || 'Erreur inconnue' });
      }
    }
  }, [cameraType, isMuted, socket, streamId, user]);

  const stopBroadcasting = useCallback(() => {
    console.log('🛑 Stopping broadcast...');
    
    // Arrêter les tracks locales
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('⏹️ Track stopped:', track.kind);
      });
      localStreamRef.current = null;
    }
    
    // Fermer la connexion peer
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Arrêter l'intervalle de stream
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    
    socket?.emit('end_broadcast', { streamId });
    
    setIsBroadcasting(false);
    setConnectionStatus('disconnected');
    setBroadcastError(null);
    
    console.log('✅ Broadcast stopped');
  }, [socket, streamId]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  }, [isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
        setIsMuted(!isMuted);
      }
    }
  }, [isMuted]);

  // =====================================================
  // WEBSOCKET
  // =====================================================
  useEffect(() => {
    if (!socket || !streamId) return;

    socket.emit('join_stream', streamId);

    socket.on('broadcaster_ready', (data: { streamId: string; broadcasterId: string }) => {
      if (data.streamId === streamId) {
        setBroadcasterReady(true);
        setConnectionStatus('connected');
      }
    });

    socket.on('stream_status', (data: { streamId: string; status: string; broadcasterReady: boolean }) => {
      if (data.streamId === streamId) {
        setBroadcasterReady(data.broadcasterReady);
      }
    });

    socket.on('broadcaster_issue', (data: { message: string }) => {
      Toast.show({ type: 'error', text1: data.message });
    });

    socket.on('webrtc_offer', async (data: { socketId: string; offer: RTCSessionDescription }) => {
      console.log('📡 Received WebRTC offer from:', data.socketId);
      
      try {
        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
        
        const pc = await createPeerConnection(data.socketId);
        if (!pc) return;
        
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('webrtc_answer', {
          targetId: data.socketId,
          answer: answer,
        });
        
        console.log('✅ WebRTC answer sent');
      } catch (error) {
        console.error('❌ WebRTC error:', error);
        setConnectionStatus('disconnected');
      }
    });

    socket.on('webrtc_ice_candidate', async (data: { socketId: string; candidate: RTCIceCandidate }) => {
      try {
        if (peerConnectionRef.current && data.candidate) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (error) {
        console.warn('ICE candidate error:', error);
      }
    });

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

    // ✅ NOUVEAU : Événement pour que le streamer envoie son offre WebRTC
    socket.on('spectator_joined', async (data: { spectatorId: string }) => {
      if (isStreamer && isBroadcasting && peerConnectionRef.current && localStreamRef.current) {
        console.log('👤 Spectator joined, sending offer to:', data.spectatorId);
        try {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          
          socket.emit('webrtc_offer', {
            streamId,
            targetId: data.spectatorId,
            offer: offer,
          });
          console.log('✅ Offer sent to spectator');
        } catch (error) {
          console.error('Failed to send offer:', error);
        }
      }
    });

    return () => {
      socket.emit('leave_stream', streamId);
      socket.off('broadcaster_ready');
      socket.off('stream_status');
      socket.off('broadcaster_issue');
      socket.off('webrtc_offer');
      socket.off('webrtc_ice_candidate');
      socket.off('viewer_count_update');
      socket.off('new_chat_message');
      socket.off('like_update');
      socket.off('stream_ended');
      socket.off('viewers_list');
      socket.off('spectator_joined');
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, [socket, streamId, createPeerConnection, navigation, isStreamer, isBroadcasting]);

  // =====================================================
  // PERMISSIONS CAMÉRA (STREAMER)
  // =====================================================
  useEffect(() => {
    if (isStreamer) {
      (async () => {
        const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
        const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
        setHasPermission(camStatus === 'granted' && micStatus === 'granted');
      })();
    }
  }, [isStreamer]);

  // Nettoyage à la fermeture
  useEffect(() => {
    return () => {
      if (isBroadcasting) stopBroadcasting();
    };
  }, []);

  // =====================================================
  // FONCTIONS CHAT
  // =====================================================
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

  // =====================================================
  // RENDU - INDICATEUR DE CONNEXION
  // =====================================================
  const renderConnectionIndicator = () => {
    if (isStreamer || streamType === 'hls') return null;
    
    const statusConfig: Record<string, { icon: any; color: string; text: string }> = {
      connecting: { icon: Wifi, color: '#FBBF24', text: 'Connexion...' },
      connected: { icon: Wifi, color: '#10B981', text: 'Connecté' },
      reconnecting: { icon: RefreshCw, color: '#FBBF24', text: `Reconnexion ${reconnectAttempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS}` },
      disconnected: { icon: WifiOff, color: '#EF4444', text: 'Déconnecté' },
    };
    
    const config = statusConfig[connectionStatus] || statusConfig.connecting;
    const Icon = config.icon;
    
    return (
      <View style={[styles.connectionIndicator, { borderColor: config.color }]}>
        <Icon size={14} color={config.color} />
        <Text style={[styles.connectionText, { color: config.color }]}>{config.text}</Text>
        {connectionStatus === 'disconnected' && (
          <TouchableOpacity onPress={handleManualReconnect} style={styles.reconnectButton}>
            <RefreshCw size={12} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const hlsUrl = stream?.stream_key ? `${HLS_SERVER_URL}/${stream.stream_key}/index.m3u8` : null;

  // =====================================================
  // RENDU PRINCIPAL
  // =====================================================
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
        {/* Streamer avec caméra */}
        {isStreamer && hasPermission ? (
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraType}
              enableTorch={flashMode === 'on'}
              mode="video"
              mute={isMuted}
            />
            {!isVideoEnabled && (
              <View style={styles.videoDisabledOverlay}>
                <VideoOff size={48} color="#FFF" />
                <Text style={styles.videoDisabledText}>Caméra désactivée</Text>
              </View>
            )}
            {/* ✅ Message d'erreur broadcast */}
            {broadcastError && (
              <View style={styles.broadcastError}>
                <AlertTriangle size={20} color="#FFF" />
                <Text style={styles.broadcastErrorText}>{broadcastError}</Text>
              </View>
            )}
          </>
        ) : null}

        {/* WebRTC (spectateur) */}
        {!isStreamer && streamType === 'webrtc' && remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.video}
            objectFit="contain"
          />
        ) : null}

        {/* HLS (fallback) */}
        {!isStreamer && streamType === 'hls' && hlsUrl ? (
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
                setVideoStatus({ isLoaded: true, error: null });
                setConnectionStatus('connected');
              }}
              onError={(error) => {
                setVideoStatus({ isLoaded: false, error: 'Erreur de lecture' });
                setConnectionStatus('disconnected');
              }}
            />
          </>
        ) : null}

        {/* En attente de connexion WebRTC */}
        {!isStreamer && streamType === 'webrtc' && !remoteStream && (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color="#EF4444" />
            <Text style={styles.waitingText}>
              {connectionStatus === 'connecting' ? 'Connexion au streamer...' : 'En attente du streamer...'}
            </Text>
            <Text style={styles.waitingSubtext}>
              Le streamer doit démarrer sa diffusion
            </Text>
            {connectionStatus === 'disconnected' && (
              <TouchableOpacity style={styles.retryButton} onPress={handleManualReconnect}>
                <RefreshCw size={20} color="#FFF" />
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Erreur vidéo */}
        {videoStatus.error && (
          <View style={styles.errorOverlay}>
            <AlertTriangle size={32} color="#FBBF24" />
            <Text style={styles.errorText}>{videoStatus.error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleManualReconnect}>
              <RefreshCw size={20} color="#FFF" />
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <X size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.streamInfo}>
            <Text style={styles.streamTitle} numberOfLines={1}>{stream?.title}</Text>
            <Text style={styles.streamerName}>@{stream?.username}</Text>
            {renderConnectionIndicator()}
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

        {/* Badge LIVE */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        {/* Contrôles streamer */}
        {isStreamer && isBroadcasting && (
          <View style={styles.streamerControls}>
            <TouchableOpacity style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]} onPress={toggleVideo}>
              {isVideoEnabled ? <VideoIcon size={22} color="#FFF" /> : <VideoOff size={22} color="#EF4444" />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, isMuted && styles.controlButtonActive]} onPress={toggleAudio}>
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

        {/* ✅ Bouton démarrer diffusion CORRIGÉ */}
        {isStreamer && !isBroadcasting && (
          <TouchableOpacity style={styles.startStreamButton} onPress={startBroadcasting}>
            <VideoIcon size={24} color="#FFF" />
            <Text style={styles.startStreamText}>Démarrer la diffusion</Text>
          </TouchableOpacity>
        )}

        {/* Toggle chat */}
        <TouchableOpacity style={styles.chatToggle} onPress={() => setShowChat(!showChat)}>
          {showChat ? <X size={24} color="#FFF" /> : <MessageCircle size={24} color="#FFF" />}
        </TouchableOpacity>
      </View>

      {/* Chat */}
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

      {/* Actions */}
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

      {/* Modal Spectateurs */}
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

      {/* Modal Menu Streamer */}
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

// =====================================================
// STYLES
// =====================================================
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
  broadcastError: { position: 'absolute', top: 100, left: 20, right: 20, backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 },
  broadcastErrorText: { color: '#FFF', fontSize: 14, flex: 1 },
  waitingContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2937', padding: 20 },
  waitingText: { color: '#FFF', marginTop: 12, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  waitingSubtext: { color: '#999', marginTop: 8, fontSize: 14, textAlign: 'center' },
  errorOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10 },
  errorText: { color: '#FFF', marginTop: 12, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, marginTop: 20, gap: 8 },
  retryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  header: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, zIndex: 10 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  streamInfo: { flex: 1, marginHorizontal: 12 },
  streamTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  streamerName: { color: '#CCC', fontSize: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewerCountText: { color: '#FFF', marginLeft: 4, fontSize: 12 },
  connectionIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
  connectionText: { fontSize: 10 },
  reconnectButton: { marginLeft: 4, padding: 2, backgroundColor: '#EF4444', borderRadius: 10 },
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