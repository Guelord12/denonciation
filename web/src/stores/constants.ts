export const APP_NAME = 'Dénonciation';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Plateforme de signalement d\'abus et d\'injustices';

// ✅ CORRECTION : URL absolue en production
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'http://16.171.39.76:5000/api' : 'http://localhost:5000/api');

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.PROD ? 'http://16.171.39.76:5000' : 'http://localhost:5000');

// ✅ CORRECTION : Avatar par défaut utilisant UI Avatars (fonctionne toujours)
export const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=EF4444&color=fff&size=128';
export const DEFAULT_THUMBNAIL = 'https://via.placeholder.com/800x450/EF4444/FFFFFF?text=Dénonciation';

// ✅ Fonction utilitaire pour générer un avatar avec initiales
export const getAvatarUrl = (name: string, size: number = 128): string => {
  return `https://ui-avatars.com/api/?background=EF4444&color=fff&size=${size}&name=${encodeURIComponent(name)}`;
};

// ✅ Fonction utilitaire pour générer un avatar pour les signalements anonymes
export const getAnonymousAvatar = (size: number = 128): string => {
  return `https://ui-avatars.com/api/?background=9CA3AF&color=fff&size=${size}&name=Anonyme`;
};

export const CATEGORIES = [
  { id: 1, name: 'Corruption', icon: '💰', color: '#e74c3c' },
  { id: 2, name: 'Violence policière', icon: '👮', color: '#c0392b' },
  { id: 3, name: 'Discrimination', icon: '⚖️', color: '#f39c12' },
  { id: 4, name: 'Violences sexuelles', icon: '🚫', color: '#9b59b6' },
  { id: 5, name: 'Abus de pouvoir', icon: '👑', color: '#e67e22' },
  { id: 6, name: 'Fraude électorale', icon: '🗳️', color: '#2c3e50' },
  { id: 7, name: 'Atteinte à l\'environnement', icon: '🌳', color: '#27ae60' },
  { id: 8, name: 'Non-respect des droits humains', icon: '✊', color: '#3498db' },
  { id: 9, name: 'Autre', icon: '📌', color: '#95a5a6' },
];

export const REPORT_STATUS = {
  pending: { label: 'En attente', color: '#F59E0B', bgColor: '#FEF3C7' },
  approved: { label: 'Approuvé', color: '#10B981', bgColor: '#D1FAE5' },
  rejected: { label: 'Rejeté', color: '#EF4444', bgColor: '#FEE2E2' },
  archived: { label: 'Archivé', color: '#6B7280', bgColor: '#F3F4F6' },
} as const;

export const STREAM_STATUS = {
  active: { label: 'En direct', color: '#EF4444' },
  ended: { label: 'Terminé', color: '#6B7280' },
  scheduled: { label: 'Programmé', color: '#3B82F6' },
  cancelled: { label: 'Annulé', color: '#F59E0B' },
} as const;

export const NOTIFICATION_TYPES = {
  welcome: 'Bienvenue',
  new_report: 'Nouveau signalement',
  new_comment: 'Nouveau commentaire',
  new_like: 'Nouveau like',
  new_witness: 'Nouveau témoignage',
  new_live: 'Nouveau live',
  report_status: 'Statut du signalement',
  system: 'Système',
  moderation_resolved: 'Modération résolue',
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password/:token',
  DASHBOARD: '/dashboard',
  REPORTS: '/reports',
  REPORT_DETAIL: '/reports/:id',
  CREATE_REPORT: '/reports/create',
  LIVE: '/live',
  LIVE_DETAIL: '/live/:id',
  CREATE_LIVE: '/live/create',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',
  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    REPORTS: '/admin/reports',
    MODERATION: '/admin/moderation',
    ANALYTICS: '/admin/analytics',
    SETTINGS: '/admin/settings',
  },
} as const;

// ✅ Configuration des timeouts
export const API_TIMEOUT = 30000; // 30 secondes
export const SOCKET_TIMEOUT = 20000; // 20 secondes

// ✅ Messages d'erreur courants
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre internet.',
  SERVER_ERROR: 'Erreur serveur. Veuillez réessayer plus tard.',
  UNAUTHORIZED: 'Vous devez être connecté pour accéder à cette page.',
  FORBIDDEN: 'Vous n\'avez pas les droits pour accéder à cette page.',
  NOT_FOUND: 'La ressource demandée n\'existe pas.',
  VALIDATION_ERROR: 'Veuillez vérifier les champs du formulaire.',
} as const;