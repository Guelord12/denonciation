import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Ressources de traduction
const resources = {
  fr: {
    translation: {
      // Navigation
      'nav.home': 'Accueil',
      'nav.reports': 'Signalements',
      'nav.live': 'Live',
      'nav.actualites': 'Actualités',
      'nav.profile': 'Profil',
      'nav.settings': 'Paramètres',
      'nav.logout': 'Déconnexion',
      'nav.information': 'Informations',
      
      // Authentification
      'auth.login': 'Connexion',
      'auth.register': 'Inscription',
      'auth.username': 'Nom d\'utilisateur',
      'auth.email': 'Email',
      'auth.password': 'Mot de passe',
      'auth.confirm_password': 'Confirmer le mot de passe',
      'auth.first_name': 'Prénom',
      'auth.last_name': 'Nom',
      'auth.phone': 'Téléphone',
      'auth.country': 'Pays',
      'auth.city': 'Ville',
      'auth.sign_in': 'Se connecter',
      'auth.sign_up': 'S\'inscrire',
      'auth.forgot_password': 'Mot de passe oublié ?',
      'auth.no_account': 'Pas de compte ?',
      'auth.has_account': 'Déjà un compte ?',
      
      // Actions
      'action.report': 'Signaler',
      'action.live': 'Go Live',
      'action.submit': 'Soumettre',
      'action.cancel': 'Annuler',
      'action.save': 'Enregistrer',
      'action.delete': 'Supprimer',
      'action.edit': 'Modifier',
      'action.share': 'Partager',
      'action.comment': 'Commenter',
      'action.like': 'J\'aime',
      'action.witness': 'Témoigner',
      
      // Signalements
      'report.title': 'Titre',
      'report.description': 'Description',
      'report.category': 'Catégorie',
      'report.location': 'Localisation',
      'report.create': 'Créer un signalement',
      'report.my_reports': 'Mes signalements',
      'report.recent': 'Signalements récents',
      'report.status': 'Statut',
      'report.pending': 'En attente',
      'report.approved': 'Approuvé',
      'report.rejected': 'Rejeté',
      
      // Live
      'live.title': 'Live',
      'live.start': 'Démarrer un live',
      'live.active': 'Lives en cours',
      'live.viewers': 'spectateurs',
      'live.chat': 'Chat en direct',
      'live.premium': 'Premium',
      
      // Statistiques
      'stats.title': 'Statistiques',
      'stats.users': 'Utilisateurs',
      'stats.reports': 'Signalements',
      
      // Messages
      'msg.welcome': 'Bienvenue',
      'msg.loading': 'Chargement...',
      'msg.error': 'Une erreur est survenue',
      'msg.success': 'Opération réussie',
      'msg.no_results': 'Aucun résultat',
      'msg.confirm_delete': 'Êtes-vous sûr de vouloir supprimer ?',
      'msg.confirm_logout': 'Êtes-vous sûr de vouloir vous déconnecter ?',
      
      // Paramètres
      'settings.title': 'Paramètres',
      'settings.preferences': 'Préférences',
      'settings.notifications': 'Notifications',
      'settings.dark_mode': 'Mode sombre',
      'settings.language': 'Langue',
      'settings.security': 'Sécurité',
      'settings.change_password': 'Changer le mot de passe',
      'settings.privacy': 'Confidentialité',
      'settings.support': 'Support',
      'settings.help': 'Aide et FAQ',
      'settings.contact': 'Contacter le support',
      'settings.about': 'À propos',
      'settings.logout': 'Déconnexion',
      'settings.delete_account': 'Supprimer le compte',
      'settings.version': 'Version',
      
      // Anonymat
      'anonymous.user': 'Utilisateur anonyme',
    },
  },
  en: {
    translation: {
      'nav.home': 'Home',
      'nav.reports': 'Reports',
      'nav.live': 'Live',
      'nav.actualites': 'News',
      'nav.profile': 'Profile',
      'nav.settings': 'Settings',
      'nav.logout': 'Logout',
      'nav.information': 'Information',
      
      'auth.login': 'Login',
      'auth.register': 'Register',
      'auth.username': 'Username',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.confirm_password': 'Confirm password',
      'auth.first_name': 'First name',
      'auth.last_name': 'Last name',
      'auth.phone': 'Phone',
      'auth.country': 'Country',
      'auth.city': 'City',
      'auth.sign_in': 'Sign in',
      'auth.sign_up': 'Sign up',
      'auth.forgot_password': 'Forgot password?',
      'auth.no_account': 'No account?',
      'auth.has_account': 'Already have an account?',
      
      'action.report': 'Report',
      'action.live': 'Go Live',
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
      'report.create': 'Create report',
      'report.my_reports': 'My reports',
      'report.recent': 'Recent reports',
      'report.status': 'Status',
      'report.pending': 'Pending',
      'report.approved': 'Approved',
      'report.rejected': 'Rejected',
      
      'live.title': 'Live',
      'live.start': 'Start live',
      'live.active': 'Active streams',
      'live.viewers': 'viewers',
      'live.chat': 'Live chat',
      'live.premium': 'Premium',
      
      'stats.title': 'Statistics',
      'stats.users': 'Users',
      'stats.reports': 'Reports',
      
      'msg.welcome': 'Welcome',
      'msg.loading': 'Loading...',
      'msg.error': 'An error occurred',
      'msg.success': 'Operation successful',
      'msg.no_results': 'No results',
      'msg.confirm_delete': 'Are you sure you want to delete?',
      'msg.confirm_logout': 'Are you sure you want to logout?',
      
      'settings.title': 'Settings',
      'settings.preferences': 'Preferences',
      'settings.notifications': 'Notifications',
      'settings.dark_mode': 'Dark mode',
      'settings.language': 'Language',
      'settings.security': 'Security',
      'settings.change_password': 'Change password',
      'settings.privacy': 'Privacy',
      'settings.support': 'Support',
      'settings.help': 'Help & FAQ',
      'settings.contact': 'Contact support',
      'settings.about': 'About',
      'settings.logout': 'Logout',
      'settings.delete_account': 'Delete account',
      'settings.version': 'Version',
      
      'anonymous.user': 'Anonymous user',
    },
  },
  sw: {
    translation: {
      'nav.home': 'Nyumbani',
      'nav.reports': 'Ripoti',
      'nav.live': 'Moja kwa moja',
      'nav.actualites': 'Habari',
      'nav.profile': 'Wasifu',
      'nav.settings': 'Mipangilio',
      'nav.logout': 'Ondoka',
      'nav.information': 'Taarifa',
      
      'auth.login': 'Ingia',
      'auth.register': 'Jisajili',
      'auth.username': 'Jina la mtumiaji',
      'auth.email': 'Barua pepe',
      'auth.password': 'Nenosiri',
      'auth.sign_in': 'Ingia',
      'auth.sign_up': 'Jisajili',
      
      'action.report': 'Ripoti',
      'action.live': 'Anza live',
      'action.submit': 'Wasilisha',
      'action.cancel': 'Ghairi',
      'action.save': 'Hifadhi',
      'action.delete': 'Futa',
      'action.share': 'Shiriki',
      'action.comment': 'Toa maoni',
      'action.like': 'Penda',
      
      'report.create': 'Unda ripoti',
      'report.my_reports': 'Ripoti zangu',
      'report.status': 'Hali',
      'report.pending': 'Inasubiri',
      'report.approved': 'Imeidhinishwa',
      
      'live.start': 'Anza live',
      'live.active': 'Vipindi vinavyoendelea',
      
      'msg.welcome': 'Karibu',
      'msg.loading': 'Inapakia...',
      'msg.error': 'Hitilafu imetokea',
      'msg.success': 'Imefanikiwa',
      
      'settings.title': 'Mipangilio',
      'settings.dark_mode': 'Hali ya giza',
      'settings.language': 'Lugha',
      'settings.logout': 'Ondoka',
      
      'anonymous.user': 'Mtumiaji asiyejulikana',
    },
  },
  ln: {
    translation: {
      'nav.home': 'Ebandeli',
      'nav.reports': 'Matindi',
      'nav.live': 'Live',
      'nav.actualites': 'Sango',
      'nav.profile': 'Profil',
      'nav.settings': 'Paramɛtɛ',
      'nav.logout': 'Kobima',
      'nav.information': 'Sango',
      
      'auth.login': 'Kokota',
      'auth.register': 'Komikomisa',
      'auth.username': 'Kombo ya mosaleli',
      'auth.email': 'Email',
      'auth.password': 'Mot de passe',
      'auth.sign_in': 'Kokota',
      'auth.sign_up': 'Komikomisa',
      
      'action.report': 'Kotinda',
      'action.live': 'Kobanda live',
      'action.submit': 'Kotinda',
      'action.cancel': 'Kolongola',
      'action.save': 'Kobomba',
      'action.delete': 'Kolongola',
      'action.share': 'Kokabola',
      'action.comment': 'Kotiya commentaire',
      'action.like': 'Kolinga',
      
      'report.create': 'Kosala signalement',
      'report.my_reports': 'Matindi na ngai',
      'report.status': 'Etat',
      'report.pending': 'Ezali kozela',
      'report.approved': 'Endimami',
      
      'live.start': 'Kobanda live',
      'live.active': 'Ba live ezali kosala',
      
      'msg.welcome': 'Boyeyi bolamu',
      'msg.loading': 'Ezali kozela...',
      'msg.error': 'Mabunga mazali',
      'msg.success': 'Esili malamu',
      
      'settings.title': 'Paramɛtɛ',
      'settings.dark_mode': 'Mode ya moyindo',
      'settings.language': 'Lokota',
      'settings.logout': 'Kobima',
      
      'anonymous.user': 'Mosaleli ya kombo te',
    },
  },
};

// Initialiser i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Charger la langue sauvegardée
export const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('language');
    if (savedLanguage) {
      await i18n.changeLanguage(savedLanguage);
    } else {
      const locales = Localization.getLocales();
      const systemLanguage = locales[0]?.languageCode;
      if (systemLanguage && ['fr', 'en', 'sw', 'ln'].includes(systemLanguage)) {
        await i18n.changeLanguage(systemLanguage);
      }
    }
  } catch (error) {
    console.error('Error loading language:', error);
  }
};

loadSavedLanguage();

export default i18n;