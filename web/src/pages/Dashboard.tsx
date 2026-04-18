import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userAPI, reportAPI } from '../services/api';
import { Flag, MessageCircle, Heart, Video, TrendingUp, Clock, Eye, User } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuthStore();

  const { data: userData } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: () => userAPI.getProfile(user?.id!).then(res => res.data),
    enabled: !!user?.id,
  });

  const { data: myReports } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => reportAPI.getReports({ user_id: user?.id, limit: 5 }).then(res => res.data),
    enabled: !!user?.id,
  });

  const statCards = [
    { label: 'Signalements', value: userData?.reports_count || 0, icon: Flag, color: 'bg-red-100 text-red-600' },
    { label: 'Commentaires', value: userData?.stats?.comments_count || 0, icon: MessageCircle, color: 'bg-blue-100 text-blue-600' },
    { label: 'Likes reçus', value: userData?.stats?.likes_count || 0, icon: Heart, color: 'bg-pink-100 text-pink-600' },
    { label: 'Streams', value: userData?.stats?.streams_count || 0, icon: Video, color: 'bg-green-100 text-green-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <Link to="/reports/create" className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">Nouveau signalement</Link>
      </div>

      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Bonjour, {user?.first_name || user?.username} !</h2>
        <p className="text-red-100">Bienvenue sur votre espace personnel. Gérez vos signalements et suivez leur évolution.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center mb-3`}><stat.icon className="w-6 h-6" /></div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Mes signalements récents</h3>
            <Link to="/my-reports" className="text-red-600 hover:underline">Voir tout</Link>
          </div>
        </div>
        <div className="divide-y">
          {myReports?.reports?.map((report: any) => (
            <div key={report.id} className="p-6 hover:bg-gray-50">
              <Link to={`/reports/${report.id}`} className="block">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 text-xs rounded-full" style={{ backgroundColor: report.category_color + '20', color: report.category_color }}>{report.category_icon} {report.category_name}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${report.status === 'approved' ? 'bg-green-100 text-green-800' : report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : report.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {report.status === 'approved' ? 'Approuvé' : report.status === 'pending' ? 'En attente' : report.status === 'rejected' ? 'Rejeté' : 'Archivé'}
                      </span>
                    </div>
                    <h4 className="font-semibold text-lg mb-1">{report.title}</h4>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-2">{report.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center"><Eye className="w-4 h-4 mr-1" />{report.views_count || 0} vues</span>
                      <span className="flex items-center"><Heart className="w-4 h-4 mr-1" />{report.likes_count || 0} likes</span>
                      <span className="flex items-center"><MessageCircle className="w-4 h-4 mr-1" />{report.comments_count || 0} commentaires</span>
                      <span className="flex items-center"><Clock className="w-4 h-4 mr-1" />{formatDistance(new Date(report.created_at), new Date(), { addSuffix: true, locale: fr })}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
          {myReports?.reports?.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Flag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Vous n'avez pas encore créé de signalement.</p>
              <Link to="/reports/create" className="text-red-600 hover:underline mt-2 inline-block">Créer mon premier signalement</Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/reports/create" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"><Flag className="w-8 h-8 text-red-600 mb-3" /><h4 className="font-semibold mb-1">Signaler un abus</h4><p className="text-sm text-gray-600">Dénoncez une injustice en quelques clics</p></Link>
        <Link to="/live/create" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"><Video className="w-8 h-8 text-green-600 mb-3" /><h4 className="font-semibold mb-1">Démarrer un live</h4><p className="text-sm text-gray-600">Diffusez en direct pour témoigner</p></Link>
        <Link to="/profile" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"><User className="w-8 h-8 text-blue-600 mb-3" /><h4 className="font-semibold mb-1">Mon profil</h4><p className="text-sm text-gray-600">Gérez mes informations</p></Link>
      </div>
    </div>
  );
}