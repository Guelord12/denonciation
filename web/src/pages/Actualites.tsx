import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { actualiteAPI } from '../services/api';
import { formatDistance, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Newspaper,
  Search,
  Filter,
  ExternalLink,
  Calendar,
  Globe,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

interface Actualite {
  id?: number;
  title: string;
  description: string;
  content: string;
  url: string;
  image_url: string | null;
  source: string | { name: string };
  category: string;
  published_at: string;
}

export default function Actualites() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const { data: actualitesData, isLoading } = useQuery({
    queryKey: ['actualites', page, selectedCategory],
    queryFn: () => actualiteAPI.getActualites({ 
      page, 
      limit: 12, 
      category: selectedCategory || undefined 
    }).then(res => res.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['actualites-categories'],
    queryFn: () => actualiteAPI.getCategories().then(res => res.data),
  });

  const categoriesList = categories || ['générale', 'politique', 'sécuritaire', 'économique', 'santé', 'technologie', 'culturel'];

  const categoryColors: Record<string, string> = {
    'générale': 'bg-blue-100 text-blue-800',
    'politique': 'bg-purple-100 text-purple-800',
    'sécuritaire': 'bg-red-100 text-red-800',
    'économique': 'bg-green-100 text-green-800',
    'santé': 'bg-emerald-100 text-emerald-800',
    'technologie': 'bg-cyan-100 text-cyan-800',
    'culturel': 'bg-pink-100 text-pink-800',
    'sportif': 'bg-orange-100 text-orange-800',
  };

  const filteredActualites = actualitesData?.actualites?.filter((actu: Actualite) => {
    if (!search) return true;
    return (
      actu.title.toLowerCase().includes(search.toLowerCase()) ||
      actu.description?.toLowerCase().includes(search.toLowerCase())
    );
  }) || [];

  const handleImageError = (uniqueKey: string) => {
    setImageErrors(prev => ({ ...prev, [uniqueKey]: true }));
  };

  const getSourceName = (source: any): string => {
    if (!source) return 'Source inconnue';
    if (typeof source === 'string') return source;
    return source?.name || 'Source inconnue';
  };

  const formatPublishedDate = (dateString: string): string => {
    try {
      if (!dateString) return 'Date inconnue';
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return 'Date inconnue';
      return formatDistance(date, new Date(), { addSuffix: true, locale: fr });
    } catch {
      return 'Date inconnue';
    }
  };

  const formatFullDate = (dateString: string): string => {
    try {
      if (!dateString) return '';
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return '';
      return format(date, 'dd MMMM yyyy à HH:mm', { locale: fr });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Newspaper className="w-8 h-8 mr-3 text-red-600" />
            Actualités
          </h1>
          <p className="text-gray-600 mt-1">
            Restez informé des dernières nouvelles concernant les droits humains et la justice
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher une actualité..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filtres</span>
              {selectedCategory && (
                <span className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">Catégories</h3>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory('')}
                  className="text-sm text-red-600 hover:underline"
                >
                  Effacer
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {categoriesList.map((category: string) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category === selectedCategory ? '' : category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    category === selectedCategory
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Breaking News Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4 text-white">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 animate-pulse" />
          <span className="font-medium">Actualités en temps réel</span>
          <span className="mx-2">•</span>
          <span>Les informations sont mises à jour automatiquement</span>
        </div>
      </div>

      {/* News Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : filteredActualites.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Aucune actualité trouvée
          </h3>
          <p className="text-gray-500">
            {search ? 'Aucun résultat pour votre recherche' : 'Revenez plus tard pour les dernières nouvelles'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActualites.map((actu: Actualite, index: number) => {
              const uniqueKey = `${actu.url}-${index}`;
              const hasError = imageErrors[uniqueKey];
              const sourceName = getSourceName(actu.source);
              const categoryClass = categoryColors[actu.category] || 'bg-gray-100 text-gray-800';
              
              return (
                <NewsCard 
                  key={uniqueKey} 
                  actu={actu} 
                  index={index}
                  uniqueKey={uniqueKey}
                  categoryClass={categoryClass}
                  sourceName={sourceName}
                  hasError={hasError}
                  formatPublishedDate={formatPublishedDate}
                  formatFullDate={formatFullDate}
                  onImageError={() => handleImageError(uniqueKey)}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {actualitesData?.pagination && actualitesData.pagination.pages > 1 && (
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="px-4 py-2">
                Page {page} sur {actualitesData.pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(actualitesData.pagination.pages, p + 1))}
                disabled={page >= actualitesData.pagination.pages}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}

      {/* Sources Info */}
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center space-x-2 text-gray-600 mb-2">
          <Globe className="w-5 h-5" />
          <span className="font-medium">Sources vérifiées</span>
        </div>
        <p className="text-sm text-gray-500">
          Nos actualités proviennent de Radio Okapi, France 24, RFI, BBC Afrique, Le Monde, Jeune Afrique et autres sources fiables.
        </p>
      </div>
    </div>
  );
}

interface NewsCardProps {
  actu: Actualite;
  index: number;
  uniqueKey: string;
  categoryClass: string;
  sourceName: string;
  hasError: boolean;
  formatPublishedDate: (date: string) => string;
  formatFullDate: (date: string) => string;
  onImageError: () => void;
}

function NewsCard({ 
  actu, 
  index, 
  uniqueKey, 
  categoryClass, 
  sourceName, 
  hasError,
  formatPublishedDate,
  formatFullDate,
  onImageError 
}: NewsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const fullDate = formatFullDate(actu.published_at);
  const relativeDate = formatPublishedDate(actu.published_at);
  const showImage = actu.image_url && !hasError;

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-all ${
      index === 0 ? 'md:col-span-2 lg:col-span-2' : ''
    }`}>
      {showImage ? (
        <img
          src={actu.image_url!}
          alt={actu.title}
          className={`w-full object-cover bg-gray-100 ${index === 0 ? 'h-64' : 'h-48'}`}
          onError={onImageError}
        />
      ) : (
        <div className={`w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${index === 0 ? 'h-64' : 'h-48'}`}>
          <Newspaper className="w-12 h-12 text-gray-400" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-1 text-xs rounded-full ${categoryClass}`}>
            {actu.category || 'générale'}
          </span>
          <span className="text-xs text-gray-500 flex items-center" title={fullDate}>
            <Calendar className="w-3 h-3 mr-1" />
            {relativeDate}
          </span>
        </div>
        
        <h3 className={`font-bold mb-2 hover:text-red-600 transition line-clamp-2 ${
          index === 0 ? 'text-xl' : 'text-lg'
        }`}>
          <a href={actu.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {actu.title}
          </a>
        </h3>
        
        <div className="text-gray-600 text-sm mb-3">
          {expanded ? (
            <p className="whitespace-pre-wrap">{actu.description || actu.content}</p>
          ) : (
            <p className="line-clamp-3">{actu.description || actu.content}</p>
          )}
          {(actu.description?.length > 150 || actu.content?.length > 150) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-red-600 hover:underline mt-1 flex items-center text-xs"
            >
              {expanded ? (
                <>Voir moins <ChevronUp className="w-3 h-3 ml-1" /></>
              ) : (
                <>Voir plus <ChevronDown className="w-3 h-3 ml-1" /></>
              )}
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center">
            <Globe className="w-3 h-3 mr-1" />
            {sourceName}
          </span>
          
          <a
            href={actu.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
          >
            Lire plus
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
}