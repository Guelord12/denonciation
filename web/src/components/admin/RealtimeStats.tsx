import { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { Users, Video, Eye, Activity } from 'lucide-react';

interface RealtimeStatsProps {
  data: {
    activeUsers: number;
    activeStreams: number;
    totalViewers: number;
    todayReports: number;
    todayUsers: number;
  };
}

export default function RealtimeStats({ data }: RealtimeStatsProps) {
  const socket = useSocket();
  const [stats, setStats] = useState(data);

  useEffect(() => {
    setStats(data);
  }, [data]);

  useEffect(() => {
    if (!socket) return;

    socket.on('stats_update', (newStats) => {
      setStats((prev) => ({ ...prev, ...newStats }));
    });

    return () => {
      socket.off('stats_update');
    };
  }, [socket]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Utilisateurs actifs</p>
            <p className="text-2xl font-bold">{stats.activeUsers}</p>
          </div>
          <Users className="w-8 h-8 text-blue-200" />
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">Streams actifs</p>
            <p className="text-2xl font-bold">{stats.activeStreams}</p>
          </div>
          <Video className="w-8 h-8 text-green-200" />
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm">Spectateurs</p>
            <p className="text-2xl font-bold">{stats.totalViewers}</p>
          </div>
          <Eye className="w-8 h-8 text-purple-200" />
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">Signalements aujourd'hui</p>
            <p className="text-2xl font-bold">{stats.todayReports}</p>
          </div>
          <Activity className="w-8 h-8 text-orange-200" />
        </div>
      </div>

      <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-pink-100 text-sm">Inscriptions aujourd'hui</p>
            <p className="text-2xl font-bold">{stats.todayUsers}</p>
          </div>
          <Users className="w-8 h-8 text-pink-200" />
        </div>
      </div>
    </div>
  );
}