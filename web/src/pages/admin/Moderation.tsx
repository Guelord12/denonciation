import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Flag, MessageCircle, User, Video, CheckCircle, XCircle, Eye, Filter, AlertTriangle } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminModeration() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [resolution, setResolution] = useState('');

  const queryClient = useQueryClient();

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['moderation-reports', page, statusFilter],
    queryFn: () => adminAPI.getModerationReports({ page, limit: 20, status: statusFilter }).then(res => res.data),
    placeholderData: (prev) => prev,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: number; resolution: string }) => adminAPI.resolveModerationReport(id, resolution),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['moderation-reports'] }); toast.success('Signalement de modération résolu'); setShowModal(false); setSelectedReport(null); setResolution(''); },
  });

  const getTargetIcon = (type: string) => {
    switch (type) { case 'report': return <Flag className="w-5 h-5" />; case 'comment': return <MessageCircle className="w-5 h-5" />; case 'user': return <User className="w-5 h-5" />; case 'live': return <Video className="w-5 h-5" />; default: return <AlertTriangle className="w-5 h-5" />; }
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = { pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' }, reviewed: { label: 'Examiné', color: 'bg-blue-100 text-blue-800' }, resolved: { label: 'Résolu', color: 'bg-green-100 text-green-800' }, dismissed: { label: 'Rejeté', color: 'bg-gray-100 text-gray-800' } };
    const s = statuses[status] || statuses.pending;
    return <span className={`px-2 py-1 text-xs rounded-full ${s.color}`}>{s.label}</span>;
  };

  const handleResolve = () => { if (selectedReport) resolveMutation.mutate({ id: selectedReport.id, resolution }); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Modération</h1>
        <div className="flex items-center space-x-3"><Filter className="w-5 h-5 text-gray-400" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-40"><option value="pending">En attente</option><option value="reviewed">Examinés</option><option value="resolved">Résolus</option><option value="">Tous</option></select></div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">En attente</p><p className="text-2xl font-bold text-yellow-600">{reportsData?.reports?.filter((r: any) => r.status === 'pending').length || 0}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">Examinés</p><p className="text-2xl font-bold text-blue-600">{reportsData?.reports?.filter((r: any) => r.status === 'reviewed').length || 0}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">Résolus</p><p className="text-2xl font-bold text-green-600">{reportsData?.reports?.filter((r: any) => r.status === 'resolved').length || 0}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">Total</p><p className="text-2xl font-bold">{reportsData?.pagination?.total || 0}</p></div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signalé par</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raison</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div></td></tr> :
                reportsData?.reports?.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Aucun signalement de modération</td></tr> :
                reportsData?.reports?.map((report: any) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><span className="mr-2">{getTargetIcon(report.target_type)}</span><span className="capitalize">{report.target_type}</span></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm">@{report.reporter_username}</span></td>
                    <td className="px-6 py-4"><p className="text-sm text-gray-900 max-w-xs truncate">{report.reason}</p></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDistance(new Date(report.created_at), new Date(), { addSuffix: true, locale: fr })}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(report.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => { setSelectedReport(report); setShowModal(true); }} className="text-blue-600 hover:text-blue-900" title="Examiner"><Eye className="w-5 h-5" /></button>
                        {report.status === 'pending' && (
                          <>
                            <button onClick={() => { setSelectedReport(report); setResolution('Contenu supprimé'); handleResolve(); }} className="text-green-600 hover:text-green-900" title="Approuver"><CheckCircle className="w-5 h-5" /></button>
                            <button onClick={() => { setSelectedReport(report); setResolution('Signalement rejeté'); handleResolve(); }} className="text-red-600 hover:text-red-900" title="Rejeter"><XCircle className="w-5 h-5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {reportsData?.pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">Affichage de {(page - 1) * 20 + 1} à {Math.min(page * 20, reportsData.pagination.total)} sur {reportsData.pagination.total} résultats</div>
          <div className="flex space-x-2"><button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Précédent</button><span className="px-3 py-1">Page {page} sur {reportsData.pagination.pages}</span><button onClick={() => setPage((p) => Math.min(reportsData.pagination.pages, p + 1))} disabled={page >= reportsData.pagination.pages} className="px-3 py-1 border rounded disabled:opacity-50">Suivant</button></div>
        </div>
      )}

      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Détails du signalement</h3>
            <div className="space-y-4">
              <div><p className="text-sm text-gray-500">Type</p><p className="font-medium capitalize">{selectedReport.target_type}</p></div>
              <div><p className="text-sm text-gray-500">Signalé par</p><p className="font-medium">@{selectedReport.reporter_username}</p></div>
              <div><p className="text-sm text-gray-500">Raison</p><p className="font-medium">{selectedReport.reason}</p></div>
              <div><p className="text-sm text-gray-500">Contenu signalé</p><div className="bg-gray-50 rounded-lg p-3 mt-1"><p className="text-sm">{selectedReport.target_preview || 'Non disponible'}</p></div></div>
              <div><p className="text-sm text-gray-500">Date</p><p className="font-medium">{new Date(selectedReport.created_at).toLocaleString('fr-FR')}</p></div>
              {selectedReport.status === 'pending' && <div><label className="block text-sm font-medium mb-2">Résolution</label><textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Décrivez la résolution..." className="input-field w-full" rows={3} /></div>}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowModal(false); setSelectedReport(null); setResolution(''); }} className="btn-secondary">Fermer</button>
              {selectedReport.status === 'pending' && (
                <>
                  <button onClick={() => resolveMutation.mutate({ id: selectedReport.id, resolution: resolution || 'Contenu supprimé' })} className="btn-primary bg-green-600 hover:bg-green-700">Approuver et résoudre</button>
                  <button onClick={() => resolveMutation.mutate({ id: selectedReport.id, resolution: resolution || 'Signalement rejeté' })} className="btn-primary bg-red-600 hover:bg-red-700">Rejeter</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}