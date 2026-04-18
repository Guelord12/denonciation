import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, categoryAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Search, Filter, Eye, CheckCircle, XCircle, Archive, Download, MapPin, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminReports() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedReport, setExpandedReport] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'archive' | null>(null);
  const [actionReason, setActionReason] = useState('');

  const queryClient = useQueryClient();

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['admin-reports', page, search, statusFilter, categoryFilter],
    queryFn: () => adminAPI.getReports({ page, limit: 20, search, status: statusFilter || undefined, category: categoryFilter || undefined }).then(res => res.data),
    placeholderData: (prev) => prev,
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoryAPI.getCategories().then(res => res.data) });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: string; reason?: string }) => adminAPI.updateReportStatus(id, status, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-reports'] }); toast.success('Statut mis à jour avec succès'); setShowModal(false); setSelectedReport(null); setActionType(null); setActionReason(''); },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour'),
  });

  const handleAction = () => {
    if (selectedReport && actionType) {
      const statusMap = { approve: 'approved', reject: 'rejected', archive: 'archived' };
      updateStatusMutation.mutate({ id: selectedReport.id, status: statusMap[actionType], reason: actionReason });
    }
  };

  const handleExport = async () => {
    try {
      const response = await adminAPI.exportData('reports');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `reports_export_${new Date().toISOString()}.csv`; a.click();
      toast.success('Export réussi');
    } catch { toast.error('Erreur lors de l\'export'); }
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = { pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' }, approved: { label: 'Approuvé', color: 'bg-green-100 text-green-800' }, rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800' }, archived: { label: 'Archivé', color: 'bg-gray-100 text-gray-800' } };
    const s = statuses[status] || statuses.pending;
    return <span className={`px-2 py-1 text-xs rounded-full ${s.color}`}>{s.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des signalements</h1>
        <div className="flex items-center space-x-3"><button onClick={handleExport} className="btn-secondary flex items-center space-x-2"><Download className="w-4 h-4" /><span>Exporter</span></button></div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Rechercher un signalement..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" /></div>
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-36"><option value="">Tous les statuts</option><option value="pending">En attente</option><option value="approved">Approuvés</option><option value="rejected">Rejetés</option><option value="archived">Archivés</option></select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input-field w-48"><option value="">Toutes les catégories</option>{categories?.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}</select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div> :
          reportsData?.reports?.length === 0 ? <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">Aucun signalement trouvé</div> :
          reportsData?.reports?.map((report: any) => (
            <div key={report.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2 py-1 text-xs rounded-full" style={{ backgroundColor: report.category_color + '20', color: report.category_color }}>{report.category_icon} {report.category_name}</span>
                      {getStatusBadge(report.status)}
                    </div>
                    <Link to={`/reports/${report.id}`} className="text-lg font-semibold hover:text-red-600">{report.title}</Link>
                    <p className="text-gray-600 mt-2 line-clamp-2">{report.description}</p>
                    <div className="flex items-center space-x-6 mt-3 text-sm text-gray-500">
                      <div className="flex items-center"><User className="w-4 h-4 mr-1" />@{report.username}</div>
                      {report.city_name && <div className="flex items-center"><MapPin className="w-4 h-4 mr-1" />{report.city_name}</div>}
                      <div className="flex items-center"><Calendar className="w-4 h-4 mr-1" />{formatDistance(new Date(report.created_at), new Date(), { addSuffix: true, locale: fr })}</div>
                      <div className="flex items-center"><Eye className="w-4 h-4 mr-1" />{report.views_count} vues</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)} className="p-2 text-gray-400 hover:text-gray-600">{expandedReport === report.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</button>
                  </div>
                </div>
                {expandedReport === report.id && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-3">Actions de modération</h4>
                    <div className="flex items-center space-x-3">
                      {report.status === 'pending' && (
                        <>
                          <button onClick={() => { setSelectedReport(report); setActionType('approve'); setShowModal(true); }} className="btn-primary bg-green-600 hover:bg-green-700 flex items-center space-x-2"><CheckCircle className="w-4 h-4" /><span>Approuver</span></button>
                          <button onClick={() => { setSelectedReport(report); setActionType('reject'); setShowModal(true); }} className="btn-secondary bg-red-100 text-red-700 hover:bg-red-200 flex items-center space-x-2"><XCircle className="w-4 h-4" /><span>Rejeter</span></button>
                        </>
                      )}
                      {report.status === 'approved' && <button onClick={() => { setSelectedReport(report); setActionType('archive'); setShowModal(true); }} className="btn-secondary flex items-center space-x-2"><Archive className="w-4 h-4" /><span>Archiver</span></button>}
                      <Link to={`/reports/${report.id}`} className="btn-secondary flex items-center space-x-2"><Eye className="w-4 h-4" /><span>Voir le signalement</span></Link>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm"><div><p className="text-gray-500">Likes</p><p className="font-medium">{report.likes_count || 0}</p></div><div><p className="text-gray-500">Commentaires</p><p className="font-medium">{report.comments_count || 0}</p></div><div><p className="text-gray-500">Témoignages</p><p className="font-medium">{report.witnesses_count || 0}</p></div></div>
                  </div>
                )}
              </div>
            </div>
          ))
        }
      </div>

      {reportsData?.pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">Affichage de {(page - 1) * 20 + 1} à {Math.min(page * 20, reportsData.pagination.total)} sur {reportsData.pagination.total} résultats</div>
          <div className="flex space-x-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Précédent</button>
            <span className="px-3 py-1">Page {page} sur {reportsData.pagination.pages}</span>
            <button onClick={() => setPage((p) => Math.min(reportsData.pagination.pages, p + 1))} disabled={page >= reportsData.pagination.pages} className="px-3 py-1 border rounded disabled:opacity-50">Suivant</button>
          </div>
        </div>
      )}

      {showModal && selectedReport && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{actionType === 'approve' && 'Approuver le signalement'}{actionType === 'reject' && 'Rejeter le signalement'}{actionType === 'archive' && 'Archiver le signalement'}</h3>
            <p className="text-sm text-gray-600 mb-4">{actionType === 'approve' && 'Le signalement sera visible publiquement et son auteur sera notifié.'}{actionType === 'reject' && 'Le signalement sera rejeté et ne sera plus visible publiquement.'}{actionType === 'archive' && 'Le signalement sera archivé et ne sera plus mis en avant.'}</p>
            <div className="mb-4"><label className="block text-sm font-medium mb-1">Commentaire (optionnel)</label><textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder={actionType === 'approve' ? 'Raison de l\'approbation...' : 'Raison du rejet...'} className="input-field w-full" rows={3} /></div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => { setShowModal(false); setSelectedReport(null); setActionType(null); setActionReason(''); }} className="btn-secondary">Annuler</button>
              <button onClick={handleAction} disabled={updateStatusMutation.isPending} className={`btn-primary ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'}`}>{updateStatusMutation.isPending ? 'Traitement...' : 'Confirmer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}