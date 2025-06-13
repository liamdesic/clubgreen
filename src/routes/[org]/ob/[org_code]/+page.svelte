<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { boardRuntime, currentBoard, currentScores } from '$lib/runtime';
  import LeaderboardLayout from '$lib/components/leaderboard/LeaderboardLayout.svelte';
  import LeaderboardScores from '$lib/components/leaderboard/LeaderboardScores.svelte';
  import LeaderboardHeader from '$lib/components/leaderboard/LeaderboardHeader.svelte';
  import LeaderboardRotationStatus from '$lib/components/leaderboard/LeaderboardRotationStatus.svelte';
  import { showToast } from '$lib/stores/toastStore';
  import { generateOrgLeaderboardBoards } from '$lib/utils/eventUtils';
  import type { TimeFilter } from '$lib/validations/timeFilter';
  import type { Event, Organization } from '$lib/validations';
  import type { LeaderboardBoard } from '$lib/runtime/board.types';
  import { supabase } from '$lib/supabaseClient';
  
  export let data: {
    organization: Organization;
    liveEvents: Event[];
    orgCode: string;
  };
  
  let loading = true;
  let error: string | null = null;
  let realtimeChannel: any = null;
  let boards: LeaderboardBoard[] = [];
  let showTransition = false;
  let previousBoardId: string | null = null;
  let transitionTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Initialize the org leaderboard rotation
  onMount(async () => {
    console.log('[OrgLeaderboard] Initializing with events:', data.liveEvents.map(e => ({ id: e.id, title: e.title })));
    
    if (!data.liveEvents || data.liveEvents.length === 0) {
      console.warn('[OrgLeaderboard] No live events found');
      error = 'No live events available for rotation';
      showToast('No live events available', 'info');
      loading = false;
      return;
    }
    
    try {
      // Generate boards from live events
      boards = await generateOrgLeaderboardBoards(data.liveEvents);
      
      if (boards.length === 0) {
        console.warn('[OrgLeaderboard] No boards generated from live events');
        error = 'No leaderboard boards available';
        showToast('No leaderboards available for rotation', 'info');
        loading = false;
        return;
      }
      
      console.log('[OrgLeaderboard] Generated boards:', boards.map(b => ({ 
        id: b.id, 
        eventId: b.eventId, 
        timeFilter: b.timeFilter,
        title: b.title 
      })));
      
      // Get rotation interval from org settings (convert from string to ms)
      const rotationIntervalMs = (Number(data.organization.leaderboard_rotation_interval) || 10) * 1000; // Default to 10 seconds if not set
      
      // Initialize the runtime
      const cleanup = boardRuntime.initialize({
        rotationIntervalMs,
        rotationEnabled: true,
        onError: (err) => {
          console.error('[OrgLeaderboard] Runtime error:', err);
          error = err.message;
          showToast(err.message, 'error');
        }
      });
      
      console.log('[OrgLeaderboard] Runtime initialized:', { 
        rotationIntervalMs, 
        boardCount: boards.length,
        orgName: data.organization.name 
      });
      
      // Set the boards
      await boardRuntime.setBoards(boards);
      
      // Start rotation if we have multiple boards
      if (boards.length > 1) {
        boardRuntime.startRotation();
        console.log('[OrgLeaderboard] Started board rotation');
      }
      
      // Set up real-time subscription for score changes
      setupRealtimeSubscription();
      
      console.log('[OrgLeaderboard] Setup complete:', { 
        boardCount: boards.length,
        rotationInterval: `${rotationIntervalMs/1000}s`
      });
      
      // Show initial transition
      showTransition = true;
      transitionTimeout = setTimeout(() => {
        showTransition = false;
      }, 1500);
      
      loading = false;
      
      // Cleanup on component destroy
      return () => {
        console.log('[OrgLeaderboard] Cleaning up: stopping runtime and subscriptions');
        cleanup();
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
        }
        if (transitionTimeout) {
          clearTimeout(transitionTimeout);
        }
      };
    } catch (err) {
      console.error('[OrgLeaderboard] Initialization error:', err);
      error = err instanceof Error ? err.message : 'Failed to initialize leaderboard rotation';
      showToast(error, 'error');
      loading = false;
    }
  });

  function setupRealtimeSubscription() {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }
    
    // Subscribe to score changes for all live events
    const eventIds = data.liveEvents.map(e => e.id);
    
    console.log('[OrgLeaderboard] Setting up realtime subscription for events:', eventIds);
    
    realtimeChannel = supabase
      .channel('public:scorecard')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'scorecard',
        filter: `event_id=in.(${eventIds.join(',')})`
      }, () => {
        console.log('[OrgLeaderboard] Score inserted, runtime will handle refresh');
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'scorecard',
        filter: `event_id=in.(${eventIds.join(',')})`
      }, () => {
        console.log('[OrgLeaderboard] Score updated, runtime will handle refresh');
      })
      .subscribe();
  }

  // Get current event for display
  $: currentEvent = $currentBoard ? data.liveEvents.find(e => e.id === $currentBoard.eventId) : null;
  
  // Handle transition completion
  function handleTransitionComplete() {
    console.log('Transition complete');
    showTransition = false;
  }
  
  // Detect board changes and trigger transitions
  $: if ($currentBoard?.id && $currentBoard.id !== previousBoardId && previousBoardId !== null) {
    console.log('[OrgLeaderboard] Board rotation:', { from: previousBoardId, to: $currentBoard.id });
    
    // Clear any existing transition timeout
    if (transitionTimeout) {
      clearTimeout(transitionTimeout);
    }
    
    // Show transition
    showTransition = true;
    
    // Set timeout to hide transition
    transitionTimeout = setTimeout(() => {
      showTransition = false;
    }, 1500); // Match TransitionOverlay duration (500ms) + buffer
  }
  
  // Update previous board ID
  $: if ($currentBoard?.id) {
    previousBoardId = $currentBoard.id;
  }
</script>

<LeaderboardLayout 
  organization={data.organization}
  event={currentEvent}
  allEvents={data.liveEvents}
  rotationInterval={Number(data.organization.leaderboard_rotation_interval) || 10}
  showTransition={showTransition}
  on:transitionComplete={handleTransitionComplete}
  {loading}
  {error}
>
  <div class="content">
    {#if currentEvent}
      <LeaderboardScores 
        event={currentEvent}
        leaderboard={$currentScores || []}
      />
    {:else}
      <div class="no-event">
        <h2>Rotating through {boards.length} leaderboards...</h2>
        <p>Live events from {data.organization.name}</p>
      </div>
    {/if}
  </div>
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
  
  .no-event {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    text-align: center;
    gap: 1rem;
  }
  
  .no-event h2 {
    color: var(--color-text-primary, #333);
    font-size: 1.5rem;
    margin: 0;
  }
  
  .no-event p {
    color: var(--color-text-secondary, #666);
    font-size: 1rem;
    margin: 0;
  }
</style>