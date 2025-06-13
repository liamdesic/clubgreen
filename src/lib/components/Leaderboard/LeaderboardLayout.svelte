<script lang="ts">
  import type { Event } from '$lib/validations';
  import type { Organization } from '$lib/validations';
  import { currentScores, currentBoard, runtimeStatus } from '$lib/runtime';
  import LeaderboardHeader from './LeaderboardHeader.svelte';
  import LeaderboardScores from './LeaderboardScores.svelte';
  import LeaderboardSidebar from './LeaderboardSidebar.svelte';
  import TransitionOverlay from './TransitionOverlay.svelte';
  import LeaderboardRotationStatus from './LeaderboardRotationStatus.svelte';
  import type { TimeFilter } from '$lib/validations/timeFilter';
  import type { LeaderboardBoardView } from '$lib/validations/leaderboardView';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { onMount } from 'svelte';
  import { boardRuntime } from '$lib/runtime';
  import { currentScores as currentScoresRuntime, currentBoard as currentBoardRuntime, runtimeStatus as runtimeStatusRuntime } from '$lib/runtime';
  import type { LeaderboardScore } from '$lib/validations/leaderboardView';
  import { showToast } from '$lib/stores/toastStore';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let organization: Organization;
  export let event: Event | null = null;
  export let loading = false;
  export let error: string | null = null;
  export let children: any;
  
  // Optional props for org leaderboards with multiple events
  export let allEvents: Event[] = [];
  export let rotationInterval: number = 10000;
  export let showTransition = false;

  // Show error toast when error prop changes
  $: if (error) {
    console.error('[LeaderboardLayout] Error:', error, { currentBoard, event: displayEvent });
    showToast(error, 'error');
  }

  // Debug logs for store initialization
  console.log('LeaderboardLayout - Store imports:', {
    currentScores,
    currentBoard,
    runtimeStatus,
    boardRuntime
  });

  onMount(() => {
    console.log('[LeaderboardLayout] Initializing with stores:', {
      currentScores: $currentScores ? `${$currentScores.length} scores` : 'null',
      currentBoard: $currentBoard ? { id: $currentBoard.id, title: $currentBoard.title } : 'null',
      runtimeStatus: {
        activeBoardId: $runtimeStatus.activeBoardId,
        timeUntilRotation: $runtimeStatus.timeUntilRotation,
        isRotating: $runtimeStatus.isRotating,
        boardCount: $runtimeStatus.boardCount
      }
    });
  });

  // Consolidate store logging
  $: {
    if ($currentScores) {
      console.log('[LeaderboardLayout] Scores updated:', {
        boardId: $currentBoard?.id,
        scoreCount: $currentScores.length
      });
    }
  }

  // Consolidate board change logging
  $: if ($currentBoard) {
    console.log('[LeaderboardLayout] Board changed:', {
      boardId: $currentBoard.id,
      eventId: $currentBoard.eventId,
      timeFilter: $currentBoard.timeFilter
    });
  }

  $: status = loading ? { timeUntilRotation: 0, isRotating: false } : $runtimeStatus;
  $: scores = loading ? [] : ($currentScores || []);
  $: lastUpdated = ($runtimeStatus?.lastUpdated) ? new Date($runtimeStatus.lastUpdated).toLocaleTimeString() : null;
  
  // For org leaderboards, determine the current event from the active board
  $: displayEvent = event || (currentBoard && allEvents.find(e => e.id === currentBoard.eventId));
  $: eventsForRotationStatus = allEvents.length > 0 ? allEvents : (event ? [event] : []);
  $: currentTimeFilter = currentBoard?.timeFilter || 'all_time';
  $: currentEventId = displayEvent?.id || '';

  function handleRetry() {
    showToast('Refreshing leaderboard...', 'info');
    window.location.reload();
  }

  // Handle transition completion
  function handleTransitionComplete() {
    console.log('LeaderboardLayout - Transition complete');
    dispatch('transitionComplete');
  }

  // Handle board transitions
  $: if ($currentBoard && $currentScores) {
    console.log('[LeaderboardLayout] Received scores for board', $currentBoard.id, $currentScores);
    showTransition = true;
    setTimeout(() => {
      showTransition = false;
      console.log('[LeaderboardLayout] Transition complete');
    }, 1000);
  }

  // Handle board changes
  $: if ($currentBoard) {
    console.log('[LeaderboardLayout] Active board changed:', {
      id: $currentBoard.id,
      title: $currentBoard.title,
      timeFilter: $currentBoard.timeFilter
    });
    showTransition = true;
    setTimeout(() => {
      showTransition = false;
      console.log('[LeaderboardLayout] Board change transition complete');
    }, 1000);
  }
</script>

<div class="leaderboard-layout">
  {#if loading}
    <div class="loading-overlay">
      <LoadingSpinner 
        size="xl"
        color="var(--accent-color)"
        label="Loading leaderboard..."
        showLabel={true}
        center={true}
      />
    </div>
  {/if}

  {#if error}
    <div class="error-overlay" role="alert" aria-live="assertive">
      <div class="error-message">
        <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
        <p id="error-text">{error}</p>
        <button 
          class="retry-button" 
          on:click={handleRetry}
          aria-label="Retry loading data"
        >
          Retry
        </button>
      </div>
    </div>
  {/if}

  <div class="main-wrapper">
    {#if currentBoard && displayEvent}
      <LeaderboardHeader 
        organization={organization} 
        event={displayEvent} 
        timeFilter={currentTimeFilter}
      />
      
      <slot>
        {children}
      </slot>

      {#if !loading && eventsForRotationStatus.length > 0}
        <LeaderboardRotationStatus
          events={eventsForRotationStatus}
          currentEventId={currentEventId}
          currentTimeFilter={currentTimeFilter}
          timeRemaining={status.timeUntilRotation}
          rotationInterval={rotationInterval}
          accentColor={displayEvent.accent_color ?? '#4CAF50'}
        />
      {/if}

      {#if lastUpdated}
        <div class="last-updated">
          Last updated: {lastUpdated}
        </div>
      {/if}
    {/if}
  </div>

  <TransitionOverlay 
    active={showTransition}
    accentColor={displayEvent?.accent_color ?? '#4CAF50'}
    logoUrl={organization.logo_url || ''}
    on:complete={handleTransitionComplete}
  />
</div>

<style>
  /* Root Variables */
  :global(:root) {
    --accent-color: #00c853;
    --accent-color-dark: color-mix(in srgb, var(--accent-color) 20%, #101010);
    --accent-color-light: color-mix(in srgb, var(--accent-color) 20%, #ffffff);
  }

  /* Dynamic Accent Color */
  :global([style*="--accent-color"]) {
    --accent-h: 138;
    --accent-s: 10%;
    --accent-l: 119%;
  }

  /* Global Body Styles */
  :global(body) {
    background: #082c2c;
    color: white;
    font-family: 'obviously', sans-serif;
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }

  /* Layout Styles */
  .leaderboard-layout {
    background: var(--accent-gradient-very-dark);
    background-attachment: fixed;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 2rem;
    align-items: flex-start;
    width: 100%;
    height: 100vh;
    position: relative;
    overflow: hidden;
    transition: background 0.5s ease-in-out;
  }

  .main-wrapper {
    padding: 3rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; /* Allows content to scroll if needed */
    max-width: 100%;
    box-sizing: border-box;
  }

  .content {
    display: flex;
    gap: 1.5rem;
    flex: 1;
    min-height: 0;
    width: 100%;
    align-items: flex-start;
    box-sizing: border-box;
  }

  /* Loading & Error States */
  .loading-overlay,
  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    z-index: 1000;
  }

  .error-message {
    background: var(--error-color);
    padding: 2rem;
    border-radius: 8px;
    text-align: center;
    max-width: 80%;
  }

  .retry-button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  /* Responsive Styles */
  @media (max-width: 1024px) {
    .content {
      flex-direction: column;
      align-items: center;
    }
  }

  .last-updated {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    z-index: 100;
  }
</style> 