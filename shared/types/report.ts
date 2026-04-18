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