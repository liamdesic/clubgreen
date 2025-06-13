import type { TimeFilter } from '$lib/validations/timeFilter';
import type { LeaderboardBoard, LeaderboardScore } from '$lib/validations/leaderboardView';

/**
 * Configuration for the board runtime
 */
export interface BoardRuntimeConfig {
  /** Whether board rotation is enabled */
  rotationEnabled: boolean;
  
  /** Rotation interval in milliseconds */
  rotationIntervalMs: number;
  
  /** Optional error handler */
  onError?: (error: Error) => void;
}

/**
 * Runtime status information
 */
export interface BoardRuntimeStatus {
  /** Whether board rotation is enabled */
  isRotating: boolean;
  
  /** Rotation interval in milliseconds */
  rotationIntervalMs: number;
  
  /** Number of boards in the rotation */
  boardCount: number;
  
  /** ID of the currently active board */
  activeBoardId: string | null;
  
  /** Timestamp when the next rotation will occur */
  nextRotationAt: number | null;
  
  /** Time until next rotation in milliseconds */
  timeUntilRotation: number | null;
  
  /** When the status was last updated */
  lastUpdated: string;
}

/**
 * State for a single board in the runtime
 */
export interface BoardState {
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
  
  /** Function to unsubscribe from updates */
  unsubscribe: () => void;
}

/**
 * Internal runtime state
 */
export interface BoardRuntimeState {
  /** Map of board ID to board state */
  boards: Record<string, BoardState>;
  
  /** ID of the currently active board */
  activeBoardId: string | null;
  
  /** Rotation timer handle */
  rotationTimer: NodeJS.Timeout | null;
  
  /** Timestamp when the next rotation will occur */
  nextRotationAt: number | null;
  
  /** Runtime configuration */
  config: BoardRuntimeConfig;
}

/**
 * The board runtime interface
 */
export interface BoardRuntime {
  /** Subscribe to runtime state changes */
  subscribe: (callback: (state: BoardRuntimeState) => void) => () => void;
  
  /** Initialize the runtime with configuration */
  initialize: (config?: Partial<BoardRuntimeConfig>) => () => void;
  
  /** Set the boards to display */
  setBoards: (boards: LeaderboardBoard[]) => void;
  
  /** Start the board rotation */
  startRotation: () => void;
  
  /** Stop the board rotation */
  stopRotation: () => void;
  
  /** Set the active board by ID */
  setActiveBoard: (boardId: string) => void;
  
  /** Get the current runtime status */
  getStatus: () => BoardRuntimeStatus;
}
