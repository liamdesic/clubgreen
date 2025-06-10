import { z } from 'zod';

/**
 * Represents a single hole score for a player
 */
export interface PlayerHoleScore {
  player_id: string;
  name: string;
  score: number | null;
  hole_number?: number;
  played_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Represents a player's total score across all holes
 */
export interface PlayerTotalScore {
  player_id: string;
  name: string;
  totalScore: number;
  holeInOnes: number;
  lastUpdated: string;
  scores: (number | null)[]; // Index = hole_number - 1
  
  // For backward compatibility
  id?: string; // Alias for player_id
}

/**
 * Input type for creating/updating a player's score (legacy, consider removing)
 * @deprecated Use PlayerHoleScore for new code
 */
export interface PlayerScoreInput {
  id: string;
  player_id?: string;
  name: string;
  scores: (number | null)[];
}

/**
 * @deprecated Use PlayerHoleScore and PlayerTotalScore instead. This schema is only maintained for backward compatibility.
 * @see PlayerHoleScore For individual hole scores
 * @see PlayerTotalScore For aggregated player scores
 */
export const playerScoreSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  player_id: z.string().uuid('Invalid player ID format'),
  name: z.string().min(1, 'Name is required'),
  scores: z.array(z.union([z.number().int().min(1).max(20), z.null()])),
  totalScore: z.number().int().min(0, 'Score cannot be negative'),
  holeInOnes: z.number().int().min(0, 'Hole-in-ones count cannot be negative'),
  recorded_at: z.string().datetime().optional()
});

/** @deprecated Use PlayerTotalScore instead */
export type PlayerScore = z.infer<typeof playerScoreSchema>;

/** @deprecated Use PlayerHoleScore instead */
export type ScoreRow = PlayerHoleScore;

/**
 * Validates a player score object against the legacy schema
 * @deprecated Use PlayerHoleScore and PlayerTotalScore instead
 */
export function validatePlayerScore(data: unknown): PlayerScore | null {
  const result = playerScoreSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Creates a new PlayerScore from input data (legacy)
 * @deprecated Use createPlayerTotalScore instead
 */
export function createPlayerScore(input: PlayerScoreInput): PlayerScore {
  const totalScore = input.scores.reduce<number>((sum, score) => {
    return score !== null ? sum + score : sum;
  }, 0);
  
  const holeInOnes = input.scores.filter((score): score is number => score === 1).length;
  
  return {
    ...input,
    player_id: input.player_id || input.id,
    totalScore,
    holeInOnes,
    recorded_at: new Date().toISOString()
  };
}

/**
 * Creates a blank player score with the given name and hole count (legacy)
 * @deprecated Use createBlankPlayerHoleScores instead
 */
export function createBlankPlayerScore(name: string, holeCount: number): PlayerScore {
  return {
    id: crypto.randomUUID(),
    player_id: crypto.randomUUID(),
    name,
    scores: Array(holeCount).fill(null),
    totalScore: 0,
    holeInOnes: 0,
    recorded_at: new Date().toISOString()
  };
}

/**
 * Creates an array of blank hole scores for a player
 */
export function createBlankPlayerHoleScores(playerId: string, playerName: string, holeCount: number): PlayerHoleScore[] {
  return Array.from({ length: holeCount }, (_, i) => ({
    player_id: playerId,
    name: playerName,
    score: null,
    hole_number: i + 1,
    created_at: new Date().toISOString()
  }));
}

/**
 * Aggregates hole scores into a player's total score
 */
export function createPlayerTotalScore(holeScores: PlayerHoleScore[]): PlayerTotalScore | null {
  if (!holeScores.length) return null;
  
  // Sort by hole number to ensure consistent order
  const sortedScores = [...holeScores].sort((a, b) => (a.hole_number || 0) - (b.hole_number || 0));
  
  const validScores = sortedScores.filter(
    (s): s is PlayerHoleScore & { score: number } => s.score !== null
  );
  
  const totalScore = validScores.reduce((sum, { score }) => sum + score, 0);
  const holeInOnes = validScores.filter(({ score }) => score === 1).length;
  
  // Create a sparse array of scores by hole number
  const scoresByHole: (number | null)[] = [];
  for (const score of sortedScores) {
    if (score.hole_number !== undefined) {
      scoresByHole[score.hole_number - 1] = score.score;
    }
  }
  
  // Find the most recent update time
  const lastUpdated = sortedScores.reduce((latest, score) => {
    const time = score.updated_at || score.created_at;
    return (time && time > latest) ? time : latest;
  }, '');
  
  return {
    player_id: holeScores[0].player_id,
    name: holeScores[0].name,
    totalScore,
    holeInOnes,
    scores: scoresByHole,
    lastUpdated: lastUpdated || new Date().toISOString(),
    // Backward compatibility
    id: holeScores[0].player_id
  };
}

/**
 * Sorts players by total score (ascending).
 * Tie-breaker: number of hole-in-ones (more is better), then name (A-Z).
 */
export function sortPlayerTotals(scores: PlayerTotalScore[]): PlayerTotalScore[] {
  return [...scores].sort((a, b) => {
    if (a.totalScore !== b.totalScore) {
      return a.totalScore - b.totalScore;
    }
    if (a.holeInOnes !== b.holeInOnes) {
      return b.holeInOnes - a.holeInOnes; // More hole-in-ones is better
    }
    return a.name.localeCompare(b.name);
  });
}
