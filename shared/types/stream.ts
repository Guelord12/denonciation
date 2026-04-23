// =====================================================
// TYPES PARTAGÉS POUR LE STREAMING
// =====================================================

export interface StreamRoom {
  streamId: string;
  broadcasterId: string;
  viewers: Set<string>;
  startTime: Date;
  heartbeatInterval?: NodeJS.Timeout;
  connectionTimeout?: NodeJS.Timeout;
}

export interface StreamData {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  is_premium: boolean;
  price: number;
  start_time: Date;
  end_time?: Date;
  status: 'active' | 'ended' | 'cancelled' | 'scheduled' | 'paused';
  stream_key: string;
  stream_url: string;
  hls_url?: string;
  viewer_count: number;
  peak_viewers?: number;
  like_count: number;
  thumbnail_path?: string;
  thumbnail_url?: string;
  category?: string;
  tags?: string[];
  channel_id?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  settings?: {
    filter?: string;
    camera_type?: string;
  };
  created_at: Date;
  updated_at: Date;
}

export interface StreamWithDetails extends StreamData {
  username: string;
  avatar?: string;
  first_name?: string;
  last_name?: string;
  channel_name?: string;
  channel_verified?: boolean;
  subscriber_count: number;
  current_viewers?: number;
  hasAccess?: boolean;
  isSubscribed?: boolean;
  messages?: ChatMessage[];
  super_chats?: SuperChat[];
  is_owner?: boolean;
}

export interface ChatMessage {
  id: number;
  live_stream_id: number;
  user_id: number;
  message: string;
  created_at: Date;
  username?: string;
  avatar?: string;
  isModerator?: boolean;
  isPinned?: boolean;
}

export interface SuperChat {
  id: number;
  stream_id: number;
  user_id: number;
  amount: number;
  message: string;
  color: string;
  is_pinned: boolean;
  pin_duration?: number;
  created_at: Date;
  username?: string;
  avatar?: string;
}

export interface Viewer {
  userId: number;
  username: string;
  avatar: string | null;
  joinedAt?: Date;
  lastSeenAt?: Date;
}

export interface StreamStats {
  unique_viewers: number;
  unique_chatters: number;
  total_messages: number;
  total_likes: number;
  total_super_chats: number;
  current_viewers: number;
}

export interface CreateStreamPayload {
  title: string;
  description?: string;
  is_premium: boolean;
  price: number;
  channel_id?: number;
  scheduled_for?: string | null;
  tags?: string[];
  thumbnail?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  settings?: {
    filter?: string;
    camera_type?: string;
  };
  category?: string;
}

export interface StreamFilter {
  id: string;
  name: string;
  type: 'beauty' | 'color' | 'effect';
  config: any;
  preview?: string;
}

export interface WebRTCOffer {
  type: 'offer';
  sdp: string;
}

export interface WebRTCAnswer {
  type: 'answer';
  sdp: string;
}

export interface WebRTCIceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface StreamClip {
  id: number;
  stream_id: number;
  user_id: number;
  title: string;
  start_time: number;
  end_time: number;
  duration: number;
  created_at: Date;
}