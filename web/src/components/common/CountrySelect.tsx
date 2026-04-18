import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X, MapPin } from 'lucide-react';
import { api } from '../../services/api';

interface Country {
  code: string;
  name: string;
  flag: string;
  phoneCode: string;
}

interface CountrySelectProps {
  value: string;
  onChange: (country: Country | null) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  preferredCountries?: string[];
}

export default function CountrySelect({
  value,
  onChange,
  error,
  placeholder = 'Sélectionner un pays',
  disabled = false,
  preferredCountries = ['CD', 'FR', 'BE', 'CH', 'CA', 'US'],
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    if (value && countries.length > 0) {
      const country = countries.find(c => c.name === value || c.code === value);
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, [value, countries]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCountries = async () => {
    try {
      const response = await api.get('/countries');
      setCountries(response.data);
    } catch (error) {
      console.error('Failed to load countries:', error);
    }
  };

  const handleSelect = (country: Country) => {
    setSelectedCountry(country);
    onChange(country);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    setSelectedCountry(null);
    onChange(null);
    setSearch('');
  };

  const filteredCountries = countries.filter(c => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.code.toLowerCase().includes(searchLower)
    );
  });

  const preferredList = filteredCountries.filter(c => preferredCountries.includes(c.code));
  const otherList = filteredCountries.filter(c => !preferredCountries.includes(c.code));

  // Grouper par continent (simplifié)
  const africanCountries = otherList.filter(c => 
    ['CD', 'CG', 'AO', 'CM', 'GA', 'CI', 'SN', 'ML', 'GN', 'BF', 'BJ', 'TG', 'GH', 'NG', 'NE', 'TD', 'CF', 'GQ', 'ST', 'ZA', 'KE', 'TZ', 'UG', 'RW', 'BI', 'ET', 'SD', 'SS', 'MA', 'DZ', 'TN', 'EG', 'LY', 'MR', 'GM', 'GW', 'SL', 'LR', 'CI', 'GH', 'TG', 'BJ', 'NG', 'CM', 'CF', 'TD', 'CG', 'CD', 'AO', 'ZM', 'MW', 'MZ', 'ZW', 'BW', 'NA', 'SZ', 'LS', 'MG', 'MU', 'SC', 'KM', 'CV', 'ST', 'GQ', 'GA'].includes(c.code)
  );
  const europeanCountries = otherList.filter(c => 
    ['FR', 'BE', 'CH', 'LU', 'DE', 'AT', 'IT', 'ES', 'PT', 'GB', 'IE', 'NL', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'RU', 'UA', 'RS', 'HR', 'SI', 'BA', 'ME', 'MK', 'AL', 'EE', 'LV', 'LT', 'MD', 'GE', 'AM', 'AZ', 'TR'].includes(c.code)
  );
  const americanCountries = otherList.filter(c => 
    ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'CU', 'DO', 'HT', 'JM', 'BS', 'BB', 'TT', 'GY', 'SR', 'PY', 'UY', 'BO', 'EC', 'PA', 'CR', 'NI', 'HN', 'SV', 'GT', 'BZ'].includes(c.code)
  );
  const asianCountries = otherList.filter(c => 
    ['CN', 'JP', 'KR', 'IN', 'ID', 'MY', 'PH', 'SG', 'TH', 'VN', 'AE', 'SA', 'QA', 'KW', 'LB', 'IL', 'JO', 'SY', 'IQ', 'IR', 'AF', 'PK', 'BD', 'LK', 'NP', 'BT', 'MM', 'LA', 'KH', 'MN', 'KZ', 'UZ', 'TM', 'KG', 'TJ', 'YE', 'OM', 'BH', 'CY', 'GE', 'AM', 'AZ', 'TR'].includes(c.code)
  );
  const oceanianCountries = otherList.filter(c => 
    ['AU', 'NZ', 'PG', 'FJ', 'SB', 'VU', 'NC', 'WS', 'TO', 'KI', 'NR', 'MH', 'PW', 'FM', 'TV'].includes(c.code)
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-3 py-2 border rounded-lg cursor-pointer transition bg-white ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
        } ${error ? 'border-red-500' : 'border-gray-300'}`}
      >
        {selectedCountry ? (
          <div className="flex items-center space-x-2">
            <span className="text-xl">{selectedCountry.flag}</span>
            <span className="truncate">{selectedCountry.name}</span>
          </div>
        ) : (
          <span className="text-gray-500 flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            {placeholder}
          </span>
        )}
        <div className="flex items-center space-x-1">
          {selectedCountry && !disabled && (
            <button
              type="button"
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
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un pays..."
                className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-72">
            {preferredList.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Suggérés
                </div>
                {preferredList.map((country, index) => (
                  <button
                    type="button"
                    key={`preferred-${country.code}-${index}`}
                    onClick={() => handleSelect(country)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition flex items-center space-x-3"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="truncate">{country.name}</span>
                  </button>
                ))}
              </>
            )}

            {africanCountries.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Afrique
                </div>
                {africanCountries.map((country, index) => (
                  <button
                    type="button"
                    key={`africa-${country.code}-${index}`}
                    onClick={() => handleSelect(country)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition flex items-center space-x-3"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="truncate">{country.name}</span>
                  </button>
                ))}
              </>
            )}

            {europeanCountries.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Europe
                </div>
                {europeanCountries.map((country, index) => (
                  <button
                    type="button"
                    key={`europe-${country.code}-${index}`}
                    onClick={() => handleSelect(country)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition flex items-center space-x-3"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="truncate">{country.name}</span>
                  </button>
                ))}
              </>
            )}

            {americanCountries.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Amérique
                </div>
                {americanCountries.map((country, index) => (
                  <button
                    type="button"
                    key={`america-${country.code}-${index}`}
                    onClick={() => handleSelect(country)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition flex items-center space-x-3"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="truncate">{country.name}</span>
                  </button>
                ))}
              </>
            )}

            {asianCountries.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Asie
                </div>
                {asianCountries.map((country, index) => (
                  <button
                    type="button"
                    key={`asia-${country.code}-${index}`}
                    onClick={() => handleSelect(country)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition flex items-center space-x-3"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="truncate">{country.name}</span>
                  </button>
                ))}
              </>
            )}

            {oceanianCountries.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Océanie
                </div>
                {oceanianCountries.map((country, index) => (
                  <button
                    type="button"
                    key={`oceania-${country.code}-${index}`}
                    onClick={() => handleSelect(country)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition flex items-center space-x-3"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="truncate">{country.name}</span>
                  </button>
                ))}
              </>
            )}

            {filteredCountries.length === 0 && (
              <div className="px-4 py-3 text-center text-gray-500">
                Aucun pays trouvé
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}