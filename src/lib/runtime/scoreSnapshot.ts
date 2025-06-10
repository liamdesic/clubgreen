import { supabase } from '$lib/supabaseClient';
import { get } from 'svelte/store';
import { parseLeaderboardScores } from '$lib/utils/leaderboardUtils';
import type { LeaderboardBoard } from './board.types';

type UnsubscribeFn = () => void;

/**
 * Subscribes to real-time updates for a leaderboard snapshot
 * @param board - The board configuration
 * @param onUpdate - Callback when scores are updated
 * @returns Unsubscribe function
 */
export function subscribeToLeaderboard(
  board: LeaderboardBoard,
  onUpdate: (scores: any[] | null, error: string | null) => void
): UnsubscribeFn {
  // Initial fetch
  fetchLeaderboardSnapshot(board.eventId, board.timeFilter)
    .then(scores => onUpdate(scores, null))
    .catch(error => onUpdate(null, error.message));

  // Set up real-time subscription
  const channel = supabase
    .channel(`leaderboard:${board.eventId}:${board.timeFilter}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'leaderboard_snapshot',
        filter: `event_id=eq.${board.eventId}`,
      },
      async (payload) => {
        try {
          const snapshot = payload.new;
          if (snapshot.time_filter !== board.timeFilter) return;
          
          const scores = await parseLeaderboardScores(snapshot.scores);
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
 * @param eventId - The event ID
 * @param timeFilter - Time filter for the leaderboard
 * @returns Promise with the scores or null if not found
 */
export async function fetchLeaderboardSnapshot(
  eventId: string,
  timeFilter: string
): Promise<any[] | null> {
  const { data, error } = await supabase
    .from('leaderboard_snapshot')
    .select('scores')
    .eq('event_id', eventId)
    .eq('time_filter', timeFilter)
    .single();

  if (error) {
    throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return parseLeaderboardScores(data.scores);
}

/**
 * Triggers a refresh of the leaderboard snapshot
 * @param eventId - The event ID
 * @param timeFilter - Time filter for the leaderboard
 */
export async function triggerLeaderboardUpdate(
  eventId: string,
  timeFilter: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.functions.invoke('update-leaderboard', {
      body: { eventId, timeFilter },
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error triggering leaderboard update:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
