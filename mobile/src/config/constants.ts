// =====================================================
// CONFIGURATION DE L'APPLICATION MOBILE
// =====================================================

import { Platform } from 'react-native';

// ✅ Détection automatique de l'IP du serveur
const getServerConfig = () => {
  if (__DEV__) {
    // Adresse IP de votre ordinateur sur le réseau local
    const DEV_SERVER_IP = '192.168.131.90';
    const DEV_SERVER_PORT = '5000';
    
    return {
      api: `http://${DEV_SERVER_IP}:${DEV_SERVER_PORT}/api`,
      socket: `http://${DEV_SERVER_IP}:${DEV_SERVER_PORT}`,
    };
  }
  
  // En production, utiliser le domaine réel
  return {
    api: 'https://api.denonciation.com/api',
    socket: 'https://api.denonciation.com',
  };
};

const serverConfig = getServerConfig();

export const API_BASE_URL = serverConfig.api;
export const SOCKET_URL = serverConfig.socket;

// =====================================================
// AUTRES CONSTANTES
// =====================================================

export const APP_NAME = 'Dénonciation';
export const APP_VERSION = '1.0.0';

export const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=EF4444&color=fff&size=128';

export const SUPPORTED_LANGUAGES = ['fr', 'en'];

export const REPORT_CATEGORIES = [
  { id: 1, name: 'Corruption', icon: '💰', color: '#F59E0B' },
  { id: 2, name: 'Violence policière', icon: '👮', color: '#EF4444' },
  { id: 3, name: 'Discrimination', icon: '⚖️', color: '#8B5CF6' },
  { id: 4, name: 'Environnement', icon: '🌳', color: '#10B981' },
  { id: 5, name: 'Droits humains', icon: '✊', color: '#3B82F6' },
];

console.log('📱 App Configuration:');
console.log('   Platform:', Platform.OS);
console.log('   API URL:', API_BASE_URL);
console.log('   Socket URL:', SOCKET_URL);
console.log('   Environment:', __DEV__ ? 'Development' : 'Production');