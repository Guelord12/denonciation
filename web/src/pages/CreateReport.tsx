import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { reportAPI, categoryAPI, cityAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import {
  Camera, MapPin, Video, X, ChevronDown, Upload, FileText,
  Lock, Globe, AlertCircle, Shield, Eye, EyeOff, Send,
  Loader2,
} from 'lucide-react';

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

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

type VisibilityMode = 'anonymous' | 'visible';

export default function CreateReport() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // États pour la boîte de dialogue de visibilité
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('anonymous');

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryAPI.getCategories().then(res => res.data),
  });

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => cityAPI.getCities().then(res => res.data),
  });

  const categories: Category[] = Array.isArray(categoriesData) ? categoriesData : [];
  const cities: City[] = Array.isArray(citiesData) ? citiesData : [];

  const createReportMutation = useMutation({
    mutationFn: (formData: FormData) => reportAPI.createReport(formData),
    onSuccess: (response) => {
      toast.success('Signalement créé avec succès !');
      setShowVisibilityModal(false);
      navigate('/reports');
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast.error(error.response?.data?.error || 'Impossible de créer le signalement');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMedia: MediaFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (media.length + newMedia.length >= 5) {
        toast.error('Maximum 5 fichiers autorisés');
        break;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 10MB`);
        continue;
      }

      newMedia.push({
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' : 'image',
      });
    }

    setMedia([...media, ...newMedia]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (index: number) => {
    const newMedia = [...media];
    URL.revokeObjectURL(newMedia[index].preview);
    newMedia.splice(index, 1);
    setMedia(newMedia);
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);

    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée par votre navigateur');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsGettingLocation(false);
        toast.success('Localisation obtenue');
      },
      (error) => {
        setIsGettingLocation(false);
        toast.error('Impossible d\'obtenir votre position');
      }
    );
  };

  const handleSubmitClick = () => {
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

    setShowVisibilityModal(true);
  };

  const handleConfirmPublish = async () => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category_id', categoryId!.toString());

      if (cityId) {
        formData.append('city_id', cityId.toString());
      }

      if (location) {
        formData.append('latitude', location.latitude.toString());
        formData.append('longitude', location.longitude.toString());
      }

      formData.append('is_live', isLive.toString());
      formData.append('is_anonymous', String(visibilityMode === 'anonymous'));
      formData.append('visibility_mode', visibilityMode);

      for (const file of media) {
        formData.append('media', file.file);
      }

      createReportMutation.mutate(formData);
    } catch (error) {
      toast.error('Erreur lors de la préparation du signalement');
      setIsSubmitting(false);
    }
  };

  const getCategoryName = () => {
    if (!categoryId) return 'Sélectionner une catégorie';
    const cat = categories.find(c => c.id === categoryId);
    return cat ? `${cat.icon} ${cat.name}` : 'Sélectionner une catégorie';
  };

  const getCityName = () => {
    if (!cityId) return 'Sélectionner une ville';
    const city = cities.find(c => c.id === cityId);
    return city ? `${city.name}, ${city.country}` : 'Sélectionner une ville';
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connectez-vous pour faire un signalement
        </h2>
        <p className="text-gray-600 mb-6">
          Vous devez être connecté pour signaler un abus.
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-red-600" />
          Nouveau signalement
        </h1>
        <p className="text-gray-600 mt-2">
          Signalez un abus ou une injustice en toute sécurité
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Titre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du signalement"
            maxLength={255}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
          <p className="text-xs text-gray-500 text-right mt-1">{title.length}/255</p>
        </div>

        {/* Catégorie */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catégorie <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
          >
            <span className={!categoryId ? 'text-gray-400' : ''}>{getCategoryName()}</span>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>

          {showCategoryDropdown && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setCategoryId(cat.id); setShowCategoryDropdown(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 ${
                    categoryId === cat.id ? 'bg-red-50' : ''
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez la situation en détail..."
            rows={6}
            maxLength={2000}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
          />
          <p className="text-xs text-gray-500 text-right mt-1">{description.length}/2000</p>
        </div>

        {/* Localisation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {isGettingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin text-red-500" />
            ) : (
              <MapPin className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm text-red-500">
              {location
                ? `Position: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                : 'Utiliser ma position actuelle'}
            </span>
          </button>
        </div>

        {/* Ville */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
          <button
            type="button"
            onClick={() => setShowCityDropdown(!showCityDropdown)}
            className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
          >
            <span className={!cityId ? 'text-gray-400' : ''}>{getCityName()}</span>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>

          {showCityDropdown && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => { setCityId(city.id); setShowCityDropdown(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 ${
                    cityId === city.id ? 'bg-red-50' : ''
                  }`}
                >
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <span>{city.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{city.country}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Médias */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photos / Vidéos (max 5)
          </label>
          <div className="flex gap-3 mb-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Upload className="w-5 h-5 text-gray-500" />
              <span className="text-sm">Ajouter des fichiers</span>
            </button>
          </div>

          {media.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {media.map((item, index) => (
                <div key={index} className="relative">
                  {item.type === 'image' ? (
                    <img
                      src={item.preview}
                      alt=""
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Option Live */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
              className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
            />
            <Video className={`w-5 h-5 ${isLive ? 'text-red-500' : 'text-gray-400'}`} />
            <span className={`text-sm ${isLive ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
              Diffuser en direct
            </span>
          </label>
          {isLive && (
            <p className="text-xs text-red-500 mt-2 ml-8">
              Votre signalement sera visible comme un live en direct
            </p>
          )}
        </div>

        {/* Information légale */}
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <FileText className="w-5 h-5 text-yellow-600 mt-0.5" />
          <p className="text-sm text-yellow-800">
            En soumettant ce signalement, vous certifiez que les informations fournies sont véridiques.
            Les fausses déclarations peuvent entraîner des poursuites.
          </p>
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={isSubmitting}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              'Publier le signalement'
            )}
          </button>
        </div>
      </div>

      {/* Modal de visibilité */}
      {showVisibilityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-bold">Choisissez votre mode de visibilité</h3>
              </div>
              <button onClick={() => setShowVisibilityModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Info impact */}
              <div className="flex items-start gap-3 bg-purple-50 rounded-lg p-4">
                <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-800 mb-2">
                    ⚡ Votre choix s'appliquera à TOUTES les interactions
                  </p>
                  <p className="text-sm text-purple-700">
                    • Mode <strong>Anonyme</strong> : Tous les commentaires, likes, témoignages et partages seront anonymes
                  </p>
                  <p className="text-sm text-purple-700">
                    • Mode <strong>Visible</strong> : Tous les commentaires, likes, témoignages et partages seront visibles publiquement
                  </p>
                  <p className="text-sm text-yellow-700 mt-2 italic">
                    ⚠️ Ce choix est définitif pour ce signalement.
                  </p>
                </div>
              </div>

              {/* Option Anonyme */}
              <button
                onClick={() => setVisibilityMode('anonymous')}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  visibilityMode === 'anonymous'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <EyeOff className="w-8 h-8 text-purple-600" />
                  <div>
                    <Lock className="w-4 h-4 text-purple-600 inline mr-1" />
                    <span className="font-bold text-purple-600">🔒 Mode Anonyme</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Votre identité sera masquée. Toutes les interactions seront anonymes.</p>
              </button>

              {/* Option Visible */}
              <button
                onClick={() => setVisibilityMode('visible')}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  visibilityMode === 'visible'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="w-8 h-8 text-green-600" />
                  <div>
                    <Globe className="w-4 h-4 text-green-600 inline mr-1" />
                    <span className="font-bold text-green-600">🌍 Mode Visible</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Votre identité sera publique. Toutes les interactions seront visibles.</p>
              </button>

              {/* Avertissement final */}
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-xs text-yellow-800 text-center">
                  ⚠️ En cliquant sur "Confirmer et publier", vous acceptez que votre signalement et toutes ses interactions suivent le mode de visibilité choisi. Ce choix est définitif.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setShowVisibilityModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={isSubmitting}
                className="flex-1 py-2 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                style={{
                  backgroundColor: visibilityMode === 'anonymous' ? '#8B5CF6' : '#10B981',
                }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Confirmer et publier
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}