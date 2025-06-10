<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { boardRuntime, activeBoard, currentScores } from '$lib/runtime';
  import LeaderboardLayout from '$lib/components/Leaderboard/LeaderboardLayout.svelte';
  import LeaderboardScores from '$lib/components/Leaderboard/LeaderboardScores.svelte';
  import LeaderboardHeader from '$lib/components/Leaderboard/LeaderboardHeader.svelte';
  import LeaderboardRotationStatus from '$lib/components/Leaderboard/LeaderboardRotationStatus.svelte';
  import type { TimeFilter } from '$lib/validations/timeFilter';
  import type { Organization } from '$lib/validations';
  import type { Event } from '$lib/validations';
  
  export let data: {
    organization: Organization;
    events: Event[];
    leaderboard: any;
    currentEventId: string | null;
  };
  
  let loading = true;
  let error: string | null = null;
  let cleanup: (() => void) | null = null;
  
  // Initialize the board runtime
  onMount(() => {
    if (!data.currentEventId) {
      error = 'No events found for this organization';
      loading = false;
      return;
    }
    
    // Set up the board
    const boards = [{
      id: 'main-leaderboard',
      eventId: data.currentEventId,
      timeFilter: 'all_time' as TimeFilter,
      title: 'Leaderboard'
    }];
    
    // Initialize the runtime
    cleanup = boardRuntime.initialize({
      rotationIntervalMs: 10000, // 10 seconds
      rotationEnabled: true // Enable auto-rotation
    });
    
    // Set the boards
    boardRuntime.setBoards(boards);
    
    loading = false;
  });

  // Cleanup on component destroy
  onDestroy(() => {
    if (cleanup) {
      cleanup();
    }
  });
</script>

<LeaderboardLayout 
  organization={data.organization}
  event={data.events[0]}
  {loading}
  {error}
/>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>
