import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { api } from '../../services/api';

interface PhoneCode {
  code: string;
  country: string;
  flag: string;
  display: string;
}

interface PhoneInputProps {
  value: string;
  onChange: (phoneNumber: string, countryCode: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  preferredCountries?: string[];
}

export default function PhoneInput({
  value,
  onChange,
  error,
  placeholder = 'Numéro de téléphone',
  disabled = false,
  preferredCountries = ['CD', 'FR', 'BE', 'CH', 'US'],
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [phoneCodes, setPhoneCodes] = useState<PhoneCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<PhoneCode | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhoneCodes();
  }, []);

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

  const loadPhoneCodes = async () => {
    try {
      const response = await api.get('/countries/phone-codes');
      const codes = response.data;
      setPhoneCodes(codes);
      
      // Définir le code par défaut (RDC)
      const defaultCode = codes.find((c: PhoneCode) => c.code === '243') || codes[0];
      setSelectedCode(defaultCode);
    } catch (error) {
      console.error('Failed to load phone codes:', error);
    }
  };

  const handleCodeSelect = (code: PhoneCode) => {
    setSelectedCode(code);
    setIsOpen(false);
    setSearch('');
    // Nettoyer le numéro de téléphone des espaces
    const cleanedNumber = phoneNumber.replace(/\s+/g, '');
    onChange(cleanedNumber, code.code);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Garder uniquement les chiffres
    const newNumber = e.target.value.replace(/[^\d]/g, '');
    setPhoneNumber(newNumber);
    if (selectedCode) {
      onChange(newNumber, selectedCode.code);
    }
  };

  const filteredCodes = phoneCodes.filter(c => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      c.country.toLowerCase().includes(searchLower) ||
      c.code.includes(search)
    );
  });

  const preferredList = filteredCodes.filter(c => preferredCountries.includes(c.code));
  const otherList = filteredCodes.filter(c => !preferredCountries.includes(c.code));

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex">
        {/* Country Code Selector */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="flex items-center space-x-2 px-3 py-2 border border-r-0 rounded-l-lg bg-gray-50 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedCode ? (
            <>
              <span className="text-xl">{selectedCode.flag}</span>
              <span className="text-sm font-medium">+{selectedCode.code}</span>
            </>
          ) : (
            <span className="text-sm text-gray-500">Code</span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="tel"
          className={`flex-1 px-3 py-2 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-80 overflow-hidden">
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
          <div className="overflow-y-auto max-h-64">
            {preferredList.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Suggérés
                </div>
                {preferredList.map((code, index) => (
                  <button
                    type="button"
                    key={`preferred-${code.code}-${index}`}
                    onClick={() => handleCodeSelect(code)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-3">
                      <span className="text-xl">{code.flag}</span>
                      <span>{code.country}</span>
                    </span>
                    <span className="text-gray-500">+{code.code}</span>
                  </button>
                ))}
              </>
            )}

            {otherList.length > 0 && (
              <>
                {preferredList.length > 0 && (
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                    Tous les pays
                  </div>
                )}
                {otherList.map((code, index) => (
                  <button
                    type="button"
                    key={`other-${code.code}-${index}`}
                    onClick={() => handleCodeSelect(code)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-3">
                      <span className="text-xl">{code.flag}</span>
                      <span>{code.country}</span>
                    </span>
                    <span className="text-gray-500">+{code.code}</span>
                  </button>
                ))}
              </>
            )}

            {filteredCodes.length === 0 && (
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