<!-- ArchivedEventsSection.svelte -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import { ChevronDown, ChevronRight, Settings, Trash2 } from 'lucide-svelte/icons';
  import { supabase } from '$lib/supabaseClient';
  import { showToast } from '$lib/toastStore';
  import type { Event } from '$lib/types';

  export let events: Event[] = [];
  
  let showArchivedEvents = false;
  let deletingEvent: string | null = null;

  async function deleteEventPermanently(eventId: string) {
    if (!confirm('Are you sure you want to permanently delete this event? This action cannot be undone.')) {
      return;
    }

    // Check if event has scores
    const { data: scores } = await supabase
      .from('scorecard')
      .select('id')
      .eq('event_id', eventId)
      .limit(1);

    if (scores && scores.length > 0) {
      if (!confirm('This event has scores attached. Deleting it will permanently remove all scores. Continue?')) {
        return;
      }
    }

    deletingEvent = eventId;

    try {
      // Delete scores first
      await supabase
        .from('scorecard')
        .delete()
        .eq('event_id', eventId);

      // Then delete the event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // Dispatch event to notify parent
      dispatch('eventDeleted', { eventId });
      showToast('Event permanently deleted', 'success');
    } catch (err) {
      console.error('Error deleting event:', err);
      showToast('Failed to delete event', 'error');
    } finally {
      deletingEvent = null;
    }
  }

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{
    eventDeleted: { eventId: string };
  }>();
</script>

{#if events.length > 0}
  <div class="archived-events-section">
    <button 
      class="archived-header" 
      on:click={() => showArchivedEvents = !showArchivedEvents}
      aria-expanded={showArchivedEvents}
    >
      {#if showArchivedEvents}
        <ChevronDown size={20} />
      {:else}
        <ChevronRight size={20} />
      {/if}
      <h2>Archived Events ({events.length})</h2>
    </button>

    {#if showArchivedEvents}
      <div class="archived-events-grid" transition:slide>
        {#each events as event}
          <div class="archived-event-card">
            <div class="archived-event-content">
              <h3>{event.title}</h3>
              <p class="archived-date">
                {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date'}
              </p>
              <div class="archived-actions">
                <a href="/dashboard/{event.id}/setup" class="btn btn-secondary btn-sm">
                  <Settings size={16} />
                  Settings
                </a>
                <button 
                  class="btn btn-danger btn-sm" 
                  on:click={() => deleteEventPermanently(event.id)}
                  disabled={deletingEvent === event.id}
                >
                  <Trash2 size={16} />
                  {deletingEvent === event.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .archived-events-section {
    max-width: 1200px;
    margin: 2rem auto;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 1rem;
    overflow: hidden;
  }

  .archived-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-primary);
    transition: background-color 0.2s;
  }

  .archived-header:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .archived-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .archived-events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    padding: 1rem;
  }

  .archived-event-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .archived-event-content h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .archived-date {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0.5rem 0;
  }

  .archived-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
</style>
