import { z } from 'zod';
import type { TimeFilter } from './timeFilter';
import type { PlayerTotalScore } from './playerScore';

/**
 * Represents a player's score in the leaderboard snapshot
 */
export interface LeaderboardScore {
  player_id: string;
  name: string;
  scores: (number | null)[]; // Index = hole_number - 1
  holeInOnes: number;
  totalScore: number;
  lastUpdated: string;
  id?: string; // Optional alias for player_id
}

/**
 * Zod schema for validating leaderboard scores
 */
export const leaderboardScoreSchema = z.object({
  player_id: z.string(),
  name: z.string(),
  scores: z.array(z.number().nullable()),
  holeInOnes: z.number(),
  totalScore: z.number(),
  lastUpdated: z.string(),
  id: z.string().optional()
});

/**
 * Validates an array of leaderboard scores
 */
export function validateLeaderboardScores(scores: unknown): LeaderboardScore[] | null {
  const scoreArraySchema = z.array(leaderboardScoreSchema);
  const parsed = scoreArraySchema.safeParse(scores);
  return parsed.success ? parsed.data : null;
}

/**
 * Represents a single board in the leaderboard rotation
 */
export interface LeaderboardBoard {
  /** Unique identifier for the board (matches leaderboard_snapshot.id) */
  id: string;
  
  /** The event ID this board is associated with */
  eventId: string;
  
  /** The time filter applied to this board */
  timeFilter: TimeFilter;
  
  /** Display title for the board */
  title: string;
  
  /** Optional priority for board ordering */
  priority?: number;
}

/**
 * View state for a leaderboard board
 */
export interface LeaderboardBoardView {
  /** The board configuration */
  board: LeaderboardBoard;
  
  /** Current scores for the board */
  scores: LeaderboardScore[] | null;
  
  /** Any error that occurred */
  error: string | null;
  
  /** Whether the board is currently loading */
  loading: boolean;
  
  /** When the board was last updated */
  lastUpdated: string | null;
}

/**
 * State for leaderboard rotation
 */
export interface LeaderboardRotationState {
  /** All available boards */
  boards: LeaderboardBoard[];
  
  /** ID of the currently active board */
  activeBoardId: string | null;
  
  /** Whether rotation is enabled */
  rotationEnabled: boolean;
  
  /** Rotation interval in milliseconds */
  rotationIntervalMs: number;
  
  /** When the current board was activated */
  boardActivatedAt: number | null;
  
  /** When the next rotation will occur */
  nextRotationAt: number | null;
} 