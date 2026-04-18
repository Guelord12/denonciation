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

export interface UserStats {
  total_reports: number;
  approved_reports: number;
  pending_reports: number;
  rejected_reports: number;
  total_comments: number;
  total_likes_received: number;
  total_likes_given: number;
  total_streams: number;
  total_views: number;
  account_age_days: number;
}

export interface UserProfile extends User {
  stats: UserStats;
}