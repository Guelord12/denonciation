import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Linking,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Newspaper,
  Search,
  Filter,
  ExternalLink,
  Calendar,
  Globe,
  AlertTriangle,
  X,
} from 'lucide-react-native';
import { format, formatDistance, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

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

export default function ActualitesScreen() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const { data: actualitesData, isLoading, refetch } = useQuery({
    queryKey: ['actualites', page, selectedCategory],
    queryFn: () => api.get('/actualites', { 
      params: { page, limit: 10, category: selectedCategory || undefined }
    }),
  });

  const { data: categories } = useQuery({
    queryKey: ['actualites-categories'],
    queryFn: () => api.get('/actualites/categories'),
  });

  const categoriesList = categories?.data || ['générale', 'politique', 'sécuritaire', 'économique', 'santé', 'technologie', 'culturel'];

  const actualites = actualitesData?.data?.actualites || [];
  const pagination = actualitesData?.data?.pagination;

  const filteredActualites = actualites.filter((actu: Actualite) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      (actu.title && actu.title.toLowerCase().includes(searchLower)) ||
      (actu.description && actu.description.toLowerCase().includes(searchLower))
    );
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    setImageErrors({});
    await refetch();
    setRefreshing(false);
  };

  const loadMore = () => {
    if (pagination && page < pagination.pages) {
      setPage(page + 1);
    }
  };

  const openArticle = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'générale': '#3B82F6',
      'politique': '#8B5CF6',
      'sécuritaire': '#EF4444',
      'économique': '#10B981',
      'santé': '#059669',
      'technologie': '#06B6D4',
      'culturel': '#EC4899',
      'sportif': '#F97316',
    };
    return colors[category] || '#6B7280';
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

  const handleImageError = (uniqueKey: string) => {
    setImageErrors(prev => ({ ...prev, [uniqueKey]: true }));
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTitleContainer}>
        <Newspaper color="#EF4444" size={28} />
        <Text style={styles.headerTitle}>Actualités</Text>
      </View>
      <Text style={styles.headerSubtitle}>
        Restez informé des dernières nouvelles
      </Text>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Search color="#999" size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher une actualité..."
          placeholderTextColor="#999"
        />
        {search !== '' && (
          <TouchableOpacity style={styles.clearButton} onPress={() => setSearch('')}>
            <X color="#999" size={16} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity 
        style={[styles.filterButton, selectedCategory ? styles.filterButtonActive : null]} 
        onPress={() => setShowFilters(!showFilters)}
      >
        <Filter color={selectedCategory ? '#FFF' : '#666'} size={20} />
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filtersHeader}>
        <Text style={styles.filtersTitle}>Catégories</Text>
        {selectedCategory ? (
          <TouchableOpacity onPress={() => setSelectedCategory('')}>
            <Text style={styles.clearFilterText}>Effacer</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        {categoriesList.map((category: string, index: number) => (
          <TouchableOpacity
            key={`${category}-${index}`}
            style={[
              styles.filterChip,
              selectedCategory === category && styles.filterChipActive,
              { borderColor: getCategoryColor(category) }
            ]}
            onPress={() => setSelectedCategory(category === selectedCategory ? '' : category)}
          >
            <Text style={[
              styles.filterChipText,
              selectedCategory === category && styles.filterChipTextActive
            ]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderLiveBanner = () => (
    <View style={styles.liveBanner}>
      <AlertTriangle color="#FFF" size={16} />
      <Text style={styles.liveBannerText}>Actualités en temps réel</Text>
    </View>
  );

  const renderArticle = ({ item, index }: { item: Actualite; index: number }) => {
    const uniqueKey = `${item.url}-${index}`;
    const isExpanded = expandedId === uniqueKey;
    const sourceName = getSourceName(item.source);
    const categoryColor = getCategoryColor(item.category || 'générale');
    const hasImageError = imageErrors[uniqueKey];
    const relativeDate = formatPublishedDate(item.published_at);
    const fullDate = formatFullDate(item.published_at);
    const showImage = item.image_url && !hasImageError;

    return (
      <TouchableOpacity 
        style={styles.articleCard}
        onPress={() => openArticle(item.url)}
        activeOpacity={0.9}
      >
        {showImage ? (
          <Image 
            source={{ uri: item.image_url! }}
            style={styles.articleImage}
            resizeMode="cover"
            onError={() => handleImageError(uniqueKey)}
          />
        ) : (
          <View style={[styles.articleImage, styles.imagePlaceholder]}>
            <Newspaper color="#CCC" size={32} />
          </View>
        )}
        
        <View style={styles.articleContent}>
          <View style={styles.articleHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {item.category || 'générale'}
              </Text>
            </View>
            <View style={styles.sourceContainer}>
              <Globe color="#999" size={12} />
              <Text style={styles.sourceText} numberOfLines={1}>
                {sourceName}
              </Text>
            </View>
          </View>

          <Text style={styles.articleTitle} numberOfLines={isExpanded ? undefined : 3}>
            {item.title || 'Sans titre'}
          </Text>

          {(item.description || item.content) ? (
            <Text style={styles.articleDescription} numberOfLines={isExpanded ? undefined : 2}>
              {item.description || item.content}
            </Text>
          ) : null}

          <View style={styles.articleFooter}>
            <View style={styles.dateContainer}>
              <Calendar color="#999" size={12} />
              <Text style={styles.dateText} numberOfLines={1}>
                {fullDate ? relativeDate : 'Date inconnue'}
              </Text>
            </View>
            
            {(item.description?.length > 100 || item.content?.length > 100) && (
              <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : uniqueKey)}>
                <Text style={styles.expandText}>
                  {isExpanded ? 'Voir moins' : 'Voir plus'}
                </Text>
              </TouchableOpacity>
            )}

            <ExternalLink color="#EF4444" size={14} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={filteredActualites}
        keyExtractor={(item, index) => {
          if (item.id) return item.id.toString();
          if (item.url) return item.url;
          return `item-${index}`;
        }}
        ListHeaderComponent={
          <>
            {renderSearchBar()}
            {showFilters && renderFilters()}
            {filteredActualites.length > 0 && renderLiveBanner()}
          </>
        }
        renderItem={renderArticle}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Newspaper color="#CCC" size={48} />
            <Text style={styles.emptyTitle}>Aucune actualité</Text>
            <Text style={styles.emptyText}>
              {search ? 'Aucun résultat pour votre recherche' : 'Revenez plus tard pour les dernières nouvelles'}
            </Text>
          </View>
        }
        contentContainerStyle={filteredActualites.length === 0 ? styles.emptyList : styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#F5F5F5',
  },
  searchBar: {
    flex: 1,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 10,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingLeft: 40,
    paddingRight: 35,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  filterButton: {
    backgroundColor: '#FFF',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  filterButtonActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F5F5F5',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  clearFilterText: {
    fontSize: 12,
    color: '#EF4444',
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  liveBannerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  articleCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  articleImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F0F0F0',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleContent: {
    padding: 12,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginLeft: 8,
  },
  sourceText: {
    fontSize: 11,
    color: '#999',
    flex: 1,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 22,
  },
  articleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: '#999',
  },
  expandText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});