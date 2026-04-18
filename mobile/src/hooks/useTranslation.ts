import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const translations: Record<string, Record<string, string>> = {
  fr: {
    'nav.home': 'Accueil',
    'nav.reports': 'Signalements',
    'nav.live': 'Live',
    'nav.profile': 'Profil',
    'action.report': 'Signaler',
    'action.live': 'Go Live',
    'action.submit': 'Soumettre',
    'action.cancel': 'Annuler',
    'report.create': 'Créer un signalement',
    'report.my_reports': 'Mes signalements',
    'msg.welcome': 'Bienvenue',
    'msg.loading': 'Chargement...',
  },
  en: {
    'nav.home': 'Home',
    'nav.reports': 'Reports',
    'nav.live': 'Live',
    'nav.profile': 'Profile',
    'action.report': 'Report',
    'action.live': 'Go Live',
    'action.submit': 'Submit',
    'action.cancel': 'Cancel',
    'report.create': 'Create report',
    'report.my_reports': 'My reports',
    'msg.welcome': 'Welcome',
    'msg.loading': 'Loading...',
  },
  sw: {
    'nav.home': 'Nyumbani',
    'nav.reports': 'Ripoti',
    'nav.live': 'Moja kwa moja',
    'nav.profile': 'Wasifu',
    'action.report': 'Ripoti',
    'action.submit': 'Wasilisha',
    'report.create': 'Unda ripoti',
    'msg.welcome': 'Karibu',
    'msg.loading': 'Inapakia...',
  },
  ln: {
    'nav.home': 'Ebandeli',
    'nav.reports': 'Matindi',
    'nav.live': 'Live',
    'nav.profile': 'Profil',
    'action.report': 'Kotinda',
    'action.submit': 'Kotinda',
    'report.create': 'Kosala signalement',
    'msg.welcome': 'Boyeyi bolamu',
    'msg.loading': 'Ezali kozela...',
  },
};

export function useTranslation() {
  const [language, setLanguage] = useState<string>('fr');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem('language');
      if (saved) {
        setLanguage(saved);
      }
    } catch (error) {
      console.error('Load language error:', error);
    }
  };

  const t = useCallback((key: string, fallback?: string): string => {
    return translations[language]?.[key] || translations.fr[key] || fallback || key;
  }, [language]);

  const changeLanguage = async (newLanguage: string) => {
    setLanguage(newLanguage);
    await AsyncStorage.setItem('language', newLanguage);
  };

  const translateText = useCallback(async (text: string, targetLanguage?: string): Promise<string> => {
    if (!text) return text;
    
    const target = targetLanguage || language;
    if (target === 'fr') return text;
    
    try {
      const response = await api.post('/chatbot/translate', {
        text,
        to: target,
      });
      return response.data.translated;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }, [language]);

  return {
    t,
    language,
    changeLanguage,
    translateText,
    languages: [
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'en', name: 'English', flag: '🇬🇧' },
      { code: 'sw', name: 'Kiswahili', flag: '🇹🇿' },
      { code: 'ln', name: 'Lingala', flag: '🇨🇩' },
    ],
  };
}