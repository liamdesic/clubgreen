import type { Event } from '../database';
import type { EventSettings, OrganizationSettings } from './settings';

// Re-export settings types
export type { EventSettings, OrganizationSettings };

export interface PlayerScore {
  id: string;
  name: string;
  totalScore: number;
  hole_in_ones?: number;
  tiebreaker_rank?: number;
  player_id: string;
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
} 