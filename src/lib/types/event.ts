import type { Database } from '$lib/database.types';
import type { ScoreTimeRange } from '$lib/utils/timeFilters';

export type Score = Database['public']['Tables']['scorecard']['Row'];

export interface EventSettings {
  accent_color?: string;
  score_time_range?: ScoreTimeRange;
  hole_count?: number;
  show_hole_in_ones?: boolean;
  enable_ads?: boolean;
  scorecard_ad_text?: string;
  scorecard_ad_url?: string;
  show_on_main_leaderboard?: boolean;
  event_type?: 'single' | 'ongoing';
  additional_time_filters?: ScoreTimeRange[];
  archived?: boolean;
}

export type Event = Omit<Database['public']['Tables']['events']['Row'], 'settings_json'> & {
  settings_json: EventSettings | null;
};
