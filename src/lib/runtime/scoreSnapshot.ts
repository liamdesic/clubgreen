import { supabase } from '$lib/supabaseClient';
import { get } from 'svelte/store';
import type { LeaderboardBoard, LeaderboardScore } from '$lib/validations/leaderboardView';
import { validateLeaderboardScores } from '$lib/validations/leaderboardView';
import type { TimeFilter } from '$lib/validations/timeFilter';

type UnsubscribeFn = () => void;

/**
 * Subscribes to real-time updates for a leaderboard snapshot
 * @param board - The board configuration
 * @param onUpdate - Callback when scores are updated
 * @returns Unsubscribe function
 */
export function subscribeToLeaderboard(
  board: LeaderboardBoard,
  onUpdate: (scores: LeaderboardScore[] | null, error: string | null) => void
): UnsubscribeFn {
  // Initial fetch
  fetchLeaderboardSnapshot(board.eventId, board.timeFilter)
    .then(scores => onUpdate(scores, null))
    .catch(error => onUpdate(null, error.message));

  // Set up real-time subscription
  const channel = supabase
    .channel(`leaderboard:${board.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'leaderboard_snapshot',
        filter: `id=eq.${board.id}`,
      },
      async (payload) => {
        try {
          const snapshot = payload.new;
          const scores = validateLeaderboardScores(snapshot.scores);
          if (!scores) {
            throw new Error('Invalid scores format');
          }
          onUpdate(scores, null);
        } catch (error) {
          console.error('Error processing real-time update:', error);
          onUpdate(null, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    channel.unsubscribe();
  };
}

/**
 * Fetches the current leaderboard snapshot
 */
export async function fetchLeaderboardSnapshot(
  eventId: string,
  timeFilter: TimeFilter
): Promise<LeaderboardScore[]> {
  const { data, error } = await supabase
    .from('leaderboard_snapshot')
    .select('scores')
    .eq('event_id', eventId)
    .eq('time_filter', timeFilter)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  const scores = validateLeaderboardScores(data.scores);
  if (!scores) {
    throw new Error('Invalid scores format');
  }
  return scores;
}

/**
 * Triggers a refresh of the leaderboard snapshot
 */
export async function triggerLeaderboardUpdate(
  eventId: string,
  timeFilter: TimeFilter
): Promise<void> {
  const { error } = await supabase.functions.invoke('update-leaderboard', {
    body: { eventId, timeFilter }
  });

  if (error) {
    throw new Error(`Failed to trigger update: ${error.message}`);
  }
}
