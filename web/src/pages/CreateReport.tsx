import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { liveAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import {
  Video,
  Lock,
  DollarSign,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Trash2,
  StopCircle,
  X,
  Radio,
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CreateLiveForm {
  title: string;
  description: string;
  is_premium: boolean;
  price: number;
  scheduled_for?: string;
  category?: string;
}

interface ExistingStream {
  id: number;
  title: string;
  status: 'active' | 'scheduled' | 'ended';
  scheduled_for?: string;
  viewer_count: number;
  is_premium: boolean;
}

export default function CreateLive() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [isPremium, setIsPremium] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<number | null>(null);

  // Récupérer les streams existants de l'utilisateur
  const { data: existingStreams, refetch: refetchStreams } = useQuery({
    queryKey: ['my-streams', user?.id],
    queryFn: async () => {
      try {
        const res = await liveAPI.getStreams({ user_id: user?.id, status: 'all' });
        return res.data;
      } catch (err) {
        console.error('Error fetching my streams:', err);
        return { streams: [] };
      }
    },
    enabled: !!isAuthenticated,
  });

  const activeStream = existingStreams?.streams?.find(
    (s: ExistingStream) => s.status === 'active'
  );
  const scheduledStreams = existingStreams?.streams?.filter(
    (s: ExistingStream) => s.status === 'scheduled'
  ) || [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<CreateLiveForm>({
    defaultValues: {
      is_premium: false,
      price: 0,
      category: 'talk',
    },
  });

  // Mutation pour créer un live
  const createLiveMutation = useMutation({
    mutationFn: (data: CreateLiveForm) => liveAPI.createStream(data),
    onSuccess: (response) => {
      toast.success(
        isScheduled
          ? 'Live programmé avec succès !'
          : 'Live créé avec succès ! Redirection...'
      );
      if (!isScheduled) {
        navigate(`/live/${response.data.id}`);
      } else {
        reset();
        setIsScheduled(false);
        refetchStreams();
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la création du live';
      toast.error(errorMessage);
      if (errorMessage.includes('déjà un stream actif')) {
        refetchStreams();
      }
    },
  });

  // Mutation pour terminer un live
  const endStreamMutation = useMutation({
    mutationFn: (streamId: number) => liveAPI.endStream(streamId),
    onSuccess: () => {
      toast.success('Live terminé avec succès');
      refetchStreams();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'arrêt du live');
    },
  });

  // Mutation pour supprimer un live programmé
  const deleteStreamMutation = useMutation({
    mutationFn: (streamId: number) => liveAPI.deleteStream(streamId),
    onSuccess: () => {
      toast.success('Live supprimé avec succès');
      setShowDeleteConfirm(false);
      setStreamToDelete(null);
      refetchStreams();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    },
  });

  const onSubmit = (data: CreateLiveForm) => {
    if (activeStream && !isScheduled) {
      toast.error('Vous avez déjà un live en cours. Terminez-le avant d\'en créer un nouveau.');
      return;
    }

    const payload = {
      ...data,
      scheduled_for: isScheduled ? data.scheduled_for : null,
    };
    createLiveMutation.mutate(payload);
  };

  const handleEndStream = (streamId: number) => {
    if (confirm('Voulez-vous vraiment terminer ce live ?')) {
      endStreamMutation.mutate(streamId);
    }
  };

  const handleDeleteStream = (streamId: number) => {
    setStreamToDelete(streamId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (streamToDelete) {
      deleteStreamMutation.mutate(streamToDelete);
    }
  };

  const handleGoToLive = (streamId: number) => {
    navigate(`/live/${streamId}`);
  };

  // Redirection si non authentifié
  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connectez-vous pour créer un live
        </h2>
        <p className="text-gray-600 mb-6">
          Vous devez être connecté pour démarrer une diffusion en direct.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700"
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Radio className="w-8 h-8 text-red-600" />
          Démarrer un live
        </h1>
        <p className="text-gray-600 mt-2">
          Diffusez en direct pour partager une situation en temps réel
        </p>
      </div>

      {/* Afficher le live actif s'il existe */}
      {activeStream && (
        <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Vous avez déjà un live en cours
                </h3>
                <p className="text-sm text-gray-600">
                  {activeStream.title} • {activeStream.viewer_count || 0} spectateur(s)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleGoToLive(activeStream.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Rejoindre le live
              </button>
              <button
                onClick={() => handleEndStream(activeStream.id)}
                disabled={endStreamMutation.isPending}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium flex items-center gap-2"
              >
                {endStreamMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <StopCircle className="w-4 h-4" />
                )}
                Arrêter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Afficher les lives programmés */}
      {scheduledStreams.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Vos lives programmés
          </h3>
          <div className="space-y-2">
            {scheduledStreams.map((stream: ExistingStream) => (
              <div
                key={stream.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">{stream.title}</p>
                    <p className="text-sm text-gray-500">
                      {stream.scheduled_for
                        ? formatDistance(new Date(stream.scheduled_for), new Date(), {
                            addSuffix: true,
                            locale: fr,
                          })
                        : 'Date non définie'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGoToLive(stream.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Voir le live"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStream(stream.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire de création */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titre du live *
          </label>
          <input
            type="text"
            {...register('title', {
              required: 'Le titre est requis',
              minLength: { value: 3, message: 'Minimum 3 caractères' },
              maxLength: { value: 100, message: 'Maximum 100 caractères' },
            })}
            className="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Ex: Manifestation pacifique à Kinshasa"
            disabled={!!activeStream}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catégorie
          </label>
          <select
            {...register('category')}
            className="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            disabled={!!activeStream}
          >
            <option value="talk">💬 Discussion</option>
            <option value="activism">✊ Activisme</option>
            <option value="news">📰 Actualités</option>
            <option value="education">📚 Éducation</option>
            <option value="entertainment">🎮 Divertissement</option>
            <option value="music">🎵 Musique</option>
            <option value="sports">⚽ Sports</option>
            <option value="tech">💻 Technologie</option>
            <option value="travel">✈️ Voyage</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={4}
            className="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Décrivez ce que vous allez diffuser..."
            disabled={!!activeStream}
          />
        </div>

        {/* Option de programmation */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className={`w-5 h-5 ${isScheduled ? 'text-blue-500' : 'text-gray-400'}`} />
              <div>
                <h3 className="font-medium">Programmer le live</h3>
                <p className="text-sm text-gray-600">
                  Définissez une date et heure de début
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="sr-only peer"
                disabled={!!activeStream}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          {isScheduled && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date et heure de début *
              </label>
              <input
                type="datetime-local"
                {...register('scheduled_for', {
                  required: isScheduled ? 'La date est requise' : false,
                  validate: (value) => {
                    if (isScheduled && value) {
                      const selectedDate = new Date(value);
                      const now = new Date();
                      if (selectedDate < now) {
                        return 'La date doit être dans le futur';
                      }
                    }
                    return true;
                  },
                })}
                className="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                min={new Date().toISOString().slice(0, 16)}
                disabled={!!activeStream}
              />
              {errors.scheduled_for && (
                <p className="mt-1 text-sm text-red-600">{errors.scheduled_for.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Option Premium */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Lock className={`w-5 h-5 ${isPremium ? 'text-yellow-500' : 'text-gray-400'}`} />
              <div>
                <h3 className="font-medium">Stream Premium</h3>
                <p className="text-sm text-gray-600">
                  Faites payer l'accès à votre stream. Vous recevrez 80% des revenus.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('is_premium')}
                onChange={(e) => setIsPremium(e.target.checked)}
                className="sr-only peer"
                disabled={!!activeStream}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
            </label>
          </div>

          {isPremium && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix (€)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('price', {
                    required: isPremium ? 'Le prix est requis' : false,
                    min: { value: 0.01, message: 'Le prix minimum est 0.01 €' },
                  })}
                  className="input-field pl-10 w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="0.00"
                  disabled={!!activeStream}
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Message d'avertissement si live actif */}
        {activeStream && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">
                  Formulaire désactivé
                </h4>
                <p className="text-sm text-yellow-700">
                  Vous ne pouvez pas créer un nouveau live tant que votre live actuel n'est pas terminé.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Informations importantes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Informations importantes</h4>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Votre stream sera visible publiquement</li>
                <li>• Respectez les conditions d'utilisation</li>
                <li>• Les contenus inappropriés seront supprimés</li>
                <li>• Vous pouvez arrêter le stream à tout moment</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/live')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createLiveMutation.isPending || !!activeStream}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {isSubmitting || createLiveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isScheduled ? 'Programmation...' : 'Création...'}</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>
                  {activeStream
                    ? 'Live en cours...'
                    : isScheduled
                    ? 'Programmer le live'
                    : 'Démarrer le live'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer ce live programmé ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setStreamToDelete(null);
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteStreamMutation.isPending}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteStreamMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}