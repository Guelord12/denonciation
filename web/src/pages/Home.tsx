import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reportAPI, liveAPI } from '../services/api';
import ReportCard from '../components/reports/ReportCard';
import StreamCard from '../components/live/StreamCard';
import { Flag, Video, Users, TrendingUp, ArrowRight } from 'lucide-react';

export default function Home() {
  const { data: reportsData } = useQuery({
    queryKey: ['home-reports'],
    queryFn: () => reportAPI.getReports({ page: 1, limit: 6, status: 'approved' }).then(res => res.data),
  });

  const { data: streamsData } = useQuery({
    queryKey: ['home-streams'],
    queryFn: () => liveAPI.getStreams({ page: 1, limit: 4 }).then(res => res.data),
  });

  const stats = [
    { icon: Flag, label: 'Signalements', value: '1,234', color: 'text-red-600' },
    { icon: Video, label: 'Lives actifs', value: '12', color: 'text-green-600' },
    { icon: Users, label: 'Utilisateurs', value: '5,678', color: 'text-blue-600' },
    { icon: TrendingUp, label: 'Actions', value: '89%', color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-12">
      <section className="text-center py-12 bg-gradient-to-r from-red-50 to-red-100 rounded-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Dénoncez les abus, <span className="text-red-600">protégez les victimes</span></h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">Une plateforme sécurisée pour signaler les injustices et les abus. Votre voix compte, faites-la entendre.</p>
        <div className="flex justify-center space-x-4">
          <Link to="/reports/create" className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-red-700">Signaler un abus</Link>
          <Link to="/reports" className="bg-white text-gray-700 px-6 py-3 rounded-lg text-lg font-medium border hover:bg-gray-50">Voir les signalements</Link>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow text-center">
              <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-2`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Signalements récents</h2>
          <Link to="/reports" className="text-red-600 hover:underline flex items-center">Voir tout <ArrowRight className="w-4 h-4 ml-1" /></Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportsData?.reports?.map((report: any) => <ReportCard key={report.id} report={report} />)}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">En direct</h2>
          <Link to="/live" className="text-red-600 hover:underline flex items-center">Voir tout <ArrowRight className="w-4 h-4 ml-1" /></Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {streamsData?.streams?.map((stream: any) => <StreamCard key={stream.id} stream={stream} />)}
        </div>
      </section>

      <section className="bg-gray-900 text-white rounded-3xl p-12 text-center">
        <h2 className="text-3xl font-bold mb-4">Vous avez été témoin d'un abus ?</h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">Ne restez pas silencieux. Signalez-le maintenant et aidez à faire justice.</p>
        <Link to="/reports/create" className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-red-700">Faire un signalement</Link>
      </section>
    </div>
  );
}