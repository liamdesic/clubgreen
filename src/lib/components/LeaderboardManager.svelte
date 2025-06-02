<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { fade, crossfade } from 'svelte/transition';
  import { supabase } from '$lib/supabaseClient';
  import { browser } from '$app/environment';
  import { 
    getDisplayableEvents, 
    getTodayISO, 
    hasDisplayableScores 
  } from '$lib/utils/leaderboard';
  import EventLeaderboardView from './EventLeaderboardView.svelte';
  import TransitionOverlay from './TransitionOverlay.svelte';
  import type { Event } from '$lib/types/event';
  import type { PlayerScore, OrganizationSettings } from '$lib/types/leaderboard';
  import LoadingSpinner from './LoadingSpinner.svelte';

  // Props
  export let organizationId: string;
  export let organizationSlug: string;
  export let organizationSettings: Partial<OrganizationSettings> = {};
  export let rotationInterval = 15000; // 15 seconds by default
  export let debug = false;
  export let showControls = false;
  
  // Rotation timer display
  let timeRemaining = rotationInterval / 1000;

  // State
  let loading = true;
  let error: string | null = null;
  let events: Event[] = [];
  let displayableEvents: Event[] = [];
  let currentEventIndex = 0;
  let scoreCounts: Record<string, number> = {};
  let eventLeaderboards: Record<string, PlayerScore[]> = {};
  let rotationPaused = false;
  let rotationTimer: ReturnType<typeof setTimeout> | null = null;
  let realtimeChannel: any = null;
  let transitioning = false;
  let showTransitionOverlay = false;
  let isMounted = false;
  
  // Debounce management for realtime updates
  let pendingUpdates: Set<string> = new Set();
  let updateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastMemoryCheck = Date.now();
  let memoryCheckInterval: ReturnType<typeof setInterval> | null = null;
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // Transition settings
  let transitionDuration = 1000; // 1 second transition

  // Derived state
  $: currentEvent = displayableEvents[currentEventIndex] || null;
  $: hasEvents = displayableEvents.length > 0;
  $: currentLeaderboard = currentEvent ? eventLeaderboards[currentEvent.id] || [] : [];

  // Crossfade transition
  const [send, receive] = crossfade({
    duration: 400,
    fallback: fade
  });

  // Load all data
  async function loadData() {
    if (!browser) return;
    
    try {
      loading = true;
      error = null;
      
      // Load events for this organization
      await loadEvents();
      
      // Load score counts for all events
      await loadScoreCounts();
      
      // Update displayable events
      updateDisplayableEvents();
      
      // Load initial leaderboard
      if (displayableEvents.length > 0) {
        const initialEventId = displayableEvents[currentEventIndex].id;
        await loadLeaderboardForEvent(initialEventId);
        
        // Set current leaderboard
        currentLeaderboard = eventLeaderboards[initialEventId] || [];
        console.log(`[LeaderboardManager] Loaded initial leaderboard for event ${initialEventId}:`, currentLeaderboard);
      }
      
      // Set up realtime subscription
      setupRealtimeSubscription();
      
      // Start rotation if we have multiple events
      if (displayableEvents.length > 1 && !rotationPaused) {
        startRotation();
      }
      
      loading = false;
      
      // Dispatch ready event
      if (isMounted) {
        console.log('[LeaderboardManager] Component ready, dispatching ready event');
        dispatch('ready');
      }
    } catch (err) {
      console.error('Error initializing LeaderboardManager:', err);
      error = 'Failed to load leaderboard data. Please try refreshing the page.';
      loading = false;
    }
  }

  // Load all events for the organization
  async function loadEvents() {
    try {
      const { data, error: err } = await supabase
        .from('events')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (err) throw err;
      
      events = data || [];
      console.log(`[LeaderboardManager] Loaded ${events.length} events`);
      
    } catch (err) {
      console.error('Error loading events:', err);
      throw err;
    }
  }

  // Load score counts for all events
  async function loadScoreCounts() {
    if (!events.length) return;
    
    try {
      // Get event IDs
      const eventIds = events.map(event => event.id);
      
      // Initialize counts for all events to 0
      const counts: Record<string, number> = {};
      eventIds.forEach(id => {
        counts[id] = 0;
      });
      
      // Fetch all published scorecards for these events
      const { data, error: err } = await supabase
        .from('scorecard')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('published', true);
      
      if (err) throw err;
      
      // Count manually
      (data || []).forEach(row => {
        counts[row.event_id] = (counts[row.event_id] || 0) + 1;
      });
      
      scoreCounts = counts;
      console.log(`[LeaderboardManager] Loaded score counts:`, scoreCounts);
      
    } catch (err) {
      console.error('Error loading score counts:', err);
      throw err;
    }
  }

  // Update the list of displayable events
  function updateDisplayableEvents() {
    const today = getTodayISO();
    displayableEvents = getDisplayableEvents(events, scoreCounts);
    
    // Reset current event index
    currentEventIndex = 0;
    
    // Set initial accent color if we have events
    if (displayableEvents.length > 0 && browser) {
      const initialEvent = displayableEvents[0];
      if (initialEvent?.settings_json?.accent_color) {
        document.documentElement.style.setProperty('--accent-color', initialEvent.settings_json.accent_color);
        console.log(`[LeaderboardManager] Set initial accent color to ${initialEvent.settings_json.accent_color} for event ${initialEvent.title}`);
      }
    }
    
    console.log(`[LeaderboardManager] Updated displayable events: ${displayableEvents.length} events`);
    if (debug) {
      console.table(displayableEvents.map(e => ({
        id: e.id,
        title: e.title,
        date: e.event_date,
        scores: scoreCounts[e.id] || 0,
        accentColor: e.settings_json?.accent_color || 'default'
      })));
    }
  }

  // Load leaderboard for a specific event
  async function loadLeaderboardForEvent(eventId: string) {
    try {
      // Fetch all scorecard entries for the event
      const { data, error: err } = await supabase
        .from('scorecard')
        .select('player_id, name, score, hole_number, hole_in_ones, published')
        .eq('event_id', eventId)
        .eq('published', true);
      
      if (err) throw err;
      
      if (!data || data.length === 0) {
        eventLeaderboards[eventId] = [];
        return;
      }
      
      // Process scores
      const processedScores = processScores(data);
      eventLeaderboards = { ...eventLeaderboards, [eventId]: processedScores };
      
    } catch (err) {
      console.error(`Error loading leaderboard for event ${eventId}:`, err);
      throw err;
    }
  }

  // Process scores from scorecard data
  function processScores(rows: Array<{
    player_id: string;
    name?: string;
    score?: number;
    hole_in_ones?: number;
  }>): PlayerScore[] {
    const playerMap = new Map<string, PlayerScore>();
    
    for (const row of rows) {
      const playerId = row.player_id;
      
      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          id: playerId,
          name: row.name || 'Unknown Player',
          totalScore: 0,
          holeInOnes: 0
        });
      }
      
      const player = playerMap.get(playerId)!;
      player.totalScore += row.score || 0;
      player.holeInOnes += row.hole_in_ones || 0;
    }
    
    return Array.from(playerMap.values())
      .sort((a, b) => a.totalScore - b.totalScore);
  }

  // Set up realtime subscription
  function setupRealtimeSubscription() {
    if (!browser || realtimeChannel) return;
    
    // Subscribe to all scorecard changes for this organization's events
    const eventIds = events.map(event => event.id);
    
    realtimeChannel = supabase
      .channel('org-leaderboard-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'scorecard',
        filter: `event_id=in.(${eventIds.join(',')})` 
      }, handleScoreUpdate)
      .subscribe();
      
    console.log(`[LeaderboardManager] Set up realtime subscription for ${eventIds.length} events`);
  }

  // Handle score update from realtime subscription with debouncing
  function handleScoreUpdate(payload: any) {
    if (!isMounted) return;
    
    console.log(`[LeaderboardManager] Received scorecard update:`, payload);
    
    // Get the event ID from the payload
    const eventId = payload.new?.event_id;
    if (!eventId) return;
    
    // Add this event to pending updates
    pendingUpdates.add(eventId);
    
    // Clear existing timer if there is one
    if (updateDebounceTimer) {
      clearTimeout(updateDebounceTimer);
    }
    
    // Set a new timer to process updates after a delay
    updateDebounceTimer = setTimeout(async () => {
      if (!isMounted) return;
      
      console.log(`[LeaderboardManager] Processing ${pendingUpdates.size} debounced updates`);
      
      try {
        // Update score counts once for all events
        await loadScoreCounts();
        
        // Process each event that needs updating
        const updatePromises = Array.from(pendingUpdates).map(eventId => 
          loadLeaderboardForEvent(eventId)
        );
        
        await Promise.all(updatePromises);
        
        // Update displayable events once after all updates
        updateDisplayableEvents();
        
        // Clear pending updates
        pendingUpdates.clear();
      } catch (err) {
        console.error('[LeaderboardManager] Error processing updates:', err);
      }
    }, 500); // 500ms debounce delay
  }

  // Start rotation timer
  function startRotation() {
    if (rotationPaused || rotationTimer || displayableEvents.length <= 1) return;
    
    // Reset time remaining display
    timeRemaining = rotationInterval / 1000;
    
    // Start countdown display
    const countdownInterval = setInterval(() => {
      timeRemaining -= 1;
      if (timeRemaining <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);
    
    // Set the rotation timer
    rotationTimer = setTimeout(() => {
      rotateToNext();
      clearInterval(countdownInterval);
    }, rotationInterval);
    
    console.log(`[LeaderboardManager] Started rotation timer: ${rotationInterval}ms`);
  }

  // Stop rotation timer
  function stopRotation() {
    if (rotationTimer) {
      clearTimeout(rotationTimer);
      rotationTimer = null;
      console.log(`[LeaderboardManager] Stopped rotation timer`);
    }
  }

  // Rotate to next event
  async function rotateToNext() {
    if (displayableEvents.length <= 1) return;
    
    transitioning = true;
    
    // Stop current timer
    stopRotation();
    
    // Show transition overlay
    showTransitionOverlay = true;
    
    // Calculate next event index
    const nextEventIndex = (currentEventIndex + 1) % displayableEvents.length;
    const nextEvent = displayableEvents[nextEventIndex];
    const newEventId = nextEvent.id;
    
    // Store the next event's accent color to apply during the transition
    const nextAccentColor = nextEvent?.settings_json?.accent_color;
    
    // Wait for half the transition duration before changing the event and accent color
    setTimeout(() => {
      // Move to next index
      currentEventIndex = nextEventIndex;
      
      // Update current leaderboard
      currentLeaderboard = eventLeaderboards[newEventId] || [];
      
      // Apply the accent color at the midpoint of the transition
      if (browser && nextAccentColor) {
        document.documentElement.style.setProperty('--accent-color', nextAccentColor);
        console.log(`[LeaderboardManager] Set accent color to ${nextAccentColor} for event ${nextEvent.title}`);
      }
    }, transitionDuration / 2);
    
    // Load the leaderboard data for the new event
    if (!eventLeaderboards[newEventId]) {
      await loadLeaderboardForEvent(newEventId);
    }
  }

  // Rotate to previous event
  async function rotateToPrevious() {
    if (displayableEvents.length <= 1) return;
    
    transitioning = true;
    
    // Stop current timer
    stopRotation();
    
    // Show transition overlay
    showTransitionOverlay = true;
    
    // Calculate previous event index
    const prevIndex = (currentEventIndex - 1 + displayableEvents.length) % displayableEvents.length;
    const prevEvent = displayableEvents[prevIndex];
    const newEventId = prevEvent.id;
    
    // Store the previous event's accent color to apply during the transition
    const prevAccentColor = prevEvent?.settings_json?.accent_color;
    
    // Wait for half the transition duration before changing the event and accent color
    setTimeout(() => {
      currentEventIndex = prevIndex;
      
      // Update current leaderboard
      currentLeaderboard = eventLeaderboards[newEventId] || [];
      
      // Apply the accent color at the midpoint of the transition
      if (browser && prevAccentColor) {
        document.documentElement.style.setProperty('--accent-color', prevAccentColor);
        console.log(`[LeaderboardManager] Set accent color to ${prevAccentColor} for event ${prevEvent.title}`);
      }
    }, transitionDuration / 2);
    
    // Load the leaderboard data for the new event
    if (!eventLeaderboards[newEventId]) {
      await loadLeaderboardForEvent(newEventId);
    }
    if (rotationPaused) {
      stopRotation();
    } else {
      startRotation();
    }
  }

  // Toggle rotation pause state
  function togglePause() {
    rotationPaused = !rotationPaused;
    
    if (rotationPaused) {
      stopRotation();
    } else {
      startRotation();
    }
  }

  // Check memory usage and perform cleanup if needed
  function checkMemoryUsage() {
    if (!browser || !isMounted) return;
    
    // Only log every 10 minutes to avoid console spam
    const now = Date.now();
    if (now - lastMemoryCheck > 10 * 60 * 1000) {
      console.log('[LeaderboardManager] Performing periodic memory check');
      lastMemoryCheck = now;
      
      // Force garbage collection of any unused objects
      eventLeaderboards = { ...eventLeaderboards };
      scoreCounts = { ...scoreCounts };
      
      // Check if we have any memory issues with the realtime channel
      if (realtimeChannel && !realtimeChannel.isJoined()) {
        console.log('[LeaderboardManager] Realtime channel disconnected, reconnecting...');
        cleanup();
        setupRealtimeSubscription();
      }
    }
  }
  
  // Comprehensive cleanup function
  function cleanup() {
    if (!browser) return;
    
    console.log('[LeaderboardManager] Running cleanup');
    
    // Stop rotation timer
    stopRotation();
    
    // Clear any debounce timers
    if (updateDebounceTimer) {
      clearTimeout(updateDebounceTimer);
      updateDebounceTimer = null;
    }
    
    // Clear memory check interval
    if (memoryCheckInterval) {
      clearInterval(memoryCheckInterval);
      memoryCheckInterval = null;
    }
    
    // Clear pending updates
    pendingUpdates.clear();
    
    // Remove realtime subscription
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  }

  // Handle refresh event from parent
  function handleRefresh(event: CustomEvent) {
    if (!isMounted) return;
    
    console.log('[LeaderboardManager] Received refresh event');
    
    // Clean up existing resources
    cleanup();
    
    // Reset state that might accumulate over time
    pendingUpdates.clear();
    
    // Reload data
    loadData();
  }
  
  // Lifecycle
  onMount(() => {
    isMounted = true;
    
    // Set up memory check interval
    memoryCheckInterval = setInterval(checkMemoryUsage, 5 * 60 * 1000); // Check every 5 minutes
    
    // Set up event listener for refresh events
    if (browser) {
      document.addEventListener('refresh', handleRefresh as EventListener);
    }
    
    // Initial data load
    loadData();
  });
  
  onDestroy(() => {
    isMounted = false;
    
    // Remove event listener
    if (browser) {
      document.removeEventListener('refresh', handleRefresh as EventListener);
    }
    
    // Run cleanup
    cleanup();
  });
</script>

<!-- Main container -->
<div class="leaderboard-manager">
  {#if error}
    <div class="error-message" role="alert">
      <p>{error}</p>
      <button 
        class="retry-button" 
        on:click={loadData}
        aria-label="Retry loading leaderboard"
      >
        Retry
      </button>
    </div>
  {:else if loading}
    <div class="loading-overlay">
      <LoadingSpinner 
        size="xl" 
        color="var(--accent-color, #4CAF50)" 
        label="Loading leaderboards..."
        showLabel={true}
        center={true}
      />
    </div>
  {:else if error}
    <div class="error-message" role="alert">
      <p>{error}</p>
      <button 
        class="retry-button" 
        on:click={loadData}
        aria-label="Retry loading leaderboard"
      >
        Retry
      </button>
    </div>
  {:else if !hasEvents}
    <div class="no-events-message">
      <h2>No Active Leaderboards</h2>
      <p>There are no active events with scores today.</p>
    </div>
  {:else}
    <!-- Current event leaderboard -->
    {#key currentEvent?.id}
      <div 
        in:receive={{key: currentEvent?.id}}
        out:send={{key: currentEvent?.id}}
        class="event-container"
      >
        {#if currentEvent}
          <EventLeaderboardView
            org={organizationSlug}
            event={currentEvent}
            organizationSettings={organizationSettings}
            leaderboard={currentLeaderboard}
            showQr={true}
            showAds={true}
            debug={debug}
            hydrateFromSupabase={false}
          />
        {/if}
      </div>
    {/key}
    
    <!-- Transition Overlay -->
    <TransitionOverlay 
      active={showTransitionOverlay} 
      accentColor={currentEvent?.settings_json?.accent_color || organizationSettings?.accent_color || '#4CAF50'}
      logoUrl={organizationSettings?.logo_url || ''}
      duration={transitionDuration}
      on:complete={() => {
        showTransitionOverlay = false;
        transitioning = false;
        
        // Start new timer if not paused
        if (!rotationPaused) {
          startRotation();
        }
      }}
    />
    
    <!-- Controls (if enabled) -->
    {#if showControls}
      <div class="controls" transition:fade={{ duration: 200 }}>
        <div class="timer-display">
          Next in: {timeRemaining}s
        </div>
        <button on:click={() => rotationPaused = !rotationPaused}>
          {rotationPaused ? 'Resume' : 'Pause'}
        </button>
        <button on:click={rotateToPrevious} disabled={displayableEvents.length <= 1}>
          Previous
        </button>
        <button on:click={rotateToNext} disabled={displayableEvents.length <= 1}>
          Next
        </button>
        <div class="interval-controls">
          <button on:click={() => {
            rotationInterval = Math.max(5000, rotationInterval - 5000);
            if (!rotationPaused) {
              stopRotation();
              startRotation();
            }
          }}>-5s</button>
          <span>{rotationInterval / 1000}s</span>
          <button on:click={() => {
            rotationInterval += 5000;
            if (!rotationPaused) {
              stopRotation();
              startRotation();
            }
          }}>+5s</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .leaderboard-manager {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 100vh;
    overflow: hidden;
  }
  
  .event-container {
    width: 100%;
    height: 100%;
  }
  
  /* Loading and Error States */
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.9);
    z-index: 1000;
  }
  
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
  
  .control-button {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    border: none;
    background: white;
    color: #333;
    font-size: 1.2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .control-button:hover:not(:disabled) {
    background: #f0f0f0;
    transform: scale(1.05);
  }
  
  .control-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .event-counter {
    display: flex;
    align-items: center;
    color: white;
    font-weight: 600;
    padding: 0 1rem;
  }
</style>
