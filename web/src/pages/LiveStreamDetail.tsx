import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { liveAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';
import Hls from 'hls.js';
import {
  Heart, Share2, Flag, Send, X, Lock, Loader2,
  Gift, Crown, AlertTriangle, Volume2, VolumeX,
  Maximize2, Minimize2, Play, Pause,
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
}

interface GiftItem {
  id: number;
  name: string;
  icon: string;
  price: number;
}

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
  const hlsRef = useRef<Hls | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // États du stream
  const [stream, setStream] = useState<any>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [streamType, setStreamType] = useState<'hls' | 'webrtc' | 'unknown'>('unknown');
  const [connectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // États du streamer
  const [isStreamer, setIsStreamer] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // États du chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);

  // États du player
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  let controlsTimeout: NodeJS.Timeout;

  // =====================================================
  // REQUÊTES
  // =====================================================

  const { data } = useQuery({
    queryKey: ['stream', id],
    queryFn: () => liveAPI.getStream(Number(id)).then(res => res.data),
  });

  useEffect(() => {
    if (data) {
      setStream(data);
      setViewerCount(data.current_viewers || 0);
      setLikeCount(data.like_count || 0);
      setHasAccess(data.hasAccess !== false);
      setMessages(data.messages || []);

      // Détecter si l'utilisateur est le streamer
      const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      const currentUserId = user?.id || authData?.state?.user?.id;
      setIsStreamer(Number(data.user_id) === Number(currentUserId));

      // Déterminer le type de flux
      if (data.hls_url) {
        setStreamType('hls');
      } else {
        setStreamType('webrtc');
      }

      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
      toast.error('Impossible de charger le stream');
      navigate('/live');
    },
    refetchInterval: 30000,
  });

  // Sync isStreamer avec user change (user peut charger async)
  useEffect(() => {
    if (stream && user?.id) {
      setIsStreamer(Number(stream.user_id) === Number(user.id));
    }
  }, [stream?.user_id, user?.id]);

  // Récupérer les cadeaux
  useEffect(() => {
    liveAPI.getGifts().then(res => setGifts(res.data.gifts || [])).catch(() => {});
  }, []);

  // =====================================================
  // WEBSOCKET
  // =====================================================

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !id) return;

    socket.emit('join_stream', id);

    socket.on('new_chat_message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    });

    socket.on('viewer_count_update', (data: { count: number }) => setViewerCount(data.count));
    socket.on('like_update', (data: { count: number }) => setLikeCount(data.count));
    
    socket.on('new_gift', (gift: any) => {
      toast.success(`${gift.gift_icon} ${gift.username} a envoyé ${gift.gift_name} !`, { duration: 3000 });
    });

    socket.on('new_super_chat', (sc: any) => {
      toast.success(`💎 ${sc.username} a envoyé ${sc.amount}€ !`, { duration: 5000 });
    });

    socket.on('stream_ended', () => {
      toast.error('Ce live est terminé');
      navigate('/live');
    });

    return () => {
      socket.emit('leave_stream', id);
      socket.off('new_chat_message'); socket.off('viewer_count_update');
      socket.off('like_update'); socket.off('new_gift');
      socket.off('new_super_chat'); socket.off('stream_ended');

      if (peerConnectionRef.current) peerConnectionRef.current.close();
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [id, navigate]);

  // =====================================================
  // GESTION HLS (fallback si pas de WebRTC)
  // =====================================================

  useEffect(() => {
    if (!videoRef.current || !stream?.hls_url || streamType !== 'hls') return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 });
      hls.loadSource(stream.hls_url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { if (isPlaying) video.play().catch(console.warn); setConnectionStatus('connected'); });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) { setVideoError('Erreur de lecture du stream'); setConnectionStatus('disconnected'); }
      });
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = stream.hls_url;
      video.addEventListener('loadedmetadata', () => { if (isPlaying) video.play().catch(console.warn); });
    }

    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [stream?.hls_url, streamType, isPlaying]);

  // =====================================================
  // FONCTIONS STREAMER (DIFFUSION)
  // =====================================================

  const startBroadcasting = async (sourceType: 'camera' | 'screen') => {
    try {
      let mediaStream: MediaStream;

      if (sourceType === 'screen') {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user', frameRate: 30 },
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
        });
      }

      mediaStreamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      // MediaRecorder pour envoyer les chunks
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm;codecs=vp8';
      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType, videoBitsPerSecond: 2500000 });

      const socket = socketService.getSocket();
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0 && socket) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            socket.emit('stream_data', { streamId: id, chunk: base64data.split(',')[1] });
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
      toast.error(error.name === 'NotAllowedError' ? 'Permission refusée. Autorisez l\'accès à la caméra.' : 'Erreur lors du démarrage de la diffusion');
    }
  };

  const stopBroadcasting = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsBroadcasting(false);
    socketService.getSocket()?.emit('end_broadcast', { streamId: id });
    toast.success('Diffusion arrêtée');
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const track = mediaStreamRef.current.getVideoTracks()[0];
      if (track) { track.enabled = !videoEnabled; setVideoEnabled(!videoEnabled); }
    }
  };

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const track = mediaStreamRef.current.getAudioTracks()[0];
      if (track) { track.enabled = !audioEnabled; setAudioEnabled(!audioEnabled); }
    }
  };

  // =====================================================
  // FONCTIONS CHAT
  // =====================================================

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isAuthenticated) return;
    socketService.getSocket()?.emit('chat_message', { streamId: id, message: inputMessage.trim() });
    setInputMessage('');
  };

  // =====================================================
  // FONCTIONS D'INTERACTION
  // =====================================================

  const handleLike = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    liveAPI.likeStream(Number(id)).then(() => {}).catch(() => {});
    setIsLiked(true);
    setTimeout(() => setIsLiked(false), 500);
  };

  const handleSubscribe = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setIsSubscribing(true);
    liveAPI.subscribe(Number(id)).then(() => {
      setHasAccess(true); setIsSubscribing(false);
      queryClient.invalidateQueries({ queryKey: ['stream', id] });
      toast.success('Abonnement réussi !');
    }).catch(() => { setIsSubscribing(false); toast.error('Erreur'); });
  };

  const handleSendGift = (gift: GiftItem) => {
    if (!isAuthenticated) return;
    liveAPI.sendGift(Number(id), gift.id, 1).then(() => {
      toast.success(`${gift.icon} Cadeau envoyé !`);
      setShowGifts(false);
    }).catch(() => toast.error('Erreur'));
  };

  const handleReport = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    const reason = prompt('Raison du signalement :');
    if (reason) {
      // TODO: Implémenter reportStream endpoint
      toast.success('Signalement envoyé');
    }
  };

  const handleEndStream = () => {
    if (confirm('Voulez-vous vraiment terminer ce live ?')) {
      stopBroadcasting();
      liveAPI.endStream(Number(id)).then(() => { toast.success('Live terminé'); navigate('/live'); }).catch(() => toast.error('Erreur'));
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) { videoRef.current.muted = !isMuted; setIsMuted(!isMuted); }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => setShowControls(false), 3000);
  };

  // =====================================================
  // RENDU
  // =====================================================

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
        <button onClick={handleSubscribe} disabled={isSubscribing}
          className="bg-yellow-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2">
          {isSubscribing ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement...</> : "S'abonner"}
        </button>
        <button onClick={() => navigate('/live')} className="mt-4 text-gray-400 hover:text-white">Retour aux lives</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex" onMouseMove={handleMouseMove}>
      {/* Zone vidéo principale */}
      <div className="flex-1 relative">
        {isStreamer && !isBroadcasting ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
            <h3 className="text-white text-2xl mb-2">Prêt à diffuser</h3>
            <p className="text-gray-400 mb-8">Choisissez votre source pour démarrer</p>
            <div className="flex gap-4">
              <button onClick={() => startBroadcasting('camera')} className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 flex items-center gap-2">
                📹 Caméra
              </button>
              <button onClick={() => startBroadcasting('screen')} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
                🖥️ Écran
              </button>
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-contain" playsInline onClick={togglePlay} />
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                  <p className="text-white mb-4">{videoError}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Badge LIVE */}
        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-md flex items-center gap-2 z-10">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          <span className="font-bold">LIVE</span>
          <span className="text-sm ml-2">{viewerCount}</span>
        </div>

        {stream?.is_premium && (
          <div className="absolute top-4 right-20 bg-yellow-500 text-white px-3 py-1 rounded-full flex items-center gap-1 z-10">
            <Crown className="w-3 h-3" /><span className="text-xs font-bold">PREMIUM</span>
          </div>
        )}

        {/* Infos du stream */}
        <div className="absolute top-4 left-24 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white max-w-md z-10">
          <h3 className="font-semibold truncate">{stream?.title}</h3>
          <p className="text-sm text-gray-300">@{stream?.username}</p>
        </div>

        {/* Contrôles streamer */}
        {isStreamer && isBroadcasting && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg p-2 z-10">
            <button onClick={toggleVideo} className={`p-2 rounded-lg transition ${videoEnabled ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}>
              {videoEnabled ? '📹' : '📹❌'}
            </button>
            <button onClick={toggleAudio} className={`p-2 rounded-lg transition ${audioEnabled ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}>
              {audioEnabled ? '🎤' : '🎤❌'}
            </button>
            <button onClick={handleEndStream} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Contrôles player */}
        {!isStreamer && showControls && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="text-white hover:text-red-500">
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                <button onClick={toggleMute} className="text-white hover:text-red-500">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
              <button onClick={toggleFullscreen} className="text-white hover:text-red-500">
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* Boutons d'action (droite) */}
        <div className="absolute right-4 bottom-20 flex flex-col gap-2 z-10">
          <button onClick={handleLike} className={`p-3 rounded-full transition ${isLiked ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}>
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <span className="text-white text-center text-sm">{likeCount}</span>

          <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Lien copié !'); }} className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70">
            <Share2 className="w-6 h-6" />
          </button>

          <button onClick={() => setShowGifts(!showGifts)} className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70">
            <Gift className="w-6 h-6 text-yellow-400" />
          </button>

          <button onClick={handleReport} className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70">
            <Flag className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Sidebar Chat */}
      {showChat && (
        <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col z-20">
          <div className="p-4 border-b border-gray-800">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-white">Chat en direct</h3>
              <button onClick={() => setShowChat(false)} className="text-gray-400 md:hidden"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-400 mt-1">{messages.length} messages</p>
          </div>

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2">
                <img src={msg.avatar || `https://ui-avatars.com/api/?name=${msg.username}`} alt="" className="w-6 h-6 rounded-full" />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-red-400 text-sm">@{msg.username}</span>
                    <span className="text-xs text-gray-500">{formatDistance(new Date(msg.timestamp), new Date(), { addSuffix: true, locale: fr })}</span>
                  </div>
                  <p className="text-gray-300 text-sm">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          {isAuthenticated ? (
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-800 flex gap-2">
              <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="Message..." className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm" />
              <button type="submit" disabled={!inputMessage.trim()} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </form>
          ) : (
            <div className="p-4 border-t border-gray-800 text-center">
              <Link to="/login" className="text-red-500 hover:underline text-sm">Connectez-vous pour chatter</Link>
            </div>
          )}
        </div>
      )}

      {/* Gifts Modal */}
      {showGifts && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/95 border-t border-gray-800 rounded-t-2xl">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h3 className="text-white font-semibold">Envoyer un cadeau</h3>
            <button onClick={() => setShowGifts(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-3 grid grid-cols-4 gap-3 max-h-60 overflow-y-auto">
            {gifts.map((gift) => (
              <button key={gift.id} onClick={() => handleSendGift(gift)} className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-800 transition">
                <span className="text-3xl">{gift.icon}</span>
                <span className="text-white text-xs">{gift.name}</span>
                <span className="text-yellow-400 text-xs">{gift.price} €</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}