import { SvelteComponent } from 'svelte';
import type { ScoreTimeRange } from '$lib/utils/timeFilters';

export interface PlayerScore {
  id: string;
  name: string;
  totalScore: number;
  holeInOnes: number;
}

export interface EventSettings {
  id: string;
  title: string;
  hole_count: number;
  accent_color?: string; // Keep for backward compatibility
  settings_json?: {
    accent_color?: string;
    score_time_range?: ScoreTimeRange;
    [key: string]: any;
  };
  logo_url?: string;
  enable_ads?: boolean;
  ads_text?: string;
  ads_url?: string;
  ads_image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationSettings {
  id: string;
  name: string;
  logo_url: string;
  accent_color?: string;
  ad_image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventLeaderboardViewProps {
  org: string;
  event: string | EventSettings;
  organizationSettings?: Partial<OrganizationSettings>;
  leaderboard?: PlayerScore[];
  qrCodeUrl?: string;
  showQr?: boolean;
  showAds?: boolean;
  debug?: boolean;
  hydrateFromSupabase?: boolean;
  fullscreenable?: boolean;
  realtimeUpdates?: boolean;
  initialScores?: PlayerScore[];
  initialEventSettings?: Partial<EventSettings>;
  initialOrganizationSettings?: Partial<OrganizationSettings>;
  showLoadingIndicator?: boolean;
  showErrorMessages?: boolean;
}

export default class EventLeaderboardView extends SvelteComponent<EventLeaderboardViewProps> {}
