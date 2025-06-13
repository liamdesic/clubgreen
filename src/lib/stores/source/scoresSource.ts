import { writable, get } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import { 
  scorecardSchema, 
  scorecardInsertSchema,
  fromScorecardRow,
  type Scorecard,
  type ScorecardInsert,
} from '$lib/validations';
import type { PlayerHoleScore } from '$lib/validations/playerScore';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { triggerLeaderboardUpdate } from '$lib/runtime/scoreSnapshot';
import type { Event } from '$lib/validations';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Safely parses a scorecard from unknown input
 * @param data Raw data to parse
 * @returns Parsed Scorecard or null if invalid
 */
function parseScorecard(data: unknown): Scorecard | null {
  if (!data) return null;
  try {
    return fromScorecardRow(data);
  } catch (error) {
    console.error('Failed to parse scorecard:', error);
    return null;
  }
}

/**
 * Converts a Scorecard to a PlayerHoleScore
 */
function toPlayerHoleScore(scorecard: Scorecard): PlayerHoleScore {
  return {
    player_id: scorecard.player_id || '',
    name: scorecard.name || 'Unknown Player',
    score: scorecard.score,
    hole_number: scorecard.hole_number || undefined,
    created_at: scorecard.created_at || undefined,
    updated_at: scorecard.updated_at || undefined,
  };
}

// Helper function to prepare score for Supabase
function prepareForSupabase(score: Omit<ScorecardInsert, 'created_at' | 'updated_at'>): Omit<Scorecard, 'id'> {
  // Validate the input against our insert schema
  const result = scorecardInsertSchema.safeParse(score);
  if (!result.success) {
    console.warn('Invalid score data:', score, result.error);
    throw new Error('Invalid score data');
  }
  
  // Return the validated data with current timestamp
  const now = new Date().toISOString();
  return {
    ...result.data,
    created_at: now,
    updated_at: now,
    // Ensure all required fields are present
    published: result.data.published ?? false,
    event_id: result.data.event_id ?? null,
    player_id: result.data.player_id ?? null,
    game_id: result.data.game_id ?? null,
    hole_number: result.data.hole_number ?? null,
    hole_in_ones: result.data.hole_in_ones ?? null,
    tiebreaker_rank: result.data.tiebreaker_rank ?? null
  };
}

function createScoresSource() {
  const { subscribe, set, update } = writable<Scorecard[]>([]);
  const loading = writable<boolean>(false);
  const error = writable<string | null>(null);
  const pendingWrites = writable<ScorecardInsert[]>([]);
  let subscription: RealtimeChannel | null = null;

    async function fetchScores(eventId: string): Promise<PlayerHoleScore[]> {
    if (!eventId) {
      const msg = 'Event ID is required';
      error.set(msg);
      throw new Error(msg);
    }

    loading.set(true);
    error.set(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('scorecard')
        .select('*')
        .eq('event_id', eventId);
        
      if (fetchError) throw fetchError;
      
      // Parse and normalize all scores using the centralized helper
      const validScores = (data || [])
        .map(row => fromScorecardRow(row))
        .filter((score): score is Scorecard => score !== null)
        .map(toPlayerHoleScore);
      
      // Store the raw scorecards in the store
      const scorecards = (data || [])
        .map(row => fromScorecardRow(row))
        .filter((score): score is Scorecard => score !== null);
      
      set(scorecards);
      return validScores;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scores';
      error.set(errorMessage);
      set([]);
      throw new Error(errorMessage);
    } finally {
      loading.set(false);
    }
  }

  async function addScore(score: ScorecardInsert, supabaseClient = supabase): Promise<PlayerHoleScore> {
    // Add to pending writes if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      pendingWrites.update(q => [...q, score]);
      throw new Error('Offline: Score will be synced when online');
    }
    
    loading.set(true);
    error.set(null);
    
    try {
      // This will validate the score data
      const scoreData = prepareForSupabase(score);
      
      const { data, error: insertError } = await supabaseClient
        .from('scorecard')
        .insert(scoreData)
        .select()
        .single();
        
      if (insertError) throw insertError;
      
      const newScore = fromScorecardRow(data);
      if (!newScore) throw new Error('Failed to parse inserted score');
      
      const playerHoleScore = toPlayerHoleScore(newScore);
      update(scores => [...scores, newScore]);
      
      // Trigger leaderboard update in the background - don't wait for it
      if (newScore.event_id) {
        triggerLeaderboardUpdate(newScore.event_id, 'all_time')
          .catch(err => console.error('Failed to update leaderboard:', err));
      }
      
      return playerHoleScore;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add score';
      error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      loading.set(false);
    }
  }

  async function flushPending() {
    const queue = get(pendingWrites);
    for (const score of queue) {
      await addScore(score);
    }
    pendingWrites.set([]);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', flushPending);
  }

  function clearSubscription() {
    if (subscription) {
      subscription.unsubscribe().catch(err => {
        console.error('Error unsubscribing from channel:', err);
      });
      subscription = null;
    }
  }

  function handleScoreChange(
    payload: RealtimePostgresChangesPayload<Scorecard>
  ) {
    update((scores) => {
      if (!payload.new && !payload.old) return scores;
      
      switch (payload.eventType) {
        case 'INSERT': {
          if (!payload.new) return scores;
          const score = parseScorecard(payload.new);
          return score ? [...scores, score] : scores;
        }
        
        case 'UPDATE': {
          if (!payload.new) return scores;
          const score = parseScorecard(payload.new);
          if (!score?.id) return scores;
          return scores.map(s => s.id === score.id ? score : s);
        }
        
        case 'DELETE': {
          if (!payload.old?.id) return scores;
          return scores.filter(s => s.id !== payload.old!.id);
        }
        
        default:
          return scores;
      }
    });
  }

  async function subscribeToEventScores(eventId: string) {
    if (!eventId) {
      console.error('Cannot subscribe: eventId is required');
      return () => {};
    }

    clearSubscription();
    
    try {
      subscription = supabase
        .channel(`scores:${eventId}`)
        .on(
          'postgres_changes',
          { 
            event: '*',
            schema: 'public',
            table: 'scorecard',
            filter: `event_id=eq.${eventId}`
          },
          handleScoreChange
        )
        .subscribe((status, err) => {
          if (err) {
            console.error('Subscription error:', err);
            error.set(`Failed to subscribe to score updates: ${err.message}`);
          } else if (status === 'CHANNEL_ERROR') {
            const message = 'Failed to subscribe to score updates: channel error';
            console.error(message);
            error.set(message);
          }
        });

      return () => clearSubscription();
    } catch (err) {
      console.error('Error setting up subscription:', err);
      error.set('Failed to set up subscription');
      return () => {};
    }
      
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
      }
    };
  }

  function stop() {
    clearSubscription();
    set([]);
  }

  return {
    subscribe,
    fetchScores,
    loading,
    error,
    pendingWrites: { subscribe: pendingWrites.subscribe }
  };
}

export const scoresSource = createScoresSource();
