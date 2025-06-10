import { supabase } from '$lib/supabaseClient';
import { writable } from 'svelte/store';
import type { TimeFilter } from '$lib/validations/timeFilter';
import type { PlayerTotalScore } from '$lib/validations/playerScore';
import type { Database } from '$lib/database.types';
import { parseLeaderboardScores } from '$lib/utils/leaderboardUtils';

// Use the existing PlayerTotalScore interface for type safety
type ScoreArray = PlayerTotalScore[];

type LeaderboardSnapshot = Omit<Database['public']['Tables']['leaderboard_snapshot']['Row'], 'scores'> & {
  scores: PlayerTotalScore[];
};

export const snapshotStore = writable<LeaderboardSnapshot | null>(null);

/**
 * Subscribes to real-time updates for a leaderboard snapshot
 * @param eventId - The ID of the event to subscribe to
 * @param timeFilter - The time filter for the leaderboard (e.g., 'today' or 'all_time')
 * @returns A function to unsubscribe from the subscription
 */
export function subscribeToLeaderboard(eventId: string, timeFilter: TimeFilter) {
  // First, fetch the current snapshot
  const fetchInitialSnapshot = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard_snapshot')
        .select('*')
        .eq('event_id', eventId)
        .eq('time_filter', timeFilter)
        .single();

      if (error) throw error;
      if (!data) return;

      // Parse and validate the scores
      const scores = parseLeaderboardScores(data.scores);
      if (!scores) return;
      
      const snapshot: LeaderboardSnapshot = {
        ...data,
        scores
      };

      snapshotStore.set(snapshot);
    } catch (error) {
      console.warn('Error fetching initial snapshot:', error);
    }
  };

  // Fetch the initial snapshot
  fetchInitialSnapshot();

  // Set up the real-time subscription
  const channel = supabase
    .channel(`leaderboard:${eventId}:${timeFilter}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'leaderboard_snapshot',
        filter: `event_id=eq.${eventId}`
      },
      async (payload) => {
        try {
          const snapshot = payload.new as Database['public']['Tables']['leaderboard_snapshot']['Row'];
          if (snapshot.time_filter !== timeFilter) return;

          // Parse and validate the scores
          const scores = parseLeaderboardScores(snapshot.scores);
          if (!scores) return;

          const updatedSnapshot: LeaderboardSnapshot = {
            ...snapshot,
            scores
          };

          snapshotStore.set(updatedSnapshot);
        } catch (error) {
          console.error('Error processing real-time update:', error);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('Error in leaderboard subscription');
      }
    });

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetches the current leaderboard snapshot without subscribing
 * @param eventId - The ID of the event
 * @param timeFilter - The time filter for the leaderboard
 * @returns The leaderboard snapshot or null if not found or invalid
 */
export async function fetchLeaderboardSnapshot(
  eventId: string,
  timeFilter: TimeFilter = 'all_time'
): Promise<LeaderboardSnapshot | null> {
  try {
    const { data, error } = await supabase
      .from('leaderboard_snapshot')
      .select('*')
      .eq('event_id', eventId)
      .eq('time_filter', timeFilter)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Parse and validate the scores
    const scores = parseLeaderboardScores(data.scores);
    if (!scores) return null;

    return {
      ...data,
      scores
    };
  } catch (error) {
    console.error('Error fetching leaderboard snapshot:', error);
    return null;
  }
}
