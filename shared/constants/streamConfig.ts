// =====================================================
// CONFIGURATION DU STREAMING (PARTAGÉE)
// =====================================================

export const STREAM_CONFIG = {
  // Timeouts
  WEBRTC_CONNECTION_TIMEOUT: 30000, // 30 secondes max pour établir WebRTC
  HEARTBEAT_INTERVAL: 10000,        // 10 secondes entre chaque heartbeat
  CONNECTION_LOST_TIMEOUT: 15000,   // 15 secondes avant de considérer perdu
  ZOMBIE_STREAM_TIMEOUT: 60000,     // 60 secondes avant de nettoyer un stream zombie
  VIEWER_INACTIVITY_TIMEOUT: 30000, // 30 secondes avant de retirer un spectateur inactif
  
  // Reconnexion
  MAX_RECONNECT_ATTEMPTS: 3,        // Nombre max de tentatives de reconnexion
  RECONNECT_DELAY: 1000,            // Délai initial de reconnexion (1s)
  RECONNECT_DELAY_MAX: 5000,        // Délai max de reconnexion (5s)
  
  // Streaming
  STREAM_CHUNK_INTERVAL: 1000,      // Intervalle d'envoi des chunks (1s)
  MAX_CHUNK_SIZE: 1024 * 1024,      // Taille max d'un chunk (1MB)
  
  // Vidéo
  DEFAULT_VIDEO_WIDTH: 1280,
  DEFAULT_VIDEO_HEIGHT: 720,
  DEFAULT_FRAME_RATE: 30,
  DEFAULT_BITRATE: 2500000,         // 2.5 Mbps
  
  // HLS
  HLS_SEGMENT_DURATION: 2,          // Durée d'un segment HLS (secondes)
  HLS_PLAYLIST_SIZE: 10,            // Nombre de segments dans la playlist
  
  // Serveurs
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  
  // URL par défaut
  DEFAULT_STREAM_SERVER_URL: 'rtmp://localhost:1935/live',
  DEFAULT_HLS_SERVER_URL: 'http://localhost:8000/live',
  
  // Chat
  MAX_CHAT_MESSAGE_LENGTH: 500,
  CHAT_MESSAGE_HISTORY_LIMIT: 100,
  
  // Super Chat
  SUPER_CHAT_MIN_AMOUNT: 1,
  SUPER_CHAT_MAX_AMOUNT: 1000,
  SUPER_CHAT_PIN_DURATION_PER_EURO: 60, // secondes par euro
  
} as const;

// Filtres vidéo disponibles
export const VIDEO_FILTERS = [
  { id: 'none', name: 'Aucun', type: 'color', config: {}, preview: '🎥' },
  { id: 'beauty', name: 'Beauté', type: 'beauty', config: { smoothness: 0.5 }, preview: '✨' },
  { id: 'vivid', name: 'Vibrant', type: 'color', config: { saturation: 1.3 }, preview: '🌈' },
  { id: 'warm', name: 'Chaud', type: 'color', config: { temperature: 1.2 }, preview: '☀️' },
  { id: 'cool', name: 'Froid', type: 'color', config: { temperature: 0.8 }, preview: '❄️' },
  { id: 'vintage', name: 'Vintage', type: 'effect', config: { sepia: 0.5 }, preview: '📷' },
] as const;

// Catégories de streams
export const STREAM_CATEGORIES = [
  { id: 'all', name: 'Tous les lives', icon: '📡' },
  { id: 'activism', name: 'Activisme', icon: '✊' },
  { id: 'news', name: 'Actualités', icon: '📰' },
  { id: 'education', name: 'Éducation', icon: '📚' },
  { id: 'entertainment', name: 'Divertissement', icon: '🎮' },
  { id: 'music', name: 'Musique', icon: '🎵' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'talk', name: 'Discussion', icon: '💬' },
  { id: 'tech', name: 'Technologie', icon: '💻' },
  { id: 'travel', name: 'Voyage', icon: '✈️' },
] as const;