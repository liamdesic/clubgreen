<script lang="ts">
  import type { Event } from '$lib/validations';
  import type { Organization } from '$lib/validations';
  import { currentScores, activeBoard, runtimeStatus } from '$lib/runtime';
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
  import { currentScores as currentScoresRuntime, activeBoard as activeBoardRuntime, runtimeStatus as runtimeStatusRuntime } from '$lib/runtime';
  import type { PlayerTotalScore } from '$lib/validations/playerScore';
  import { showToast } from '$lib/stores/toastStore';

  export let organization: Organization;
  export let event: Event;
  export let loading = false;
  export let error: string | null = null;
  export let children: any;

  // Show error toast when error prop changes
  $: if (error) {
    showToast(error, 'error');
  }

  // Debug logs for store initialization
  console.log('LeaderboardLayout - Store imports:', {
    currentScores,
    activeBoard,
    runtimeStatus,
    boardRuntime
  });

  onMount(() => {
    console.log('LeaderboardLayout - onMount - Store state:', {
      currentScores: $currentScores,
      activeBoard: $activeBoard,
      runtimeStatus: $runtimeStatus
    });
  });

  // Get the current board status with defensive guards
  $: {
    console.log('LeaderboardLayout - Reactive update:', {
      loading,
      currentScoresValue: $currentScores,
      activeBoardValue: $activeBoard,
      runtimeStatusValue: $runtimeStatus
    });
  }

  $: status = loading ? { timeUntilRotation: 0, isRotating: false } : $runtimeStatus;
  $: currentBoard = loading ? null : $activeBoard;
  $: scores = loading ? [] : ($currentScores || []);
  $: lastUpdated = ($runtimeStatus?.lastUpdated) ? new Date($runtimeStatus.lastUpdated).toLocaleTimeString() : null;

  function handleRetry() {
    showToast('Refreshing leaderboard...', 'info');
    window.location.reload();
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
    {#if currentBoard && event?.id}
      <LeaderboardHeader {organization} {event} />
      
      <slot>
        {children}
      </slot>

      {#if !loading}
        <LeaderboardRotationStatus
          events={[event]}
          currentEventId={event.id}
          currentTimeFilter={'all_time' as TimeFilter}
          timeRemaining={status.timeUntilRotation}
          rotationInterval={10000}
          accentColor={event.accent_color ?? '#4CAF50'}
        />
      {/if}

      {#if lastUpdated}
        <div class="last-updated">
          Last updated: {lastUpdated}
        </div>
      {/if}
    {/if}
  </div>

  <TransitionOverlay />
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
    background: black;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 2rem;
    align-items: flex-start;
    width: 100%;
    height: 100vh;
    position: relative;
    overflow: hidden;
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