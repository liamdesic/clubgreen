<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { boardRuntime, activeBoard, currentScores } from '$lib/runtime';
  import LeaderboardLayout from '$lib/components/Leaderboard/LeaderboardLayout.svelte';
  import LeaderboardScores from '$lib/components/Leaderboard/LeaderboardScores.svelte';
  import LeaderboardHeader from '$lib/components/Leaderboard/LeaderboardHeader.svelte';
  import LeaderboardRotationStatus from '$lib/components/Leaderboard/LeaderboardRotationStatus.svelte';
  
  export let data;
  
  let loading = true;
  let error = null;
  
  // Initialize the board runtime
  onMount(() => {
    console.log('Page - onMount - Starting runtime initialization');
    
    if (!data.event) {
      console.error('Page - onMount - No event data found');
      error = 'Event not found';
      loading = false;
      return;
    }
    
    // Set up the board
    const boards = [{
      id: 'main-leaderboard',
      eventId: data.event.id,
      timeFilter: 'all_time',
      title: data.event.title || 'Leaderboard'
    }];
    
    console.log('Page - onMount - Initializing runtime with boards:', boards);
    
    // Initialize the runtime
    const cleanup = boardRuntime.initialize({
      rotationIntervalMs: 10000, // 10 seconds
      rotationEnabled: false // Disable auto-rotation for now
    });
    
    console.log('Page - onMount - Runtime initialized, setting boards');
    
    // Set the boards
    boardRuntime.setBoards(boards);
    
    console.log('Page - onMount - Boards set, runtime ready');
    
    loading = false;
    
    // Cleanup on component destroy
    return () => {
      console.log('Page - onMount - Cleanup: stopping runtime');
      cleanup();
    };
  });
</script>

<LeaderboardLayout 
  organization={data.organization}
  event={data.event}
  {loading}
  {error}
>
  <div class="content">
    <LeaderboardScores 
      event={data.event}
      leaderboard={$currentScores || []}
    />
  </div>
  
  <LeaderboardRotationStatus />
</LeaderboardLayout>

<style>
  .content {
    display: flex;
    flex: 1;
    min-height: 0;
    width: 100%;
    align-items: flex-start;
    box-sizing: border-box;
  }
</style> 