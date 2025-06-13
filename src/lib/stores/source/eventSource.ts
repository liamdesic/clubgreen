import { writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import { eventSchema, eventInsertSchema, type Event, normalizeEvent } from '$lib/validations';
import { nullableDateSchema } from '$lib/validations/dateSchemas';
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
    console.log('🔄 [eventSource] fetchEvents called with orgId:', orgId);
    loading.set(true);
    error.set(null);
    const { data, error: err } = await supabase
      .from('events')
      .select('*')
      .eq('organization_id', orgId);
    if (err) {
      console.error('❌ [eventSource] Error fetching events:', err);
      error.set(err.message);
      set([]);
      loading.set(false);
      return;
    }
    console.log('📊 [eventSource] Raw event data from DB:', data?.length || 0, 'events');
    console.log('📋 [eventSource] Raw events:', data);
    
    const validRows = (data ?? [])
      .map(normalizeEvent)
      .filter(row => {
        const validation = eventSchema.safeParse(row);
        if (!validation.success) {
          console.warn('⚠️ [eventSource] Event failed validation:', row.id, validation.error);
        }
        return validation.success;
      });
    
    console.log('✅ [eventSource] Valid events after filtering:', validRows.length);
    console.log('📝 [eventSource] Valid events:', validRows.map(e => ({ id: e.id, title: e.title, archived: e.archived })));
    set(validRows);
    loading.set(false);
  }

  async function addEvent(newEvent: Omit<Event, 'id'>) {
    loading.set(true);
    error.set(null);
    
    // First validate with eventInsertSchema
    const insertValidation = eventInsertSchema.safeParse(newEvent);
    if (!insertValidation.success) {
      console.error('❌ [eventSource] Validation failed before insert:', insertValidation.error);
      error.set('Validation failed before insert');
      loading.set(false);
      throw new Error('Validation failed before insert');
    }
    
    // Remove created_at from the insert data since Supabase will handle it
    const { created_at, ...eventData } = prepareForSupabase(newEvent);
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
    
    // Create a temporary schema that omits created_at since we don't use it
    const postInsertSchema = eventSchema.omit({ created_at: true });
    
    // Validate with the temporary schema
    const parsed = postInsertSchema.safeParse(normalized);
    if (!parsed.success) {
      console.error('❌ [eventSource] Validation failed after insert:', parsed.error);
      error.set('Validation failed after insert');
      loading.set(false);
      throw new Error('Validation failed after insert');
    }
    
    // Add the event to the store with the correct type
    const validatedEvent = parsed.data as Event;
    update(events => [...events, validatedEvent]);
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

  async function deleteEvent(id: string) {
    loading.set(true);
    error.set(null);
    const { error: err } = await supabase
      .from('events')
      .delete()
      .eq('id', id);
    if (err) {
      error.set(err.message);
      loading.set(false);
      throw err;
    }
    update(events => events.filter(e => e.id !== id));
    loading.set(false);
  }

  return {
    subscribe,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    loading,
    error
  };
}

export const eventSource = createEventSource();
