<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import TransitionOverlay from '$lib/components/TransitionOverlay.svelte';
  import LeaderboardController from '$lib/components/LeaderboardController.svelte';

  // Page state management
  type LoadState = 'loading' | 'transition' | 'ready' | 'error';
  let state: LoadState = 'loading';
  
  // Data
  let logoUrl = '';
  let showFullscreenButton = false;
  let mouseTimer: ReturnType<typeof setTimeout> | null = null;
  let organizationId = '';
  let organizationSlug = '';
  let organizationSettings: Record<string, any> = {};
  let accentColor = '#4CAF50'; // Default accent color
  let errorMsg: string | null = null;
  let leaderboardLoaded = false;
  let eventCode = '';
  
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
      
      console.log(`[MB Leaderboard] Initializing for org: ${organizationSlug}, code: ${eventCode}`);
      
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
      
      // Brief delay before showing transition
      await delay(500);
      
      // Go straight to transition
      state = 'transition';
      
    } catch (err) {
      console.error('[MB Leaderboard] Error loading data:', err);
      errorMsg = err instanceof Error ? err.message : 'Failed to load organization';
      state = 'error';
    }
  }
  
  // Handle leaderboard loaded event
  function handleLeaderboardReady() {
    console.log('[MB Leaderboard] LeaderboardController is ready');
    leaderboardLoaded = true;
  }
  
  // Handle mouse movement to show/hide fullscreen button
  function handleMouseMove() {
    showFullscreenButton = true;
    
    if (mouseTimer) {
      clearTimeout(mouseTimer);
    }
    
    mouseTimer = setTimeout(() => {
      showFullscreenButton = false;
    }, 3000);
  }
  
  // Toggle fullscreen
  function toggleFullscreen() {
    if (!browser) return;
    
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
  
  // Initialize on mount
  onMount(() => {
    if (browser) {
      document.addEventListener('mousemove', handleMouseMove);
    }
    
    initPage();
    
    return () => {
      if (browser) {
        document.removeEventListener('mousemove', handleMouseMove);
      }
      if (mouseTimer) {
        clearTimeout(mouseTimer);
      }
    };
  });
</script>

<div class="mb-display-page" class:accent-background={state === 'ready'} on:mousemove={handleMouseMove}>
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
      <!-- LeaderboardController loads in the background while transition is visible -->
      <div class="page-container" style="background-color: black;">
        <div class="leaderboard-container" class:visible={state === 'ready'}>
          <LeaderboardController
            organizationId={organizationId}
            organizationSlug={organizationSlug}
            organizationSettings={organizationSettings}
            rotationInterval={15000}
            showControls={false}
            on:ready={handleLeaderboardReady}
          />
        </div>
        
        <!-- TransitionOverlay is positioned above the LeaderboardController -->
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

{#if showFullscreenButton}
  <button
    class="fullscreen-button"
    on:click={toggleFullscreen}
    transition:fade
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
    </svg>
  </button>
{/if}

<style>
  .mb-display-page {
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

  .fullscreen-button {
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    z-index: 2001;
    transition: background-color 0.2s ease;
  }

  .fullscreen-button:hover {
    background: rgba(0, 0, 0, 0.8);
  }
</style>
