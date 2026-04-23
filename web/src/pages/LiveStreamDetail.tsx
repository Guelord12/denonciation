import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { liveAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { socketService } from '../services/socket';
import { usePictureInPicture } from '../hooks/usePictureInPicture';
import toast from 'react-hot-toast';
import Hls from 'hls.js';
import {
  Heart, Share2, Flag, Send, Users, X, Lock, Loader2,
  MessageCircle, Video as VideoIcon, VideoOff, Mic, MicOff,
  Camera, Monitor, Settings, Maximize2, Minimize2, Volume2, VolumeX,
  Play, Pause, Gift, Star, Link as LinkIcon, Twitter, Facebook,
  AlertTriangle, CheckCircle, Clock, Calendar, Crown, Wifi, WifiOff,
  RefreshCw,
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

// =====================================================
// TYPES
// =====================================================

interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  avatar?: string;
  message: string;
  timestamp: string;
  isModerator?: boolean;
  isPinned?: boolean;
}

interface SuperChat {
  id: number;
  userId: number;
  username: string;
  avatar?: string;
  amount: number;
  message: string;
  color: string;
  createdAt: string;
}

interface VideoFilter {
  id: string;
  name: string;
  type: 'beauty' | 'color' | 'effect';
  config: any;
}

// =====================================================
// CONSTANTES
// =====================================================

const CONFIG = {
  // Délai maximum de connexion WebRTC (30 secondes)
  WEBRTC_CONNECTION_TIMEOUT: 30000,
  // Intervalle de heartbeat (10 secondes)
  HEARTBEAT_INTERVAL: 10000,
  // Délai avant de considérer la connexion comme perdue
  CONNECTION_LOST_TIMEOUT: 15000,
  // Nombre maximum de tentatives de reconnexion
  MAX_RECONNECT_ATTEMPTS: 3,
};

const VIDEO_FILTERS: VideoFilter[] = [
  { id: 'none', name: 'Aucun', type: 'color', config: {} },
  { id: 'beauty', name: 'Beauté', type: 'beauty', config: { smoothness: 0.5 } },
  { id: 'vivid', name: 'Vibrant', type: 'color', config: { saturation: 1.3 } },
  { id: 'warm', name: 'Chaud', type: 'color', config: { temperature: 1.2 } },
  { id: 'cool', name: 'Froid', type: 'color', config: { temperature: 0.8 } },
  { id: 'vintage', name: 'Vintage', type: 'effect', config: { sepia: 0.5 } },
];

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================

export default function LiveStreamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  // États du stream
  const [stream, setStream] = useState<any>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  // ✅ AMÉLIORATION : États de connexion
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
  const [streamType, setStreamType] = useState<'hls' | 'webrtc' | 'unknown'>('unknown');
  const [broadcasterReady, setBroadcasterReady] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // États du chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [superChats, setSuperChats] = useState<SuperChat[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // États du streamer
  const [isStreamer, setIsStreamer] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [selectedSource, setSelectedSource] = useState<'camera' | 'screen'>('camera');
  const [selectedFilter, setSelectedFilter] = useState<VideoFilter>(VIDEO_FILTERS[0]);
  const [showStreamerMenu, setShowStreamerMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // États du player
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState('auto');
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // États des modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSuperChatModal, setShowSuperChatModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [superChatAmount, setSuperChatAmount] = useState(5);
  const [superChatMessage, setSuperChatMessage] = useState('');
  
  // Hook PiP
  const { isPiPActive, requestPiP, exitPiP } = usePictureInPicture(videoRef);
  
  // Timer pour les contrôles
  let controlsTimeout: NodeJS.Timeout;
  
  // =====================================================
  // REQUÊTES
  // =====================================================
  
  const { data: streamData, refetch } = useQuery({
    queryKey: ['stream', id],
    queryFn: () => liveAPI.getStream(Number(id)).then(res => res.data),
    onSuccess: (data) => {
      setStream(data);
      setViewerCount(data.current_viewers || 0);
      setLikeCount(data.like_count || 0);
      setHasAccess(data.hasAccess !== false);
      setMessages(data.messages || []);
      setIsStreamer(data.user_id === user?.id);
      setIsLoading(false);
      
      // ✅ AMÉLIORATION : Détecter le type de flux
      if (data.hls_url) {
        setStreamType('hls');
      } else {
        setStreamType('webrtc');
        // Initialiser WebRTC
        initializeWebRTC();
      }
    },
    onError: () => {
      setIsLoading(false);
      toast.error('Impossible de charger le stream');
      navigate('/live');
    },
    refetchInterval: 30000,
  });
  
  // Mutations
  const likeMutation = useMutation({
    mutationFn: () => liveAPI.likeStream(Number(id)),
    onSuccess: (response) => setLikeCount(response.data.like_count),
  });
  
  const subscribeMutation = useMutation({
    mutationFn: () => liveAPI.subscribe(Number(id)),
    onSuccess: () => {
      setHasAccess(true);
      queryClient.invalidateQueries({ queryKey: ['stream', id] });
      toast.success('Abonnement réussi !');
    },
  });
  
  const endStreamMutation = useMutation({
    mutationFn: () => liveAPI.endStream(Number(id)),
    onSuccess: () => {
      toast.success('Live terminé');
      navigate('/live');
    },
  });
  
  const reportMutation = useMutation({
    mutationFn: (data: { reason: string; screenshot?: string }) =>
      liveAPI.reportStream(Number(id), data),
    onSuccess: () => {
      toast.success('Signalement envoyé');
      setShowReportModal(false);
      setReportReason('');
    },
  });
  
  const superChatMutation = useMutation({
    mutationFn: (data: { amount: number; message: string; color: string }) =>
      liveAPI.sendSuperChat(Number(id), data),
    onSuccess: () => {
      toast.success('Super Chat envoyé !');
      setShowSuperChatModal(false);
      setSuperChatMessage('');
    },
  });
  
  // =====================================================
  // ✅ AMÉLIORATION : INITIALISATION WEBRTC
  // =====================================================
  
  const initializeWebRTC = useCallback(() => {
    if (!id || isStreamer) return;
    
    setConnectionStatus('connecting');
    setBroadcasterReady(false);
    
    const socket = socketService.getSocket();
    if (!socket) {
      console.error('❌ Socket not available');
      setConnectionStatus('disconnected');
      setVideoError('Impossible de se connecter au serveur');
      return;
    }
    
    // Rejoindre le stream
    socket.emit('join_stream', id);
    console.log('📺 Joined stream:', id);
    
    // Écouter le statut du streamer
    socket.on('broadcaster_ready', (data: { streamId: string; broadcasterId: string }) => {
      if (data.streamId === id) {
        console.log('🎬 Broadcaster ready:', data.broadcasterId);
        setBroadcasterReady(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        setReconnectAttempts(0);
      }
    });
    
    socket.on('stream_status', (data: { streamId: string; status: string; broadcasterReady: boolean }) => {
      if (data.streamId === id) {
        console.log('📊 Stream status:', data.status);
        setBroadcasterReady(data.broadcasterReady);
        if (data.broadcasterReady) {
          setConnectionStatus('connected');
        }
      }
    });
    
    socket.on('broadcaster_issue', (data: { message: string }) => {
      console.warn('⚠️ Broadcaster issue:', data.message);
      toast.error(data.message, { icon: '⚠️' });
    });
    
    // Écouter l'offre WebRTC
    socket.on('webrtc_offer', async (data: { socketId: string; offer: RTCSessionDescriptionInit }) => {
      console.log('📡 Received WebRTC offer from:', data.socketId);
      
      try {
        // Annuler le timeout de connexion
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        
        // Créer la connexion peer
        await createPeerConnection(data.socketId);
        
        // Appliquer l'offre
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          
          // Créer la réponse
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          // Envoyer la réponse
          socket.emit('webrtc_answer', {
            targetId: data.socketId,
            answer: answer,
          });
          
          console.log('✅ WebRTC answer sent');
        }
      } catch (error) {
        console.error('❌ WebRTC error:', error);
        setConnectionStatus('disconnected');
        setVideoError('Erreur de connexion WebRTC');
        attemptReconnect();
      }
    });
    
    // Écouter les candidats ICE
    socket.on('webrtc_ice_candidate', async (data: { socketId: string; candidate: RTCIceCandidateInit }) => {
      try {
        if (peerConnectionRef.current && data.candidate) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (error) {
        console.warn('ICE candidate error:', error);
      }
    });
    
    // Démarrer le heartbeat
    startHeartbeat();
    
    // Timeout de connexion
    connectionTimeoutRef.current = setTimeout(() => {
      if (connectionStatus === 'connecting' && !broadcasterReady) {
        console.warn('⏰ WebRTC connection timeout');
        setConnectionStatus('disconnected');
        setVideoError('Délai de connexion dépassé');
        attemptReconnect();
      }
    }, CONFIG.WEBRTC_CONNECTION_TIMEOUT);
    
  }, [id, isStreamer, connectionStatus, broadcasterReady]);
  
  // ✅ AMÉLIORATION : Créer une connexion peer WebRTC
  const createPeerConnection = useCallback(async (broadcasterId: string) => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
    
    const pc = new RTCPeerConnection(configuration);
    
    // Gérer les tracks entrants
    pc.ontrack = (event) => {
      console.log('🎥 Received remote track');
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        videoRef.current.play().catch(console.warn);
        setConnectionStatus('connected');
        setVideoError(null);
      }
    };
    
    // Gérer l'état de la connexion
    pc.onconnectionstatechange = () => {
      console.log('📊 WebRTC connection state:', pc.connectionState);
      
      switch (pc.connectionState) {
        case 'connected':
          setConnectionStatus('connected');
          setVideoError(null);
          break;
        case 'disconnected':
        case 'failed':
          setConnectionStatus('disconnected');
          attemptReconnect();
          break;
        case 'connecting':
          setConnectionStatus('connecting');
          break;
        case 'closed':
          setConnectionStatus('disconnected');
          break;
      }
    };
    
    // Gérer les candidats ICE
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = socketService.getSocket();
        socket?.emit('webrtc_ice_candidate', {
          targetId: broadcasterId,
          candidate: event.candidate,
        });
      }
    };
    
    // Gérer la négociation
    pc.onnegotiationneeded = async () => {
      console.log('🔄 WebRTC negotiation needed');
    };
    
    peerConnectionRef.current = pc;
    
    // ✅ AMÉLIORATION : Envoyer le statut de connexion
    const socket = socketService.getSocket();
    socket?.emit('webrtc_connection_status', {
      streamId: id,
      status: 'connecting',
    });
    
  }, [id]);
  
  // ✅ AMÉLIORATION : Heartbeat pour maintenir la connexion
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      const socket = socketService.getSocket();
      if (socket && socket.connected) {
        socket.emit('heartbeat');
      } else {
        // Socket déconnecté
        setConnectionStatus('disconnected');
        attemptReconnect();
      }
    }, CONFIG.HEARTBEAT_INTERVAL);
  }, []);
  
  // ✅ AMÉLIORATION : Tentative de reconnexion
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnect attempts reached');
      setVideoError('Impossible de se reconnecter. Veuillez rafraîchir la page.');
      return;
    }
    
    reconnectAttemptsRef.current++;
    setReconnectAttempts(reconnectAttemptsRef.current);
    setConnectionStatus('reconnecting');
    
    console.log(`🔄 Reconnect attempt ${reconnectAttemptsRef.current}/${CONFIG.MAX_RECONNECT_ATTEMPTS}`);
    
    // Nettoyer l'ancienne connexion
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Réinitialiser
    setTimeout(() => {
      initializeWebRTC();
    }, 2000);
  }, [initializeWebRTC]);
  
  // ✅ AMÉLIORATION : Reconnexion manuelle
  const handleManualReconnect = () => {
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    setVideoError(null);
    initializeWebRTC();
  };
  
  // =====================================================
  // GESTION DE LA VIDÉO (HLS)
  // =====================================================
  
  useEffect(() => {
    if (!videoRef.current || !stream?.hls_url || isStreamer || streamType !== 'hls') return;
    
    const video = videoRef.current;
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      
      hls.loadSource(stream.hls_url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isPlaying) video.play().catch(console.warn);
        setConnectionStatus('connected');
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setVideoError('Erreur de lecture du stream');
          setConnectionStatus('disconnected');
          toast.error('Erreur de lecture');
        }
      });
      
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = stream.hls_url;
      video.addEventListener('loadedmetadata', () => {
        if (isPlaying) video.play().catch(console.warn);
        setConnectionStatus('connected');
      });
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [stream?.hls_url, isStreamer, streamType, isPlaying]);
  
  // =====================================================
  // WEBSOCKET (Chat et événements)
  // =====================================================
  
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !id) return;
    
    socket.on('viewer_count_update', (data: { streamId: string; count: number }) => {
      if (data.streamId === id) setViewerCount(data.count);
    });
    
    socket.on('new_chat_message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });
    
    socket.on('new_super_chat', (superChat: SuperChat) => {
      setSuperChats((prev) => [superChat, ...prev]);
      toast.success(`${superChat.username} a envoyé ${superChat.amount}€ !`, {
        icon: '💎',
        duration: 5000,
      });
    });
    
    socket.on('like_update', (data: { count: number }) => setLikeCount(data.count));
    
    socket.on('stream_ended', () => {
      toast.error('Ce live est terminé');
      navigate('/live');
    });
    
    socket.on('moderation_warning', (data: { message: string }) => {
      toast.error(data.message, { icon: '⚠️', duration: 10000 });
    });
    
    return () => {
      socket.off('viewer_count_update');
      socket.off('new_chat_message');
      socket.off('new_super_chat');
      socket.off('like_update');
      socket.off('stream_ended');
      socket.off('moderation_warning');
      socket.off('broadcaster_ready');
      socket.off('stream_status');
      socket.off('broadcaster_issue');
      socket.off('webrtc_offer');
      socket.off('webrtc_ice_candidate');
      
      // Nettoyer WebRTC
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      stopBroadcasting();
    };
  }, [id, navigate]);
  
  // =====================================================
  // FONCTIONS DE DIFFUSION (STREAMER)
  // =====================================================
  
  const startBroadcasting = useCallback(async (sourceType: 'camera' | 'screen') => {
    try {
      let stream: MediaStream;
      
      if (sourceType === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080, frameRate: 30 },
          audio: true,
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            frameRate: 30,
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 48000,
          },
        });
      }
      
      mediaStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm;codecs=vp8';
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });
      
      const socket = socketService.getSocket();
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            socket.emit('stream_data', {
              streamId: id,
              chunk: base64data.split(',')[1],
            });
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      
      setIsBroadcasting(true);
      socket?.emit('start_broadcast', { streamId: id });
      
      toast.success('Diffusion en direct démarrée !');
      
    } catch (error: any) {
      console.error('Broadcast error:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Permission refusée. Autorisez l\'accès à la caméra.');
      } else {
        toast.error('Erreur lors du démarrage de la diffusion');
      }
    }
  }, [id]);
  
  const stopBroadcasting = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    setIsBroadcasting(false);
    const socket = socketService.getSocket();
    socket?.emit('end_broadcast', { streamId: id });
    toast.success('Diffusion arrêtée');
  }, [id]);
  
  const toggleVideo = useCallback(() => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  }, [videoEnabled]);
  
  const toggleAudio = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  }, [audioEnabled]);
  
  // =====================================================
  // FONCTIONS DU CHAT
  // =====================================================
  
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;
    
    setIsSending(true);
    
    const socket = socketService.getSocket();
    socket?.emit('chat_message', {
      streamId: id,
      message: inputMessage.trim(),
    });
    
    setInputMessage('');
    setIsSending(false);
  };
  
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };
  
  // =====================================================
  // FONCTIONS D'INTERACTION
  // =====================================================
  
  const handleLike = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    likeMutation.mutate();
    setIsLiked(true);
    setTimeout(() => setIsLiked(false), 500);
  };
  
  const handleSubscribe = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsSubscribing(true);
    subscribeMutation.mutate(undefined, {
      onSettled: () => setIsSubscribing(false),
    });
  };
  
  const handleShare = () => {
    setShowShareModal(true);
  };
  
  const copyStreamLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success('Lien copié !');
  };
  
  const shareToTwitter = () => {
    const text = encodeURIComponent(`Je regarde "${stream?.title}" en direct !`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };
  
  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };
  
  const handleReport = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowReportModal(true);
  };
  
  const submitReport = async () => {
    if (!reportReason.trim()) {
      toast.error('Veuillez indiquer la raison du signalement');
      return;
    }
    
    let screenshot = null;
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      screenshot = canvas.toDataURL('image/jpeg');
    }
    
    reportMutation.mutate({ reason: reportReason, screenshot });
  };
  
  const handleSuperChat = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowSuperChatModal(true);
  };
  
  const submitSuperChat = () => {
    if (superChatAmount < 1) {
      toast.error('Montant minimum : 1€');
      return;
    }
    
    const colors = ['#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#00FF00', '#00BFFF', '#8A2BE2'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    superChatMutation.mutate({
      amount: superChatAmount,
      message: superChatMessage,
      color: randomColor,
    });
  };
  
  const handleEndStream = () => {
    if (confirm('Voulez-vous vraiment terminer ce live ?')) {
      stopBroadcasting();
      endStreamMutation.mutate();
    }
  };
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };
  
  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => setShowControls(false), 3000);
  };
  
  // =====================================================
  // RENDU
  // =====================================================
  
  // ✅ AMÉLIORATION : Rendu de l'indicateur de connexion
  const renderConnectionIndicator = () => {
    if (isStreamer) return null;
    
    const statusConfig = {
      connecting: { icon: Wifi, color: 'text-yellow-500', text: 'Connexion...' },
      connected: { icon: Wifi, color: 'text-green-500', text: 'Connecté' },
      reconnecting: { icon: RefreshCw, color: 'text-yellow-500', text: `Reconnexion ${reconnectAttempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS}` },
      disconnected: { icon: WifiOff, color: 'text-red-500', text: 'Déconnecté' },
    };
    
    const config = statusConfig[connectionStatus];
    const Icon = config.icon;
    
    return (
      <div className={`flex items-center gap-1 ${config.color} bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full`}>
        <Icon className={`w-4 h-4 ${connectionStatus === 'reconnecting' ? 'animate-spin' : ''}`} />
        <span className="text-xs">{config.text}</span>
        {connectionStatus === 'disconnected' && (
          <button
            onClick={handleManualReconnect}
            className="ml-2 text-white hover:text-green-400"
            title="Reconnecter"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="text-white ml-3">Chargement du stream...</span>
      </div>
    );
  }
  
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <Lock className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Stream Premium</h2>
        <p className="text-gray-400 mb-2">Ce stream nécessite un abonnement</p>
        <p className="text-3xl font-bold text-yellow-500 mb-6">{stream?.price} €</p>
        
        <button
          onClick={handleSubscribe}
          disabled={isSubscribing}
          className="bg-yellow-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isSubscribing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Traitement...
            </>
          ) : (
            'S\'abonner'
          )}
        </button>
        
        <button
          onClick={() => navigate('/live')}
          className="mt-4 text-gray-400 hover:text-white"
        >
          Retour aux lives
        </button>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black flex" onMouseMove={handleMouseMove}>
      {/* Zone vidéo principale */}
      <div className="flex-1 relative">
        {isStreamer && !isBroadcasting ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
            <Camera className="w-20 h-20 text-gray-400 mb-4" />
            <h3 className="text-white text-2xl mb-2">Prêt à diffuser</h3>
            <p className="text-gray-400 mb-8">Choisissez votre source pour démarrer</p>
            
            <div className="flex gap-4">
              <button
                onClick={() => startBroadcasting('camera')}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 flex items-center gap-2"
              >
                <VideoIcon className="w-5 h-5" />
                Caméra
              </button>
              <button
                onClick={() => startBroadcasting('screen')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
              >
                <Monitor className="w-5 h-5" />
                Écran
              </button>
            </div>
            
            <div className="mt-8">
              <p className="text-gray-400 mb-3">Filtres</p>
              <div className="flex gap-2">
                {VIDEO_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-4 py-2 rounded-lg transition ${
                      selectedFilter.id === filter.id
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              onClick={togglePlay}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                  <p className="text-white mb-4">{videoError}</p>
                  <button
                    onClick={handleManualReconnect}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Badge LIVE */}
        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-md flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          <span className="font-bold">LIVE</span>
          <span className="text-sm ml-2">{viewerCount}</span>
        </div>
        
        {/* ✅ AMÉLIORATION : Indicateur de connexion */}
        {!isStreamer && (
          <div className="absolute top-4 left-32">
            {renderConnectionIndicator()}
          </div>
        )}
        
        {/* Infos du stream */}
        <div className="absolute top-4 left-24 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white max-w-md">
          <h3 className="font-semibold truncate">{stream?.title}</h3>
          <p className="text-sm text-gray-300">@{stream?.username}</p>
        </div>
        
        {/* ✅ AMÉLIORATION : Message d'attente WebRTC */}
        {!isStreamer && streamType === 'webrtc' && connectionStatus === 'connecting' && !broadcasterReady && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-lg px-6 py-3 text-white">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>En attente du streamer...</span>
            </div>
          </div>
        )}
        
        {/* Contrôles du streamer */}
        {isStreamer && isBroadcasting && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg p-2">
            <button
              onClick={toggleVideo}
              className={`p-2 rounded-lg transition ${
                videoEnabled ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'
              }`}
              title={videoEnabled ? 'Désactiver la caméra' : 'Activer la caméra'}
            >
              {videoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleAudio}
              className={`p-2 rounded-lg transition ${
                audioEnabled ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'
              }`}
              title={audioEnabled ? 'Couper le micro' : 'Activer le micro'}
            >
              {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleEndStream}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Contrôles du player (spectateur) */}
        {!isStreamer && showControls && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="text-white hover:text-red-500">
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="text-white hover:text-red-500">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-24 h-1 bg-gray-600 rounded-full"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button onClick={toggleFullscreen} className="text-white hover:text-red-500">
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button onClick={() => setShowSettings(true)} className="text-white hover:text-red-500">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Boutons d'action */}
        <div className="absolute right-4 bottom-20 flex flex-col gap-2">
          <button
            onClick={handleLike}
            className={`p-3 rounded-full transition ${
              isLiked ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'
            }`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <span className="text-white text-center text-sm">{likeCount}</span>
          
          <button
            onClick={handleShare}
            className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <Share2 className="w-6 h-6" />
          </button>
          
          <button
            onClick={handleReport}
            className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <Flag className="w-6 h-6" />
          </button>
          
          {stream?.is_premium && (
            <button
              onClick={handleSuperChat}
              className="p-3 rounded-full bg-yellow-500 text-white hover:bg-yellow-600"
            >
              <Gift className="w-6 h-6" />
            </button>
          )}
        </div>
        
        {/* Bouton toggle chat (mobile) */}
        <button
          onClick={() => setShowChat(!showChat)}
          className="absolute top-4 right-4 md:hidden bg-black/50 backdrop-blur-sm p-2 rounded-lg text-white"
        >
          {showChat ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        </button>
      </div>
      
      {/* Sidebar Chat */}
      {showChat && (
        <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Chat en direct</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleShare} className="text-gray-400 hover:text-white">
                  <Share2 className="w-4 h-4" />
                </button>
                <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white md:hidden">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{messages.length} messages</p>
          </div>
          
          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {superChats.slice(0, 3).map((sc) => (
              <div
                key={sc.id}
                className="p-2 rounded-lg"
                style={{ backgroundColor: sc.color + '20', borderLeft: `3px solid ${sc.color}` }}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={sc.avatar || `https://ui-avatars.com/api/?name=${sc.username}`}
                    alt=""
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-white font-medium">{sc.username}</span>
                  <span className="text-yellow-400 text-sm">{sc.amount}€</span>
                </div>
                <p className="text-gray-300 text-sm mt-1">{sc.message}</p>
              </div>
            ))}
            
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2">
                <img
                  src={msg.avatar || `https://ui-avatars.com/api/?name=${msg.username}`}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-medium text-sm ${msg.isModerator ? 'text-green-400' : 'text-white'}`}>
                      {msg.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistance(new Date(msg.timestamp), new Date(), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm break-words">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Input chat */}
          {isAuthenticated ? (
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Écrivez un message..."
                  className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 border-t border-gray-800 text-center">
              <p className="text-gray-400 text-sm">
                <a href="/login" className="text-red-500 hover:underline">
                  Connectez-vous
                </a>
                {' '}pour participer au chat
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Modal de partage */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Partager</h3>
              <button onClick={() => setShowShareModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={copyStreamLink}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
              >
                <LinkIcon className="w-5 h-5" />
                <span>Copier le lien</span>
              </button>
              
              <button
                onClick={shareToTwitter}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
              >
                <Twitter className="w-5 h-5 text-blue-400" />
                <span>Twitter</span>
              </button>
              
              <button
                onClick={shareToFacebook}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
              >
                <Facebook className="w-5 h-5 text-blue-600" />
                <span>Facebook</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de signalement */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Signaler ce contenu</h3>
            
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Décrivez le problème..."
              className="w-full p-3 border rounded-lg mb-4 h-32 resize-none"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={submitReport}
                disabled={reportMutation.isPending}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {reportMutation.isPending ? 'Envoi...' : 'Signaler'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Super Chat */}
      {showSuperChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Super Chat
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Montant (€)</label>
              <div className="flex gap-2">
                {[5, 10, 20, 50].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSuperChatAmount(amount)}
                    className={`px-4 py-2 rounded-lg ${
                      superChatAmount === amount
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {amount}€
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={superChatAmount}
                onChange={(e) => setSuperChatAmount(Number(e.target.value))}
                min={1}
                className="mt-2 w-full p-2 border rounded-lg"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Message (optionnel)</label>
              <textarea
                value={superChatMessage}
                onChange={(e) => setSuperChatMessage(e.target.value)}
                placeholder="Votre message..."
                maxLength={200}
                className="w-full p-3 border rounded-lg h-24 resize-none"
              />
              <p className="text-xs text-gray-500 text-right">{superChatMessage.length}/200</p>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-yellow-800">
                💡 Votre message sera épinglé en haut du chat pendant {Math.floor(superChatAmount / 5)} minute(s)
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSuperChatModal(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={submitSuperChat}
                disabled={superChatMutation.isPending}
                className="flex-1 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50"
              >
                {superChatMutation.isPending ? 'Envoi...' : `Envoyer ${superChatAmount}€`}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Paramètres */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Paramètres</h3>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {!isStreamer && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Qualité</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="auto">Auto</option>
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Vitesse de lecture</label>
                  <select
                    value={playbackRate}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value);
                      setPlaybackRate(rate);
                      if (videoRef.current) videoRef.current.playbackRate = rate;
                    }}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>Normal</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </div>
              </>
            )}
            
            {isStreamer && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Source</label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value as 'camera' | 'screen')}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="camera">Caméra</option>
                  <option value="screen">Écran</option>
                </select>
              </div>
            )}
            
            {/* ✅ AMÉLIORATION : État de connexion dans les paramètres */}
            {!isStreamer && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">État de la connexion</p>
                <div className="flex items-center gap-2">
                  {connectionStatus === 'connected' && (
                    <>
                      <Wifi className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">Connecté</span>
                    </>
                  )}
                  {connectionStatus === 'connecting' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                      <span className="text-sm text-yellow-600">Connexion...</span>
                    </>
                  )}
                  {connectionStatus === 'reconnecting' && (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />
                      <span className="text-sm text-yellow-600">Reconnexion ({reconnectAttempts}/{CONFIG.MAX_RECONNECT_ATTEMPTS})</span>
                    </>
                  )}
                  {connectionStatus === 'disconnected' && (
                    <>
                      <WifiOff className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600">Déconnecté</span>
                    </>
                  )}
                </div>
                {connectionStatus === 'disconnected' && (
                  <button
                    onClick={handleManualReconnect}
                    className="mt-3 w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Reconnexion manuelle
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Icône CheckCircle manquante
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);