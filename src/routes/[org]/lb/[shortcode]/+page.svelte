<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { boardRuntime, currentBoard, currentScores } from '$lib/runtime';
  import LeaderboardLayout from '$lib/components/leaderboard/LeaderboardLayout.svelte';
  import LeaderboardScores from '$lib/components/leaderboard/LeaderboardScores.svelte';
  import LeaderboardHeader from '$lib/components/leaderboard/LeaderboardHeader.svelte';
  import LeaderboardRotationStatus from '$lib/components/leaderboard/LeaderboardRotationStatus.svelte';
  import { type FormErrorResponse, createErrorResponse } from '$lib/validations/errorSchemas';
  import { showToast } from '$lib/stores/toastStore';
  import type { TimeFilter } from '$lib/validations/timeFilter';
  import type { Event } from '$lib/validations';
  import type { Organization } from '$lib/validations';
  import type { LeaderboardBoard } from '$lib/runtime/board.types';
  import { supabase } from '$lib/supabaseClient';
  
  export let data: {
    organization: Organization;
    event: Event;
  };
  
  let loading = true;
  let error: string | null = null;
  let realtimeChannel: any = null;
  
  // Initialize the board runtime
  onMount(() => {
    console.log('Page - onMount - Starting runtime initialization');
    
    if (!data.event?.id) {
      console.error('Page - onMount - No event data found');
      error = 'Event not found';
      showToast('Event not found', 'error');
      loading = false;
      return;
    }
    
    try {
      // Set up the board
      const boards: LeaderboardBoard[] = [{
        id: 'main-leaderboard',
        eventId: data.event.id,
        timeFilter: 'all_time' as TimeFilter,
        title: data.event.title || 'Leaderboard'
      }];
      
      console.log('Page - onMount - Initializing runtime with boards:', boards);
      
      // Initialize the runtime
      const cleanup = boardRuntime.initialize({
        rotationIntervalMs: 10000, // 10 seconds
        rotationEnabled: true, // Enable auto-rotation
        onError: (err) => {
          console.error('Runtime error:', err);
          error = err.message;
          showToast(err.message, 'error');
        }
      });
      
      console.log('Page - onMount - Runtime initialized, setting boards');
      
      // Set the boards
      boardRuntime.setBoards(boards);
      
      // Set up real-time subscription
      setupRealtimeSubscription();
      
      console.log('Page - onMount - Boards set, runtime ready');
      
      loading = false;
      
      // Cleanup on component destroy
      return () => {
        console.log('Page - onMount - Cleanup: stopping runtime');
        cleanup();
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
        }
      };
    } catch (err) {
      console.error('Error initializing leaderboard:', err);
      error = err instanceof Error ? err.message : 'Failed to initialize leaderboard';
      showToast(error, 'error');
      loading = false;
    }
  });

  function setupRealtimeSubscription() {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }
    
    realtimeChannel = supabase
      .channel('public:scorecard')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'scorecard',
        filter: `event_id=eq.${data.event.id}`
      }, () => {
        console.log('Score inserted, refreshing leaderboard');
        // The boardRuntime will automatically handle updates through its subscription
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'scorecard',
        filter: `event_id=eq.${data.event.id}`
      }, () => {
        console.log('Score updated, refreshing leaderboard');
        // The boardRuntime will automatically handle updates through its subscription
      })
      .subscribe();
  }
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
  
  {#if data.event.id}
    <LeaderboardRotationStatus 
      events={[data.event]}
      currentEventId={data.event.id}
      currentTimeFilter={'all_time' as TimeFilter}
      timeRemaining={0}
      rotationInterval={10000}
      accentColor={data.event.accent_color ?? '#4CAF50'}
    />
  {/if}
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