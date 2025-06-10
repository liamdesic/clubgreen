import type { TimeFilter } from './timeFilter';
import type { PlayerTotalScore } from './playerScore';

/**
 * Represents a single board in the leaderboard rotation
 */
export interface LeaderboardBoard {
  eventId: string;
  timeFilter: TimeFilter;
}

/**
 * Represents the view state for a single board
 */
export interface LeaderboardBoardView {
  board: LeaderboardBoard;
  scores: PlayerTotalScore[];
  loading: boolean;
  error: string | null;
  lastUpdated?: string;
}

/**
 * Represents the full rotation state for the leaderboard
 */
export interface LeaderboardRotationState {
  boards: LeaderboardBoard[];
  currentIndex: number;
  intervalMs: number;
  timeRemaining: number;
  currentBoard: LeaderboardBoard | null;
} 