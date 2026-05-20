import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { liveAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';
import {
  Heart, Share2, Send, X, Lock, Loader2,
  MessageCircle, Video as VideoIcon, Gift, Crown,
  Maximize2, ChevronUp, ChevronDown, Plus,
  Music2, BadgeCheck,
} from 'lucide-react';

// Types
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
  category: string;
}

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
  status: 'active' | 'scheduled' | 'ended';
  current_viewers: number;
  current_likes?: number;
  tags?: string[];
  category?: string;
  user_id?: number;
  hasAccess?: boolean;
}

// Composant principal
export default function LiveFeed() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['live-feed'],
    queryFn: ({ pageParam = 1 }) =>
      liveAPI.getLiveFeed({ page: pageParam, limit: 10 }).then(res => res.data),
    getNextPageParam: (lastPage) => lastPage.has_more ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  const streams = data?.pages.flatMap(page => page.streams) || [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goToNext();
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, streams.length]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) > 30) {
      if (e.deltaY > 0) goToNext();
      else goToPrev();
    }
  }, [currentIndex, streams.length]);

  const touchStartY = useRef(0);

  const goToNext = () => {
    if (currentIndex < streams.length - 1) setCurrentIndex(prev => prev + 1);
    else if (hasNextPage) fetchNextPage();
  };

  const goToPrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  useEffect(() => {
    if (currentIndex >= streams.length - 3 && hasNextPage) fetchNextPage();
  }, [currentIndex, streams.length, hasNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white">
        <VideoIcon className="w-20 h-20 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Aucun live en cours</h2>
        <p className="text-gray-400 mb-8">Soyez le premier à lancer un live !</p>
        {isAuthenticated ? (
          <Link to="/live/create" className="bg-red-600 text-white px-8 py-3 rounded-full font-medium hover:bg-red-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Démarrer un live
          </Link>
        ) : (
          <Link to="/login" className="bg-red-600 text-white px-8 py-3 rounded-full font-medium hover:bg-red-700">
            Se connecter pour lancer un live
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" onWheel={handleWheel}>
      {/* Flèches */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 flex flex-col gap-4">
        <button onClick={goToPrev} disabled={currentIndex === 0} className="p-2 bg-black/50 rounded-full text-white disabled:opacity-30">
          <ChevronUp className="w-8 h-8" />
        </button>
        <button onClick={goToNext} disabled={currentIndex >= streams.length - 1 && !hasNextPage} className="p-2 bg-black/50 rounded-full text-white disabled:opacity-30">
          <ChevronDown className="w-8 h-8" />
        </button>
      </div>

      {/* Streams */}
      <div className="transition-transform duration-300 ease-out" style={{ transform: `translateY(-${currentIndex * 100}vh)` }}>
        {streams.map((stream) => (
          <LiveStreamCard key={stream.id} stream={stream} />
        ))}
      </div>

      {/* Indicateur */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 flex flex-col gap-1">
        {streams.map((_, index) => (
          <div key={index} className={`w-1 rounded-full transition-all duration-300 ${index === currentIndex ? 'h-8 bg-red-600' : index < currentIndex ? 'h-4 bg-gray-500' : 'h-4 bg-gray-700'}`} />
        ))}
      </div>

      {isAuthenticated && (
        <Link to="/live/create" className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 bg-red-600 text-white px-8 py-3 rounded-full font-medium hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-600/50">
          <Plus className="w-5 h-5" /> Créer un live
        </Link>
      )}
    </div>
  );
}

// Carte de stream
function LiveStreamCard({ stream }: { stream: LiveStream }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [likeCount, setLikeCount] = useState(stream.current_likes || 0);
  const [viewerCount, setViewerCount] = useState(stream.current_viewers || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    liveAPI.getGifts().then(res => setGifts(res.data.gifts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('join_stream', stream.id);
    socket.on('new_chat_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), 100);
    });
    socket.on('viewer_count_update', (data: { count: number }) => setViewerCount(data.count));
    socket.on('like_update', (data: { count: number }) => setLikeCount(data.count));
    socket.on('stream_ended', () => toast.error('Ce live est terminé'));
    return () => {
      socket.emit('leave_stream', stream.id);
      socket.off('new_chat_message'); socket.off('viewer_count_update'); socket.off('like_update'); socket.off('stream_ended');
    };
  }, [stream.id]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isAuthenticated) return;
    socketService.getSocket()?.emit('chat_message', { streamId: stream.id, message: inputMessage.trim() });
    setInputMessage('');
  };

  const handleLike = () => {
    if (!isAuthenticated) return;
    socketService.getSocket()?.emit('like_stream', { streamId: stream.id, userId: user?.id });
    setIsLiked(true);
    setTimeout(() => setIsLiked(false), 500);
  };

  const handleSendGift = (gift: GiftItem) => {
    if (!isAuthenticated) return;
    socketService.getSocket()?.emit('send_gift', { streamId: stream.id, gift_id: gift.id, amount: 1 });
    toast.success(`${gift.icon} Cadeau envoyé !`);
    setShowGifts(false);
  };

  const handleSubscribe = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    liveAPI.subscribe(stream.id).then(() => toast.success('Abonnement réussi !')).catch(() => toast.error('Erreur'));
  };

  if (stream.is_premium && !stream.hasAccess && stream.user_id !== user?.id) {
    return (
      <div className="relative w-full h-screen flex-shrink-0 bg-gray-900">
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-8 text-center">
          <Lock className="w-16 h-16 text-yellow-500 mb-4" />
          <h2 className="text-white text-2xl font-bold mb-2">Stream Premium</h2>
          <p className="text-gray-300 mb-1">@{stream.username}</p>
          <p className="text-yellow-400 text-3xl font-bold mb-6">{stream.price} €</p>
          <button onClick={handleSubscribe} className="bg-yellow-500 text-white px-8 py-3 rounded-full font-medium hover:bg-yellow-600">S'abonner pour regarder</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen flex-shrink-0 bg-gray-900">
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        <VideoIcon className="w-24 h-24 text-gray-600 opacity-50" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

      <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2 z-10">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
        <span className="font-bold text-sm">LIVE</span>
        <span className="text-xs ml-1">{viewerCount}</span>
      </div>

      {stream.is_premium && (
        <div className="absolute top-4 right-16 bg-yellow-500 text-white px-3 py-1 rounded-full flex items-center gap-1 z-10">
          <Crown className="w-3 h-3" /><span className="text-xs font-bold">PREMIUM</span>
        </div>
      )}

      <div className="absolute bottom-20 left-4 right-20 z-10">
        <div className="flex items-center gap-3 mb-3">
          <img src={stream.avatar || `https://ui-avatars.com/api/?name=${stream.username}&background=ef4444&color=fff`} alt="" className="w-12 h-12 rounded-full border-2 border-red-600" />
          <div>
            <p className="text-white font-bold flex items-center gap-2">@{stream.username} {stream.is_premium && <Crown className="w-4 h-4 text-yellow-500" />} <BadgeCheck className="w-4 h-4 text-blue-500" /></p>
            <p className="text-gray-300 text-sm">{stream.title}</p>
          </div>
          {!stream.is_premium && <button className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-medium">Suivre</button>}
        </div>
        <p className="text-gray-400 text-xs mt-2 line-clamp-2">{stream.description}</p>
        <div className="flex items-center gap-2 mt-2"><Music2 className="w-4 h-4 text-white" /><span className="text-white text-xs">Son original - @{stream.username}</span></div>
      </div>

      <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6 z-10">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={`p-3 rounded-full transition ${isLiked ? 'bg-red-500' : 'bg-black/30'}`}><Heart className={`w-7 h-7 ${isLiked ? 'fill-white text-white' : 'text-white'}`} /></div>
          <span className="text-white text-xs">{likeCount}</span>
        </button>
        <button onClick={() => setShowChat(!showChat)} className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-black/30"><MessageCircle className="w-7 h-7 text-white" /></div>
          <span className="text-white text-xs">Chat</span>
        </button>
        <button onClick={() => setShowGifts(!showGifts)} className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-black/30"><Gift className="w-7 h-7 text-yellow-400" /></div>
          <span className="text-white text-xs">Cadeau</span>
        </button>
        <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Lien copié !'); }} className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-black/30"><Share2 className="w-7 h-7 text-white" /></div>
          <span className="text-white text-xs">Partager</span>
        </button>
        <button onClick={() => navigate(`/live/${stream.id}`)} className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-black/30"><Maximize2 className="w-7 h-7 text-white" /></div>
          <span className="text-white text-xs">Plein écran</span>
        </button>
      </div>

      {showChat && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/95 border-t border-gray-800 max-h-[50vh] flex flex-col rounded-t-2xl">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h3 className="text-white font-semibold">Chat en direct</h3>
            <button onClick={() => setShowChat(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg) => <div key={msg.id} className="flex items-start gap-2"><span className="text-red-400 font-medium text-sm">@{msg.username}:</span><span className="text-white text-sm">{msg.message}</span></div>)}
            {messages.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Aucun message. Soyez le premier !</p>}
          </div>
          {isAuthenticated ? (
            <form onSubmit={sendMessage} className="p-3 border-t border-gray-800 flex gap-2">
              <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="Envoyer un message..." className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm" />
              <button type="submit" disabled={!inputMessage.trim()} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </form>
          ) : (
            <div className="p-4 text-center"><Link to="/login" className="text-red-500 hover:underline text-sm">Connectez-vous pour chatter</Link></div>
          )}
        </div>
      )}

      {showGifts && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/95 border-t border-gray-800 rounded-t-2xl">
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

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin opacity-30" />
      </div>
    </div>
  );
}