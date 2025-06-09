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
      .eq('org_id', orgId);
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
    const { data, error: err } = await supabase
      .from('events')
      .insert(eventData)
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
      error.set('Validation failed after insert');
      loading.set(false);
      return;
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
