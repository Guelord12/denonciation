import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { reportAPI, commentAPI } from '../services/api';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  MapPin,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Flag,
  Send,
  AlertTriangle,
  User,
  Users,
  Lock,
  Globe,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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
  replies?: Comment[];
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
  // Les admins voient tout
  if (isAdmin) return true;
  
  // Le propriétaire du signalement voit son propre contenu
  if (report.reporter_id === currentUserId) return true;
  
  // Sinon, on suit le mode de visibilité
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
  // L'admin voit tout
  if (isAdmin) return comment.username || 'Utilisateur';
  
  // Le propriétaire du commentaire voit son propre nom
  if (comment.user_id === currentUserId) return comment.username || 'Vous';
  
  // Le propriétaire du signalement voit les commentateurs si le mode est visible
  if (report.reporter_id === currentUserId && report.visibility_mode === 'visible') {
    return comment.username || 'Utilisateur';
  }
  
  // Sinon, on suit le mode de visibilité du signalement
  if (report.visibility_mode === 'visible' && !report.is_anonymous && !comment.is_anonymous) {
    return comment.username || 'Utilisateur';
  }
  
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

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [comment, setComment] = useState('');
  const [testimony, setTestimony] = useState('');
  const [showTestimonyModal, setShowTestimonyModal] = useState(false);
  const [showVisibilityInfo, setShowVisibilityInfo] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [commentSort, setCommentSort] = useState<'recent' | 'popular'>('recent');

  const { data: report, isLoading } = useQuery<Report>({
    queryKey: ['report', id],
    queryFn: () => reportAPI.getReport(Number(id)).then(res => res.data),
  });

  const likeMutation = useMutation({
    mutationFn: () => reportAPI.likeReport(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: number }) => 
      commentAPI.createComment(Number(id), content, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      setComment('');
      setReplyTo(null);
      toast.success('Commentaire ajouté');
    },
  });

  const witnessMutation = useMutation({
    mutationFn: (testimony: string) => reportAPI.addWitness(Number(id), testimony),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      setShowTestimonyModal(false);
      setTestimony('');
      toast.success('Témoignage ajouté');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => commentAPI.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      toast.success('Commentaire supprimé');
    },
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    likeMutation.mutate();
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (comment.trim()) {
      commentMutation.mutate({ 
        content: comment.trim(), 
        parentId: replyTo?.id 
      });
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
    setComment(`@${getCommentDisplayName(comment, report!, user?.id || null, user?.is_admin || false)} `);
    document.getElementById('comment-input')?.focus();
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    toast.success('Lien copié dans le presse-papier');
  };

  const handleReport = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const reason = prompt('Raison du signalement :');
    if (reason) {
      reportAPI.reportContent(Number(id), 'report', reason).then(() => {
        toast.success('Signalement envoyé pour modération');
      });
    }
  };

  const toggleCommentExpanded = (commentId: number) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const organizeComments = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>();
    const rootComments: Comment[] = [];

    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    comments.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies?.push(commentMap.get(comment.id)!);
        }
      } else {
        rootComments.push(commentMap.get(comment.id)!);
      }
    });

    return rootComments;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Signalement non trouvé</h2>
        <p className="text-gray-600 mb-4">Ce signalement n'existe pas ou a été supprimé.</p>
        <Link to="/reports" className="text-red-600 hover:underline">
          Retour aux signalements
        </Link>
      </div>
    );
  }

  const isAdmin = user?.is_admin || false;
  const currentUserId = user?.id || null;
  const isOwner = report.reporter_id === currentUserId;
  const showIdentity = shouldShowIdentity(report, currentUserId, isAdmin);
  const displayName = getDisplayName(report, currentUserId, isAdmin);
  const displayAvatar = getDisplayAvatar(report, currentUserId, isAdmin);
  const displayInitial = displayName === 'Utilisateur anonyme' ? 'A' : displayName.charAt(0).toUpperCase();
  
  const organizedComments = organizeComments(report.comments || []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <span 
            className="px-3 py-1 rounded-full text-sm"
            style={{ backgroundColor: report.category_color + '20', color: report.category_color }}
          >
            {report.category_icon} {report.category_name}
          </span>
          {report.city_name && (
            <span className="flex items-center text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mr-1" />
              {report.city_name}, {report.city_country}
            </span>
          )}
          
          {/* ✅ Badge de visibilité */}
          <button
            onClick={() => setShowVisibilityInfo(!showVisibilityInfo)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
              report.visibility_mode === 'anonymous' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-green-100 text-green-700'
            }`}
          >
            {report.visibility_mode === 'anonymous' ? (
              <>
                <Lock className="w-3 h-3" />
                <span>Mode Anonyme</span>
              </>
            ) : (
              <>
                <Globe className="w-3 h-3" />
                <span>Mode Visible</span>
              </>
            )}
          </button>
        </div>
        
        {/* ✅ Info bulle de visibilité */}
        {showVisibilityInfo && (
          <div className={`mb-4 p-4 rounded-lg ${
            report.visibility_mode === 'anonymous' 
              ? 'bg-purple-50 border border-purple-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-start">
              {report.visibility_mode === 'anonymous' ? (
                <Lock className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
              ) : (
                <Globe className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium mb-1">
                  {report.visibility_mode === 'anonymous' ? 'Signalement en mode anonyme' : 'Signalement en mode visible'}
                </p>
                <p className="text-sm text-gray-600">
                  {report.visibility_mode === 'anonymous' 
                    ? 'L\'auteur a choisi de rester anonyme. Tous les commentaires, témoignages et interactions seront également anonymes.'
                    : 'L\'auteur a choisi d\'être visible. Les commentaires, témoignages et interactions seront publics.'
                  }
                </p>
                {isOwner && (
                  <p className="text-xs text-gray-500 mt-2">
                    Vous êtes l'auteur de ce signalement. Vous voyez toutes les identités.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <h1 className="text-3xl font-bold mb-4">{report.title}</h1>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {displayAvatar ? (
                <img src={displayAvatar} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                  displayName === 'Utilisateur anonyme' ? 'bg-gray-400' : 'bg-red-600'
                }`}>
                  {displayInitial}
                </div>
              )}
              <div>
                <p className="font-medium">{displayName}</p>
                {showIdentity && report.username && (
                  <p className="text-sm text-gray-500">@{report.username}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-gray-500">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDistance(new Date(report.created_at), new Date(), { 
                addSuffix: true, 
                locale: fr 
              })}
            </span>
            <span className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              {report.views_count} vues
            </span>
          </div>
        </div>
      </div>

      {/* Media */}
      {report.media_path && (
        <div className="mb-6">
          {report.media_type === 'image' ? (
            <img 
              src={report.media_path} 
              alt={report.title} 
              className="w-full rounded-lg max-h-96 object-cover"
            />
          ) : report.media_type === 'video' ? (
            <video 
              src={report.media_path} 
              controls 
              className="w-full rounded-lg max-h-96"
            />
          ) : null}
        </div>
      )}

      {/* Description */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="text-gray-700 whitespace-pre-wrap">{report.description}</p>
        
        {report.latitude && report.longitude && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              Localisation: {Number(report.latitude).toFixed(6)}, {Number(report.longitude).toFixed(6)}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
              report.user_interactions?.liked
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Heart className={`w-5 h-5 ${report.user_interactions?.liked ? 'fill-current' : ''}`} />
            <span>{report.likes_count || 0}</span>
          </button>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <MessageCircle className="w-5 h-5" />
            <span>{report.comments_count || 0}</span>
          </button>
          
          <button
            onClick={handleShare}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Share2 className="w-5 h-5" />
            <span>Partager</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTestimonyModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            <Users className="w-5 h-5" />
            <span>Témoigner</span>
          </button>
          
          <button
            onClick={handleReport}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
          >
            <Flag className="w-5 h-5" />
            <span>Signaler</span>
          </button>
        </div>
      </div>

      {/* Witnesses */}
      {report.witnesses && report.witnesses.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">
            Témoignages ({report.witnesses_count})
          </h3>
          <div className="space-y-4">
            {report.witnesses.map((witness) => {
              const witnessDisplayName = getWitnessDisplayName(witness, report, currentUserId, isAdmin);
              const witnessDisplayAvatar = getWitnessDisplayAvatar(witness, report, currentUserId, isAdmin);
              const witnessInitial = witnessDisplayName === 'Témoin anonyme' ? 'T' : witnessDisplayName.charAt(0).toUpperCase();
              
              return (
                <div key={witness.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    {witnessDisplayAvatar ? (
                      <img src={witnessDisplayAvatar} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                        witnessDisplayName === 'Témoin anonyme' ? 'bg-gray-400' : 'bg-blue-600'
                      }`}>
                        {witnessInitial}
                      </div>
                    )}
                    <span className="font-medium">{witnessDisplayName}</span>
                    <span className="text-sm text-gray-500">
                      {formatDistance(new Date(witness.created_at), new Date(), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </span>
                  </div>
                  <p className="text-gray-700 ml-10">{witness.testimony}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            Commentaires ({report.comments_count})
          </h3>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCommentSort('recent')}
              className={`text-sm px-3 py-1 rounded-full transition ${
                commentSort === 'recent' 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Récents
            </button>
            <button
              onClick={() => setCommentSort('popular')}
              className={`text-sm px-3 py-1 rounded-full transition ${
                commentSort === 'popular' 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Populaires
            </button>
          </div>
        </div>
        
        {/* Comment Form */}
        {isAuthenticated ? (
          <form onSubmit={handleComment} className="mb-6">
            {replyTo && (
              <div className="flex items-center justify-between bg-gray-100 px-4 py-2 rounded-t-lg">
                <span className="text-sm text-gray-600">
                  Réponse à <span className="font-medium">{getCommentDisplayName(replyTo, report, currentUserId, isAdmin)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(null);
                    setComment('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  id="comment-input"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={replyTo ? "Écrire une réponse..." : "Ajouter un commentaire..."}
                  className={`input-field w-full resize-none ${replyTo ? 'rounded-t-none' : ''}`}
                  rows={3}
                />
                
                {/* ✅ Indication de visibilité du commentaire */}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    {report.visibility_mode === 'anonymous' ? (
                      <span className="flex items-center">
                        <Lock className="w-3 h-3 mr-1" />
                        Votre commentaire sera anonyme (mode anonyme activé par l'auteur)
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        Votre commentaire sera visible publiquement
                      </span>
                    )}
                  </p>
                  <button
                    type="submit"
                    disabled={!comment.trim() || commentMutation.isPending}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{replyTo ? 'Répondre' : 'Commenter'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-center mb-6">
            <p className="text-gray-600">
              <Link to="/login" className="text-red-600 hover:underline">Connectez-vous</Link> pour commenter
            </p>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {organizedComments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun commentaire pour le moment.</p>
              <p className="text-sm text-gray-400">Soyez le premier à commenter !</p>
            </div>
          ) : (
            organizedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                report={report}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onReply={handleReply}
                onDelete={(commentId) => deleteCommentMutation.mutate(commentId)}
                isExpanded={expandedComments.has(comment.id)}
                onToggleExpand={() => toggleCommentExpanded(comment.id)}
                getCommentDisplayName={getCommentDisplayName}
                getCommentDisplayAvatar={getCommentDisplayAvatar}
              />
            ))
          )}
        </div>
      </div>

      {/* Testimony Modal */}
      {showTestimonyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Ajouter un témoignage</h3>
            
            {/* ✅ Indication de visibilité du témoignage */}
            <div className={`mb-4 p-3 rounded-lg ${
              report.visibility_mode === 'anonymous' 
                ? 'bg-purple-50 border border-purple-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              <p className="text-sm flex items-center">
                {report.visibility_mode === 'anonymous' ? (
                  <>
                    <Lock className="w-4 h-4 mr-1 text-purple-600" />
                    <span className="text-purple-700">Votre témoignage sera anonyme (mode anonyme activé par l'auteur)</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-1 text-green-600" />
                    <span className="text-green-700">Votre témoignage sera visible publiquement</span>
                  </>
                )}
              </p>
            </div>
            
            <textarea
              value={testimony}
              onChange={(e) => setTestimony(e.target.value)}
              placeholder="Décrivez ce dont vous avez été témoin..."
              className="input-field w-full mb-4"
              rows={6}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowTestimonyModal(false);
                  setTestimony('');
                }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={() => witnessMutation.mutate(testimony)}
                disabled={!testimony.trim() || witnessMutation.isPending}
                className="btn-primary"
              >
                {witnessMutation.isPending ? 'Envoi...' : 'Témoigner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// SOUS-COMPOSANT CommentItem
// =====================================================
interface CommentItemProps {
  comment: Comment;
  report: Report;
  currentUserId: number | null;
  isAdmin: boolean;
  onReply: (comment: Comment) => void;
  onDelete: (commentId: number) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  getCommentDisplayName: (comment: Comment, report: Report, currentUserId: number | null, isAdmin: boolean) => string;
  getCommentDisplayAvatar: (comment: Comment, report: Report, currentUserId: number | null, isAdmin: boolean) => string | null;
}

function CommentItem({ 
  comment, 
  report, 
  currentUserId, 
  isAdmin, 
  onReply, 
  onDelete,
  isExpanded,
  onToggleExpand,
  getCommentDisplayName,
  getCommentDisplayAvatar
}: CommentItemProps) {
  const displayName = getCommentDisplayName(comment, report, currentUserId, isAdmin);
  const displayAvatar = getCommentDisplayAvatar(comment, report, currentUserId, isAdmin);
  const displayInitial = displayName === 'Utilisateur anonyme' ? 'A' : displayName.charAt(0).toUpperCase();
  const canDelete = isAdmin || comment.user_id === currentUserId;
  const hasReplies = comment.replies && comment.replies.length > 0;
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start space-x-3">
        {displayAvatar ? (
          <img src={displayAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
        ) : (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${
            displayName === 'Utilisateur anonyme' ? 'bg-gray-400' : 'bg-red-600'
          }`}>
            {displayInitial}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium">{displayName}</span>
            <span className="text-sm text-gray-500">
              {formatDistance(new Date(comment.created_at), new Date(), { 
                addSuffix: true, 
                locale: fr 
              })}
            </span>
            {comment.is_edited && (
              <span className="text-xs text-gray-400">(modifié)</span>
            )}
          </div>
          
          <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          
          <div className="flex items-center space-x-4 mt-2">
            <button
              onClick={() => onReply(comment)}
              className="text-sm text-gray-500 hover:text-red-600 transition"
            >
              Répondre
            </button>
            
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-sm text-gray-500 hover:text-red-600 transition"
              >
                Supprimer
              </button>
            )}
            
            {hasReplies && (
              <button
                onClick={onToggleExpand}
                className="text-sm text-blue-500 hover:text-blue-700 transition flex items-center space-x-1"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Masquer les réponses</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>Voir {comment.replies?.length} réponse{comment.replies?.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            )}
          </div>
          
          {/* Replies */}
          {hasReplies && isExpanded && (
            <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
              {comment.replies!.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  report={report}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onReply={onReply}
                  onDelete={onDelete}
                  isExpanded={false}
                  onToggleExpand={() => {}}
                  getCommentDisplayName={getCommentDisplayName}
                  getCommentDisplayAvatar={getCommentDisplayAvatar}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}