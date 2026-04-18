import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { MapPin, Camera, Upload, X, Loader2 } from 'lucide-react';
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
  onSubmit: (data: ReportFormData, files: File[]) => Promise<void>;
  isLoading?: boolean;
}

export default function ReportForm({ categories, cities, onSubmit, isLoading }: ReportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

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

  const onFormSubmit = (data: ReportFormData) => {
    onSubmit(data, mediaFiles);
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
  );
}