import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { MapPin, Camera, Upload, X, Loader2, Shield, Eye, EyeOff, Lock, Globe, AlertCircle, Send } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

interface ReportFormData {
  title: string;
  description: string;
  category_id: number;
  city_id?: number;
  is_live: boolean;
}

interface ReportFormProps {
  categories: Array<{ id: number; name: string; icon: string }>;
  cities: Array<{ id: number; name: string; country: string }>;
  onSubmit: (data: ReportFormData, files: File[], visibilityMode: 'anonymous' | 'visible') => Promise<void>;
  isLoading?: boolean;
}

type VisibilityMode = 'anonymous' | 'visible';

export default function ReportForm({ categories, cities, onSubmit, isLoading }: ReportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // ✅ ÉTATS POUR LA BOÎTE DE DIALOGUE DE VISIBILITÉ
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('anonymous');
  const [formData, setFormData] = useState<ReportFormData | null>(null);
  const [showVisibilityInfo, setShowVisibilityInfo] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ReportFormData>({
    defaultValues: {
      is_live: false,
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + mediaFiles.length > 5) {
      alert('Maximum 5 fichiers autorisés');
      return;
    }

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Le fichier ${file.name} dépasse 10MB`);
        return;
      }

      newFiles.push(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string);
          setMediaPreviews([...mediaPreviews, ...newPreviews]);
        };
        reader.readAsDataURL(file);
      } else {
        newPreviews.push('/video-placeholder.png');
        setMediaPreviews([...mediaPreviews, ...newPreviews]);
      }
    });

    setMediaFiles([...mediaFiles, ...newFiles]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsGettingLocation(false);
      },
      () => {
        alert('Impossible d\'obtenir votre position');
        setIsGettingLocation(false);
      }
    );
  };

  // ✅ ÉTAPE 1 : Vérifier le formulaire et ouvrir la boîte de dialogue
  const onFormSubmit = (data: ReportFormData) => {
    setFormData(data);
    setShowVisibilityModal(true);
  };

  // ✅ ÉTAPE 2 : Confirmer et publier
  const handleConfirmPublish = () => {
    if (formData) {
      onSubmit(formData, mediaFiles, visibilityMode);
      setShowVisibilityModal(false);
    }
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: `${cat.icon} ${cat.name}`,
  }));

  const cityOptions = [
    { value: '', label: 'Sélectionner une ville' },
    ...cities.map((city) => ({
      value: city.id,
      label: `${city.name}, ${city.country}`,
    })),
  ];

  return (
    <>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <Input
          label="Titre du signalement *"
          placeholder="Ex: Corruption dans l'attribution des marchés publics"
          error={errors.title?.message}
          {...register('title', {
            required: 'Le titre est requis',
            minLength: { value: 5, message: 'Minimum 5 caractères' },
            maxLength: { value: 255, message: 'Maximum 255 caractères' },
          })}
        />

        <Select
          label="Catégorie *"
          options={categoryOptions}
          error={errors.category_id?.message}
          {...register('category_id', {
            required: 'La catégorie est requise',
            valueAsNumber: true,
          })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description détaillée *
          </label>
          <textarea
            rows={8}
            className="input-field"
            placeholder="Décrivez précisément ce qui s'est passé..."
            {...register('description', {
              required: 'La description est requise',
              minLength: { value: 20, message: 'Minimum 20 caractères' },
            })}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Localisation
          </label>
          
          <div className="flex items-center space-x-4 mb-3">
            <Button
              type="button"
              variant="secondary"
              onClick={getCurrentLocation}
              loading={isGettingLocation}
              icon={<MapPin className="w-4 h-4" />}
            >
              Utiliser ma position
            </Button>
            
            {location && (
              <span className="text-sm text-green-600">
                Position: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            )}
          </div>

          <Select
            options={cityOptions}
            {...register('city_id', { valueAsNumber: true })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos / Vidéos (max 5)
          </label>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload className="w-4 h-4" />}
            >
              Ajouter des fichiers
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              icon={<Camera className="w-4 h-4" />}
            >
              Prendre une photo
            </Button>
          </div>
          
          {mediaPreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('is_live')}
              className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
            />
            <span className="text-gray-700">
              <span className="font-medium">Diffuser en direct</span>
              <span className="text-sm text-gray-500 ml-2">
                (Votre signalement sera visible comme un live)
              </span>
            </span>
          </label>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t">
          <Button type="button" variant="secondary">
            Annuler
          </Button>
          <Button type="submit" loading={isLoading}>
            Publier le signalement
          </Button>
        </div>
      </form>

      {/* ✅ BOÎTE DE DIALOGUE DE VISIBILITÉ */}
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
              {/* Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-1">
                      Votre choix de visibilité est important
                    </p>
                    <p className="text-sm text-blue-700">
                      Ce choix déterminera si votre identité et celles des personnes qui interagissent avec votre signalement seront visibles ou anonymes.
                    </p>
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      ⚠️ Ce choix est définitif pour ce signalement et ne pourra pas être modifié.
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
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      visibilityMode === 'anonymous' ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      <EyeOff className={`w-5 h-5 ${
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
                          Mode Anonyme
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Votre identité sera masquée pour tous les utilisateurs (sauf les administrateurs).
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                        <li>Votre nom n'apparaîtra pas</li>
                        <li>Les commentaires seront anonymes</li>
                        <li>Les témoignages seront anonymes</li>
                        <li>Les likes seront anonymes</li>
                      </ul>
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
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      visibilityMode === 'visible' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Eye className={`w-5 h-5 ${
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
                          Mode Visible
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Votre identité sera publique et visible par tous les utilisateurs.
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                        <li>Votre nom sera affiché</li>
                        <li>Les commentaires seront publics</li>
                        <li>Les témoignages seront publics</li>
                        <li>Les likes seront publics</li>
                      </ul>
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
              {formData && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h5 className="font-medium text-gray-700 mb-2">Résumé de votre signalement</h5>
                  <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Titre :</span> {formData.title}</p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Description :</span> {formData.description.length > 100 ? formData.description.substring(0, 100) + '...' : formData.description}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Catégorie :</span> {categories.find(c => c.id === formData.category_id)?.name || 'Non sélectionnée'}
                  </p>
                </div>
              )}

              {/* Avertissement final */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800 text-center">
                  En cliquant sur "Confirmer et publier", vous acceptez que votre signalement soit publié avec le mode de visibilité choisi.
                  Ce choix est définitif.
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
                className={`px-6 py-2 rounded-lg text-white font-medium transition flex items-center space-x-2 ${
                  visibilityMode === 'anonymous' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Confirmer et publier</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}