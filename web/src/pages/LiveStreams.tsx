import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { liveAPI } from '../services/api';
import { socketService } from '../services/socket';
import { useAuthStore } from '../stores/authStore';
import {
  Video, Plus, Users, Radio, TrendingUp, Search, Filter, X,
  Calendar, Clock, Lock, Heart, Eye, Play, Crown, Flame,
  LayoutGrid, List, Loader2, RefreshCw, AlertCircle, Smartphone,
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LiveStream {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  thumbnail_path?: string;
  username: string;
  avatar?: string;
  viewer_count: number;
  like_count: number;
  is_premium: boolean;
  price?: number;
  status: 'active' | 'scheduled' | 'ended';
  scheduled_for?: string;
  current_viewers: number;
  tags?: string[];
  category?: string;
  user_id?: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

const CATEGORIES: Category[] = [
  { id: 'all', name: 'Tous les lives', icon: '📡', count: 0 },
  { id: 'activism', name: 'Activisme', icon: '✊', count: 0 },
  { id: 'news', name: 'Actualités', icon: '📰', count: 0 },
  { id: 'education', name: 'Éducation', icon: '📚', count: 0 },
  { id: 'entertainment', name: 'Divertissement', icon: '🎮', count: 0 },
  { id: 'music', name: 'Musique', icon: '🎵', count: 0 },
  { id: 'sports', name: 'Sports', icon: '⚽', count: 0 },
  { id: 'talk', name: 'Discussion', icon: '💬', count: 0 },
  { id: 'tech', name: 'Technologie', icon: '💻', count: 0 },
  { id: 'travel', name: 'Voyage', icon: '✈️', count: 0 },
];

export default function LiveStreams() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  
  const [activeStreams, setActiveStreams] = useState<LiveStream[]>([]);
  const [scheduledStreams, setScheduledStreams] = useState<LiveStream[]>([]);
  const [totalViewers, setTotalViewers] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'viewers' | 'recent' | 'trending'>('viewers');
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileFeed, setShowMobileFeed] = useState(false);

  const { data, isLoading, isFetching, refetch, isError } = useQuery({
    queryKey: ['live-streams', page, selectedCategory, sortBy, premiumOnly, searchQuery],
    queryFn: async () => {
      try {
        const response = await liveAPI.getStreams({
          page, limit: 20,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          premium: premiumOnly || undefined,
          search: searchQuery || undefined,
          sort: sortBy,
          status: 'active,scheduled',
        });
        setError(null);
        return response.data;
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erreur lors du chargement des lives');
        throw err;
      }
    },
    onSuccess: (data) => {
      const streams = data.streams || [];
      const active = streams.filter((s: LiveStream) => s.status === 'active');
      const scheduled = streams.filter((s: LiveStream) => s.status === 'scheduled');
      
      if (page === 1) {
        setActiveStreams(active);
        setScheduledStreams(scheduled);
      } else {
        setActiveStreams(prev => [...prev, ...active]);
        setScheduledStreams(prev => [...prev, ...scheduled]);
      }
      
      setTotalViewers(active.reduce((sum, s) => sum + (s.current_viewers || s.viewer_count || 0), 0));
      setHasMore(data.pagination?.has_more || false);
    },
    retry: 2,
  });

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on('new_stream', (stream: LiveStream) => {
      if (stream.status === 'active') {
        setActiveStreams(prev => { if (prev.find(s => s.id === stream.id)) return prev; return [stream, ...prev]; });
      } else if (stream.status === 'scheduled') {
        setScheduledStreams(prev => { if (prev.find(s => s.id === stream.id)) return prev; return [stream, ...prev]; });
      }
    });

    socket.on('stream_ended_global', ({ streamId }: { streamId: string }) => {
      setActiveStreams(prev => prev.filter(s => s.id !== parseInt(streamId)));
      setScheduledStreams(prev => prev.filter(s => s.id !== parseInt(streamId)));
    });

    socket.on('viewer_count_update', ({ streamId, count }: { streamId: string; count: number }) => {
      setActiveStreams(prev => prev.map(s => s.id === parseInt(streamId) ? { ...s, current_viewers: count } : s));
    });

    socket.on('stream_went_live', (stream: LiveStream) => {
      setScheduledStreams(prev => prev.filter(s => s.id !== stream.id));
      setActiveStreams(prev => { if (prev.find(s => s.id === stream.id)) return prev; return [stream, ...prev]; });
    });

    return () => {
      socket.off('new_stream'); socket.off('stream_ended_global');
      socket.off('viewer_count_update'); socket.off('stream_went_live');
    };
  }, []);

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) setPage(prev => prev + 1);
  }, [hasMore, isFetching]);

  useEffect(() => {
    setPage(1); setActiveStreams([]); setScheduledStreams([]); setError(null);
  }, [selectedCategory, sortBy, premiumOnly, searchQuery]);

  const formatTimeUntil = (date: string) => {
    try { return formatDistance(new Date(date), new Date(), { addSuffix: true, locale: fr }); }
    catch { return 'Date invalide'; }
  };

  if (isError || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Impossible de charger les lives</h2>
        <p className="text-gray-600 mb-6">{error || 'Une erreur est survenue'}</p>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
          <RefreshCw className="w-5 h-5" /> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Radio className="w-8 h-8 text-red-600" />
                Lives en direct
                {activeStreams.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">{activeStreams.length} en direct</span>
                )}
              </h1>
              <p className="text-gray-600 mt-1">Découvrez et participez aux lives de la communauté</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Link to="/live/feed" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition flex items-center gap-2" title="Mode swipe (mobile)">
                <Smartphone className="w-5 h-5" />
                <span className="text-sm hidden md:inline">Mode découverte</span>
              </Link>
              <button onClick={() => refetch()} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition" title="Actualiser">
                <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              {isAuthenticated && (
                <Link to="/live/create" className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium transition">
                  <Plus className="w-5 h-5" /> <span>Démarrer un live</span>
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((category) => (
              <button key={category.id} onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition flex items-center gap-2 ${selectedCategory === category.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                <span>{category.icon}</span><span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeStreams.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span className="font-medium text-gray-900">{activeStreams.length} live{activeStreams.length > 1 ? 's' : ''} en cours</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-red-600" />
                <span className="font-medium text-gray-900">{totalViewers.toLocaleString()} spectateur{totalViewers > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        )}

        {isLoading && page === 1 ? (
          <div className="flex justify-center py-12"><Loader2 className="w-12 h-12 text-red-600 animate-spin" /></div>
        ) : (
          <>
            {activeStreams.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-red-600" /> En direct maintenant
                  </h2>
                </div>
                <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                  {activeStreams.map((stream) => (
                    <LiveStreamCard key={stream.id} stream={stream} viewMode={viewMode} />
                  ))}
                </div>
              </div>
            )}

            {scheduledStreams.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" /> Programmés
                </h2>
                <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                  {scheduledStreams.map((stream) => (
                    <ScheduledStreamCard key={stream.id} stream={stream} viewMode={viewMode} formatTimeUntil={formatTimeUntil} />
                  ))}
                </div>
              </div>
            )}

            {activeStreams.length === 0 && scheduledStreams.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <Video className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-700 mb-2">
                  {searchQuery ? 'Aucun live ne correspond à votre recherche' : 'Aucun live en cours actuellement'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Soyez le premier à lancer un live !'}
                </p>
                {isAuthenticated ? (
                  <Link to="/live/create" className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 inline-flex items-center gap-2 font-medium">
                    <Plus className="w-5 h-5" /> <span>Démarrer un live</span>
                  </Link>
                ) : (
                  <Link to="/login" className="text-red-600 hover:underline font-medium">Connectez-vous pour lancer un live</Link>
                )}
              </div>
            )}

            {hasMore && (activeStreams.length > 0 || scheduledStreams.length > 0) && (
              <div className="text-center mt-8">
                <button onClick={loadMore} disabled={isFetching}
                  className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 mx-auto">
                  {isFetching ? <><Loader2 className="w-4 h-4 animate-spin" /> Chargement...</> : 'Charger plus de lives'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Icône CheckCircle
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

function LiveStreamCard({ stream, viewMode }: { stream: LiveStream; viewMode: 'grid' | 'list' }) {
  const thumbnailUrl = stream.thumbnail_url || stream.thumbnail_path;
  const avatarUrl = stream.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(stream.username || 'User')}&background=ef4444&color=fff`;

  return (
    <Link to={`/live/${stream.id}`} className="block group">
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden h-full flex flex-col">
        <div className="relative">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={stream.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-40 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <Video className="w-12 h-12 text-white/50" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></span> LIVE
            </span>
          </div>
          {stream.is_premium && (
            <div className="absolute top-2 right-2">
              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Crown className="w-3 h-3" /> Premium
              </span>
            </div>
          )}
          <div className="absolute bottom-2 left-2">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center">
              <Users className="w-3 h-3 mr-1" /> {stream.current_viewers || stream.viewer_count || 0}
            </span>
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Play className="w-12 h-12 text-white" />
          </div>
        </div>
        <div className="p-3 flex-1">
          <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-red-600 transition">{stream.title}</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full" />
              <span className="text-sm text-gray-600 truncate">@{stream.username}</span>
            </div>
            <div className="flex items-center text-gray-500 text-sm">
              <Heart className="w-3 h-3 mr-1" /> <span>{stream.like_count || 0}</span>
            </div>
          </div>
          {stream.is_premium && <p className="text-xs text-yellow-600 mt-1">{stream.price}€</p>}
        </div>
      </div>
    </Link>
  );
}

function ScheduledStreamCard({ stream, viewMode, formatTimeUntil }: { stream: LiveStream; viewMode: 'grid' | 'list'; formatTimeUntil: (date: string) => string }) {
  const thumbnailUrl = stream.thumbnail_url || stream.thumbnail_path;
  const avatarUrl = stream.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(stream.username || 'User')}&background=3b82f6&color=fff`;
  const timeUntil = stream.scheduled_for ? formatTimeUntil(stream.scheduled_for) : 'Date non définie';

  return (
    <Link to={`/live/${stream.id}`} className="block group">
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden h-full flex flex-col">
        <div className="relative">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={stream.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-40 bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center">
              <Calendar className="w-12 h-12 text-white/50" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center">
              <Clock className="w-3 h-3 mr-1" /> Programmé
            </span>
          </div>
          {stream.is_premium && (
            <div className="absolute top-2 right-2">
              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Crown className="w-3 h-3" /> Premium
              </span>
            </div>
          )}
        </div>
        <div className="p-3 flex-1">
          <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition">{stream.title}</h4>
          <div className="flex items-center gap-2 mb-1">
            <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full" />
            <span className="text-sm text-gray-600 truncate">@{stream.username}</span>
          </div>
          <p className="text-xs text-blue-600 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Début {timeUntil}
          </p>
          {stream.is_premium && <p className="text-xs text-yellow-600 mt-1">{stream.price}€</p>}
        </div>
      </div>
    </Link>
  );
}