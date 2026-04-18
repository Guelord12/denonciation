import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { liveAPI } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../stores/authStore';
import {
  Video,
  Plus,
  Users,
  Radio,
  TrendingUp,
  Search,
  Filter,
  X,
  Calendar,
  Clock,
  Lock,
  Heart,
  Eye,
  ChevronRight,
  Play,
  Sparkles,
  Crown,
  Star,
  Flame,
  Compass,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types
interface LiveStream {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  username: string;
  avatar?: string;
  viewer_count: number;
  like_count: number;
  is_premium: boolean;
  price?: number;
  status: 'active' | 'scheduled' | 'ended';
  scheduled_for?: string;
  channel_name?: string;
  channel_verified?: boolean;
  current_viewers: number;
  tags?: string[];
  category?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// Catégories prédéfinies
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
  const { isAuthenticated, user } = useAuthStore();
  const socket = useSocket();
  const navigate = useNavigate();
  
  // États
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
  
  // Requête pour récupérer les streams
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['live-streams', page, selectedCategory, sortBy, premiumOnly, searchQuery],
    queryFn: () => liveAPI.getStreams({
      page,
      limit: 20,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      premium: premiumOnly || undefined,
      search: searchQuery || undefined,
      sort: sortBy,
    }).then(res => res.data),
    onSuccess: (data) => {
      // Séparer les streams actifs et programmés
      const active = data.streams.filter((s: LiveStream) => s.status === 'active');
      const scheduled = data.streams.filter((s: LiveStream) => s.status === 'scheduled');
      
      if (page === 1) {
        setActiveStreams(active);
        setScheduledStreams(scheduled);
      } else {
        setActiveStreams(prev => [...prev, ...active]);
        setScheduledStreams(prev => [...prev, ...scheduled]);
      }
      
      setTotalViewers(active.reduce((sum: number, s: LiveStream) => sum + (s.current_viewers || 0), 0));
      setHasMore(data.pagination.has_more);
    },
  });

  // WebSocket pour mises à jour en temps réel
  useEffect(() => {
    if (!socket) return;

    socket.on('new_stream', (stream: LiveStream) => {
      if (stream.status === 'active') {
        setActiveStreams(prev => [stream, ...prev]);
      } else if (stream.status === 'scheduled') {
        setScheduledStreams(prev => [stream, ...prev]);
      }
    });

    socket.on('stream_ended_global', ({ streamId }: { streamId: string }) => {
      setActiveStreams(prev => prev.filter(s => s.id !== parseInt(streamId)));
    });

    socket.on('viewer_count_update', ({ streamId, count }: { streamId: string; count: number }) => {
      setActiveStreams(prev => prev.map(s => 
        s.id === parseInt(streamId) ? { ...s, current_viewers: count } : s
      ));
    });

    socket.on('stream_went_live', (stream: LiveStream) => {
      setScheduledStreams(prev => prev.filter(s => s.id !== stream.id));
      setActiveStreams(prev => [stream, ...prev]);
    });

    return () => {
      socket.off('new_stream');
      socket.off('stream_ended_global');
      socket.off('viewer_count_update');
      socket.off('stream_went_live');
    };
  }, [socket]);

  // Charger plus de streams
  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, isFetching]);

  // Réinitialiser la pagination lors du changement de filtres
  useEffect(() => {
    setPage(1);
    setActiveStreams([]);
    setScheduledStreams([]);
  }, [selectedCategory, sortBy, premiumOnly, searchQuery]);

  // Obtenir l'icône de catégorie
  const getCategoryIcon = (categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId)?.icon || '📡';
  };

  // Formater le temps restant
  const formatTimeUntil = (date: string) => {
    return formatDistance(new Date(date), new Date(), { addSuffix: true, locale: fr });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Radio className="w-8 h-8 text-red-600" />
                Lives en direct
                {activeStreams.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    {activeStreams.length} en direct
                  </span>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                Découvrez et participez aux lives de la communauté
              </p>
            </div>
            
            {isAuthenticated && (
              <Link
                to="/live/create"
                className="btn-primary flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Video className="w-5 h-5" />
                <span>Démarrer un live</span>
              </Link>
            )}
          </div>

          {/* Barre de recherche et filtres */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un live, une chaîne ou un sujet..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtres
              </button>
              
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-red-50 text-red-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${viewMode === 'list' ? 'bg-red-50 text-red-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trier par</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="viewers">Plus de spectateurs</option>
                    <option value="recent">Plus récents</option>
                    <option value="trending">Tendances</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={premiumOnly}
                      onChange={(e) => setPremiumOnly(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      Premium uniquement
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Catégories */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition flex items-center gap-2 ${
                  selectedCategory === category.id
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats en direct */}
        {activeStreams.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="font-medium text-gray-900">
                    {activeStreams.length} live{activeStreams.length > 1 ? 's' : ''} en cours
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-gray-900">
                    {totalViewers.toLocaleString()} spectateur{totalViewers > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-900">
                    +{Math.floor(totalViewers * 0.1)} cette heure
                  </span>
                </div>
              </div>
              <button
                onClick={() => refetch()}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Actualiser
              </button>
            </div>
          </div>
        )}

        {/* État de chargement */}
        {isLoading && page === 1 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <>
            {/* Section Lives en cours */}
            {activeStreams.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-red-600" />
                    En direct maintenant
                  </h2>
                  <Link to="/live/active" className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1">
                    Voir tout <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                
                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1'
                }`}>
                  {activeStreams.map((stream) => (
                    <LiveStreamCard key={stream.id} stream={stream} viewMode={viewMode} />
                  ))}
                </div>
              </div>
            )}

            {/* Section Lives programmés */}
            {scheduledStreams.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Programmés
                  </h2>
                  <Link to="/live/scheduled" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                    Voir tout <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                
                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1'
                }`}>
                  {scheduledStreams.map((stream) => (
                    <ScheduledStreamCard key={stream.id} stream={stream} viewMode={viewMode} />
                  ))}
                </div>
              </div>
            )}

            {/* État vide */}
            {activeStreams.length === 0 && scheduledStreams.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <Video className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-700 mb-2">
                  Aucun live {searchQuery ? 'correspondant à votre recherche' : 'en cours'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery 
                    ? 'Essayez avec d\'autres mots-clés'
                    : 'Soyez le premier à lancer un live !'
                  }
                </p>
                {isAuthenticated ? (
                  <Link
                    to="/live/create"
                    className="btn-primary inline-flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Démarrer un live</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="text-red-600 hover:underline font-medium"
                  >
                    Connectez-vous pour lancer un live
                  </Link>
                )}
              </div>
            )}

            {/* Bouton "Charger plus" */}
            {hasMore && activeStreams.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={isFetching}
                  className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {isFetching ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      Chargement...
                    </span>
                  ) : (
                    'Charger plus de lives'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sections recommandées */}
      {activeStreams.length > 0 && (
        <div className="bg-white border-t py-8 mt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Chaînes recommandées */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Chaînes recommandées
                </h3>
                <div className="space-y-3">
                  {activeStreams.slice(0, 5).map((stream) => (
                    <Link
                      key={stream.id}
                      to={`/channel/${stream.username}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition"
                    >
                      <img
                        src={stream.avatar || `https://ui-avatars.com/api/?name=${stream.username}`}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          {stream.channel_name || stream.username}
                          {stream.channel_verified && (
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                          )}
                        </p>
                        <p className="text-sm text-gray-500">@{stream.username}</p>
                      </div>
                      {stream.is_premium && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Top catégories */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Catégories tendance
                </h3>
                <div className="space-y-2">
                  {CATEGORIES.slice(1, 6).map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white transition"
                    >
                      <span className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </span>
                      <span className="text-sm text-gray-500">
                        {Math.floor(Math.random() * 50) + 5} lives
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pour vous */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Pour vous
                </h3>
                <p className="text-gray-600 mb-4">
                  Découvrez des lives personnalisés en fonction de vos intérêts
                </p>
                <Link
                  to="/live/discover"
                  className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
                >
                  Explorer <Compass className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant pour les lives en cours
function LiveStreamCard({ stream, viewMode }: { stream: LiveStream; viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <Link
        to={`/live/${stream.id}`}
        className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden flex"
      >
        <div className="relative w-64 h-36 flex-shrink-0">
          {stream.thumbnail_url ? (
            <img
              src={stream.thumbnail_url}
              alt={stream.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <Video className="w-8 h-8 text-white/50" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></span>
              LIVE
            </span>
          </div>
          <div className="absolute bottom-2 left-2">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {stream.current_viewers || 0}
            </span>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                {stream.title}
              </h4>
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={stream.avatar || `https://ui-avatars.com/api/?name=${stream.username}`}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-sm text-gray-600">@{stream.username}</span>
                {stream.channel_verified && (
                  <span className="text-blue-500">✓</span>
                )}
              </div>
              {stream.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{stream.description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {stream.is_premium && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">{stream.price}€</span>
                </span>
              )}
              <div className="flex items-center gap-1 text-gray-500">
                <Heart className="w-4 h-4" />
                <span className="text-sm">{stream.like_count || 0}</span>
              </div>
            </div>
          </div>
          
          {stream.tags && stream.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {stream.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/live/${stream.id}`} className="block group">
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
        {/* Thumbnail */}
        <div className="relative">
          {stream.thumbnail_url ? (
            <img
              src={stream.thumbnail_url}
              alt={stream.title}
              className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-40 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <Video className="w-12 h-12 text-white/50" />
            </div>
          )}

          {/* Badge LIVE */}
          <div className="absolute top-2 left-2">
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></span>
              LIVE
            </span>
          </div>

          {/* Badge Premium */}
          {stream.is_premium && (
            <div className="absolute top-2 right-2">
              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Premium
              </span>
            </div>
          )}

          {/* Nombre de spectateurs */}
          <div className="absolute bottom-2 left-2">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {stream.current_viewers || 0}
            </span>
          </div>

          {/* Overlay au survol */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Play className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Contenu */}
        <div className="p-3">
          <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-red-600 transition">
            {stream.title}
          </h4>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={stream.avatar || `https://ui-avatars.com/api/?name=${stream.username}`}
                alt=""
                className="w-5 h-5 rounded-full"
              />
              <span className="text-sm text-gray-600 truncate">
                {stream.channel_name || stream.username}
                {stream.channel_verified && (
                  <span className="text-blue-500 ml-1">✓</span>
                )}
              </span>
            </div>

            <div className="flex items-center text-gray-500 text-sm">
              <Heart className="w-3 h-3 mr-1" />
              <span>{stream.like_count || 0}</span>
            </div>
          </div>

          {stream.is_premium && (
            <p className="text-xs text-yellow-600 mt-1">
              {stream.price}€
            </p>
          )}

          {stream.tags && stream.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {stream.tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  #{tag}
                </span>
              ))}
              {stream.tags.length > 2 && (
                <span className="text-xs text-gray-400">+{stream.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// Composant pour les lives programmés
function ScheduledStreamCard({ stream, viewMode }: { stream: LiveStream; viewMode: 'grid' | 'list' }) {
  const timeUntil = formatDistance(new Date(stream.scheduled_for!), new Date(), { addSuffix: true, locale: fr });
  
  if (viewMode === 'list') {
    return (
      <Link
        to={`/live/${stream.id}`}
        className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden flex"
      >
        <div className="relative w-64 h-36 flex-shrink-0">
          {stream.thumbnail_url ? (
            <img
              src={stream.thumbnail_url}
              alt={stream.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-white/50" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Programmé
            </span>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                {stream.title}
              </h4>
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={stream.avatar || `https://ui-avatars.com/api/?name=${stream.username}`}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-sm text-gray-600">@{stream.username}</span>
              </div>
              <p className="text-sm text-blue-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Début {timeUntil}
              </p>
            </div>
            
            {stream.is_premium && (
              <span className="flex items-center gap-1 text-yellow-600">
                <Lock className="w-4 h-4" />
                <span className="text-sm">{stream.price}€</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/live/${stream.id}`} className="block group">
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
        <div className="relative">
          {stream.thumbnail_url ? (
            <img
              src={stream.thumbnail_url}
              alt={stream.title}
              className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-40 bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center">
              <Calendar className="w-12 h-12 text-white/50" />
            </div>
          )}

          <div className="absolute top-2 left-2">
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Programmé
            </span>
          </div>

          {stream.is_premium && (
            <div className="absolute top-2 right-2">
              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Premium
              </span>
            </div>
          )}
        </div>

        <div className="p-3">
          <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition">
            {stream.title}
          </h4>

          <div className="flex items-center gap-2 mb-1">
            <img
              src={stream.avatar || `https://ui-avatars.com/api/?name=${stream.username}`}
              alt=""
              className="w-5 h-5 rounded-full"
            />
            <span className="text-sm text-gray-600 truncate">{stream.username}</span>
          </div>

          <p className="text-xs text-blue-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Début {timeUntil}
          </p>

          {stream.is_premium && (
            <p className="text-xs text-yellow-600 mt-1">{stream.price}€</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// Icône CheckCircle manquante
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);