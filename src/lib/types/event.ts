import type { Tables } from '$lib/database.types';
import type { ScoreTimeRange } from '$lib/utils/timeFilters';

export type Event = Tables<'events'>;

// Keep the settings type as it's specific to our application
export type EventSettings = {
  hole_count?: number;
  accent_color?: string;
  show_hole_in_ones?: boolean;
  enable_ads?: boolean;
  ads_text?: string;
  scorecard_ad_text?: string;
  scorecard_ad_url?: string;
  show_on_main_leaderboard?: boolean;
  score_time_range?: ScoreTimeRange;
};
