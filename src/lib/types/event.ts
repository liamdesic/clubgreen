export interface Event {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  settings_json: {
    hole_count?: number;
    accent_color?: string;
    show_hole_in_ones?: boolean;
    enable_ads?: boolean;
    ads_text?: string;
    scorecard_ad_text?: string;
    scorecard_ad_url?: string;
    show_on_main_leaderboard?: boolean;
  };
  published: boolean;
  created_at: string;
  organization_id: string;
}
