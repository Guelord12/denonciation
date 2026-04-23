import { Platform } from 'react-native';

// ✅ Configuration des serveurs
const DEV_SERVER_IP = '192.168.131.90';
const PROD_SERVER_IP = '16.171.39.76';
const SERVER_PORT = '5000';

export const APP_NAME = 'Dénonciation';
export const APP_VERSION = '1.0.0';

export const API_URL = __DEV__
  ? Platform.select({
      ios: `http://${DEV_SERVER_IP}:${SERVER_PORT}/api`,
      android: `http://${DEV_SERVER_IP}:${SERVER_PORT}/api`,
      default: `http://${DEV_SERVER_IP}:${SERVER_PORT}/api`,
    })
  : `http://${PROD_SERVER_IP}:${SERVER_PORT}/api`;

export const SOCKET_URL = __DEV__
  ? Platform.select({
      ios: `http://${DEV_SERVER_IP}:${SERVER_PORT}`,
      android: `http://${DEV_SERVER_IP}:${SERVER_PORT}`,
      default: `http://${DEV_SERVER_IP}:${SERVER_PORT}`,
    })
  : `http://${PROD_SERVER_IP}:${SERVER_PORT}`;

export const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=EF4444&color=fff';

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

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB