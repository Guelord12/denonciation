import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI, reportAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Calendar, Camera, Edit2, Save, X, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReportCard from '../components/reports/ReportCard';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  city: string;
  nationality: string;
  birth_date: string;
  gender: string;
}

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'comments' | 'likes'>('reports');

  const userId = id ? parseInt(id) : currentUser?.id;
  const isOwnProfile = !id || parseInt(id) === currentUser?.id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => userAPI.getProfile(userId!).then(res => res.data),
    enabled: !!userId,
  });

  const { data: reports } = useQuery({
    queryKey: ['user-reports', userId],
    queryFn: () => reportAPI.getReports({ user_id: userId, limit: 10 }).then(res => res.data),
    enabled: !!userId,
  });

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<ProfileFormData>({
    defaultValues: {
      first_name: profile?.first_name || '', last_name: profile?.last_name || '', phone: profile?.phone || '',
      country: profile?.country || '', city: profile?.city || '', nationality: profile?.nationality || '',
      birth_date: profile?.birth_date?.split('T')[0] || '', gender: profile?.gender || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => userAPI.updateProfile(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile', userId] }); setIsEditing(false); toast.success('Profil mis à jour'); },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => userAPI.uploadAvatar(file),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile', userId] }); toast.success('Photo de profil mise à jour'); },
  });

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) uploadAvatarMutation.mutate(file); };
  const onSubmit = (data: ProfileFormData) => updateProfileMutation.mutate(data);
  const handleCancel = () => { reset(); setIsEditing(false); };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;
  if (!profile) return <div className="text-center py-12"><p className="text-gray-500">Utilisateur non trouvé</p></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="h-32 bg-gradient-to-r from-red-500 to-red-600 rounded-t-lg"></div>
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end -mt-12 mb-4">
            <div className="relative">
              <img src={profile.avatar || `https://ui-avatars.com/api/?name=${profile.username}&size=128`} alt={profile.username} className="w-24 h-24 rounded-full border-4 border-white object-cover" />
              {isOwnProfile && <label className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow cursor-pointer"><Camera className="w-4 h-4 text-gray-600" /><input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} /></label>}
            </div>
            <div className="mt-4 md:mt-0 md:ml-6 flex-1">
              <div className="flex items-center"><h1 className="text-2xl font-bold">{profile.first_name} {profile.last_name}</h1>{isOwnProfile && !isEditing && <button onClick={() => setIsEditing(true)} className="ml-4 text-gray-500 hover:text-red-600"><Edit2 className="w-4 h-4" /></button>}</div>
              <p className="text-gray-600">@{profile.username}</p>
            </div>
          </div>
          <div className="flex space-x-6 border-t pt-4">
            <div className="text-center"><p className="text-2xl font-bold">{profile.reports_count || 0}</p><p className="text-gray-600 text-sm">Signalements</p></div>
            <div className="text-center"><p className="text-2xl font-bold">{profile.stats?.comments_count || 0}</p><p className="text-gray-600 text-sm">Commentaires</p></div>
            <div className="text-center"><p className="text-2xl font-bold">{profile.stats?.likes_count || 0}</p><p className="text-gray-600 text-sm">Likes reçus</p></div>
            <div className="text-center"><p className="text-2xl font-bold">{profile.stats?.streams_count || 0}</p><p className="text-gray-600 text-sm">Streams</p></div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Modifier le profil</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Prénom</label><input type="text" {...register('first_name')} className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Nom</label><input type="text" {...register('last_name')} className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Téléphone</label><input type="tel" {...register('phone')} className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Date de naissance</label><input type="date" {...register('birth_date')} className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Genre</label><select {...register('gender')} className="input-field"><option value="">Non spécifié</option><option value="Homme">Homme</option><option value="Femme">Femme</option><option value="Autre">Autre</option></select></div>
              <div><label className="block text-sm font-medium mb-1">Pays</label><input type="text" {...register('country')} className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Ville</label><input type="text" {...register('city')} className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Nationalité</label><input type="text" {...register('nationality')} className="input-field" /></div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={handleCancel} className="btn-secondary flex items-center"><X className="w-4 h-4 mr-1" />Annuler</button>
              <button type="submit" disabled={!isDirty} className="btn-primary flex items-center disabled:opacity-50"><Save className="w-4 h-4 mr-1" />Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Informations</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center text-gray-600"><Mail className="w-5 h-5 mr-3 text-gray-400" /><span>{profile.email}</span></div>
          {profile.phone && <div className="flex items-center text-gray-600"><Phone className="w-5 h-5 mr-3 text-gray-400" /><span>{profile.phone}</span></div>}
          {(profile.city || profile.country) && <div className="flex items-center text-gray-600"><MapPin className="w-5 h-5 mr-3 text-gray-400" /><span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span></div>}
          <div className="flex items-center text-gray-600"><Calendar className="w-5 h-5 mr-3 text-gray-400" /><span>Membre depuis {format(new Date(profile.created_at), 'dd MMMM yyyy', { locale: fr })}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b"><div className="flex"><button onClick={() => setActiveTab('reports')} className={`px-6 py-3 font-medium ${activeTab === 'reports' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}><Flag className="w-4 h-4 inline mr-2" />Signalements</button></div></div>
        <div className="p-6">
          {activeTab === 'reports' && (
            reports?.reports?.length > 0 ? <div className="space-y-4">{reports.reports.map((report: any) => <ReportCard key={report.id} report={report} />)}</div> : <p className="text-gray-500 text-center py-8">Aucun signalement pour le moment</p>
          )}
        </div>
      </div>
    </div>
  );
}