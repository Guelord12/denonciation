import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';
import { Flag, MessageCircle, User, Video, CheckCircle, XCircle, Eye, Filter, AlertTriangle } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ModerationReport {
  id: number;
  title: string;
  description: string;
  status: string;
  reporter_id: number;
  reporter_username: string;
  reporter_avatar: string | null;
  moderation_score: number;
  moderation_flags: string | null;
  auto_moderated: boolean;
  requires_manual_review: boolean;
  created_at: string;
  target_type: string;
  target_preview: string;
  reason: string;
  category_name: string;
  category_color: string;
  resolver_username: string | null;
  resolution_note: string | null;
}

export default function AdminModeration() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [resolution, setResolution] = useState('');

  const queryClient = useQueryClient();
  
  // ✅ Récupérer le socket de manière sécurisée
  const socketData = useSocket();
  const socket = socketData?.socket || null;

  // ✅ Écouter les mises à jour en temps réel
  useEffect(() => {
    if (!socket) return;
    
    const handleStatsUpdate = () => {
      console.log('📡 Stats update received, refreshing moderation reports...');
      queryClient.invalidateQueries({ queryKey: ['moderation-reports'] });
    };
    
    const handleAdminNotification = (data: any) => {
      console.log('📡 Admin notification received:', data);
      if (data?.type === 'new_report' || data?.type === 'moderation_resolved') {
        queryClient.invalidateQueries({ queryKey: ['moderation-reports'] });
        toast.success(data?.type === 'new_report' ? 'Nouveau signalement à modérer' : 'Signalement résolu');
      }
    };
    
    socket.on('stats_update', handleStatsUpdate);
    socket.on('admin_notification', handleAdminNotification);
    
    return () => {
      socket.off('stats_update', handleStatsUpdate);
      socket.off('admin_notification', handleAdminNotification);
    };
  }, [socket, queryClient]);

  // ✅ Requête pour récupérer les signalements
  const { data: reportsData, isLoading, refetch } = useQuery({
    queryKey: ['moderation-reports', page, statusFilter],
    queryFn: async () => {
      console.log(`📊 Fetching moderation reports - page: ${page}, status: ${statusFilter}`);
      const response = await adminAPI.getModerationReports({ page, limit: 20, status: statusFilter });
      console.log('📊 Moderation reports response:', response.data);
      return response.data;
    },
    placeholderData: (prev) => prev,
  });

  // ✅ Mutation pour résoudre un signalement
  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution: res, action }: { id: number; resolution: string; action: string }) => 
      adminAPI.resolveModerationReport(id, res, action),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['moderation-reports'] }); 
      toast.success('Signalement de modération résolu'); 
      setShowModal(false); 
      setSelectedReport(null); 
      setResolution(''); 
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la résolution');
    }
  });

  const getTargetIcon = (type: string) => {
    switch (type) { 
      case 'report': return <Flag className="w-5 h-5" />; 
      case 'comment': return <MessageCircle className="w-5 h-5" />; 
      case 'user': return <User className="w-5 h-5" />; 
      case 'live': return <Video className="w-5 h-5" />; 
      default: return <AlertTriangle className="w-5 h-5" />; 
    }
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = { 
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' }, 
      approved: { label: 'Approuvé', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800' },
      reviewed: { label: 'Examiné', color: 'bg-blue-100 text-blue-800' }, 
      resolved: { label: 'Résolu', color: 'bg-green-100 text-green-800' }, 
      dismissed: { label: 'Rejeté', color: 'bg-gray-100 text-gray-800' } 
    };
    const s = statuses[status] || statuses.pending;
    return <span className={`px-2 py-1 text-xs rounded-full ${s.color}`}>{s.label}</span>;
  };

  const handleResolve = (action: string) => { 
    if (selectedReport) {
      resolveMutation.mutate({ 
        id: selectedReport.id, 
        resolution: resolution || (action === 'approved' ? 'Contenu approuvé' : 'Contenu rejeté'),
        action 
      }); 
    }
  };

  // ✅ Utiliser les statistiques fournies par l'API
  const stats = reportsData?.stats || { pending: 0, reviewed: 0, resolved: 0, total: 0 };
  const reports = reportsData?.reports || [];
  const pagination = reportsData?.pagination || { page: 1, limit: 20, total: 0, pages: 0 };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Modération</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="text-sm text-gray-600 hover:text-gray-900"
            title="Actualiser"
          >
            Actualiser
          </button>
          <Filter className="w-5 h-5 text-gray-400" />
          <select 
            value={statusFilter} 
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1); // Réinitialiser à la première page
            }} 
            className="input-field w-40"
          >
            <option value="pending">En attente</option>
            <option value="reviewed">Examinés</option>
            <option value="resolved">Résolus</option>
            <option value="">Tous</option>
          </select>
        </div>
      </div>

      {/* ✅ Statistiques depuis l'API */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">En attente</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Examinés</p>
          <p className="text-2xl font-bold text-blue-600">{stats.reviewed}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Résolus</p>
          <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signalé par</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raison</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    </div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-600">Aucun signalement de modération</p>
                    <p className="text-sm text-gray-400 mt-1">Les signalements nécessitant une revue apparaîtront ici</p>
                  </td>
                </tr>
              ) : (
                reports.map((report: ModerationReport) => (
                  <tr key={report.id} className={report.status === 'pending' ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-2">{getTargetIcon(report.target_type)}</span>
                        <span className="capitalize text-sm">{report.target_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {report.reporter_avatar ? (
                          <img src={report.reporter_avatar} alt="" className="w-6 h-6 rounded-full mr-2" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs mr-2">
                            {report.reporter_username?.charAt(0).toUpperCase() || 'A'}
                          </div>
                        )}
                        <span className="text-sm">@{report.reporter_username || 'anonyme'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 max-w-xs truncate">{report.reason}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistance(new Date(report.created_at), new Date(), { addSuffix: true, locale: fr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => { setSelectedReport(report); setShowModal(true); }} 
                          className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                          title="Examiner"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {report.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => { 
                                setSelectedReport(report); 
                                setResolution('Contenu approuvé après revue');
                                handleResolve('approved');
                              }} 
                              className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded"
                              title="Approuver"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => { 
                                setSelectedReport(report); 
                                setResolution('Contenu rejeté après revue');
                                handleResolve('rejected');
                              }} 
                              className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                              title="Rejeter"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ Pagination */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Affichage de {(page - 1) * 20 + 1} à {Math.min(page * 20, pagination.total)} sur {pagination.total} résultats
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setPage((p) => Math.max(1, p - 1))} 
              disabled={page === 1} 
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              Précédent
            </button>
            <span className="px-3 py-1">Page {page} sur {pagination.pages}</span>
            <button 
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} 
              disabled={page >= pagination.pages} 
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Détails du signalement</h3>
              <button 
                onClick={() => { setShowModal(false); setSelectedReport(null); setResolution(''); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium capitalize">{selectedReport.target_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut</p>
                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Signalé par</p>
                <div className="flex items-center mt-1">
                  {selectedReport.reporter_avatar ? (
                    <img src={selectedReport.reporter_avatar} alt="" className="w-6 h-6 rounded-full mr-2" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs mr-2">
                      {selectedReport.reporter_username?.charAt(0).toUpperCase() || 'A'}
                    </div>
                  )}
                  <p className="font-medium">@{selectedReport.reporter_username || 'anonyme'}</p>
                </div>
              </div>
              
              {selectedReport.category_name && (
                <div>
                  <p className="text-sm text-gray-500">Catégorie</p>
                  <p className="font-medium">{selectedReport.category_name}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500">Titre</p>
                <p className="font-medium">{selectedReport.title}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Description / Raison</p>
                <div className="bg-gray-50 rounded-lg p-3 mt-1">
                  <p className="text-sm whitespace-pre-wrap">{selectedReport.description || selectedReport.reason}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Date de signalement</p>
                <p className="font-medium">{new Date(selectedReport.created_at).toLocaleString('fr-FR')}</p>
              </div>
              
              {selectedReport.resolver_username && (
                <div>
                  <p className="text-sm text-gray-500">Résolu par</p>
                  <p className="font-medium">@{selectedReport.resolver_username}</p>
                </div>
              )}
              
              {selectedReport.resolution_note && (
                <div>
                  <p className="text-sm text-gray-500">Note de résolution</p>
                  <p className="font-medium">{selectedReport.resolution_note}</p>
                </div>
              )}
              
              {selectedReport.status === 'pending' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Résolution</label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Décrivez la résolution..."
                    className="input-field w-full"
                    rows={3}
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button 
                onClick={() => { setShowModal(false); setSelectedReport(null); setResolution(''); }} 
                className="btn-secondary"
              >
                Fermer
              </button>
              {selectedReport.status === 'pending' && (
                <>
                  <button 
                    onClick={() => handleResolve('approved')} 
                    disabled={resolveMutation.isPending}
                    className="btn-primary bg-green-600 hover:bg-green-700 flex items-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{resolveMutation.isPending ? 'Traitement...' : 'Approuver'}</span>
                  </button>
                  <button 
                    onClick={() => handleResolve('rejected')} 
                    disabled={resolveMutation.isPending}
                    className="btn-primary bg-red-600 hover:bg-red-700 flex items-center space-x-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{resolveMutation.isPending ? 'Traitement...' : 'Rejeter'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}