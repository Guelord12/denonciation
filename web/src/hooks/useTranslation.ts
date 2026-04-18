import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const translations: Record<string, Record<string, string>> = {
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.reports': 'Signalements',
    'nav.live': 'Live',
    'nav.dashboard': 'Tableau de bord',
    'nav.profile': 'Profil',
    'nav.settings': 'Paramètres',
    'nav.logout': 'Déconnexion',
    
    // Actions
    'action.report': 'Signaler',
    'action.live': 'Go Live',
    'action.login': 'Connexion',
    'action.register': 'Inscription',
    'action.submit': 'Soumettre',
    'action.cancel': 'Annuler',
    'action.save': 'Enregistrer',
    'action.delete': 'Supprimer',
    'action.edit': 'Modifier',
    'action.share': 'Partager',
    'action.comment': 'Commenter',
    'action.like': 'J\'aime',
    'action.witness': 'Témoigner',
    
    // Report
    'report.title': 'Titre',
    'report.description': 'Description',
    'report.category': 'Catégorie',
    'report.location': 'Localisation',
    'report.media': 'Médias',
    'report.create': 'Créer un signalement',
    'report.my_reports': 'Mes signalements',
    'report.recent': 'Signalements récents',
    'report.status': 'Statut',
    'report.pending': 'En attente',
    'report.approved': 'Approuvé',
    'report.rejected': 'Rejeté',
    
    // Live
    'live.title': 'Titre du live',
    'live.start': 'Démarrer un live',
    'live.active': 'Lives en cours',
    'live.viewers': 'spectateurs',
    'live.chat': 'Chat en direct',
    'live.premium': 'Premium',
    
    // Statistics
    'stats.title': 'Statistiques',
    'stats.users': 'Utilisateurs',
    'stats.reports': 'Signalements',
    'stats.approved': 'Approuvés',
    'stats.pending': 'En attente',
    
    // Messages
    'msg.welcome': 'Bienvenue',
    'msg.success': 'Opération réussie',
    'msg.error': 'Une erreur est survenue',
    'msg.loading': 'Chargement...',
    'msg.no_results': 'Aucun résultat',
    'msg.confirm_delete': 'Êtes-vous sûr de vouloir supprimer ?',
  },
  en: {
    'nav.home': 'Home',
    'nav.reports': 'Reports',
    'nav.live': 'Live',
    'nav.dashboard': 'Dashboard',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    
    'action.report': 'Report',
    'action.live': 'Go Live',
    'action.login': 'Login',
    'action.register': 'Register',
    'action.submit': 'Submit',
    'action.cancel': 'Cancel',
    'action.save': 'Save',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.share': 'Share',
    'action.comment': 'Comment',
    'action.like': 'Like',
    'action.witness': 'Witness',
    
    'report.title': 'Title',
    'report.description': 'Description',
    'report.category': 'Category',
    'report.location': 'Location',
    'report.media': 'Media',
    'report.create': 'Create report',
    'report.my_reports': 'My reports',
    'report.recent': 'Recent reports',
    'report.status': 'Status',
    'report.pending': 'Pending',
    'report.approved': 'Approved',
    'report.rejected': 'Rejected',
    
    'live.title': 'Stream title',
    'live.start': 'Start live',
    'live.active': 'Active streams',
    'live.viewers': 'viewers',
    'live.chat': 'Live chat',
    'live.premium': 'Premium',
    
    'stats.title': 'Statistics',
    'stats.users': 'Users',
    'stats.reports': 'Reports',
    'stats.approved': 'Approved',
    'stats.pending': 'Pending',
    
    'msg.welcome': 'Welcome',
    'msg.success': 'Operation successful',
    'msg.error': 'An error occurred',
    'msg.loading': 'Loading...',
    'msg.no_results': 'No results',
    'msg.confirm_delete': 'Are you sure you want to delete?',
  },
  sw: {
    'nav.home': 'Nyumbani',
    'nav.reports': 'Ripoti',
    'nav.live': 'Moja kwa moja',
    'nav.dashboard': 'Dashibodi',
    'nav.profile': 'Wasifu',
    'nav.settings': 'Mipangilio',
    'nav.logout': 'Ondoka',
    
    'action.report': 'Ripoti',
    'action.live': 'Anza live',
    'action.login': 'Ingia',
    'action.register': 'Jisajili',
    'action.submit': 'Wasilisha',
    'action.cancel': 'Ghairi',
    'action.save': 'Hifadhi',
    'action.delete': 'Futa',
    
    'report.create': 'Unda ripoti',
    'report.my_reports': 'Ripoti zangu',
    'report.status': 'Hali',
    'report.pending': 'Inasubiri',
    'report.approved': 'Imeidhinishwa',
    
    'stats.title': 'Takwimu',
    'stats.users': 'Watumiaji',
    'stats.reports': 'Ripoti',
    
    'msg.welcome': 'Karibu',
    'msg.success': 'Imefanikiwa',
    'msg.error': 'Hitilafu imetokea',
    'msg.loading': 'Inapakia...',
  },
  ln: {
    'nav.home': 'Ebandeli',
    'nav.reports': 'Matindi',
    'nav.live': 'Live',
    'nav.dashboard': 'Esika ya mosala',
    'nav.profile': 'Profil',
    'nav.settings': 'Paramètres',
    'nav.logout': 'Kobima',
    
    'action.report': 'Kotinda',
    'action.live': 'Kobanda live',
    'action.login': 'Kokota',
    'action.register': 'Komikomisa',
    'action.submit': 'Kotinda',
    'action.cancel': 'Kolongola',
    'action.save': 'Kobomba',
    'action.delete': 'Kolongola',
    
    'report.create': 'Kosala signalement',
    'report.my_reports': 'Matindi na ngai',
    'report.status': 'Etat',
    'report.pending': 'Ezali kozela',
    'report.approved': 'Endimami',
    
    'stats.title': 'Statistiques',
    'stats.users': 'Basaleli',
    'stats.reports': 'Matindi',
    
    'msg.welcome': 'Boyeyi bolamu',
    'msg.success': 'Esili malamu',
    'msg.error': 'Mabunga mazali',
    'msg.loading': 'Ezali kozela...',
  },
};

export function useTranslation() {
  const [language, setLanguage] = useState<string>(() => {
    return localStorage.getItem('language') || 'fr';
  });

  useEffect(() => {
    const handleLanguageChange = (e: CustomEvent) => {
      setLanguage(e.detail);
    };

    window.addEventListener('languageChange', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener);
    };
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    return translations[language]?.[key] || translations.fr[key] || fallback || key;
  }, [language]);

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

  const changeLanguage = useCallback((newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: newLanguage }));
  }, []);

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