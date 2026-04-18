export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  phone?: string;
  country?: string;
  city?: string;
  nationality?: string;
  birth_date?: Date;
  gender?: 'Homme' | 'Femme' | 'Autre' | '';
  is_admin: boolean;
  is_banned: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Report {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category_id: number;
  city_id?: number;
  latitude?: number;
  longitude?: number;
  media_type?: 'image' | 'video' | 'document';
  media_path?: string;
  is_live: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  views_count: number;
  created_at: Date;
  updated_at: Date;
}

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

export interface Comment {
  id: number;
  report_id: number;
  user_id: number;
  parent_id?: number;
  content: string;
  is_edited: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'welcome' | 'new_report' | 'new_comment' | 'new_like' | 'new_witness' | 'new_live' | 'report_status' | 'system';
  content: string;
  related_id?: number;
  is_read: boolean;
  created_at: Date;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TokenPayload {
  userId: number;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface WebSocketEvent {
  event: string;
  data: any;
  timestamp: Date;
}