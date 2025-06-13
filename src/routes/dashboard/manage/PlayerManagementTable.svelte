<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import '$lib/styles/player-management.css';
  import { 
    fetchLeaderboardSnapshot, 
    subscribeToLeaderboard, 
    type LeaderboardSnapshot 
  } from '$lib/stores/source/snapshotSource';
  import { showToast } from '$lib/stores/toastStore';
  import { supabase } from '$lib/supabaseClient';
  import type { TimeFilter } from '$lib/validations/timeFilter';
  import type { Event } from '$lib/validations';
  import type { PlayerTotalScore } from '$lib/validations/playerScore';
  
  // Type for the unsubscribe function returned by subscribeToLeaderboard
  type UnsubscribeFn = () => void;
  
  export let events: Event[] = [];
  export let orgId = '';
  
  let selectedEventId: string | null = null;
  let selectedTimeFilter: TimeFilter = 'all_time';
  
  // Store leaderboards by event ID and time filter, allowing null for missing data
  type LeaderboardMap = {
    [eventId: string]: {
      [K in TimeFilter]?: LeaderboardSnapshot | null;
    };
  };
  
  let leaderboards: LeaderboardMap = {};
  let loading = false;
  let error: string | null = null;
  let unsubscribeCallbacks: UnsubscribeFn[] = [];
  let processingPlayerId: string | null = null;
  
  // Time filters for the leaderboard views - using only the most relevant time filters
  const timeFilters: TimeFilter[] = [
    'all_time',
    'last_hour',
    'last_day',
    'last_week',
    'last_month'
  ];
  const timeFilterLabels: Record<TimeFilter, string> = {
    all_time: 'All Time',
    last_hour: 'Last Hour',
    last_day: 'Last Day',
    last_week: 'Last Week',
    last_month: 'Last Month',
    since_start_of_hour: 'Since Start of Hour',
    since_start_of_day: 'Since Start of Day',
    since_start_of_month: 'Since Start of Month'
  };

  // Initialize with first event if available
  $: if (events.length > 0 && !selectedEventId) {
    selectEvent(events[0].id);
    setupRealtimeSubscriptions();
  }

  // Set up real-time subscriptions when events change
  $: if (events.length > 0 && events.every(e => e?.id)) {
    setupRealtimeSubscriptions();
  }

  // Clean up subscriptions on destroy
  onDestroy(() => {
    unsubscribeFromAll();
  });
  
  // Get leaderboard for an event and time filter
  function getLeaderboard(eventId: string, timeFilter: TimeFilter): LeaderboardSnapshot | null {
    const eventLeaderboards = leaderboards[eventId];
    if (!eventLeaderboards) return null;
    return eventLeaderboards[timeFilter] ?? null;
  }

  // Set up real-time subscriptions for all events and time filters
  function setupRealtimeSubscriptions() {
    // Clear any existing subscriptions
    unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    unsubscribeCallbacks = [];
    
    events.forEach(event => {
      timeFilters.forEach(timeFilter => {
        try {
          const subscription = subscribeToLeaderboard(event.id, timeFilter);
          if (subscription) {
            unsubscribeCallbacks.push(subscription);
          }
        } catch (err) {
          console.error(`Failed to subscribe to ${event.id} ${timeFilter}:`, err);
        }
      });
    });
    
    // Set up a subscription to the snapshot store for updates
    const unsubscribeSnapshot = snapshotStore.subscribe(handleSnapshotUpdate);
    unsubscribeCallbacks.push(unsubscribeSnapshot);
  }
  
  // Handle snapshot updates from the store
  function handleSnapshotUpdate(snapshot: LeaderboardSnapshot | null) {
    if (!snapshot) return;
    
    const { event_id, time_filter } = snapshot;
    
    // Create a new object to ensure reactivity
    leaderboards = {
      ...leaderboards,
      [event_id]: {
        ...(leaderboards[event_id] || {}),
        [time_filter]: snapshot
      }
    };
  }

  function unsubscribeFromAll() {
    unsubscribeCallbacks.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    unsubscribeCallbacks = [];
  }

  async function handleLeaderboardUpdate(
    eventId: string,
    timeFilter: TimeFilter,
    snapshot: LeaderboardSnapshot | null
  ) {
    if (!leaderboards[eventId]) {
      leaderboards[eventId] = {} as Record<TimeFilter, LeaderboardSnapshot | null>;
    }
    
    leaderboards[eventId][timeFilter] = snapshot;
    leaderboards = { ...leaderboards };  // Handle unpublishing scores
  }

  // Unpublish a player's scores

  // Load leaderboard data for the selected event and time filter
  async function loadLeaderboardData() {
    if (!selectedEventId) return;
    
    loading = true;
    error = null;
    
    try {
      // Fetch the snapshot for the selected event and time filter
      await fetchLeaderboardSnapshot(selectedEventId, selectedTimeFilter);
      
      // Subscribe to real-time updates
      const unsubscribe = subscribeToLeaderboard(selectedEventId, selectedTimeFilter, (snapshot: LeaderboardSnapshot) => {
        if (selectedEventId) {
          leaderboards = {
            ...leaderboards,
            [selectedEventId]: {
              ...(leaderboards[selectedEventId] || {}),
              [selectedTimeFilter]: snapshot
            }
          };
        }
      });
      
      unsubscribeCallbacks.push(unsubscribe);
    } catch (err) {
      console.error('Error loading leaderboard data:', err);
      error = 'Failed to load leaderboard data';
    } finally {
      loading = false;
    }
  }
  
  // Get medal emoji for top 3 positions
  function getMedalEmoji(rank: number): string {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  }

  async function togglePublish(score: PlayerTotalScore) {
    if (processingPlayerId === score.player_id || !selectedEventId) return;
    
    const action = isScorePublished(score) ? 'unpublish' : 'publish';
    if (!confirm(`Are you sure you want to ${action} scores for ${score.name || 'this player'}?`)) {
      return;
    }
    
    processingPlayerId = score.player_id;
    loading = true;
    
    try {
      const { error: updateError } = await supabase
        .from('scorecard')
        .update({ published: !isScorePublished(score) })
        .eq('player_id', score.player_id)
        .eq('event_id', selectedEventId);
      
      if (updateError) throw updateError;
      
      // Refresh the leaderboard data
      await loadLeaderboardData();
      
      showToast({
        type: 'success',
        message: `Successfully ${action}ed scores for ${score.name || 'player'}`
      });
    } catch (err) {
      console.error(`Error ${action}ing scores:`, err);
      showToast({
        type: 'error',
        message: `Failed to ${action} scores: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    } finally {
      loading = false;
      processingPlayerId = null;
    }
  }
  
  function isScorePublished(score: PlayerTotalScore): boolean {
    return score.published !== false; // Default to true if not specified
  }
  
  // Format score with sign
  function formatScore(score: number | null | undefined): string {
    if (score === null || score === undefined) return '-';
    return score > 0 ? `+${score}` : score.toString();
  }
  
  
  // Initialize with first event if available
  onMount(() => {
    if (events.length > 0 && !selectedEventId) {
      selectEvent(events[0].id);
    }
    
    // Cleanup subscriptions when component is destroyed
    return () => {
      unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
      unsubscribeCallbacks = [];
    };
  });

  // ... (rest of the code remains the same)
</script>

<style>
  /* Player Management Styles */
  .player-management {
    padding: 1.5rem 0;
    color: var(--text-primary);
    font-family: 'Inter', sans-serif;
  }
  
  .player-row {
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .player-row:hover {
    background-color: rgba(79, 70, 229, 0.1) !important;
  }
  
  .player-name {
    font-weight: 500;
  }
  
  .rank {
    font-weight: 600;
    color: #a1a1aa;
  }
  
  .score {
    text-align: right;
    font-family: 'Roboto Mono', monospace;
    font-weight: 500;
  }
  
  .publish-toggle {
    text-align: center;
  }
  
  /* Toggle switch styles */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
  }
  
  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #4b5563;
    transition: .4s;
    border-radius: 24px;
  }
  
  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }
  
  input:checked + .toggle-slider {
    background-color: #8b5cf6;
  }
  
  input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }
</style>

<div class="player-management">
  <!-- Event Tabs -->
  <div class="event-tabs">
    {#each events as event}
      <button
        class="event-tab {selectedEventId === event.id ? 'active' : ''}"
        on:click={() => selectEvent(event.id)}
        aria-current={selectedEventId === event.id ? 'page' : undefined}
      >
        {event.title}
      </button>
    {/each}
  </div>
  
  {#if loading && !selectedEventId}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading player data...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>{error}</p>
      <button class="action-button refresh-button" on:click={refreshData}>
        <span>Try Again</span>
      </button>
    </div>
  {:else if selectedEventId}
    <div class="time-filter-tabs">
      {#each timeFilters as timeFilter}
        <button
          class="time-filter-tab {selectedTimeFilter === timeFilter ? 'active' : ''}"
          on:click={() => selectTimeFilter(timeFilter)}
        >
          {timeFilterLabels[timeFilter]}
        </button>
      {/each}
    </div>
    
    <div class="player-table-container">
      <table class="player-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
            <th>Published</th>
          </tr>
        </thead>
        <tbody>
          {#if loading}
            <tr>
              <td colspan="4" class="loading-state">
                <div class="spinner"></div>
                <p>Loading scores...</p>
              </td>
            </tr>
          {:else if leaderboards[selectedEventId]?.[selectedTimeFilter]?.scores?.length}
            {#each leaderboards[selectedEventId][selectedTimeFilter]?.scores || [] as score, i (i)}
              <tr on:click={() => togglePublish(score as PlayerTotalScore)} class="player-row">
                <td class="rank">{getMedalEmoji(i + 1)} {i + 1}</td>
                <td class="player-name">{(score as PlayerTotalScore).name || `Player ${(score as PlayerTotalScore).player_id?.substring(0, 6) || ''}`}</td>
                <td class="score">{formatScore((score as PlayerTotalScore).totalScore)}</td>
                <td class="publish-toggle">
                  <label class="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={isScorePublished(score as PlayerTotalScore)}
                      on:click|stopPropagation={() => {}}
                      on:change={() => togglePublish(score as PlayerTotalScore)}
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="4" class="empty-state">
                <p>No scores available for this time period</p>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="empty-state">
      <p>Select an event to view player scores</p>
    </div>
  {/if}
</div>
