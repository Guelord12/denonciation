import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MapPin,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Flag,
  Send,
  User,
} from 'lucide-react-native';

export default function ReportDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const { id } = route.params as { id: number };
  const [comment, setComment] = useState('');
  const [testimony, setTestimony] = useState('');
  const [showTestimonyModal, setShowTestimonyModal] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: () => api.get(`/reports/${id}`).then(res => res.data),
  });

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/reports/${id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => api.post('/comments', { report_id: id, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      setComment('');
    },
  });

  const witnessMutation = useMutation({
    mutationFn: (testimony: string) => api.post(`/reports/${id}/witness`, { testimony }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      setShowTestimonyModal(false);
      setTestimony('');
    },
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login' as never);
      return;
    }
    likeMutation.mutate();
  };

  const handleComment = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login' as never);
      return;
    }
    if (comment.trim()) {
      commentMutation.mutate(comment.trim());
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvrez ce signalement : ${report?.title}`,
        url: `https://denonciation.com/reports/${id}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Signaler ce contenu',
      'Choisissez une raison',
      [
        { text: 'Contenu inapproprié' },
        { text: 'Fausse information' },
        { text: 'Harcèlement' },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  // ✅ Fonction pour obtenir le nom à afficher (anonyme pour tous sauf admin)
  const getDisplayName = (username: string): string => {
    if (user?.is_admin) return username;
    return 'Utilisateur anonyme';
  };

  // ✅ Fonction pour obtenir l'avatar à afficher
  const getDisplayAvatar = (avatar: string | null): string | null => {
    if (user?.is_admin) return avatar;
    return null;
  };

  // ✅ Fonction pour obtenir les initiales pour l'avatar par défaut
  const getInitials = (name: string): string => {
    if (name === 'Utilisateur anonyme') return 'A';
    return name.charAt(0).toUpperCase();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  const reportData = report;
  const displayName = getDisplayName(reportData?.username || 'Utilisateur anonyme');
  const displayAvatar = getDisplayAvatar(reportData?.user_avatar || null);
  const displayInitial = getInitials(displayName);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.categoryBadge}>
          <Text style={[styles.categoryText, { color: reportData?.category_color }]}>
            {reportData?.category_icon} {reportData?.category_name}
          </Text>
        </View>
        <Text style={styles.title}>{reportData?.title}</Text>
        
        <View style={styles.meta}>
          <View style={styles.authorInfo}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, !user?.is_admin && styles.avatarAnonymous]}>
                <Text style={styles.avatarText}>{displayInitial}</Text>
              </View>
            )}
            <View>
              <Text style={styles.authorName}>{displayName}</Text>
              <Text style={styles.date}>
                {formatDistance(new Date(reportData?.created_at), new Date(), {
                  addSuffix: true,
                  locale: fr,
                })}
              </Text>
            </View>
          </View>
          
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Eye size={16} color="#999" />
              <Text style={styles.statText}>{reportData?.views_count || 0}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Media */}
      {reportData?.media_path && (
        <Image source={{ uri: reportData.media_path }} style={styles.media} />
      )}

      {/* Location */}
      {reportData?.city_name && (
        <View style={styles.locationContainer}>
          <MapPin size={16} color="#666" />
          <Text style={styles.locationText}>
            {reportData.city_name}, {reportData.city_country}
          </Text>
        </View>
      )}

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>{reportData?.description}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Heart
            size={24}
            color={reportData?.user_interactions?.liked ? '#EF4444' : '#666'}
            fill={reportData?.user_interactions?.liked ? '#EF4444' : 'none'}
          />
          <Text style={styles.actionText}>{reportData?.likes_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <MessageCircle size={24} color="#666" />
          <Text style={styles.actionText}>{reportData?.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Share2 size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleReport}>
          <Flag size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Witness Button */}
      <TouchableOpacity
        style={styles.witnessButton}
        onPress={() => {
          if (!isAuthenticated) {
            navigation.navigate('Login' as never);
            return;
          }
          setShowTestimonyModal(true);
        }}
      >
        <User size={20} color="#3B82F6" />
        <Text style={styles.witnessButtonText}>Ajouter un témoignage</Text>
      </TouchableOpacity>

      {/* Witnesses */}
      {reportData?.witnesses?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Témoignages ({reportData.witnesses_count})
          </Text>
          {reportData.witnesses.map((witness: any) => {
            const witnessDisplayName = getDisplayName(witness.username || 'Utilisateur anonyme');
            const witnessDisplayAvatar = getDisplayAvatar(witness.avatar || null);
            const witnessInitial = getInitials(witnessDisplayName);
            
            return (
              <View key={witness.id} style={styles.witnessItem}>
                <View style={styles.witnessHeader}>
                  <View style={styles.witnessAuthor}>
                    {witnessDisplayAvatar ? (
                      <Image source={{ uri: witnessDisplayAvatar }} style={styles.witnessAvatar} />
                    ) : (
                      <View style={[styles.witnessAvatarPlaceholder, !user?.is_admin && styles.avatarAnonymous]}>
                        <Text style={styles.witnessAvatarText}>{witnessInitial}</Text>
                      </View>
                    )}
                    <Text style={styles.witnessName}>{witnessDisplayName}</Text>
                  </View>
                  <Text style={styles.witnessDate}>
                    {formatDistance(new Date(witness.created_at), new Date(), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </Text>
                </View>
                <Text style={styles.witnessContent}>{witness.testimony}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Comments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Commentaires ({reportData?.comments_count})
        </Text>

        {/* Comment Input */}
        {isAuthenticated ? (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Ajouter un commentaire..."
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !comment.trim() && styles.sendButtonDisabled]}
              onPress={handleComment}
              disabled={!comment.trim()}
            >
              <Send size={20} color={comment.trim() ? '#EF4444' : '#CCC'} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.loginPrompt}
            onPress={() => navigation.navigate('Login' as never)}
          >
            <Text style={styles.loginPromptText}>
              Connectez-vous pour commenter
            </Text>
          </TouchableOpacity>
        )}

        {/* Comments List */}
        {reportData?.comments?.map((comment: any) => {
          const commentDisplayName = getDisplayName(comment.username || 'Utilisateur anonyme');
          const commentDisplayAvatar = getDisplayAvatar(comment.avatar || null);
          const commentInitial = getInitials(commentDisplayName);
          
          return (
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAuthor}>
                  {commentDisplayAvatar ? (
                    <Image source={{ uri: commentDisplayAvatar }} style={styles.commentAvatar} />
                  ) : (
                    <View style={[styles.commentAvatarPlaceholder, !user?.is_admin && styles.avatarAnonymous]}>
                      <Text style={styles.commentAvatarText}>{commentInitial}</Text>
                    </View>
                  )}
                  <Text style={styles.commentAuthorName}>{commentDisplayName}</Text>
                </View>
                <Text style={styles.commentDate}>
                  {formatDistance(new Date(comment.created_at), new Date(), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </Text>
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  categoryBadge: {
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarAnonymous: {
    backgroundColor: '#9CA3AF',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  statText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 4,
  },
  media: {
    width: '100%',
    height: 250,
    backgroundColor: '#F5F5F5',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  descriptionContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  witnessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    gap: 8,
  },
  witnessButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  witnessItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  witnessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  witnessAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  witnessAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  witnessAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  witnessAvatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  witnessName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  witnessDate: {
    fontSize: 12,
    color: '#999',
  },
  witnessContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    padding: 10,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  loginPrompt: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginPromptText: {
    color: '#EF4444',
    fontSize: 14,
  },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  commentAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    paddingLeft: 32,
  },
});