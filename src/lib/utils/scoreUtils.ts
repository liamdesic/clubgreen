// Utility functions for player score calculation and ordering
// Used by both scorecard and leaderboard for DRY, consistent logic

export interface PlayerScoreInput {
  id: string;
  name: string;
  scores: (number | null)[];
}

export interface PlayerScoreResult extends PlayerScoreInput {
  totalScore: number;
  holeInOnes: number;
}

/**
 * Generates a new unique player ID (UUID v4)
 * @returns string
 */
export function generatePlayerId(): string {
  return crypto.randomUUID();
}

/**
 * Generates a new unique game ID (UUID v4)
 * @returns string
 */
export function generateGameId(): string {
  return crypto.randomUUID();
}

/**
 * Calculates the total score for a player (sum of all non-null scores)
 * @param scores - Array of scores (number or null)
 * @returns Total score (number)
 */
export function calculateTotalScore(scores: (number | null)[]): number {
  return scores.reduce((sum: number, s) => (typeof s === 'number' ? sum + s : sum), 0);
}

/**
 * Counts the number of holes-in-one (score === 1)
 * @param scores - Array of scores (number or null)
 * @returns Number of holes-in-one
 */
export function countHoleInOnes(scores: (number | null)[]): number {
  return scores.filter(s => s === 1).length;
}

/**
 * Calculates the total score and holes-in-one for a player
 * @param player - PlayerScoreInput
 * @returns PlayerScoreResult with totalScore and holeInOnes
 */
export function calculatePlayerScore(player: PlayerScoreInput): PlayerScoreResult {
  return {
    ...player,
    totalScore: calculateTotalScore(player.scores),
    holeInOnes: countHoleInOnes(player.scores)
  };
}

/**
 * Sorts players by total score (ascending). Tie-breaker: order of input array.
 * @param players - Array of PlayerScoreResult
 * @returns Sorted array
 */
export function sortPlayersByScore(players: PlayerScoreResult[]): PlayerScoreResult[] {
  return [...players].sort((a, b) => a.totalScore - b.totalScore);
}

/**
 * Creates a blank player object with the given name and hole count.
 * @param name - Player name
 * @param holeCount - Number of holes in the game
 * @returns PlayerScoreResult
 */
export function createBlankPlayer(name: string, holeCount: number): PlayerScoreResult {
  return {
    id: generatePlayerId(),
    name,
    scores: Array(holeCount).fill(null),
    totalScore: 0,
    holeInOnes: 0
  };
}

/**
 * Validates if a score is a number within the allowed range (inclusive).
 * @param score - The value to check
 * @param min - Minimum allowed (default: 1)
 * @param max - Maximum allowed (default: 20)
 * @returns true if valid, false otherwise
 */
export function isValidScore(score: unknown, min = 1, max = 20): boolean {
  return typeof score === 'number' && Number.isFinite(score) && score >= min && score <= max;
}

/**
 * Checks if all players have scored all holes (no nulls in their scores array).
 * @param players - Array of PlayerScoreResult
 * @param holeCount - Number of holes in the game
 * @returns true if complete, false otherwise
 */
export function isGameComplete(players: PlayerScoreResult[], holeCount: number): boolean {
  return players.every(p => p.scores.length === holeCount && p.scores.every(s => typeof s === 'number'));
}

/**
 * Formats a score for display (dash for null, number as string otherwise).
 * @param score - The score value (number or null)
 * @returns string
 */
export function formatScore(score: number | null): string {
  return score === null ? '-' : score.toString();
}

/**
 * Checks if an event has any scores
 * @param eventId - The ID of the event
 * @param scoreCounts - Object mapping event IDs to their score counts
 * @returns boolean - True if the event has at least one score
 */
export function hasScores(eventId: string, scoreCounts: Record<string, number>): boolean {
  return (scoreCounts[eventId] || 0) > 0;
}
