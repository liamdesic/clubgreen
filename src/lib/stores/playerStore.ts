import { writable, derived } from 'svelte/store';
import type { Score } from '$lib/types';

// Create a writable store for player scores
const createPlayerStore = () => {
  const { subscribe, set, update } = writable<Score[]>([]);

  return {
    subscribe,
    set,
    // Add new scores
    addScores: (scores: Score[]) => update(current => [...current, ...scores]),
    // Update scores for an event
    updateEventScores: (eventId: string, scores: Score[]) => 
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
  const scoresByEventId = new Map<string, Score[]>();
  
  $scores.forEach(score => {
    if (!score.event_id) return;
    const eventScores = scoresByEventId.get(score.event_id) || [];
    scoresByEventId.set(score.event_id, [...eventScores, score]);
  });
  
  return scoresByEventId;
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