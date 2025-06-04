import type { ScoreTimeRange } from '$lib/utils/timeFilters';

export interface OrganizationSettings {
  logo_url?: string;
  accent_color?: string;
  ad_image_url?: string;
  ad_link?: string;
  billing_email?: string;
  settings_json?: {
    logo_url?: string;
    accent_color?: string;
    ad_image_url?: string;
    ad_link?: string;
    billing_email?: string;
  };
}

export interface EventSettings {
  id?: string;
  title?: string;
  hole_count?: number;
  settings_json?: {
    accent_color?: string;
    score_time_range?: ScoreTimeRange;
    hole_count?: number;
    show_hole_in_ones?: boolean;
    enable_ads?: boolean;
    ads_text?: string;
    scorecard_ad_text?: string;
    scorecard_ad_url?: string;
    show_on_main_leaderboard?: boolean;
    logo_url?: string;
    ads_url?: string;
    ads_image_url?: string | null;
  };
  logo_url?: string;
  enable_ads?: boolean;
  ads_text?: string;
  ads_url?: string;
  ads_image_url?: string | null;
  created_at?: string;
  updated_at?: string;
} 