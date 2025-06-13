<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getLiveVisibleEventsForOrg } from '$lib/utils/eventUtils';
  import PlayerManagementTable from './PlayerManagementTable.svelte';
  import { showToast } from '$lib/stores/toastStore';
  import type { PageData } from './$types';
  import type { Event } from '$lib/types/event';

  export let data: PageData;
  
  let events: Event[] = [];
  let loading = true;
  let error: string | null = null;
  let org = data.org;

  onMount(async () => {
    try {
      loading = true;
      events = await getLiveVisibleEventsForOrg(org.id);
      
      if (events.length === 0) {
        showToast('No live events found for this organization', 'info');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load events';
      error = message;
      console.error('Error loading events:', err);
      showToast(message, 'error');
    } finally {
      loading = false;
    }
  });
</script>

<div class="player-management-page">
  <header class="page-header">
    <h1>Player Management</h1>
    <p class="org-name">{org.name}</p>
  </header>

  {#if loading && events.length === 0}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading player data...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>{error}</p>
      <button class="retry-button" on:click={() => window.location.reload()}>
        Retry
      </button>
    </div>
  {:else if events.length === 0}
    <div class="empty-state">
      <p>No live events found for this organization.</p>
      <a href="/dashboard/{org.code}/events/create" class="create-event-button">
        Create New Event
      </a>
    </div>
  {:else}
    <PlayerManagementTable {events} orgId={org.id} />
  {/if}
</div>

<style>
  .player-management-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    color: var(--text-primary);
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
  }

  .org-name {
    color: var(--text-secondary);
    margin: 0;
    font-size: 1.1rem;
  }

  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
    padding: 2rem;
    background: var(--bg-secondary);
    border-radius: 8px;
    margin-top: 1.5rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border-color);
    border-top: 4px solid var(--accent-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  .error-state {
    color: var(--error-color);
  }

  .retry-button,
  .create-event-button {
    margin-top: 1rem;
    padding: 0.5rem 1.5rem;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .retry-button:hover,
  .create-event-button:hover {
    background: var(--accent-hover);
  }

  .empty-state {
    color: var(--text-secondary);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
