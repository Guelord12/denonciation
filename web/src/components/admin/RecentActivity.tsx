import { useQuery } from 'react-query';
import { adminAPI } from '../../services/api';
import { Flag, Users, Video, Activity, LogIn, LogOut, Ban } from 'lucide-react';

export default function RecentActivity() {
  const { data: logs, isLoading } = useQuery('recent-logs', () =>
    adminAPI.getActivityLogs({ limit: 10 }).then((res) => res.data)
  );

  const getActionIcon = (action: string) => {
    if (action.includes('REPORT')) return <Flag className="w-4 h-4" />;
    if (action.includes('USER') || action.includes('REGISTER')) return <Users className="w-4 h-4" />;
    if (action.includes('LOGIN')) return <LogIn className="w-4 h-4" />;
    if (action.includes('LOGOUT')) return <LogOut className="w-4 h-4" />;
    if (action.includes('BAN')) return <Ban className="w-4 h-4" />;
    if (action.includes('STREAM')) return <Video className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600 bg-green-100';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-100';
    if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-100';
    if (action.includes('BAN')) return 'text-red-600 bg-red-100';
    if (action.includes('LOGIN')) return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs?.logs?.map((log: any) => (
        <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${getActionColor(log.action)}`}>
              {getActionIcon(log.action)}
            </div>
            <div>
              <p className="text-sm font-medium">{formatAction(log.action)}</p>
              <p className="text-xs text-gray-500">
                {log.username || 'Système'} • {new Date(log.created_at).toLocaleTimeString('fr-FR')}
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-400">
            {new Date(log.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      ))}
      {logs?.logs?.length === 0 && (
        <p className="text-gray-500 text-center py-4">Aucune activité récente</p>
      )}
    </div>
  );
}