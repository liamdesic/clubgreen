<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { leaderboardStore, currentEvent, currentLeaderboard, hasEvents } from '$lib/stores/LeaderboardStore';
  import { rotationStore, timeRemaining, isPaused } from '$lib/stores/RotationStore';
  import { themeStore } from '$lib/stores/ThemeStore';
  import EventLeaderboardView from './EventLeaderboardView.svelte';
  import TransitionOverlay from './TransitionOverlay.svelte';
  import TimeRangeBadge from './TimeRangeBadge.svelte';
  import LeaderboardRotationStatus from './LeaderboardRotationStatus.svelte';
  import { browser } from '$app/environment';

  // Props
  export let organizationId: string;
  export let organizationSlug: string;
  export let organizationSettings: Record<string, any> = {};
  export let rotationInterval = 15000; // 15 seconds by default
  export let showControls = false;
  
  // State
  let transitioning = false;
  let showTransitionOverlay = false;
  let isMounted = false;
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // Handle rotation
  async function handleRotation() {
    if (!$hasEvents) return;
    
    // Show transition overlay
    transitioning = true;
    showTransitionOverlay = true;
    
    try {
      // Wait for transition overlay to appear
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Rotate to next event/filter
      await leaderboardStore.rotateNext();
      
      // Update theme based on new event
      if ($currentEvent?.settings_json?.accent_color) {
        themeStore.setAccentColor($currentEvent.settings_json.accent_color);
      }
      
      // Wait for data to load
      await new Promise(resolve => setTimeout(resolve, 400));
      
    } catch (err) {
      console.error('Error during rotation:', err);
    }
    
    // Return true to indicate rotation is complete
    return true;
  }
  
  // Handle manual rotation
  async function rotateToNext() {
    // Pause rotation during manual navigation
    const wasPaused = $isPaused;
    rotationStore.pause();
    
    await handleRotation();
    
    // Resume rotation if it wasn't paused before
    if (!wasPaused) {
      rotationStore.resume();
    }
  }
  
  // Handle manual rotation to previous
  async function rotateToPrevious() {
    if (!$hasEvents) return;
    
    // Pause rotation during manual navigation
    const wasPaused = $isPaused;
    rotationStore.pause();
    
    // Show transition overlay
    transitioning = true;
    showTransitionOverlay = true;
    
    try {
      // Wait for transition overlay to appear
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Rotate to previous event
      await leaderboardStore.rotatePrevious();
      
      // Update theme based on new event
      if ($currentEvent?.settings_json?.accent_color) {
        themeStore.setAccentColor($currentEvent.settings_json.accent_color);
      }
      
      // Wait for data to load
      await new Promise(resolve => setTimeout(resolve, 400));
      
    } catch (err) {
      console.error('Error during rotation:', err);
    }
    
    // Resume rotation if it wasn't paused before
    if (!wasPaused) {
      rotationStore.resume();
    }
  }
  
  // Initialize on mount
  onMount(async () => {
    isMounted = true;
    console.log('[LeaderboardController] Mounting component with organizationId:', organizationId);
    
    // Initialize theme store with organization settings
    themeStore.initialize(
      organizationSettings.accent_color || '#4CAF50',
      organizationSettings.logo_url || ''
    );
    
    // Initialize leaderboard store
    console.log('[LeaderboardController] Initializing leaderboard store...');
    await leaderboardStore.initialize(organizationId);
    console.log('[LeaderboardController] Leaderboard store initialized, current state:', $leaderboardStore);
    console.log('[LeaderboardController] Current event:', $currentEvent);
    console.log('[LeaderboardController] Current leaderboard data:', $currentLeaderboard);
    
    // Initialize rotation store
    rotationStore.initialize(rotationInterval, handleRotation);
    
    // Notify parent that we're ready
    dispatch('ready');
  });
  
  // Clean up on destroy
  onDestroy(() => {
    isMounted = false;
    leaderboardStore.cleanup();
    rotationStore.cleanup();
  });
  
  // Handle transition overlay completion
  function handleTransitionComplete() {
    showTransitionOverlay = false;
    transitioning = false;
  }
</script>

<div class="leaderboard-controller">
  {#if $leaderboardStore.error}
    <div class="error-message" role="alert">
      <p>{$leaderboardStore.error}</p>
      <button 
        class="retry-button" 
        on:click={() => leaderboardStore.initialize(organizationId)}
      >
        Retry
      </button>
    </div>
  {:else if $leaderboardStore.loading && !$currentEvent}
    <div class="loading-container">
      <div class="spinner"></div>
    </div>
  {:else if !$hasEvents}
    <div class="no-events-message">
      <h2>No Active Leaderboards</h2>
      <p>There are no active events with scores today.</p>
    </div>
  {:else}
    <!-- Current event leaderboard -->
    <div class="event-container">
      {#if $currentEvent}
        <!-- Time range badge -->
        <div class="time-range-badge-container">
          <TimeRangeBadge timeRange={$leaderboardStore.currentTimeFilter} />
        </div>
        
        <!-- Event leaderboard -->
        <EventLeaderboardView
          event={$currentEvent}
          scores={$currentLeaderboard}
          loading={$leaderboardStore.loading}
        />
      {/if}
    </div>
    
    <!-- Transition Overlay -->
    <TransitionOverlay 
      active={showTransitionOverlay} 
      accentColor={$currentEvent?.settings_json?.accent_color || organizationSettings?.accent_color || '#4CAF50'}
      logoUrl={organizationSettings?.logo_url || ''}
      duration={800}
      on:complete={handleTransitionComplete}
    />
    
    <!-- Rotation Status Component (always visible) -->
    {#if $hasEvents && $currentEvent}
      <LeaderboardRotationStatus
        events={$leaderboardStore.displayableEvents}
        currentEventId={$currentEvent.id}
        currentTimeFilter={$leaderboardStore.currentTimeFilter}
        timeRemaining={$timeRemaining}
        rotationInterval={rotationInterval}
        accentColor={$currentEvent?.settings_json?.accent_color || organizationSettings?.accent_color || '#4CAF50'}
      />
    {/if}
    
    <!-- Controls (if enabled) -->
    {#if showControls}
      <div class="controls">
        <div class="timer-display">
          Next in: {$timeRemaining}s
        </div>
        <button on:click={() => rotationStore.togglePause()}>
          {$isPaused ? 'Resume' : 'Pause'}
        </button>
        <button on:click={rotateToPrevious} disabled={!$hasEvents || $leaderboardStore.displayableEvents.length <= 1}>
          Previous
        </button>
        <button on:click={rotateToNext} disabled={!$hasEvents || $leaderboardStore.displayableEvents.length <= 1}>
          Next
        </button>
        <div class="interval-controls">
          <button on:click={() => {
            const newInterval = Math.max(5000, rotationInterval - 5000);
            rotationInterval = newInterval;
            rotationStore.setInterval(newInterval);
          }}>-5s</button>
          <span>{rotationInterval / 1000}s</span>
          <button on:click={() => {
            rotationInterval += 5000;
            rotationStore.setInterval(rotationInterval);
          }}>+5s</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .leaderboard-controller {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 100vh;
    overflow: hidden;
  }
  
  .event-container {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .time-range-badge-container {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 10;
  }
  
  /* Loading container */
  .loading-container {
    position: fixed;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.9);
  }
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 5px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: var(--accent-color, #4CAF50);
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Error message */
  .error-message {
    padding: 2rem;
    margin: 2rem;
    background: #ffebee;
    border-left: 4px solid #f44336;
    color: #b71c1c;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .retry-button {
    padding: 0.5rem 1rem;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .retry-button:hover {
    background: #d32f2f;
  }
  
  /* No events message */
  .no-events-message {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    text-align: center;
    padding: 2rem;
    background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
  }
  
  .no-events-message h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: #333;
  }
  
  .no-events-message p {
    font-size: 1.2rem;
    color: #666;
  }
  
  /* Controls */
  .controls {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 2rem;
    z-index: 100;
  }
  
  /* Controls styling */
  button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: none;
    background: white;
    color: #333;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  button:hover:not(:disabled) {
    background: #f0f0f0;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .timer-display {
    color: white;
    font-weight: 600;
    padding: 0 1rem;
  }
  
  .interval-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .interval-controls span {
    color: white;
    min-width: 3rem;
    text-align: center;
  }
</style>
