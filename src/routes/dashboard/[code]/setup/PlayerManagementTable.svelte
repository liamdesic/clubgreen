<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getLiveVisibleEventsForOrg } from '$lib/utils/eventUtils';
  import { fetchLeaderboardSnapshot } from '$lib/stores/source/snapshotSource';
  import type { TimeFilter, LeaderboardSnapshot } from '$lib/validations';
  import { triggerLeaderboardUpdate } from '$lib/runtime/scoreSnapshot';
  
  export let orgId: string;
  
  // State
  let events = [];
  let selectedEventId: string | null = null;
  let leaderboards: Record<string, Record<TimeFilter, LeaderboardSnapshot | null>> = {};
  let loading = true;
  let error: string | null = null;
  
  const timeFilters: TimeFilter[] = ['all_time', 'today', 'this_week', 'this_month'];
  
  // Load events on mount
  onMount(async () => {
    try {
      loading = true;
      events = await getLiveVisibleEventsForOrg(orgId);
      
      if (events.length > 0) {
        selectedEventId = events[0].id;
        await loadLeaderboards(selectedEventId);
      }
    } catch (err) {
      error = err.message || 'Failed to load events';
      console.error('Error loading events:', err);
    } finally {
      loading = false;
    }
  });
  
  // Load leaderboards for an event
  async function loadLeaderboards(eventId: string) {
    try {
      loading = true;
      
      // Load leaderboards for all time filters
      const leaderboardPromises = timeFilters.map(async (filter) => {
        const snapshot = await fetchLeaderboardSnapshot(eventId, filter);
        return { filter, snapshot };
      });
      
      const results = await Promise.all(leaderboardPromises);
      
      // Update the leaderboards state
      leaderboards[eventId] = results.reduce((acc, { filter, snapshot }) => {
        acc[filter] = snapshot;
        return acc;
      }, {} as Record<TimeFilter, LeaderboardSnapshot | null>);
      
    } catch (err) {
      error = 'Failed to load leaderboard data';
      console.error('Error loading leaderboards:', err);
    } finally {
      loading = false;
    }
  }
  
  // Handle event tab click
  async function selectEvent(eventId: string) {
    if (selectedEventId === eventId) return;
    
    selectedEventId = eventId;
    
    // Load leaderboards if not already loaded
    if (!leaderboards[eventId]) {
      await loadLeaderboards(eventId);
    }
  }
  
  // Handle unpublishing scores for a player
  async function unpublishScores(playerId: string) {
    if (!selectedEventId || !confirm('Are you sure you want to unpublish all scores for this player?')) {
      return;
    }
    
    try {
      // TODO: Implement unpublish logic here
      // 1. Find all scores for this player in the event
      // 2. Mark them as unpublished
      
      // After unpublishing, refresh the leaderboard
      await Promise.all(
        timeFilters.map(filter => 
          triggerLeaderboardUpdate(selectedEventId, filter)
        )
      );
      
      // Reload leaderboards
      await loadLeaderboards(selectedEventId);
      
    } catch (err) {
      error = 'Failed to unpublish scores';
      console.error('Error unpublishing scores:', err);
    }
  }
  
  // Format score for display
  function formatScore(score: number | null): string {
    if (score === null) return '-';
    return score > 0 ? `+${score}` : score.toString();
  }
</script>

<div class="player-management">
  <!-- Event Tabs -->
  <div class="event-tabs">
    {#each events as event}
      <button
        class="tab-button {selectedEventId === event.id ? 'active' : ''}"
        on:click={() => selectEvent(event.id)}
        aria-current={selectedEventId === event.id ? 'page' : undefined}
      >
        {event.title}
      </button>
    {/each}
  </div>
  
  {#if loading && !selectedEventId}
    <div class="loading">Loading events...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if events.length === 0}
    <div class="empty">No live events found</div>
  {:else if selectedEventId}
    <div class="leaderboard-container">
      {#each timeFilters as timeFilter}
        {#if leaderboards[selectedEventId]?.[timeFilter]}
          <div class="leaderboard-section">
            <h3 class="time-filter">{timeFilter.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}</h3>
            
            <div class="leaderboard">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {#each leaderboards[selectedEventId][timeFilter]?.scores || [] as score, i}
                    <tr>
                      <td>{i + 1}</td>
                      <td>{score.player_name}</td>
                      <td class="score {score.totalScore > 0 ? 'positive' : score.totalScore < 0 ? 'negative' : ''}">
                        {formatScore(score.totalScore)}
                      </td>
                      <td>
                        <button 
                          class="unpublish-button"
                          on:click|stopPropagation={() => unpublishScores(score.player_id)}
                          aria-label={`Unpublish scores for ${score.player_name}`}
                        >
                          Unpublish
                        </button>
                      </td>
                    </tr>
                  {:else}
                    <tr>
                      <td colspan="4" class="no-scores">No scores available</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .player-management {
    padding: 1.5rem;
    color: #fff;
    font-family: 'Inter', sans-serif;
  }
  
  .event-tabs {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 1px; /* For tab border */
    margin-bottom: 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .tab-button {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
    cursor: pointer;
    position: relative;
    white-space: nowrap;
    transition: color 0.2s ease;
  }
  
  .tab-button:hover {
    color: #fff;
  }
  
  .tab-button.active {
    color: #fff;
    font-weight: 600;
  }
  
  .tab-button.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--accent-color, #4CAF50);
  }
  
  .leaderboard-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .leaderboard-section {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 0.75rem;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .time-filter {
    font-size: 1.1rem;
    margin: 0 0 1rem 0;
    color: #fff;
    font-weight: 600;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  th {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  .score {
    font-family: 'Roboto Mono', monospace;
    font-weight: 500;
  }
  
  .score.positive {
    color: #4caf50;
  }
  
  .score.negative {
    color: #f44336;
  }
  
  .unpublish-button {
    background: rgba(244, 67, 54, 0.1);
    color: #f44336;
    border: 1px solid rgba(244, 67, 54, 0.2);
    border-radius: 0.5rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .unpublish-button:hover {
    background: rgba(244, 67, 54, 0.2);
  }
  
  .no-scores {
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    padding: 2rem;
  }
  
  .loading, .error, .empty {
    padding: 2rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .error {
    color: #f44336;
  }
</style>