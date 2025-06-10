// Core runtime
export { boardRuntime, activeBoard, currentScores, runtimeStatus } from './boardRuntime';
export type { BoardRuntime, LeaderboardBoard, BoardRuntimeStatus } from './board.types';

// Snapshot handling
export { subscribeToLeaderboard, fetchLeaderboardSnapshot, triggerLeaderboardUpdate } from './scoreSnapshot';

// Re-export types for convenience
export type { PlayerTotalScore } from '$lib/validations/playerScore';
export type { TimeFilter } from '$lib/validations/timeFilter';
