export interface LiveStream {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  is_premium: boolean;
  price: number;
  start_time: Date;
  end_time?: Date;
  status: 'active' | 'ended' | 'cancelled';
  stream_key: string;
  stream_url: string;
  viewer_count: number;
  like_count: number;
  thumbnail_path?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LiveStreamWithDetails extends LiveStream {
  username: string;
  avatar?: string;
  first_name?: string;
  last_name?: string;
  subscriber_count: number;
  current_viewers?: number;
}

export interface ChatMessage {
  id: number;
  live_stream_id: number;
  user_id: number;
  message: string;
  created_at: Date;
  username?: string;
  avatar?: string;
}