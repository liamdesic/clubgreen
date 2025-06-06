<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/supabaseClient';
  import { page } from '$app/stores';
  import TransitionOverlay from '$lib/components/TransitionOverlay.svelte';
  import LeaderboardManager from '$lib/components/LeaderboardManager.svelte';


  // Page state management
  type LoadState = 'loading' | 'transition' | 'ready' | 'error';
  let state: LoadState = 'loading';
  
  // Data
  let logoUrl = '';
  let organizationId = '';
  let organizationSlug = '';
  let organizationSettings: Record<string, any> = {};
  let accentColor = '#4CAF50'; // Default accent color
  let errorMsg: string | null = null;
  let leaderboardLoaded = false;
  let eventCode = '';
  
  // Cleanup and stability management
  let pageVisible = true;
  let periodicCleanupTimer: ReturnType<typeof setTimeout> | null = null;
  let leaderboardManagerRef: HTMLDivElement | null = null;

  // Helper function for delays
  function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
  
  // Main initialization function
  async function initPage() {
    state = 'loading';
    errorMsg = null;
    
    try {
      // Get route parameters
      organizationSlug = $page.params.org;
      eventCode = $page.params.code;
      
      console.log(`[Org Leaderboard] Initializing for org: ${organizationSlug}, code: ${eventCode}`);
      
      // Fetch organization data and get logo URL from settings_json
      const { data, error } = await supabase
        .from('organizations')
        .select('id, settings_json')
        .eq('slug', organizationSlug)
        .single();
      
      if (error || !data) throw new Error(error?.message || 'Organization not found');
      
      organizationId = data.id;
      organizationSettings = data.settings_json || {};
      logoUrl = organizationSettings.logo_url || '';
      accentColor = organizationSettings.accent_color || '#4CAF50';
      
      // Apply accent color to CSS variable
      if (browser) {
        document.documentElement.style.setProperty('--accent-color', accentColor);
        console.log(`[Org Leaderboard] Set accent color to ${accentColor}`);
        
        // We'll load CSS directly in the component instead of dynamically
        // This ensures the styles are properly bundled with the component
      }
      
      // Brief delay before showing transition
      await delay(500);
      
      // Go straight to transition
      state = 'transition';
      
    } catch (err) {
      console.error('[Org Leaderboard] Error loading data:', err);
      errorMsg = err instanceof Error ? err.message : 'Failed to load organization';
      state = 'error';
    }
  }
  
  // Handle leaderboard loaded event
  function handleLeaderboardReady() {
    console.log('[Org Leaderboard] LeaderboardManager is ready');
    leaderboardLoaded = true;
  }
  
  // Handle page visibility changes
  function handleVisibilityChange() {
    pageVisible = !document.hidden;
    console.log(`[Org Leaderboard] Page visibility changed: ${pageVisible ? 'visible' : 'hidden'}`);
    
    // When page becomes visible again after being hidden, check if we need to refresh
    if (pageVisible && state === 'ready') {
      // Optional: could trigger a data refresh here if needed
    }
  }
  
  // Periodic cleanup to prevent memory leaks during long-running sessions
  function setupPeriodicCleanup() {
    // Clean up any existing timer
    if (periodicCleanupTimer) {
      clearTimeout(periodicCleanupTimer);
    }
    
    // Set up a new cleanup timer - runs every 3 hours
    periodicCleanupTimer = setTimeout(() => {
      console.log('[Org Leaderboard] Running periodic cleanup');
      
      // Force garbage collection by refreshing key components
      if (state === 'ready' && leaderboardManagerRef) {
        // Trigger a refresh of the LeaderboardManager component
        const event = new CustomEvent('refresh');
        leaderboardManagerRef.dispatchEvent(event);
      }
      
      // Set up the next cleanup
      setupPeriodicCleanup();
    }, 3 * 60 * 60 * 1000); // 3 hours
  }
  
  // Initialize on mount
  onMount(() => {
    initPage();
    
    // Set up page visibility handling
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up periodic cleanup
    setupPeriodicCleanup();
    
    // CSS is now loaded in EventLeaderboardView component
    if (browser) {
      console.log('[CSS Debug] CSS loading delegated to EventLeaderboardView');
    }
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (periodicCleanupTimer) {
        clearTimeout(periodicCleanupTimer);
      }
    };
  });
</script>

<div class="logo-display-page" class:accent-background={state === 'ready'}>
  {#if state === 'error'}
    <div class="error-message" role="alert">
      <p>{errorMsg}</p>
      <button class="retry-button" on:click={() => initPage()}>Retry</button>
    </div>
  {:else if state === 'loading'}
    <div class="black-loading-screen">
      <!-- Clean black screen with no text -->
    </div>
  {:else if state === 'transition' || state === 'ready'}
    <!-- Always render both components, control visibility with CSS -->
    {#if organizationId && organizationSlug}
      <!-- LeaderboardManager loads in the background while transition is visible -->
      <div class="page-container" style="background-color: black;">
        <div class="leaderboard-container" class:visible={state === 'ready'} bind:this={leaderboardManagerRef}>
          <LeaderboardManager
            organizationId={organizationId}
            organizationSlug={organizationSlug}
            organizationSettings={organizationSettings}
            rotationInterval={15000}
            showControls={false}
            on:ready={handleLeaderboardReady}
          />
        </div>
        
        <!-- TransitionOverlay is positioned above the LeaderboardManager -->
        <div class="transition-container" class:hidden={state === 'ready'}>
          <TransitionOverlay
            active={state === 'transition'}
            logoUrl={logoUrl}
            duration={800}
            accentColor={accentColor}
            on:complete={() => state = 'ready'}
          />
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .logo-display-page {
    position: fixed;
    inset: 0;
    background-color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    width: 100vw;
    height: 100vh;
    transition: background-color 0.8s ease-in-out;
  }
  
  .accent-background {
    background: var(--accent-gradient-very-dark);
  }
  
  .leaderboard-container {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }
  
  .leaderboard-container.visible {
    opacity: 1;
  }
  
  .transition-container {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1000; /* Higher z-index to appear above the leaderboard */
    transition: opacity 0.5s ease-in-out;
  }
  
  .transition-container.hidden {
    opacity: 0;
    pointer-events: none; /* Prevents interaction when hidden */
  }

  /* Black screen styles */
  .black-loading-screen {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
    z-index: 1000;
  }

  .error-message {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.95);
    color: #e74c3c;
    z-index: 2000;
  }
  
  .retry-button {
    margin-top: 24px;
    padding: 12px 24px;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
  }
  
  .retry-button:hover {
    opacity: 0.88;
  }
</style>
