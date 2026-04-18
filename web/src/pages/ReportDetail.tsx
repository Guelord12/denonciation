import { useState } from 'react';
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
} from 'lucide-react';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [testimony, setTestimony] = useState('');
  const [showTestimonyModal, setShowTestimonyModal] = useState(false);

  const { data: report, isLoading } = useQuery({
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
    mutationFn: (content: string) => commentAPI.createComment(Number(id), content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      setComment('');
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
      commentMutation.mutate(comment.trim());
    }
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
      toast.success('Signalement envoyé pour modération');
    }
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

  // Déterminer le nom à afficher (anonyme sauf pour admin)
  const displayName = report.username || 'Utilisateur anonyme';
  const displayAvatar = report.user_avatar || null;
  const displayInitial = displayName === 'Utilisateur anonyme' ? 'A' : displayName.charAt(0).toUpperCase();

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
        </div>
        <h1 className="text-3xl font-bold mb-4">{report.title}</h1>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {displayAvatar ? (
                <img src={displayAvatar} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white">
                  {displayInitial}
                </div>
              )}
              <div>
                <p className="font-medium">{displayName}</p>
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
            <User className="w-5 h-5" />
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
      {report.witnesses?.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">
            Témoignages ({report.witnesses_count})
          </h3>
          <div className="space-y-4">
            {report.witnesses.map((witness: any) => (
              <div key={witness.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center space-x-2 mb-2">
                  {witness.avatar ? (
                    <img src={witness.avatar} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white">
                      A
                    </div>
                  )}
                  <span className="font-medium">{witness.username || 'Utilisateur anonyme'}</span>
                  <span className="text-sm text-gray-500">
                    {formatDistance(new Date(witness.created_at), new Date(), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </span>
                </div>
                <p className="text-gray-700">{witness.testimony}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div>
        <h3 className="text-xl font-semibold mb-4">
          Commentaires ({report.comments_count})
        </h3>
        
        {/* Comment Form */}
        {isAuthenticated ? (
          <form onSubmit={handleComment} className="mb-6">
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  className="input-field w-full resize-none"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!comment.trim() || commentMutation.isPending}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Commenter</span>
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
          {report.comments?.map((comment: any) => (
            <div key={comment.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center space-x-2 mb-2">
                {comment.avatar ? (
                  <img src={comment.avatar} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm">
                    A
                  </div>
                )}
                <span className="font-medium">{comment.username || 'Utilisateur anonyme'}</span>
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
              <p className="text-gray-700 ml-10">{comment.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimony Modal */}
      {showTestimonyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Ajouter un témoignage</h3>
            <textarea
              value={testimony}
              onChange={(e) => setTestimony(e.target.value)}
              placeholder="Décrivez ce dont vous avez été témoin..."
              className="input-field w-full mb-4"
              rows={6}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTestimonyModal(false)}
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