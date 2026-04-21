import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { reportAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { MapPin, Lock, Globe, AlertCircle, X, Image as ImageIcon, Shield, Eye, EyeOff, Send } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface City {
  id: number;
  name: string;
  country: string;
}

interface CreateReportFormProps {
  categories: Category[];
  cities: City[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

type VisibilityMode = 'anonymous' | 'visible';

export default function CreateReportForm({ categories, cities, onSuccess, onCancel }: CreateReportFormProps) {
  const navigate = useNavigate();
  
  // États du formulaire
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // ✅ États pour la boîte de dialogue modale de visibilité
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('anonymous');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createReportMutation = useMutation({
    mutationFn: (formData: FormData) => reportAPI.createReport(formData),
    onSuccess: (response) => {
      toast.success('Signalement créé avec succès !');
      setShowVisibilityModal(false);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/reports/${response.data.id}`);
      }
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast.error(error.response?.data?.error || 'Erreur lors de la création du signalement');
    },
  });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGettingLocation(false);
        toast.success('Localisation obtenue');
      },
      (error) => {
        setGettingLocation(false);
        toast.error('Impossible d\'obtenir votre position');
      }
    );
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMedia(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMedia = () => {
    setMedia(null);
    setMediaPreview(null);
  };

  // ✅ ÉTAPE 1 : Vérifier le formulaire et ouvrir la boîte de dialogue de visibilité
  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Le titre est requis');
      return;
    }

    if (!description.trim()) {
      toast.error('La description est requise');
      return;
    }

    if (!categoryId) {
      toast.error('Veuillez sélectionner une catégorie');
      return;
    }

    // ✅ Ouvrir la boîte de dialogue pour choisir la visibilité
    setShowVisibilityModal(true);
  };

  // ✅ ÉTAPE 2 : Publier avec le mode de visibilité choisi
  // Ce choix impactera automatiquement TOUTES les interactions futures
  const handleConfirmPublish = () => {
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('category_id', String(categoryId));
    if (cityId) formData.append('city_id', String(cityId));
    if (latitude) formData.append('latitude', String(latitude));
    if (longitude) formData.append('longitude', String(longitude));
    formData.append('is_live', String(isLive));
    
    // ✅ LES DEUX CHAMPS CLÉS QUI IMPACTENT TOUT LE RESTE
    // is_anonymous = true → mode anonyme pour tout le monde
    // is_anonymous = false + visibility_mode = 'visible' → tout est visible
    formData.append('is_anonymous', String(visibilityMode === 'anonymous'));
    formData.append('visibility_mode', visibilityMode);
    
    if (media) {
      formData.append('media', media);
    }

    createReportMutation.mutate(formData);
  };

  return (
    <>
      <form onSubmit={handleSubmitClick} className="space-y-6">
        {/* Titre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titre du signalement *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Manifestation pacifique à Kinshasa"
            className="input-field"
            maxLength={255}
          />
          <p className="text-xs text-gray-500 text-right mt-1">{title.length}/255</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description détaillée *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez en détail ce que vous avez observé..."
            className="input-field w-full"
            rows={6}
          />
          <p className="text-xs text-gray-500 text-right mt-1">{description.length}/2000</p>
        </div>

        {/* Catégorie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catégorie *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`p-3 rounded-lg border-2 transition text-center ${
                  categoryId === cat.id
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{ borderColor: categoryId === cat.id ? cat.color : undefined }}
              >
                <span className="text-2xl">{cat.icon}</span>
                <p className="text-sm mt-1">{cat.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Ville */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ville (optionnel)
          </label>
          <select
            value={cityId || ''}
            onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
            className="input-field"
          >
            <option value="">Sélectionner une ville</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}, {city.country}
              </option>
            ))}
          </select>
        </div>

        {/* Localisation GPS */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Localisation précise (optionnel)
          </label>
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={gettingLocation}
            className="btn-secondary flex items-center space-x-2"
          >
            <MapPin className="w-4 h-4" />
            <span>{gettingLocation ? 'Obtention de la position...' : 'Utiliser ma position actuelle'}</span>
          </button>
          {latitude && longitude && (
            <p className="text-sm text-green-600 mt-2">
              ✓ Position enregistrée: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          )}
        </div>

        {/* Type de signalement */}
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">
              🔴 Signaler en direct (streaming)
            </span>
          </label>
        </div>

        {/* Média */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo ou vidéo (optionnel)
          </label>
          {!mediaPreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="hidden"
                id="media-input"
              />
              <label htmlFor="media-input" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-gray-600">Cliquez pour ajouter une photo ou vidéo</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, MP4 (max 50MB)</p>
                </div>
              </label>
            </div>
          ) : (
            <div className="relative">
              {media?.type.startsWith('image/') ? (
                <img src={mediaPreview} alt="Preview" className="w-full rounded-lg max-h-64 object-cover" />
              ) : (
                <video src={mediaPreview} controls className="w-full rounded-lg max-h-64" />
              )}
              <button
                type="button"
                onClick={handleRemoveMedia}
                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Information légale */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              En soumettant ce signalement, vous certifiez que les informations fournies sont véridiques.
              Les fausses déclarations peuvent entraîner des poursuites.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary">
              Annuler
            </button>
          )}
          <button
            type="submit"
            className="btn-primary flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Publier le signalement</span>
          </button>
        </div>
      </form>

      {/* ✅ BOÎTE DE DIALOGUE DE VISIBILITÉ - LE CHOIX QUI IMPACTE TOUT */}
      {showVisibilityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* En-tête */}
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-6 h-6 text-red-600" />
                <h3 className="text-xl font-bold text-gray-900">Choisissez votre mode de visibilité</h3>
              </div>
              <button
                onClick={() => setShowVisibilityModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenu */}
            <div className="p-6">
              {/* Information IMPORTANTE sur l'impact du choix */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-800 mb-2">
                      ⚡ Votre choix s'appliquera à TOUTES les interactions
                    </p>
                    <ul className="text-xs text-purple-700 space-y-1">
                      <li>• Si vous choisissez <strong>Anonyme</strong> : Tous les commentaires, likes, témoignages et partages seront <strong>anonymes</strong></li>
                      <li>• Si vous choisissez <strong>Visible</strong> : Tous les commentaires, likes, témoignages et partages seront <strong>visibles publiquement</strong></li>
                    </ul>
                    <p className="text-xs text-purple-600 mt-2 font-medium">
                      ⚠️ Ce choix est définitif pour ce signalement et toutes ses interactions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Options de visibilité */}
              <div className="space-y-4 mb-6">
                {/* Option Anonyme */}
                <button
                  type="button"
                  onClick={() => setVisibilityMode('anonymous')}
                  className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
                    visibilityMode === 'anonymous'
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                      visibilityMode === 'anonymous' ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      <EyeOff className={`w-6 h-6 ${
                        visibilityMode === 'anonymous' ? 'text-purple-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Lock className={`w-4 h-4 ${
                          visibilityMode === 'anonymous' ? 'text-purple-600' : 'text-gray-500'
                        }`} />
                        <h4 className={`font-semibold text-lg ${
                          visibilityMode === 'anonymous' ? 'text-purple-700' : 'text-gray-700'
                        }`}>
                          🔒 Mode Anonyme
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Votre identité sera masquée. Toutes les interactions seront anonymes.
                      </p>
                      <div className="bg-purple-50 rounded-lg p-3 mt-2">
                        <p className="text-xs text-purple-700 font-medium mb-1">Ce qui sera anonyme :</p>
                        <ul className="text-xs text-purple-600 space-y-0.5">
                          <li>✓ Votre nom d'utilisateur</li>
                          <li>✓ Les commentaires</li>
                          <li>✓ Les likes</li>
                          <li>✓ Les témoignages</li>
                          <li>✓ Les partages</li>
                        </ul>
                      </div>
                    </div>
                    {visibilityMode === 'anonymous' && (
                      <div className="ml-4 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>

                {/* Option Visible */}
                <button
                  type="button"
                  onClick={() => setVisibilityMode('visible')}
                  className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
                    visibilityMode === 'visible'
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                      visibilityMode === 'visible' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Eye className={`w-6 h-6 ${
                        visibilityMode === 'visible' ? 'text-green-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Globe className={`w-4 h-4 ${
                          visibilityMode === 'visible' ? 'text-green-600' : 'text-gray-500'
                        }`} />
                        <h4 className={`font-semibold text-lg ${
                          visibilityMode === 'visible' ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          🌍 Mode Visible
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Votre identité sera publique. Toutes les interactions seront visibles.
                      </p>
                      <div className="bg-green-50 rounded-lg p-3 mt-2">
                        <p className="text-xs text-green-700 font-medium mb-1">Ce qui sera visible :</p>
                        <ul className="text-xs text-green-600 space-y-0.5">
                          <li>✓ Votre nom d'utilisateur</li>
                          <li>✓ Les commentaires</li>
                          <li>✓ Les likes</li>
                          <li>✓ Les témoignages</li>
                          <li>✓ Les partages</li>
                        </ul>
                      </div>
                    </div>
                    {visibilityMode === 'visible' && (
                      <div className="ml-4 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              </div>

              {/* Résumé du signalement */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h5 className="font-medium text-gray-700 mb-2">Résumé de votre signalement</h5>
                <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Titre :</span> {title}</p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Description :</span> {description.length > 100 ? description.substring(0, 100) + '...' : description}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Catégorie :</span> {categories.find(c => c.id === categoryId)?.name || 'Non sélectionnée'}
                </p>
              </div>

              {/* Avertissement final */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800 text-center">
                  ⚠️ En cliquant sur "Confirmer et publier", vous acceptez que votre signalement et toutes ses interactions suivent le mode de visibilité choisi. Ce choix est définitif.
                </p>
              </div>
            </div>

            {/* Pied de page avec boutons */}
            <div className="border-t px-6 py-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowVisibilityModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={isSubmitting || createReportMutation.isPending}
                className={`px-6 py-2 rounded-lg text-white font-medium transition flex items-center space-x-2 ${
                  visibilityMode === 'anonymous' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting || createReportMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Publication...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirmer et publier</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}