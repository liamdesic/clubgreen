import type { TimeFilter } from '$lib/validations/timeFilter';
import type { PlayerTotalScore } from '$lib/validations/playerScore';

/**
 * Represents a single leaderboard board configuration
 */
export interface LeaderboardBoard {
  /** Unique identifier for the board */
  id: string;
  
  /** The event ID this board is associated with */
  eventId: string;
  
  /** The time filter applied to this board */
  timeFilter: TimeFilter;
  
  /** Optional display title for the board */
  title?: string;
  
  /** Optional priority for board ordering */
  priority?: number;
  
  /** Whether this board is currently active/visible */
  isActive?: boolean;
}

/**
 * Represents the runtime state of a board
 */
export interface BoardState {
  /** The board configuration */
  board: LeaderboardBoard;
  
  /** The current scores for this board */
  scores: PlayerTotalScore[] | null;
  
  /** Error state, if any */
  error: string | null;
  
  /** Loading state */
  loading: boolean;
  
  /** Last updated timestamp */
  lastUpdated: string | null;
}

/**
 * Configuration for the board runtime
 */
export interface BoardRuntimeConfig {
  /** Rotation interval in milliseconds */
  rotationIntervalMs: number;
  
  /** Whether rotation is enabled */
  rotationEnabled: boolean;
  
  /** Callback when the active board changes */
  onBoardChange?: (board: LeaderboardBoard) => void;
  
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * Runtime status information
 */
export interface BoardRuntimeStatus {
  /** Current active board ID */
  activeBoardId: string | null;
  
  /** Time remaining until next rotation (ms) */
  timeUntilRotation: number;
  
  /** Whether the runtime is currently rotating boards */
  isRotating: boolean;
  
  /** Timestamp of last update */
  lastUpdated: string | null;
  
  /** Number of boards in rotation */
  boardCount: number;
}
