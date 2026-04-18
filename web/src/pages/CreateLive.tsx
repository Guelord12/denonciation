import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { liveAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Video, Lock, DollarSign, AlertCircle, Loader2 } from 'lucide-react';

interface CreateLiveForm {
  title: string;
  description: string;
  is_premium: boolean;
  price: number;
}

export default function CreateLive() {
  const navigate = useNavigate();
  const [isPremium, setIsPremium] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateLiveForm>({
    defaultValues: {
      is_premium: false,
      price: 0,
    },
  });

  const createLiveMutation = useMutation({
    mutationFn: (data: CreateLiveForm) => liveAPI.createStream(data),
    onSuccess: (response) => {
      toast.success('Live créé avec succès !');
      navigate(`/live/${response.data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la création du live');
    },
  });

  const onSubmit = (data: CreateLiveForm) => {
    createLiveMutation.mutate(data);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Démarrer un live</h1>
        <p className="text-gray-600 mt-2">
          Diffusez en direct pour partager une situation en temps réel
        </p>
      </div>

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
              maxLength: { value: 255, message: 'Maximum 255 caractères' },
            })}
            className="input-field"
            placeholder="Ex: Manifestation pacifique à Kinshasa"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={4}
            className="input-field"
            placeholder="Décrivez ce que vous allez diffuser..."
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
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
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
            </label>
          </div>

          {isPremium && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix (USD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('price', {
                    required: isPremium ? 'Le prix est requis' : false,
                    min: { value: 0.01, message: 'Le prix minimum est 0.01 USD' },
                  })}
                  className="input-field pl-10 w-48"
                  placeholder="0.00"
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>
          )}
        </div>

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

        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Création...</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>Démarrer le live</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}