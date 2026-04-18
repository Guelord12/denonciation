import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sw', name: 'Kiswahili', flag: '🇹🇿' },
  { code: 'ln', name: 'Lingala', flag: '🇨🇩' },
];

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return LANGUAGES.find(l => l.code === saved) || LANGUAGES[0];
  });

  const handleLanguageChange = (language: Language) => {
    setCurrentLanguage(language);
    localStorage.setItem('language', language.code);
    setIsOpen(false);
    
    // Recharger la page ou mettre à jour les traductions
    window.dispatchEvent(new CustomEvent('languageChange', { detail: language.code }));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-red-600 transition"
      >
        <Globe className="w-5 h-5" />
        <span className="hidden md:inline">{currentLanguage.flag}</span>
        <span className="hidden lg:inline text-sm">{currentLanguage.name}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language)}
                className={`w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-100 transition ${
                  currentLanguage.code === language.code ? 'bg-red-50 text-red-600' : ''
                }`}
              >
                <span className="text-xl">{language.flag}</span>
                <span>{language.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}