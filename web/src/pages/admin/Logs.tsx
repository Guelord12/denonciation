import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Search,
  Filter,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Video,
  Flag,
  MessageCircle,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Eye,
  Shield,
  Ban,
  CheckCircle,
  MapPin,
} from 'lucide-react';

const ACTION_ICONS: Record<string, any> = {
  CREATE_STREAM: Video,
  END_STREAM: Video,
  UPDATE_STREAM: Edit,
  CREATE_REPORT: Flag,
  UPDATE_REPORT: Edit,
  DELETE_REPORT: Trash2,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  REGISTER: User,
  SUBSCRIBE_STREAM: Video,
  SUBSCRIBE_CHANNEL: Video,
  CREATE_COMMENT: MessageCircle,
  UPDATE_COMMENT: Edit,
  DELETE_COMMENT: Trash2,
  BAN_USER: Ban,
  UNBAN_USER: CheckCircle,
  VIEW_STREAM: Eye,
  VIEW_REPORT: Eye,
  ADMIN_ACTION: Shield,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE_STREAM: 'bg-green-100 text-green-700',
  END_STREAM: 'bg-red-100 text-red-700',
  UPDATE_STREAM: 'bg-blue-100 text-blue-700',
  CREATE_REPORT: 'bg-orange-100 text-orange-700',
  UPDATE_REPORT: 'bg-blue-100 text-blue-700',
  DELETE_REPORT: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
  REGISTER: 'bg-indigo-100 text-indigo-700',
  SUBSCRIBE_STREAM: 'bg-yellow-100 text-yellow-700',
  SUBSCRIBE_CHANNEL: 'bg-yellow-100 text-yellow-700',
  CREATE_COMMENT: 'bg-cyan-100 text-cyan-700',
  UPDATE_COMMENT: 'bg-blue-100 text-blue-700',
  DELETE_COMMENT: 'bg-red-100 text-red-700',
  BAN_USER: 'bg-red-100 text-red-700',
  UNBAN_USER: 'bg-green-100 text-green-700',
  VIEW_STREAM: 'bg-gray-100 text-gray-700',
  VIEW_REPORT: 'bg-gray-100 text-gray-700',
  ADMIN_ACTION: 'bg-purple-100 text-purple-700',
};

export default function AdminLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-logs', page, search, actionFilter],
    queryFn: () =>
      adminAPI.getActivityLogs({
        page,
        limit: 20,
        search: search || undefined,
        action: actionFilter || undefined,
      }).then((res) => res.data),
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE_STREAM: 'Création live',
      END_STREAM: 'Fin live',
      UPDATE_STREAM: 'Modification live',
      CREATE_REPORT: 'Nouveau signalement',
      UPDATE_REPORT: 'Modification signalement',
      DELETE_REPORT: 'Suppression signalement',
      LOGIN: 'Connexion',
      LOGOUT: 'Déconnexion',
      REGISTER: 'Inscription',
      SUBSCRIBE_STREAM: 'Abonnement live',
      SUBSCRIBE_CHANNEL: 'Abonnement chaîne',
      CREATE_COMMENT: 'Nouveau commentaire',
      UPDATE_COMMENT: 'Modification commentaire',
      DELETE_COMMENT: 'Suppression commentaire',
      BAN_USER: 'Bannissement',
      UNBAN_USER: 'Débannissement',
      VIEW_STREAM: 'Visionnage live',
      VIEW_REPORT: 'Consultation signalement',
      ADMIN_ACTION: 'Action admin',
    };
    return labels[action] || action;
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
        <button onClick={() => refetch()} className="flex items-center gap-2 text-red-600 hover:underline">
          <RefreshCw className="w-4 h-4" /> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logs d'activité</h1>
        <p className="text-gray-600 mt-1">Suivez toutes les actions effectuées sur la plateforme</p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par utilisateur, IP..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Toutes les actions</option>
            <option value="CREATE_STREAM">Création live</option>
            <option value="END_STREAM">Fin live</option>
            <option value="CREATE_REPORT">Signalement</option>
            <option value="LOGIN">Connexion</option>
            <option value="REGISTER">Inscription</option>
            <option value="BAN_USER">Bannissement</option>
          </select>
          {(search || actionFilter) && (
            <button
              onClick={() => { setSearch(''); setActionFilter(''); }}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun log trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localisation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log: any) => {
                  const ActionIcon = ACTION_ICONS[log.action] || Shield;
                  const colorClass = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700';

                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                          <ActionIcon className="w-3 h-3" />
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.username || `User #${log.user_id}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.entity_type && log.entity_id ? `${log.entity_type} #${log.entity_id}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                        {log.ip_address || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.latitude && log.longitude ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500" />
                            <a
                              href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-blue-600"
                              title={`${log.latitude}, ${log.longitude}`}
                            >
                              {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.created_at
                          ? formatDistance(new Date(log.created_at), new Date(), { addSuffix: true, locale: fr })
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t">
            <span className="text-sm text-gray-500">
              Page {pagination.page} sur {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}