import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationAPI } from '../../services/api';
import {
  Bell,
  User,
  LogOut,
  Settings,
  Shield,
  Video,
  Plus,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: unreadData } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: () => notificationAPI.getUnreadCount().then(res => res.data),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-red-600" />
            <span className="text-xl font-bold text-gray-900">Dénonciation</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-red-600 transition">
              Accueil
            </Link>
            <Link to="/reports" className="text-gray-700 hover:text-red-600 transition">
              Signalements
            </Link>
            <Link to="/live" className="text-gray-700 hover:text-red-600 transition">
              Live
            </Link>
            <Link to="/actualites" className="text-gray-700 hover:text-red-600 transition">
              Actualités
            </Link>
            <Link to="/information" className="text-gray-700 hover:text-red-600 transition">
              Informations
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/reports/create')}
                  className="hidden md:flex items-center space-x-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Signaler</span>
                </button>

                <button
                  onClick={() => navigate('/live/create')}
                  className="hidden md:flex items-center space-x-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                  <Video className="w-4 h-4" />
                  <span>Go Live</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-600 hover:text-red-600 transition"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadData?.unread_count > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadData.unread_count > 9 ? '9+' : unreadData.unread_count}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                        <NotificationPanel onClose={() => setShowNotifications(false)} />
                      </div>
                    </>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2"
                  >
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white">
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>

                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                        <Link to="/dashboard" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 transition" onClick={() => setShowUserMenu(false)}>
                          <User className="w-4 h-4 mr-2" /> Tableau de bord
                        </Link>
                        <Link to="/profile" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 transition" onClick={() => setShowUserMenu(false)}>
                          <User className="w-4 h-4 mr-2" /> Profil
                        </Link>
                        <Link to="/settings" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 transition" onClick={() => setShowUserMenu(false)}>
                          <Settings className="w-4 h-4 mr-2" /> Paramètres
                        </Link>
                        {user?.is_admin && (
                          <Link to="/admin" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 transition" onClick={() => setShowUserMenu(false)}>
                            <Shield className="w-4 h-4 mr-2" /> Administration
                          </Link>
                        )}
                        <hr className="my-1" />
                        <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-gray-100 transition">
                          <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-red-600 px-4 py-2 transition">Connexion</Link>
                <Link to="/register" className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">Inscription</Link>
              </>
            )}

            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="md:hidden p-2 text-gray-600">
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {showMobileMenu && (
        <div className="md:hidden bg-white border-t py-4">
          <div className="container-custom space-y-2">
            <Link to="/" className="block py-2 text-gray-700 hover:text-red-600" onClick={() => setShowMobileMenu(false)}>Accueil</Link>
            <Link to="/reports" className="block py-2 text-gray-700 hover:text-red-600" onClick={() => setShowMobileMenu(false)}>Signalements</Link>
            <Link to="/live" className="block py-2 text-gray-700 hover:text-red-600" onClick={() => setShowMobileMenu(false)}>Live</Link>
            <Link to="/actualites" className="block py-2 text-gray-700 hover:text-red-600" onClick={() => setShowMobileMenu(false)}>Actualités</Link>
            <Link to="/information" className="block py-2 text-gray-700 hover:text-red-600" onClick={() => setShowMobileMenu(false)}>Informations</Link>
            {isAuthenticated && (
              <>
                <hr className="my-2" />
                <Link to="/dashboard" className="block py-2 text-gray-700 hover:text-red-600" onClick={() => setShowMobileMenu(false)}>Tableau de bord</Link>
                <Link to="/profile" className="block py-2 text-gray-700 hover:text-red-600" onClick={() => setShowMobileMenu(false)}>Profil</Link>
                <Link to="/settings" className="block py-2 text-gray-700 hover:text-red-600" onClick={() => setShowMobileMenu(false)}>Paramètres</Link>
                <button onClick={() => { navigate('/reports/create'); setShowMobileMenu(false); }} className="block w-full text-left py-2 bg-red-600 text-white rounded-lg text-center">
                  Signaler un abus
                </button>
                <button onClick={handleLogout} className="block w-full text-left py-2 text-red-600">Déconnexion</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data } = useQuery({
    queryKey: ['notifications-panel'],
    queryFn: () => notificationAPI.getNotifications(1, true).then(res => res.data),
  });
  
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-panel'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const handleNotificationClick = (notification: any) => {
    markAsReadMutation.mutate(notification.id);
    onClose();

    if (notification.type === 'new_report' || notification.type === 'new_comment' || 
        notification.type === 'new_like' || notification.type === 'report_status') {
      if (notification.related_id) navigate(`/reports/${notification.related_id}`);
    } else if (notification.type === 'new_live') {
      if (notification.related_id) navigate(`/live/${notification.related_id}`);
    }
  };

  return (
    <div>
      <div className="p-4 border-b"><h3 className="font-semibold">Notifications</h3></div>
      <div className="max-h-96 overflow-y-auto">
        {data?.notifications?.length === 0 ? (
          <p className="p-4 text-gray-500 text-center">Aucune notification</p>
        ) : (
          data?.notifications?.map((notif: any) => (
            <div key={notif.id} className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${!notif.is_read ? 'bg-red-50' : ''}`} onClick={() => handleNotificationClick(notif)}>
              <p className="text-sm">{notif.content}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistance(new Date(notif.created_at), new Date(), { addSuffix: true, locale: fr })}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t">
        <button onClick={() => { navigate('/notifications'); onClose(); }} className="text-red-600 text-sm hover:underline">
          Voir toutes les notifications
        </button>
      </div>
    </div>
  );
}