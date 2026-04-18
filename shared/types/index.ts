export * from './user';
export * from './report';
export * from './live';

export interface Category {
  id: number;
  name: string;
  icon?: string;
  color?: string;
  created_at: Date;
}

export interface City {
  id: number;
  name: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  created_at: Date;
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