import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Calendar, Download, TrendingUp, Users, Flag, Video, Eye } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState('30');

  const { data: stats } = useQuery({ queryKey: ['analytics', dateRange], queryFn: () => adminAPI.getDashboardStats().then(res => res.data) });

  const handleExport = async () => {
    try {
      const response = await adminAPI.exportData('stats');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `analytics_${new Date().toISOString()}.csv`; a.click();
    } catch (error) { console.error('Export error:', error); }
  };

  const userGrowthData = { labels: stats?.userGrowth?.map((d: any) => d.date).reverse() || [], datasets: [{ label: 'Nouveaux utilisateurs', data: stats?.userGrowth?.map((d: any) => d.count).reverse() || [], borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }] };
  const reportGrowthData = { labels: stats?.reportGrowth?.map((d: any) => d.date).reverse() || [], datasets: [{ label: 'Signalements', data: stats?.reportGrowth?.map((d: any) => d.count).reverse() || [], backgroundColor: '#3B82F6' }] };
  const categoryData = { labels: stats?.reportsByCategory?.map((c: any) => c.name) || [], datasets: [{ data: stats?.reportsByCategory?.map((c: any) => c.count) || [], backgroundColor: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6B7280'] }] };

  const kpis = [
    { title: 'Utilisateurs totaux', value: stats?.totalUsers || 0, change: '+12%', icon: Users, color: 'blue' },
    { title: 'Signalements totaux', value: stats?.totalReports || 0, change: '+8%', icon: Flag, color: 'red' },
    { title: 'Taux d\'approbation', value: '78%', change: '+5%', icon: TrendingUp, color: 'green' },
    { title: 'Vues totales', value: '45.2k', change: '+15%', icon: Eye, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Analytique</h1>
        <div className="flex items-center space-x-3">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="input-field w-32"><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option><option value="365">1 an</option></select>
          <button onClick={handleExport} className="btn-secondary flex items-center space-x-2"><Download className="w-4 h-4" /><span>Exporter</span></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">{kpi.title}</p><p className="text-2xl font-bold mt-1">{kpi.value}</p><p className="text-sm text-green-600 mt-1">{kpi.change}</p></div>
              <div className={`w-12 h-12 bg-${kpi.color}-100 rounded-lg flex items-center justify-center`}><kpi.icon className={`w-6 h-6 text-${kpi.color}-600`} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-semibold mb-4">Croissance des utilisateurs</h3><Line data={userGrowthData} options={{ responsive: true, plugins: { legend: { display: false } } }} /></div>
        <div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-semibold mb-4">Signalements par jour</h3><Bar data={reportGrowthData} options={{ responsive: true, plugins: { legend: { display: false } } }} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-semibold mb-4">Répartition par catégorie</h3><div className="h-64"><Doughnut data={categoryData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }} /></div></div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top catégories</h3>
          <div className="space-y-3">
            {stats?.reportsByCategory?.slice(0, 5).map((cat: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2"><span>{cat.icon}</span><span className="text-sm">{cat.name}</span></div>
                <div className="flex items-center space-x-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${(cat.count / (stats?.totalReports || 1)) * 100}%`, backgroundColor: cat.color }} /></div>
                  <span className="text-sm font-medium w-12 text-right">{cat.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b"><h3 className="text-lg font-semibold">Résumé quotidien</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nouveaux utilisateurs</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signalements</th></tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats?.userGrowth?.slice(0, 10).map((day: any, index: number) => (
                <tr key={index}><td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(day.date).toLocaleDateString('fr-FR')}</td><td className="px-6 py-4 whitespace-nowrap text-sm">{day.count}</td><td className="px-6 py-4 whitespace-nowrap text-sm">{stats?.reportGrowth?.find((r: any) => r.date === day.date)?.count || 0}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}