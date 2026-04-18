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
  birth_date?: string;
  gender?: 'Homme' | 'Femme' | 'Autre' | '';
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface ReportWithDetails extends Report {
  username: string;
  user_avatar?: string;
  first_name?: string;
  last_name?: string;
  category_name: string;
  category_icon?: string;
  category_color?: string;
  city_name?: string;
  city_country?: string;
  likes_count: number;
  comments_count: number;
  witnesses_count: number;
  shares_count: number;
  user_interactions?: {
    liked: boolean;
    witnessed: boolean;
  };
}

export interface LiveStream {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  is_premium: boolean;
  price: number;
  start_time: string;
  end_time?: string;
  status: 'active' | 'ended' | 'cancelled';
  stream_key: string;
  stream_url: string;
  viewer_count: number;
  like_count: number;
  thumbnail_path?: string;
  created_at: string;
  updated_at: string;
}

export interface LiveStreamWithDetails extends LiveStream {
  username: string;
  avatar?: string;
  first_name?: string;
  last_name?: string;
  subscriber_count: number;
  current_viewers?: number;
  hasAccess?: boolean;
  isSubscribed?: boolean;
}

export interface Comment {
  id: number;
  report_id: number;
  user_id: number;
  parent_id?: number;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  username?: string;
  avatar?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  content: string;
  related_id?: number;
  is_read: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
  color?: string;
  created_at: string;
}

export interface City {
  id: number;
  name: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
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

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  city?: string;
}

export interface CreateReportData {
  title: string;
  description: string;
  category_id: number;
  city_id?: number;
  latitude?: number;
  longitude?: number;
  is_live?: boolean;
  media?: File[];
}

export interface CreateLiveData {
  title: string;
  description?: string;
  is_premium?: boolean;
  price?: number;
}