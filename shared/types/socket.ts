// =====================================================
// TYPES POUR LES ÉVÉNEMENTS SOCKET.IO
// =====================================================

// Événements émis par le client
export interface ClientToServerEvents {
  // Streaming
  join_stream: (streamId: string) => void;
  leave_stream: (streamId: string) => void;
  start_broadcast: (data: { streamId: string; userId?: number }) => void;
  end_broadcast: (data: { streamId: string }) => void;
  stream_data: (data: { streamId: string; chunk: string }) => void;
  
  // WebRTC
  webrtc_offer: (data: { streamId: string; offer: any; targetId?: string }) => void;
  webrtc_answer: (data: { targetId: string; answer: any }) => void;
  webrtc_ice_candidate: (data: { targetId: string; candidate: any }) => void;
  webrtc_connection_status: (data: { streamId: string; status: string; error?: string }) => void;
  
  // Chat
  chat_message: (data: { streamId: string; message: string; userId?: number }) => void;
  
  // Interactions
  like_stream: (data: { streamId: string; userId?: number }) => void;
  super_chat: (data: { streamId: string; userId: number; amount: number; message: string; color: string }) => void;
  report_stream: (data: { streamId: string; reason: string; userId: number }) => void;
  
  // Viewers
  get_viewers: (data: { streamId: string }) => void;
  
  // Heartbeat
  heartbeat: () => void;
}

// Événements émis par le serveur
export interface ServerToClientEvents {
  // Streaming
  new_stream: (stream: any) => void;
  stream_ended: (data: { streamId: string; message?: string }) => void;
  stream_ended_global: (data: { streamId: string }) => void;
  stream_started: (data: { streamId: string }) => void;
  stream_updated: (stream: any) => void;
  stream_went_live: (stream: any) => void;
  stream_status: (data: { streamId: string; status: string; broadcasterReady: boolean }) => void;
  broadcaster_ready: (data: { streamId: string; broadcasterId: string }) => void;
  broadcaster_issue: (data: { message: string }) => void;
  no_viewers_warning: (data: { message: string }) => void;
  
  // WebRTC
  webrtc_offer: (data: { socketId: string; offer: any }) => void;
  webrtc_answer: (data: { socketId: string; answer: any }) => void;
  webrtc_ice_candidate: (data: { socketId: string; candidate: any }) => void;
  
  // Spectateurs rejoint
  spectator_joined: (data: { spectatorId: string }) => void;
  
  // Données du stream
  stream_chunk: (data: { streamId: string; chunk: string; timestamp?: number }) => void;
  
  // Chat
  new_chat_message: (message: any) => void;
  moderation_warning: (data: { message: string }) => void;
  
  // Interactions
  like_update: (data: { count: number }) => void;
  new_super_chat: (superChat: any) => void;
  
  // Compteur
  viewer_count_update: (data: { streamId: string; count: number }) => void;
  viewers_list: (data: { viewers: any[] }) => void;
  
  // Signalement
  new_report: (data: { streamId: string; reason: string }) => void;
  
  // Notifications admin
  admin_notification: (data: any) => void;
  stats_update: (data: any) => void;
  
  // Heartbeat
  heartbeat_ack: () => void;
}