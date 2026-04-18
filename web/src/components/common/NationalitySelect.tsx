import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X, User } from 'lucide-react';
import { api } from '../../services/api';

interface NationalitySelectProps {
  value: string;
  onChange: (nationality: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  preferredNationalities?: string[];
}

export default function NationalitySelect({
  value,
  onChange,
  error,
  placeholder = 'Sélectionner une nationalité',
  disabled = false,
  preferredNationalities = ['Congolais', 'Français', 'Belge', 'Suisse', 'Canadien'],
}: NationalitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [selectedNationality, setSelectedNationality] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNationalities();
  }, []);

  useEffect(() => {
    if (value) {
      setSelectedNationality(value);
    }
  }, [value]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNationalities = async () => {
    try {
      const response = await api.get('/countries/nationalities');
      setNationalities(response.data);
    } catch (error) {
      console.error('Failed to load nationalities:', error);
    }
  };

  const handleSelect = (nationality: string) => {
    setSelectedNationality(nationality);
    onChange(nationality);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    setSelectedNationality(null);
    onChange('');
    setSearch('');
  };

  const filteredNationalities = nationalities.filter(n => {
    if (!search) return true;
    return n.toLowerCase().includes(search.toLowerCase());
  });

  const preferredList = filteredNationalities.filter(n => 
    preferredNationalities.some(p => n.toLowerCase().includes(p.toLowerCase()))
  );
  const otherList = filteredNationalities.filter(n => 
    !preferredNationalities.some(p => n.toLowerCase().includes(p.toLowerCase()))
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-3 py-2 border rounded-lg cursor-pointer transition ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
        } ${error ? 'border-red-500' : 'border-gray-300'}`}
      >
        {selectedNationality ? (
          <span>{selectedNationality}</span>
        ) : (
          <span className="text-gray-500 flex items-center">
            <User className="w-4 h-4 mr-2" />
            {placeholder}
          </span>
        )}
        <div className="flex items-center space-x-1">
          {selectedNationality && !disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 hover:bg-gray-200 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border z-50 max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une nationalité..."
                className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-64">
            {preferredList.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Suggérées
                </div>
                {preferredList.map((nationality) => (
                  <button
                    key={nationality}
                    onClick={() => handleSelect(nationality)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition"
                  >
                    {nationality}
                  </button>
                ))}
              </>
            )}

            {otherList.length > 0 && (
              <>
                {preferredList.length > 0 && (
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                    Toutes les nationalités
                  </div>
                )}
                {otherList.map((nationality) => (
                  <button
                    key={nationality}
                    onClick={() => handleSelect(nationality)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition"
                  >
                    {nationality}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}