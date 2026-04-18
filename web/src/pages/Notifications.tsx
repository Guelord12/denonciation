import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationAPI } from '../services/api';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Bell, Flag, MessageCircle, Heart, Video, CheckCircle, Trash2, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotificationIcon = ({ type }: { type: string }) => {
  const icons: Record<string, any> = { welcome: Bell, new_report: Flag, new_comment: MessageCircle, new_like: Heart, new_witness: Flag, new_live: Video, report_status: CheckCircle, system: Bell };
  const colors: Record<string, string> = { welcome: 'bg-green-100 text-green-600', new_report: 'bg-red-100 text-red-600', new_comment: 'bg-blue-100 text-blue-600', new_like: 'bg-pink-100 text-pink-600', new_witness: 'bg-yellow-100 text-yellow-600', new_live: 'bg-purple-100 text-purple-600', report_status: 'bg-indigo-100 text-indigo-600', system: 'bg-gray-100 text-gray-600' };
  const IconComponent = icons[type] || Bell;
  const colorClass = colors[type] || 'bg-gray-100 text-gray-600';
  return <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}><IconComponent className="w-5 h-5" /></div>;
};

export default function Notifications() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationAPI.getNotifications(1, filter === 'unread').then(res => res.data),
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id?: number) => notificationAPI.markAsRead(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['unread-notifications'] }); },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationAPI.markAllAsRead(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['unread-notifications'] }); toast.success('Toutes les notifications ont été marquées comme lues'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationAPI.deleteNotification(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Notification supprimée'); },
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) markAsReadMutation.mutate(notification.id);
    if (notification.type === 'new_report' || notification.type === 'new_comment' || notification.type === 'new_like' || notification.type === 'report_status') { if (notification.related_id) window.location.href = `/reports/${notification.related_id}`; }
    else if (notification.type === 'new_live') { if (notification.related_id) window.location.href = `/live/${notification.related_id}`; }
  };

  const notifications = data?.notifications || [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${filter === 'all' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}>Toutes</button>
            <button onClick={() => setFilter('unread')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${filter === 'unread' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}>Non lues</button>
          </div>
          {notifications.some((n: any) => !n.is_read) && <button onClick={() => markAllAsReadMutation.mutate()} className="btn-secondary flex items-center space-x-2"><CheckCheck className="w-4 h-4" /><span>Tout marquer comme lu</span></button>}
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div> :
        notifications.length === 0 ? <div className="bg-white rounded-lg shadow p-12 text-center"><Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-700 mb-2">Aucune notification</h3><p className="text-gray-500">{filter === 'all' ? 'Vous n\'avez pas encore reçu de notifications' : 'Vous n\'avez pas de notifications non lues'}</p></div> :
        <div className="bg-white rounded-lg shadow divide-y">
          {notifications.map((notification: any) => (
            <div key={notification.id} className={`p-4 hover:bg-gray-50 cursor-pointer transition ${!notification.is_read ? 'bg-red-50' : ''}`} onClick={() => handleNotificationClick(notification)}>
              <div className="flex items-start space-x-3">
                <NotificationIcon type={notification.type} />
                <div className="flex-1">
                  <p className={!notification.is_read ? 'font-medium' : ''}>{notification.content}</p>
                  <p className="text-sm text-gray-500 mt-1">{formatDistance(new Date(notification.created_at), new Date(), { addSuffix: true, locale: fr })}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {!notification.is_read && <span className="w-2 h-2 bg-red-600 rounded-full"></span>}
                  <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notification.id); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}