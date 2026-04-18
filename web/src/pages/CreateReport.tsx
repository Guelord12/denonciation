import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { reportAPI, categoryAPI, cityAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { MapPin, Camera, Video, Upload, X, AlertCircle, Loader2 } from 'lucide-react';

interface ReportFormData {
  title: string;
  description: string;
  category_id: number;
  city_id?: number;
  is_live: boolean;
}

export default function CreateReport() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoryAPI.getCategories().then(res => res.data) });
  const { data: cities } = useQuery({ queryKey: ['cities'], queryFn: () => cityAPI.getCities().then(res => res.data) });

  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<ReportFormData>({ defaultValues: { is_live: false } });
  const isLive = watch('is_live');

  const createReportMutation = useMutation({
    mutationFn: (formData: FormData) => reportAPI.createReport(formData),
    onSuccess: (response) => { toast.success('Signalement créé avec succès !'); navigate(`/reports/${response.data.id}`); },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Erreur lors de la création du signalement'),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + mediaFiles.length > 5) { toast.error('Maximum 5 fichiers autorisés'); return; }
    const newFiles: File[] = []; const newPreviews: string[] = [];
    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) { toast.error(`Le fichier ${file.name} dépasse 10MB`); return; }
      newFiles.push(file);
      if (file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = (e) => { newPreviews.push(e.target?.result as string); setMediaPreviews([...mediaPreviews, ...newPreviews]); }; reader.readAsDataURL(file); }
      else { newPreviews.push('/video-placeholder.png'); setMediaPreviews([...mediaPreviews, ...newPreviews]); }
    });
    setMediaFiles([...mediaFiles, ...newFiles]);
  };

  const removeMedia = (index: number) => { setMediaFiles(mediaFiles.filter((_, i) => i !== index)); setMediaPreviews(mediaPreviews.filter((_, i) => i !== index)); };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (!navigator.geolocation) { toast.error('La géolocalisation n\'est pas supportée'); setIsGettingLocation(false); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => { setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }); toast.success('Localisation obtenue'); setIsGettingLocation(false); },
      () => { toast.error('Impossible d\'obtenir votre position'); setIsGettingLocation(false); }
    );
  };

  const onSubmit = async (data: ReportFormData) => {
    const formData = new FormData();
    formData.append('title', data.title); formData.append('description', data.description); formData.append('category_id', data.category_id.toString()); formData.append('is_live', data.is_live.toString());
    if (data.city_id) formData.append('city_id', data.city_id.toString());
    if (location) { formData.append('latitude', location.lat.toString()); formData.append('longitude', location.lng.toString()); }
    mediaFiles.forEach((file) => formData.append('media', file));
    createReportMutation.mutate(formData);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6"><h1 className="text-3xl font-bold text-gray-900">Créer un signalement</h1><p className="text-gray-600 mt-2">Décrivez la situation dont vous avez été témoin. Soyez précis et objectif.</p></div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Titre du signalement *</label><input type="text" {...register('title', { required: 'Le titre est requis', minLength: { value: 5, message: 'Minimum 5 caractères' }, maxLength: { value: 255, message: 'Maximum 255 caractères' } })} className="input-field" placeholder="Ex: Corruption dans l'attribution des marchés publics" />{errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}</div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label><select {...register('category_id', { required: 'La catégorie est requise', valueAsNumber: true })} className="input-field"><option value="">Sélectionner une catégorie</option>{categories?.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}</select>{errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>}</div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Description détaillée *</label><textarea {...register('description', { required: 'La description est requise', minLength: { value: 20, message: 'Minimum 20 caractères' } })} rows={8} className="input-field" placeholder="Décrivez précisément ce qui s'est passé, quand, où, et qui était impliqué..." />{errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}</div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Localisation</label>
          <div className="flex items-center space-x-4 mb-3">
            <button type="button" onClick={getCurrentLocation} disabled={isGettingLocation} className="btn-secondary flex items-center space-x-2">{isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}<span>Utiliser ma position</span></button>
            {location && <span className="text-sm text-green-600">Position: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>}
          </div>
          <select {...register('city_id', { valueAsNumber: true })} className="input-field"><option value="">Ou sélectionner une ville</option>{cities?.map((city: any) => <option key={city.id} value={city.id}>{city.name}, {city.country}</option>)}</select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos / Vidéos (max 5)</label>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 transition-colors"><Upload className="w-5 h-5 text-gray-400" /><span>Ajouter des fichiers</span></button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 transition-colors"><Camera className="w-5 h-5 text-gray-400" /><span>Prendre une photo</span></button>
          </div>
          {mediaPreviews.length > 0 && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">{mediaPreviews.map((preview, index) => <div key={index} className="relative group"><img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" /><button type="button" onClick={() => removeMedia(index)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button></div>)}</div>}
        </div>
        <div><label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" {...register('is_live')} className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500" /><span className="text-gray-700"><span className="font-medium">Diffuser en direct</span><span className="text-sm text-gray-500 ml-2">(Votre signalement sera visible comme un live)</span></span></label></div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"><div className="flex items-start"><AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" /><div><h4 className="text-sm font-medium text-yellow-800">Information importante</h4><p className="text-sm text-yellow-700 mt-1">En soumettant ce signalement, vous certifiez que les informations fournies sont véridiques. Les fausses déclarations peuvent entraîner des poursuites judiciaires.</p></div></div></div>
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center space-x-2">{isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Création...</span></> : <span>Publier le signalement</span>}</button>
        </div>
      </form>
    </div>
  );
}