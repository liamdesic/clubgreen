<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Organization } from '$lib/types';
  import { eventStore, liveEvents, activeEvents, archivedEvents } from '../../../backup/eventStore';
  import MainLeaderboardCard from '../MainLeaderboardCard.svelte';
  import EventCard from '../EventCard.svelte';
  import AddEventCard from '../AddEventCard.svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';

  // Props
  export let organization: Organization;
  export let scoreCounts: Record<string, number> = {};
  export let playerCounts: Record<string, number> = {};

  // State
  let showArchived = false;

  const dispatch = createEventDispatcher();

  // Get organization leaderboard codes
  $: orgLeaderboardCodes = Array.isArray(organization.org_leaderboard_codes) && 
    organization.org_leaderboard_codes.every(code => 
      typeof code === 'object' && code !== null && 'code' in code && typeof code.code === 'string'
    ) 
      ? organization.org_leaderboard_codes as { code: string }[] 
      : [];

  // Filter out live events from active events
  $: nonLiveActiveEvents = $activeEvents.filter(event => 
    !$liveEvents.some(liveEvent => liveEvent.id === event.id)
  );

  // Debug logs for live events
  $: {
    console.log('🔍 [EventSections] Live events:', {
      count: $liveEvents.length,
      events: $liveEvents.map(e => ({
        id: e.id,
        title: e.title,
        scoreCount: scoreCounts[e.id] || 0
      }))
    });
  }

  function handleAddEvent() {
    dispatch('addEvent');
  }

  function handleQrModal(event: any) {
    dispatch('qrModal', event);
  }

  function handleEdit(e: CustomEvent<Event>) {
    console.log('📦 [EventSections] Handling edit event:', {
      id: e.detail.id,
      title: e.detail.title,
      short_code: e.detail.short_code
    });
    dispatch('edit', e.detail);
  }

  function handleArchived({ detail }: any) {
    dispatch('archived', detail);
  }

  function handleDeleted({ detail }: any) {
    dispatch('deleted', detail);
  }

  function toggleArchived() {
    showArchived = !showArchived;
  }
</script>

<div class="event-sections">
  <!-- Live Section -->
  {#if $liveEvents.length > 0}
    <section class="live-section">
      <MainLeaderboardCard 
        organizationSlug={organization.slug} 
        {orgLeaderboardCodes}
        events={$liveEvents}
        {scoreCounts}
      />
      <div class="event-grid">
        {#each $liveEvents as event}
          <EventCard 
            {event} 
            {organization}
            scoreCount={scoreCounts[event.id] || 0}
            playerCount={playerCounts[event.id] || 0}
            on:openQrModal={handleQrModal}
            on:edit={handleEdit}
            on:archived={handleArchived}
            on:deleted={handleDeleted}
          />
        {/each}
      </div>
    </section>
  {:else}
    <div class="debug-info">
      <p>No live events found. Debug info:</p>
      <pre>{JSON.stringify({
        liveEventsCount: $liveEvents.length,
        activeEventsCount: $activeEvents.length,
        scoreCounts,
        orgLeaderboardCodes
      }, null, 2)}</pre>
    </div>
  {/if}

  <!-- Active Events Grid -->
  {#if nonLiveActiveEvents.length > 0}
    <div class="event-grid">
      {#each nonLiveActiveEvents as event}
        <EventCard 
          {event} 
          {organization}
          scoreCount={scoreCounts[event.id] || 0}
          playerCount={playerCounts[event.id] || 0}
          on:openQrModal={handleQrModal}
          on:edit={handleEdit}
          on:archived={handleArchived}
          on:deleted={handleDeleted}
        />
      {/each}
      <AddEventCard on:click={handleAddEvent} />
    </div>
  {:else}
    <div class="empty-state">
      <p>No active events yet. Create your first event to get started!</p>
      <AddEventCard on:click={handleAddEvent} />
    </div>
  {/if}

  <!-- Archived Events Section -->
  {#if $archivedEvents.length > 0}
    <section class="archived-section">
      <div class="section-header">
        <h2>Archived Events</h2>
        <button 
          class="toggle-button"
          on:click={toggleArchived}
          aria-expanded={showArchived}
        >
          {showArchived ? 'Hide' : 'Show'} Archived
        </button>
      </div>

      {#if showArchived}
        <div class="event-grid archived">
          {#each $archivedEvents as event}
            <EventCard 
              {event} 
              {organization}
              scoreCount={scoreCounts[event.id] || 0}
              playerCount={playerCounts[event.id] || 0}
              on:openQrModal={handleQrModal}
              on:edit={handleEdit}
              on:archived={handleArchived}
              on:deleted={handleDeleted}
            />
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .event-sections {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .live-section {
    background: rgba(0,0,0,0.12);
    border-radius: 1.5rem;
    padding: 1.5rem;
    box-shadow: 0 4px 24px 0 rgba(0,0,0,0.12);
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .event-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
    padding: 1rem 0;
  }

  .event-grid.archived {
    opacity: 0.8;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .empty-state p {
    margin-bottom: 2rem;
    font-size: 1.1rem;
  }

  .archived-section {
    margin-top: 2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin: 0;
  }

  .toggle-button {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .debug-info {
    background: rgba(0, 0, 0, 0.2);
    padding: 1rem;
    border-radius: 0.5rem;
    margin: 1rem 0;
    font-family: monospace;
    font-size: 0.875rem;
  }

  .debug-info pre {
    margin: 0.5rem 0;
    white-space: pre-wrap;
  }
</style> 