import { writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import { eventSchema, type Event, normalizeEvent } from '$lib/validations';
import type { TimeFilter } from '$lib/validations/timeFilter';

// Helper function to convert Date objects to ISO strings for Supabase
function prepareForSupabase<T extends Record<string, any>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (value instanceof Date) {
        return [key, value.toISOString()];
      }
      // Transform settings to settings_json for database
      if (key === 'settings') {
        return ['settings_json', value];
      }
      return [key, value];
    })
  ) as T;
}

function createEventSource() {
  const { subscribe, set, update } = writable<Event[]>([]);
  const loading = writable<boolean>(false);
  const error = writable<string | null>(null);

  async function fetchEvents(orgId: string) {
    loading.set(true);
    error.set(null);
    const { data, error: err } = await supabase
      .from('events')
      .select('*')
      .eq('organization_id', orgId);
    if (err) {
      error.set(err.message);
      set([]);
      loading.set(false);
      return;
    }
    const validRows = (data ?? [])
      .map(normalizeEvent)
      .filter(row => eventSchema.safeParse(row).success);
    set(validRows);
    loading.set(false);
  }

  async function addEvent(newEvent: Omit<Event, 'id'>) {
    loading.set(true);
    error.set(null);
    const eventData = prepareForSupabase(newEvent);
    console.log('📝 [eventSource] Attempting to create event:', eventData);
    
    const { data, error: err } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();
      
    if (err) {
      console.error('❌ [eventSource] Error creating event:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      error.set(err.message);
      loading.set(false);
      throw err; // Re-throw to be caught by the component
    }
    
    console.log('✅ [eventSource] Event created successfully:', data);
    const normalized = normalizeEvent(data);
    const parsed = eventSchema.safeParse(normalized);
    if (!parsed.success) {
      console.error('❌ [eventSource] Validation failed after insert:', parsed.error);
      error.set('Validation failed after insert');
      loading.set(false);
      throw new Error('Validation failed after insert');
    }
    update(events => [...events, parsed.data]);
    loading.set(false);
  }

  async function updateEvent(id: string, updates: Partial<Event>) {
    loading.set(true);
    error.set(null);
    const updateData = prepareForSupabase(updates);
    const { data, error: err } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (err) {
      error.set(err.message);
      loading.set(false);
      return;
    }
    const normalized = normalizeEvent(data);
    const parsed = eventSchema.safeParse(normalized);
    if (!parsed.success) {
      error.set('Validation failed after update');
      loading.set(false);
      return;
    }
    update(events => events.map(e => e.id === id ? parsed.data : e));
    loading.set(false);
  }

  return {
    subscribe,
    fetchEvents,
    addEvent,
    updateEvent,
    loading,
    error
  };
}

export const eventSource = createEventSource();
