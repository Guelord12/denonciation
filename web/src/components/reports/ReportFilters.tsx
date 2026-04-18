import { useState } from 'react';
import { Filter, X, Search } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

interface ReportFiltersProps {
  categories: Array<{ id: number; name: string; icon: string }>;
  cities: Array<{ id: number; name: string }>;
  onFilterChange: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
}

export interface FilterValues {
  search: string;
  category_id: string;
  city_id: string;
  status: string;
  sort: string;
  order: 'ASC' | 'DESC';
}

export default function ReportFilters({ 
  categories, 
  cities, 
  onFilterChange, 
  initialFilters 
}: ReportFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(initialFilters || {
    search: '',
    category_id: '',
    city_id: '',
    status: 'approved',
    sort: 'created_at',
    order: 'DESC',
  });

  const handleChange = (key: keyof FilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    onFilterChange(filters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = {
      search: '',
      category_id: '',
      city_id: '',
      status: 'approved',
      sort: 'created_at',
      order: 'DESC' as const,
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const categoryOptions = [
    { value: '', label: 'Toutes les catégories' },
    ...categories.map((cat) => ({
      value: cat.id.toString(),
      label: `${cat.icon} ${cat.name}`,
    })),
  ];

  const cityOptions = [
    { value: '', label: 'Toutes les villes' },
    ...cities.map((city) => ({
      value: city.id.toString(),
      label: city.name,
    })),
  ];

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'approved', label: 'Approuvés' },
    { value: 'pending', label: 'En attente' },
    { value: 'rejected', label: 'Rejetés' },
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Date' },
    { value: 'views_count', label: 'Vues' },
    { value: 'likes_count', label: 'Likes' },
  ];

  const orderOptions = [
    { value: 'DESC', label: 'Décroissant' },
    { value: 'ASC', label: 'Croissant' },
  ];

  const activeFiltersCount = Object.values(filters).filter((v) => v && v !== 'approved' && v !== 'created_at' && v !== 'DESC').length;

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un signalement..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="input-field pl-10"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => setIsOpen(!isOpen)}
          icon={<Filter className="w-4 h-4" />}
        >
          Filtres
          {activeFiltersCount > 0 && (
            <span className="ml-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Filtres</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Select
                label="Catégorie"
                options={categoryOptions}
                value={filters.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
              />

              <Select
                label="Ville"
                options={cityOptions}
                value={filters.city_id}
                onChange={(e) => handleChange('city_id', e.target.value)}
              />

              <Select
                label="Statut"
                options={statusOptions}
                value={filters.status}
                onChange={(e) => handleChange('status', e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Trier par"
                  options={sortOptions}
                  value={filters.sort}
                  onChange={(e) => handleChange('sort', e.target.value)}
                />
                <Select
                  label="Ordre"
                  options={orderOptions}
                  value={filters.order}
                  onChange={(e) => handleChange('order', e.target.value as 'ASC' | 'DESC')}
                />
              </div>
            </div>

            <div className="flex justify-between mt-6 pt-4 border-t">
              <Button variant="ghost" onClick={handleReset}>
                Réinitialiser
              </Button>
              <Button onClick={handleSubmit}>
                Appliquer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}