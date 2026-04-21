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
  Modal,
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
  Lock,
  Globe,
  AlertCircle,
  X,
  Users,
} from 'lucide-react-native';

// =====================================================
// TYPES
// =====================================================
interface Comment {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  is_anonymous: boolean;
  user_id: number;
  username: string;
  avatar: string | null;
  parent_id: number | null;
}

interface Witness {
  id: number;
  testimony: string;
  created_at: string;
  is_anonymous: boolean;
  user_id: number;
  username: string;
  avatar: string | null;
}

interface Report {
  id: number;
  title: string;
  description: string;
  status: string;
  reporter_id: number;
  is_anonymous: boolean;
  visibility_mode: 'anonymous' | 'visible';
  media_path: string | null;
  media_type: string | null;
  category_name: string;
  category_icon: string;
  category_color: string;
  city_name: string | null;
  city_country: string | null;
  latitude: number | null;
  longitude: number | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  witnesses_count: number;
  shares_count: number;
  created_at: string;
  updated_at: string;
  username: string;
  user_avatar: string | null;
  first_name: string | null;
  last_name: string | null;
  comments: Comment[];
  witnesses: Witness[];
  user_interactions: {
    liked: boolean;
    witnessed: boolean;
  };
}

// =====================================================
// FONCTIONS UTILITAIRES DE VISIBILITÉ
// =====================================================
function shouldShowIdentity(report: Report, currentUserId: number | null, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (report.reporter_id === currentUserId) return true;
  return report.visibility_mode === 'visible' && !report.is_anonymous;
}

function getDisplayName(report: Report, currentUserId: number | null, isAdmin: boolean): string {
  if (shouldShowIdentity(report, currentUserId, isAdmin)) {
    return report.username || `${report.first_name || ''} ${report.last_name || ''}`.trim() || 'Utilisateur';
  }
  return 'Utilisateur anonyme';
}

function getDisplayAvatar(report: Report, currentUserId: number | null, isAdmin: boolean): string | null {
  if (shouldShowIdentity(report, currentUserId, isAdmin)) {
    return report.user_avatar;
  }
  return null;
}

function getCommentDisplayName(comment: Comment, report: Report, currentUserId: number | null, isAdmin: boolean): string {
  if (isAdmin) return comment.username || 'Utilisateur';
  if (comment.user_id === currentUserId) return comment.username || 'Vous';
  if (report.reporter_id === currentUserId && report.visibility_mode === 'visible') return comment.username || 'Utilisateur';
  if (report.visibility_mode === 'visible' && !report.is_anonymous && !comment.is_anonymous) return comment.username || 'Utilisateur';
  return 'Utilisateur anonyme';
}

function getCommentDisplayAvatar(comment: Comment, report: Report, currentUserId: number | null, isAdmin: boolean): string | null {
  if (isAdmin) return comment.avatar;
  if (comment.user_id === currentUserId) return comment.avatar;
  if (report.reporter_id === currentUserId && report.visibility_mode === 'visible') return comment.avatar;
  if (report.visibility_mode === 'visible' && !report.is_anonymous && !comment.is_anonymous) return comment.avatar;
  return null;
}

function getWitnessDisplayName(witness: Witness, report: Report, currentUserId: number | null, isAdmin: boolean): string {
  if (isAdmin) return witness.username || 'Témoin';
  if (witness.user_id === currentUserId) return witness.username || 'Vous';
  if (report.reporter_id === currentUserId && report.visibility_mode === 'visible') return witness.username || 'Témoin';
  if (report.visibility_mode === 'visible' && !report.is_anonymous && !witness.is_anonymous) return witness.username || 'Témoin';
  return 'Témoin anonyme';
}

function getWitnessDisplayAvatar(witness: Witness, report: Report, currentUserId: number | null, isAdmin: boolean): string | null {
  if (isAdmin) return witness.avatar;
  if (witness.user_id === currentUserId) return witness.avatar;
  if (report.reporter_id === currentUserId && report.visibility_mode === 'visible') return witness.avatar;
  if (report.visibility_mode === 'visible' && !report.is_anonymous && !witness.is_anonymous) return witness.avatar;
  return null;
}

function getInitials(name: string): string {
  if (name === 'Utilisateur anonyme') return 'A';
  if (name === 'Témoin anonyme') return 'T';
  if (name === 'Vous') return 'V';
  return name.charAt(0).toUpperCase();
}

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
export default function ReportDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const { id } = route.params as { id: number };
  
  const [comment, setComment] = useState('');
  const [testimony, setTestimony] = useState('');
  const [showTestimonyModal, setShowTestimonyModal] = useState(false);
  const [showVisibilityInfo, setShowVisibilityInfo] = useState(false);

  const { data: report, isLoading } = useQuery<Report>({
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
        { text: 'Contenu inapproprié', onPress: () => {} },
        { text: 'Fausse information', onPress: () => {} },
        { text: 'Harcèlement', onPress: () => {} },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Signalement non trouvé</Text>
        <Text style={styles.errorText}>Ce signalement n'existe pas ou a été supprimé.</Text>
      </View>
    );
  }

  const isAdmin = user?.is_admin || false;
  const currentUserId = user?.id || null;
  const isOwner = report.reporter_id === currentUserId;
  
  const displayName = getDisplayName(report, currentUserId, isAdmin);
  const displayAvatar = getDisplayAvatar(report, currentUserId, isAdmin);
  const displayInitial = getInitials(displayName);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.categoryContainer}>
          <View style={[styles.categoryBadge, { backgroundColor: report.category_color + '20' }]}>
            <Text style={[styles.categoryText, { color: report.category_color }]}>
              {report.category_icon} {report.category_name}
            </Text>
          </View>
          
          {/* ✅ Badge de visibilité */}
          <TouchableOpacity
            style={[
              styles.visibilityBadge,
              { backgroundColor: report.visibility_mode === 'anonymous' ? '#8B5CF6' + '20' : '#10B981' + '20' }
            ]}
            onPress={() => setShowVisibilityInfo(!showVisibilityInfo)}
          >
            {report.visibility_mode === 'anonymous' ? (
              <>
                <Lock size={12} color="#8B5CF6" />
                <Text style={[styles.visibilityBadgeText, { color: '#8B5CF6' }]}>Anonyme</Text>
              </>
            ) : (
              <>
                <Globe size={12} color="#10B981" />
                <Text style={[styles.visibilityBadgeText, { color: '#10B981' }]}>Visible</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ✅ Info visibilité */}
        {showVisibilityInfo && (
          <View style={[
            styles.visibilityInfoBox,
            { backgroundColor: report.visibility_mode === 'anonymous' ? '#F3E8FF' : '#D1FAE5' }
          ]}>
            <View style={styles.visibilityInfoHeader}>
              {report.visibility_mode === 'anonymous' ? (
                <Lock size={16} color="#8B5CF6" />
              ) : (
                <Globe size={16} color="#10B981" />
              )}
              <Text style={[
                styles.visibilityInfoTitle,
                { color: report.visibility_mode === 'anonymous' ? '#6B21A8' : '#065F46' }
              ]}>
                {report.visibility_mode === 'anonymous' ? 'Mode Anonyme' : 'Mode Visible'}
              </Text>
            </View>
            <Text style={styles.visibilityInfoText}>
              {report.visibility_mode === 'anonymous' 
                ? 'L\'auteur a choisi de rester anonyme. Tous les commentaires et témoignages seront également anonymes.'
                : 'L\'auteur a choisi d\'être visible. Les commentaires et témoignages seront publics.'
              }
            </Text>
            {isOwner && (
              <Text style={styles.visibilityInfoOwner}>
                Vous êtes l'auteur de ce signalement. Vous voyez toutes les identités.
              </Text>
            )}
          </View>
        )}

        <Text style={styles.title}>{report.title}</Text>
        
        <View style={styles.meta}>
          <View style={styles.authorInfo}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={[
                styles.avatarPlaceholder,
                !shouldShowIdentity(report, currentUserId, isAdmin) && styles.avatarAnonymous
              ]}>
                <Text style={styles.avatarText}>{displayInitial}</Text>
              </View>
            )}
            <View>
              <Text style={styles.authorName}>{displayName}</Text>
              <View style={styles.dateContainer}>
                <Calendar size={12} color="#999" />
                <Text style={styles.date}>
                  {formatDistance(new Date(report.created_at), new Date(), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Eye size={14} color="#999" />
              <Text style={styles.statText}>{report.views_count || 0}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Media */}
      {report.media_path && (
        <Image source={{ uri: report.media_path }} style={styles.media} />
      )}

      {/* Location */}
      {report.city_name && (
        <View style={styles.locationContainer}>
          <MapPin size={16} color="#666" />
          <Text style={styles.locationText}>
            {report.city_name}, {report.city_country}
          </Text>
        </View>
      )}

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>{report.description}</Text>
        
        {report.latitude && report.longitude && (
          <View style={styles.gpsContainer}>
            <MapPin size={14} color="#999" />
            <Text style={styles.gpsText}>
              GPS: {Number(report.latitude).toFixed(6)}, {Number(report.longitude).toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Heart
            size={24}
            color={report.user_interactions?.liked ? '#EF4444' : '#666'}
            fill={report.user_interactions?.liked ? '#EF4444' : 'none'}
          />
          <Text style={styles.actionText}>{report.likes_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <MessageCircle size={24} color="#666" />
          <Text style={styles.actionText}>{report.comments_count || 0}</Text>
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
        <Users size={20} color="#3B82F6" />
        <Text style={styles.witnessButtonText}>Ajouter un témoignage</Text>
      </TouchableOpacity>

      {/* Witnesses */}
      {report.witnesses && report.witnesses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Témoignages ({report.witnesses_count})
          </Text>
          {report.witnesses.map((witness) => {
            const witnessDisplayName = getWitnessDisplayName(witness, report, currentUserId, isAdmin);
            const witnessDisplayAvatar = getWitnessDisplayAvatar(witness, report, currentUserId, isAdmin);
            const witnessInitial = getInitials(witnessDisplayName);
            
            return (
              <View key={witness.id} style={styles.witnessItem}>
                <View style={styles.witnessHeader}>
                  <View style={styles.witnessAuthor}>
                    {witnessDisplayAvatar ? (
                      <Image source={{ uri: witnessDisplayAvatar }} style={styles.witnessAvatar} />
                    ) : (
                      <View style={[
                        styles.witnessAvatarPlaceholder,
                        witnessDisplayName === 'Témoin anonyme' && styles.avatarAnonymous
                      ]}>
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
          Commentaires ({report.comments_count})
        </Text>

        {/* Comment Input */}
        {isAuthenticated ? (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Ajouter un commentaire..."
              placeholderTextColor="#999"
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !comment.trim() && styles.sendButtonDisabled]}
              onPress={handleComment}
              disabled={!comment.trim() || commentMutation.isPending}
            >
              {commentMutation.isPending ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Send size={20} color={comment.trim() ? '#EF4444' : '#CCC'} />
              )}
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
        {report.comments && report.comments.length > 0 ? (
          report.comments.map((comment) => {
            const commentDisplayName = getCommentDisplayName(comment, report, currentUserId, isAdmin);
            const commentDisplayAvatar = getCommentDisplayAvatar(comment, report, currentUserId, isAdmin);
            const commentInitial = getInitials(commentDisplayName);
            
            return (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAuthor}>
                    {commentDisplayAvatar ? (
                      <Image source={{ uri: commentDisplayAvatar }} style={styles.commentAvatar} />
                    ) : (
                      <View style={[
                        styles.commentAvatarPlaceholder,
                        commentDisplayName === 'Utilisateur anonyme' && styles.avatarAnonymous
                      ]}>
                        <Text style={styles.commentAvatarText}>{commentInitial}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.commentAuthorName}>{commentDisplayName}</Text>
                      {comment.is_edited && (
                        <Text style={styles.editedText}>(modifié)</Text>
                      )}
                    </View>
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
          })
        ) : (
          <View style={styles.noComments}>
            <MessageCircle size={32} color="#CCC" />
            <Text style={styles.noCommentsText}>Aucun commentaire pour le moment</Text>
            <Text style={styles.noCommentsSubtext}>Soyez le premier à commenter !</Text>
          </View>
        )}
      </View>

      {/* Testimony Modal */}
      <Modal
        visible={showTestimonyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTestimonyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un témoignage</Text>
              <TouchableOpacity onPress={() => setShowTestimonyModal(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* ✅ Indication de visibilité du témoignage */}
            <View style={[
              styles.testimonyVisibilityInfo,
              { backgroundColor: report.visibility_mode === 'anonymous' ? '#F3E8FF' : '#D1FAE5' }
            ]}>
              {report.visibility_mode === 'anonymous' ? (
                <>
                  <Lock size={16} color="#8B5CF6" />
                  <Text style={[styles.testimonyVisibilityText, { color: '#6B21A8' }]}>
                    Votre témoignage sera anonyme (mode anonyme activé par l'auteur)
                  </Text>
                </>
              ) : (
                <>
                  <Globe size={16} color="#10B981" />
                  <Text style={[styles.testimonyVisibilityText, { color: '#065F46' }]}>
                    Votre témoignage sera visible publiquement
                  </Text>
                </>
              )}
            </View>

            <TextInput
              style={styles.testimonyInput}
              value={testimony}
              onChangeText={setTestimony}
              placeholder="Décrivez ce dont vous avez été témoin..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowTestimonyModal(false);
                  setTestimony('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, (!testimony.trim() || witnessMutation.isPending) && styles.modalSubmitButtonDisabled]}
                onPress={() => witnessMutation.mutate(testimony)}
                disabled={!testimony.trim() || witnessMutation.isPending}
              >
                {witnessMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Témoigner</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#FFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  visibilityBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  visibilityInfoBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  visibilityInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  visibilityInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  visibilityInfoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  visibilityInfoOwner: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
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
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
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
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  gpsText: {
    fontSize: 12,
    color: '#999',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  witnessAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
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
    paddingLeft: 36,
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
    backgroundColor: '#FFF',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  commentAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  editedText: {
    fontSize: 11,
    color: '#999',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    paddingLeft: 36,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noCommentsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  testimonyVisibilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  testimonyVisibilityText: {
    flex: 1,
    fontSize: 13,
  },
  testimonyInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalSubmitButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  modalSubmitButtonDisabled: {
    opacity: 0.6,
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});