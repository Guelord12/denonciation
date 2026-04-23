// =====================================================
// CONFIGURATION CENTRALISÉE
// =====================================================

// Environnement
const IS_DEV = process.env.NODE_ENV === 'development';
const IS_PROD = process.env.NODE_ENV === 'production';

// URLs
const DEV_API_URL = 'http://192.168.131.90:5000';
const PROD_API_URL = 'http://16.171.39.76:5000';

export const CONFIG = {
  // Mode
  IS_DEV,
  IS_PROD,
  
  // API
  API_URL: IS_DEV ? `${DEV_API_URL}/api` : `${PROD_API_URL}/api`,
  SOCKET_URL: IS_DEV ? DEV_API_URL : PROD_API_URL,
  HLS_SERVER_URL: IS_DEV ? 'http://192.168.131.90:8000/live' : 'http://16.171.39.76:8000/live',
  RTMP_SERVER_URL: IS_DEV ? 'rtmp://192.168.131.90:1935/live' : 'rtmp://16.171.39.76:1935/live',
  
  // Streaming
  STREAM: {
    KEY_PREFIX: 'live_',
    MAX_TITLE_LENGTH: 100,
    MIN_TITLE_LENGTH: 3,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_TAGS: 10,
  },
  
  // Fichiers
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    THUMBNAIL_ASPECT_RATIO: 16 / 9,
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
} as const;

// Export des types de configuration
export type AppConfig = typeof CONFIG;