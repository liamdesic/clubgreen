// Utility functions for player score calculation and ordering
// Used by both scorecard and leaderboard for DRY, consistent logic

import type { PlayerHoleScore, PlayerTotalScore } from '$lib/validations/playerScore';
import { createBlankPlayerHoleScores } from '$lib/validations/playerScore';

/**
 * Generates a new unique ID (UUID v4)
 * @returns string
 */
export function generateId(): string {
  return crypto.randomUUID();
}

// Export generateId as generateGameId for backward compatibility
export const generateGameId = generateId;

/**
 * Calculates the total score from an array of hole scores
 * @param holeScores - Array of hole scores (number or null)
 * @returns Total score (sum of all non-null scores)
 */
export function calculateTotalScore(holeScores: (number | null)[]): number {
  return holeScores.reduce<number>((sum, score) => {
    return score !== null ? sum + score : sum;
  }, 0);
}

/**
 * Counts the number of holes-in-one (score === 1) in an array of hole scores
 * @param holeScores - Array of hole scores (number or null)
 * @returns Number of holes-in-one
 */
export function countHoleInOnes(holeScores: (number | null)[]): number {
  return holeScores.filter(score => score === 1).length;
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
 * Checks if all holes have been scored (no nulls).
 * @param holeScores - Array of hole scores (number or null)
 * @returns true if complete, false otherwise
 */
export function isRoundComplete(holeScores: (number | null)[]): boolean {
  return holeScores.every(score => score !== null);
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
  return !!scoreCounts[eventId] && scoreCounts[eventId] > 0;
}

/**
 * Gets the total score for a player from an array of hole scores
 * @param holeScores - Array of PlayerHoleScore objects
 * @returns Total score (sum of all non-null scores)
 */
export function getPlayerTotalScore(holeScores: PlayerHoleScore[]): number {
  return holeScores.reduce((sum, { score }) => sum + (score || 0), 0);
}

/**
 * Gets the number of hole-in-ones for a player from an array of hole scores
 * @param holeScores - Array of PlayerHoleScore objects
 * @returns Number of holes-in-one
 */
export function getPlayerHoleInOnes(holeScores: PlayerHoleScore[]): number {
  return holeScores.filter(({ score }) => score === 1).length;
}

/**
 * Gets the last updated timestamp from an array of hole scores
 * @param holeScores - Array of PlayerHoleScore objects
 * @returns ISO timestamp string of the most recent update, or undefined if no scores
 */
export function getLastUpdated(holeScores: PlayerHoleScore[]): string | undefined {
  if (holeScores.length === 0) return undefined;
  
  return holeScores
    .map(score => score.updated_at || score.created_at || '')
    .filter(Boolean)
    .sort()
    .pop();
}

/**
 * Creates a blank player with the given name and hole count
 * @param name - Player's name
 * @param holeCount - Number of holes in the game
 * @returns A new player object with blank scores
 */
export function createBlankPlayer(name: string, holeCount: number) {
  const playerId = generateId();
  const holeScores = createBlankPlayerHoleScores(playerId, name, holeCount);
  
  return {
    id: playerId,
    name,
    scores: holeScores.map(score => score.score),
    holeInOnes: 0,
    totalScore: 0
  };
}
