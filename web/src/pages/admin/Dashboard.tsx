import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSocket } from '../../hooks/useSocket';
import { adminAPI } from '../../services/api';
import { Users, Flag, Video, AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface StatCardProps { title: string; value: number | string; icon: React.ElementType; color: string; trend?: 'up' | 'down'; trendValue?: string; }

function StatCard({ title, value, icon: Icon, color, trend, trendValue }: StatCardProps) {
  const colorClasses: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', red: 'bg-red-100 text-red-600', yellow: 'bg-yellow-100 text-yellow-600', green: 'bg-green-100 text-green-600', purple: 'bg-purple-100 text-purple-600' };
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div><p className="text-sm text-gray-600">{title}</p><p className="text-2xl font-bold mt-1">{value}</p>{trend && <div className="flex items-center mt-2">{trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-500 mr-1" /> : <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}<span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>{trendValue}</span></div>}</div>
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center`}><Icon className="w-6 h-6" /></div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const socket = useSocket();
  const [realtimeData, setRealtimeData] = useState({ activeUsers: 0, activeStreams: 0, totalViewers: 0, todayReports: 0, todayUsers: 0, pendingModeration: 0 });

  const { data: stats, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => adminAPI.getDashboardStats().then(res => res.data) });

  useEffect(() => {
    if (!socket) return;
    socket.on('stats_update', (data) => setRealtimeData((prev) => ({ ...prev, ...data })));
    socket.on('admin_notification', (data) => console.log('Admin notification:', data));
    socket.emit('get_realtime_stats');
    const interval = setInterval(() => socket.emit('get_realtime_stats'), 30000);
    return () => { socket.off('stats_update'); socket.off('admin_notification'); clearInterval(interval); };
  }, [socket]);

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;

  const userGrowthData = { labels: stats?.userGrowth?.map((d: any) => d.date).reverse() || [], datasets: [{ label: 'Nouveaux utilisateurs', data: stats?.userGrowth?.map((d: any) => d.count).reverse() || [], borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }] };
  const categoryData = { labels: stats?.reportsByCategory?.map((c: any) => c.name) || [], datasets: [{ data: stats?.reportsByCategory?.map((c: any) => c.count) || [], backgroundColor: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6B7280'], borderWidth: 0 }] };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord administrateur</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500"><Activity className="w-4 h-4 text-green-500 animate-pulse" /><span>Mise à jour en temps réel</span></div>
      </div>

      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Statistiques en temps réel</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center"><p className="text-2xl font-bold">{realtimeData.activeUsers}</p><p className="text-sm text-gray-400">Utilisateurs actifs</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{realtimeData.activeStreams}</p><p className="text-sm text-gray-400">Streams actifs</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{realtimeData.totalViewers}</p><p className="text-sm text-gray-400">Spectateurs</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{realtimeData.todayReports}</p><p className="text-sm text-gray-400">Signalements aujourd'hui</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{realtimeData.todayUsers}</p><p className="text-sm text-gray-400">Inscriptions aujourd'hui</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-yellow-400">{realtimeData.pendingModeration}</p><p className="text-sm text-gray-400">En attente de modération</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Utilisateurs totaux" value={stats?.totalUsers || 0} icon={Users} color="blue" trend="up" trendValue="+12%" />
        <StatCard title="Signalements totaux" value={stats?.totalReports || 0} icon={Flag} color="red" trend="up" trendValue="+8%" />
        <StatCard title="En attente" value={stats?.pendingReports || 0} icon={AlertTriangle} color="yellow" />
        <StatCard title="Lives actifs" value={stats?.activeStreams || 0} icon={Video} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-semibold mb-4">Croissance des utilisateurs (30 jours)</h3><Line data={userGrowthData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} /></div>
        <div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-semibold mb-4">Signalements par catégorie</h3><div className="h-64"><Doughnut data={categoryData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }} /></div></div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"><Users className="w-6 h-6 mx-auto mb-2" /><span className="text-sm font-medium">Gérer les utilisateurs</span></button>
          <button className="p-4 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"><Flag className="w-6 h-6 mx-auto mb-2" /><span className="text-sm font-medium">Modérer les signalements</span></button>
          <button className="p-4 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition"><AlertTriangle className="w-6 h-6 mx-auto mb-2" /><span className="text-sm font-medium">Voir les signalements</span></button>
          <button className="p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"><Activity className="w-6 h-6 mx-auto mb-2" /><span className="text-sm font-medium">Voir les logs</span></button>
        </div>
      </div>
    </div>
  );
}