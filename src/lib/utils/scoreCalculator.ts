import type { PlayerHoleScore, PlayerTotalScore } from '$lib/validations/playerScore';
import { createPlayerTotalScore } from '$lib/validations/playerScore';

/**
 * @deprecated Use PlayerTotalScore from '$lib/validations/playerScore' instead
 */
export type LeaderboardPlayerScore = PlayerTotalScore;

/**
 * Aggregates hole scores into player total scores
 * @param holeScores - Array of individual hole scores
 * @param filterFn - Optional filter function to include only specific scores
 * @returns Array of aggregated player scores with totals and hole details
 */
export function aggregatePlayerScores(
  holeScores: PlayerHoleScore[],
  filterFn: (score: PlayerHoleScore) => boolean = () => true
): PlayerTotalScore[] {
  // Group by player_id, applying the filter
  const scoresByPlayer = holeScores.reduce<Record<string, PlayerHoleScore[]>>((acc, score) => {
    if (filterFn(score)) {
      if (!acc[score.player_id]) {
        acc[score.player_id] = [];
      }
      acc[score.player_id].push(score);
    }
    return acc;
  }, {});

  // Calculate totals for each player
  const result: PlayerTotalScore[] = [];
  
  for (const playerScores of Object.values(scoresByPlayer)) {
    const playerTotal = createPlayerTotalScore(playerScores);
    if (playerTotal) {
      result.push(playerTotal);
    }
  }
  
  return result;
}

/**
 * Sorts player scores by total score (ascending), hole-in-ones (descending), and name (ascending)
 * @param scores - Array of player total scores to sort
 * @returns Sorted array of player scores
 */
export function sortPlayerScores(scores: PlayerTotalScore[]): PlayerTotalScore[] {
  return [...scores].sort((a, b) => {
    // First by total score (ascending)
    if (a.totalScore !== b.totalScore) {
      return a.totalScore - b.totalScore;
    }
    
    // Then by hole-in-ones (descending)
    if (a.holeInOnes !== b.holeInOnes) {
      return b.holeInOnes - a.holeInOnes;
    }
    
    // Finally by name (ascending)
    return a.name.localeCompare(b.name);
  });
}

/**
 * Gets the top N player scores, sorted by score and hole-in-ones
 * @param holeScores - Array of individual hole scores
 * @param limit - Maximum number of top scores to return (default: 10)
 * @returns Array of top player scores
 */
export function getTopPlayerScores(
  holeScores: PlayerHoleScore[],
  limit: number = 10
): PlayerTotalScore[] {
  const aggregated = aggregatePlayerScores(holeScores);
  return sortPlayerScores(aggregated).slice(0, limit);
}

/**
 * Calculates and sorts player scores in one function (convenience function)
 * @deprecated Use getTopPlayerScores instead
 */
export function calculateAndSortScores(
  holeScores: PlayerHoleScore[],
  limit?: number
): PlayerTotalScore[] {
  return getTopPlayerScores(holeScores, limit);
}

/**
 * @deprecated Use aggregatePlayerScores instead
 */
export function calculateLeaderboardScores(scores: PlayerHoleScore[]): PlayerTotalScore[] {
  return aggregatePlayerScores(scores);
}

/**
 * Gets a player's score by their ID
 * @param playerId - The ID of the player
 * @param holeScores - Array of individual hole scores
 * @returns The player's total score or null if not found
 */
export function getPlayerScore(
  playerId: string,
  holeScores: PlayerHoleScore[]
): PlayerTotalScore | null {
  const playerScores = holeScores.filter(score => score.player_id === playerId);
  return playerScores.length > 0 ? createPlayerTotalScore(playerScores) : null;
}

/**
 * Gets scores for multiple players by their IDs
 * @param playerIds - Array of player IDs
 * @param holeScores - Array of individual hole scores
 * @returns Array of player total scores, sorted by score
 */
export function getPlayerScores(
  playerIds: string[],
  holeScores: PlayerHoleScore[]
): PlayerTotalScore[] {
  if (playerIds.length === 0) return [];
  
  // Use a Set for O(1) lookups
  const playerIdSet = new Set(playerIds);
  
  // Reuse aggregatePlayerScores with a filter function
  const filteredScores = aggregatePlayerScores(
    holeScores,
    score => playerIdSet.has(score.player_id)
  );
  
  return sortPlayerScores(filteredScores);
}
