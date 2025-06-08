import { writable, derived } from 'svelte/store';
import type { Scorecard, PlayerScore } from '$lib/validations';

// Create a writable store for player scores
const createPlayerStore = () => {
  const { subscribe, set, update } = writable<Scorecard[]>([]);

  return {
    subscribe,
    set,
    // Add new scores
    addScores: (scores: Scorecard[]) => update(current => [...current, ...scores]),
    // Update scores for an event
    updateEventScores: (eventId: string, scores: Scorecard[]) => 
      update(current => {
        const filtered = current.filter(score => score.event_id !== eventId);
        return [...filtered, ...scores];
      }),
    // Remove scores for an event
    removeEventScores: (eventId: string) => 
      update(scores => scores.filter(score => score.event_id !== eventId)),
    // Clear all scores
    clear: () => set([])
  };
};

// Create the store instance
export const playerStore = createPlayerStore();

// Derived store for scores by event
export const scoresByEvent = derived(playerStore, $scores => {
  const scoresByEventId = new Map<string, Scorecard[]>();
  
  $scores.forEach(score => {
    if (!score.event_id) return;
    const eventScores = scoresByEventId.get(score.event_id) || [];
    scoresByEventId.set(score.event_id, [...eventScores, score]);
  });
  
  return scoresByEventId;
});

// Derived store for aggregated player scores (PlayerScore[])
export const playerScores = derived(playerStore, $scores => {
  const map = new Map<string, PlayerScore>();
  for (const score of $scores) {
    if (!score.player_id) continue;
    if (!map.has(score.player_id)) {
      map.set(score.player_id, {
        id: score.player_id,
        name: score.name || 'Unknown Player',
        totalScore: 0,
        holeInOnes: 0,
      });
    }
    const player = map.get(score.player_id)!;
    player.totalScore += score.score || 0;
    player.holeInOnes += score.hole_in_ones || 0;
  }
  return Array.from(map.values());
});

// Helper function to get score stats for an event
export function getEventScoreStats(eventId: string, $scoresByEvent: Map<string, Score[]>) {
  const eventScores = $scoresByEvent.get(eventId) || [];
  const uniquePlayers = new Set(eventScores.map(score => score.player_id));
  
  return {
    scoreCount: eventScores.length,
    playerCount: uniquePlayers.size
  };
} 