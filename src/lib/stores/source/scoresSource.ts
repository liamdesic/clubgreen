import { writable, get } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import { scorecardSchema, type Scorecard } from '$lib/validation';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Helper function to convert Date objects to ISO strings for Supabase and ensure all required fields are present
function prepareForSupabase<T extends Partial<Scorecard>>(data: T): Omit<Scorecard, 'id'> & { updated_at?: string } {
  const now = new Date().toISOString();
  const prepared = Object.fromEntries(
    Object.entries({
      ...data,
      updated_at: now, // Always set updated_at to current time
      created_at: data.created_at || now, // Set created_at if not provided
    }).map(([key, value]) => {
      if (value && typeof value === 'object' && 'toISOString' in value) {
        return [key, (value as Date).toISOString()];
      }
      return [key, value];
    })
  ) as Omit<Scorecard, 'id'> & { updated_at: string };
  
  return prepared;
}

function createScoresSource() {
  const { subscribe, set, update } = writable<Scorecard[]>([]);
  const loading = writable<boolean>(false);
  const error = writable<string | null>(null);
  const pendingWrites = writable<Omit<Scorecard, 'id'>[]>([]);
  let subscription: RealtimeChannel | null = null;

  async function fetchScores(eventId: string) {
    loading.set(true);
    error.set(null);
    
    try {
      const { data, error: err } = await supabase
        .from('scorecard')
        .select('*')
        .eq('event_id', eventId);
        
      if (err) throw err;
      
      const validRows = (data ?? [])
        .map(row => {
          const result = scorecardSchema.safeParse(row);
          if (!result.success) {
            console.warn('Invalid scorecard data:', row, result.error);
            return null;
          }
          return result.data;
        })
        .filter((row): row is Scorecard => row !== null);
        
      set(validRows);
      return validRows;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scores';
      error.set(errorMessage);
      set([]);
      throw new Error(errorMessage);
    } finally {
      loading.set(false);
    }
  }

  async function addScore(newScore: Omit<Scorecard, 'id' | 'created_at' | 'updated_at'>) {
    // Optimistically add to pendingWrites if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      pendingWrites.update(q => [...q, { ...newScore, created_at: null, updated_at: null }]);
      return;
    }
    
    loading.set(true);
    error.set(null);
    
    try {
      const scoreData = prepareForSupabase({
        ...newScore,
        created_at: null, // Will be set by prepareForSupabase
        updated_at: null  // Will be set by prepareForSupabase
      });
      
      const { data, error: err } = await supabase
        .from('scorecard')
        .insert(scoreData)
        .select()
        .single();
        
      if (err) throw err;
      
      const parsed = scorecardSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error('Validation failed after insert');
      }
      
      update(scores => [...scores, parsed.data]);
      return parsed.data;
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
      subscription.unsubscribe();
      subscription = null;
    }
  }

  async function subscribeToEventScores(eventId: string) {
    clearSubscription();
    subscription = supabase
      .channel('scores_event_' + eventId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scorecard', filter: 'event_id=eq.' + eventId },
        payload => {
          update(list => {
            switch (payload.eventType) {
              case 'INSERT':   return [...list, payload.new as Scorecard];
              case 'UPDATE':   return list.map(r => r.id === payload.new.id ? payload.new as Scorecard : r);
              case 'DELETE':   return list.filter(r => r.id !== payload.old.id);
            }
            return list;
          });
        }
      )
      .subscribe();
  }

  function stop() {
    clearSubscription();
    set([]);
  }

  return {
    subscribe,
    fetchScores,
    addScore,
    subscribeToEventScores,
    stop,
    flushPending,
    loading,
    error,
    pendingWrites
  };
}

export const scoresSource = createScoresSource();
