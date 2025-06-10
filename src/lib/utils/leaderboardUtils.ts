import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, PUBLIC_LEADERBOARD_API_KEY } from '$env/static/public';
import type { PlayerTotalScore } from '$lib/validations/playerScore';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'Authorization': `Bearer ${PUBLIC_LEADERBOARD_API_KEY}`
    }
  }
});

/**
 * Fetches the cached leaderboard for an event
 * @param eventId - The ID of the event
 * @param timeFilter - Time filter for the leaderboard (default: 'all_time')
 * @returns Promise with the leaderboard data or null if not found
 */
export async function fetchLeaderboardSnapshot(
  eventId: string,
  timeFilter: 'today' | 'all_time' = 'all_time'
): Promise<PlayerTotalScore[] | null> {
  const { data, error } = await supabase
    .from('leaderboard_snapshot')
    .select('scores')
    .eq('event_id', eventId)
    .eq('time_filter', timeFilter)
    .single();

  if (error || !data) {
    console.error('Error fetching leaderboard snapshot:', error);
    return null;
  }

  return data.scores as PlayerTotalScore[];
}

/**
 * Triggers an update of the leaderboard snapshot
 * @param eventId - The ID of the event to update
 * @param timeFilter - Time filter for the leaderboard (default: 'all_time')
 * @returns Promise with the update result
 */
export async function triggerLeaderboardUpdate(
  eventId: string,
  timeFilter: 'today' | 'all_time' = 'all_time'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/update-leaderboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PUBLIC_LEADERBOARD_API_KEY}`
      },
      body: JSON.stringify({
        event_id: eventId,
        time_filter: timeFilter
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error triggering leaderboard update:', response.status, errorData);
      return { 
        success: false, 
        error: errorData.error || `HTTP error! status: ${response.status}`
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Exception in triggerLeaderboardUpdate:', error);
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

/**
 * Subscribes to leaderboard updates for an event
 * @param eventId - The ID of the event to subscribe to
 * @param callback - Callback function that receives the updated leaderboard
 * @returns Function to unsubscribe
 */
export function subscribeToLeaderboardUpdates(
  eventId: string,
  callback: (scores: PlayerTotalScore[]) => void
) {
  const channel = supabase
    .channel(`leaderboard:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'leaderboard_snapshot',
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => {
        if (payload.new?.scores) {
          callback(payload.new.scores as PlayerTotalScore[]);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}
