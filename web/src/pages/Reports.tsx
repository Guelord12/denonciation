import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportAPI, categoryAPI } from '../services/api';
import ReportCard from '../components/reports/ReportCard';
import { Search, Filter, X } from 'lucide-react';

export default function Reports() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category_id: '', status: 'approved', city_id: '' });
  const [showFilters, setShowFilters] = useState(false);

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['reports', page, filters, search],
    queryFn: () => reportAPI.getReports({ ...filters, page, limit: 12, search }).then(res => res.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryAPI.getCategories().then(res => res.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Signalements</h1>
        <div className="flex items-center space-x-2">
          <form onSubmit={(e) => e.preventDefault()} className="flex-1 md:flex-initial">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Rechercher un signalement..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 pr-4 w-full md:w-80" />
            </div>
          </form>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center space-x-2"><Filter className="w-4 h-4" /><span>Filtres</span></button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Filtres</h3><button onClick={() => setShowFilters(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">Catégorie</label><select value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })} className="input-field"><option value="">Toutes les catégories</option>{categories?.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Statut</label><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="input-field"><option value="approved">Approuvés</option><option value="pending">En attente</option><option value="rejected">Rejetés</option><option value="">Tous</option></select></div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setFilters({ category_id: '', status: 'approved', city_id: '' })} className="btn-secondary mr-2">Réinitialiser</button>
            <button onClick={() => setPage(1)} className="btn-primary">Appliquer</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportsData?.reports?.map((report: any) => <ReportCard key={report.id} report={report} />)}
          </div>
          {reportsData?.pagination && reportsData.pagination.pages > 1 && (
            <div className="flex justify-center space-x-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded disabled:opacity-50">Précédent</button>
              <span className="px-4 py-2">Page {page} sur {reportsData.pagination.pages}</span>
              <button onClick={() => setPage(p => Math.min(reportsData.pagination.pages, p + 1))} disabled={page === reportsData.pagination.pages} className="px-4 py-2 border rounded disabled:opacity-50">Suivant</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}