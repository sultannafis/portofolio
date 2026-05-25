export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar_url: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  thumbnail_public_id: string;
  github_url: string;
  demo_url: string;
  video_url: string;
  documentation_url: string;
  category: string;
  tags: string;
  year: number;
  is_published: boolean;
  sort_order: number;
  media: ProjectMedia[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMedia {
  id: string;
  project_id: string;
  media_url: string;
  public_id: string;
  media_type: string;
  sort_order: number;
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  proficiency: number;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issue_date: string;
  expiry_date: string;
  credential_url: string;
  image_url: string;
  image_public_id: string;
  is_published: boolean;
  created_at: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  description: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  company_logo_url: string;
  company_logo_public_id: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Visitor {
  id: string;
  ip_address: string;
  user_agent: string;
  page: string;
  country: string;
  city: string;
  session_id: string;
  created_at: string;
}

export interface APIResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface DashboardStats {
  total_projects: number;
  unread_messages: number;
  today_visitors: number;
  total_visitors: number;
  daily_stats: { date: string; count: number }[];
}

export interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
}
