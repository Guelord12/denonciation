// =====================================================
// FONCTIONS UTILITAIRES POUR LE STREAMING
// =====================================================

/**
 * Génère une clé de stream unique
 */
export function generateStreamKey(userId: number): string {
  const prefix = 'live_';
  const random = Math.random().toString(36).substring(2, 18);
  const timestamp = Date.now().toString(36);
  return `${prefix}${userId}_${random}_${timestamp}`;
}

/**
 * Construit l'URL HLS à partir d'une clé de stream
 */
export function buildHlsUrl(streamKey: string, baseUrl?: string): string {
  const serverUrl = baseUrl || 'http://localhost:8000/live';
  return `${serverUrl}/${streamKey}/index.m3u8`;
}

/**
 * Construit l'URL RTMP à partir d'une clé de stream
 */
export function buildRtmpUrl(streamKey: string, baseUrl?: string): string {
  const serverUrl = baseUrl || 'rtmp://localhost:1935/live';
  return `${serverUrl}/${streamKey}`;
}

/**
 * Formate un timestamp pour l'affichage
 */
export function formatStreamDuration(startTime: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(startTime).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formate un compteur de spectateurs
 */
export function formatViewerCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Vérifie si un stream est actif
 */
export function isStreamActive(status: string): boolean {
  return status === 'active';
}

/**
 * Vérifie si un stream est planifié
 */
export function isStreamScheduled(status: string): boolean {
  return status === 'scheduled';
}

/**
 * Vérifie si un stream est terminé
 */
export function isStreamEnded(status: string): boolean {
  return status === 'ended';
}

/**
 * Extrait l'ID d'un paramètre de route (gère les tableaux)
 */
export function getParamId(params: any): string {
  if (!params) return '';
  if (Array.isArray(params.id)) return params.id[0];
  return String(params.id || '');
}

/**
 * Vérifie si une connexion WebRTC est supportée
 */
export function isWebRTCSupported(): boolean {
  return typeof RTCPeerConnection !== 'undefined';
}

/**
 * Vérifie si HLS est supporté
 */
export function isHLSSupported(videoElement?: HTMLVideoElement): boolean {
  if (typeof window === 'undefined') return false;
  if (videoElement) {
    return videoElement.canPlayType('application/vnd.apple.mpegurl') !== '';
  }
  return false;
}

/**
 * Détecte le type de flux (HLS ou WebRTC)
 */
export function detectStreamType(stream: { hls_url?: string; stream_url?: string }): 'hls' | 'webrtc' | 'unknown' {
  if (stream.hls_url) return 'hls';
  if (stream.stream_url) return 'webrtc';
  return 'unknown';
}

/**
 * Filtre les gros mots basiques (version simple)
 */
export function filterBasicBadWords(message: string): string {
  const badWords = ['insulte1', 'insulte2']; // À compléter
  let filtered = message;
  badWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '***');
  });
  return filtered;
}

/**
 * Valide un titre de stream
 */
export function validateStreamTitle(title: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length < 3) {
    return { valid: false, error: 'Le titre doit contenir au moins 3 caractères' };
  }
  if (title.trim().length > 100) {
    return { valid: false, error: 'Le titre ne peut pas dépasser 100 caractères' };
  }
  return { valid: true };
}