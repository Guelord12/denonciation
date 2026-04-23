// =====================================================
// CONSTANTES DES ÉVÉNEMENTS SOCKET.IO
// =====================================================

export const SOCKET_EVENTS = {
  // Connexion
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',
  
  // Streaming
  JOIN_STREAM: 'join_stream',
  LEAVE_STREAM: 'leave_stream',
  START_BROADCAST: 'start_broadcast',
  END_BROADCAST: 'end_broadcast',
  STREAM_DATA: 'stream_data',
  STREAM_CHUNK: 'stream_chunk',
  
  // Stream status
  NEW_STREAM: 'new_stream',
  STREAM_ENDED: 'stream_ended',
  STREAM_ENDED_GLOBAL: 'stream_ended_global',
  STREAM_STARTED: 'stream_started',
  STREAM_UPDATED: 'stream_updated',
  STREAM_WENT_LIVE: 'stream_went_live',
  STREAM_STATUS: 'stream_status',
  BROADCASTER_READY: 'broadcaster_ready',
  BROADCASTER_ISSUE: 'broadcaster_issue',
  NO_VIEWERS_WARNING: 'no_viewers_warning',
  
  // WebRTC
  WEBRTC_OFFER: 'webrtc_offer',
  WEBRTC_ANSWER: 'webrtc_answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc_ice_candidate',
  WEBRTC_CONNECTION_STATUS: 'webrtc_connection_status',
  SPECTATOR_JOINED: 'spectator_joined',
  
  // Chat
  CHAT_MESSAGE: 'chat_message',
  NEW_CHAT_MESSAGE: 'new_chat_message',
  MODERATION_WARNING: 'moderation_warning',
  
  // Interactions
  LIKE_STREAM: 'like_stream',
  LIKE_UPDATE: 'like_update',
  SUPER_CHAT: 'super_chat',
  NEW_SUPER_CHAT: 'new_super_chat',
  REPORT_STREAM: 'report_stream',
  NEW_REPORT: 'new_report',
  
  // Viewers
  GET_VIEWERS: 'get_viewers',
  VIEWERS_LIST: 'viewers_list',
  VIEWER_COUNT_UPDATE: 'viewer_count_update',
  
  // Heartbeat
  HEARTBEAT: 'heartbeat',
  HEARTBEAT_ACK: 'heartbeat_ack',
  
  // Admin
  ADMIN_NOTIFICATION: 'admin_notification',
  STATS_UPDATE: 'stats_update',
} as const;

// Type pour les valeurs d'événements
export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];