<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { SvelteComponent } from 'svelte';
  
  // Define the component interface
  interface $$Events {
    [evt: string]: (event: any) => void;
  }
  
  interface $$Props {
    event: any;
    organizationSettings?: any;
    leaderboard?: any[];
    qrCodeUrl?: string;
    showQr?: boolean;
    showAds?: boolean;
    debug?: boolean;
  }
  
  // Export the component as default
  export default class EventLeaderboardView extends SvelteComponent<$$Props, $$Events> {};
  import { fade } from 'svelte/transition';
  import { supabase } from '$lib/supabaseClient';
  import { browser } from '$app/environment';
  import QRCode from 'qrcode';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  // Types
  export interface PlayerScore {
    id: string;
    name: string;
    totalScore: number;
    holeInOnes: number;
  }

  export interface EventSettings {
    id: string;
    title: string;
    hole_count: number;
    accent_color: string;
    logo_url: string;
    enable_ads: boolean;
    ads_text: string;
    ads_url: string;
    ads_image_url?: string | null;
    created_at?: string;
    updated_at?: string;
  }

  export interface OrganizationSettings {
    id: string;
    name: string;
    logo_url: string;
    ad_image_url?: string | null;
    created_at?: string;
    updated_at?: string;
  }



  // Props with defaults
  export let org: string;
  export let event: string;
  export let hydrateFromSupabase = true;
  export let fullscreenable = true;
  export let realtimeUpdates = true;
  export let initialScores: PlayerScore[] = [];
  export let initialEventSettings: Partial<EventSettings> = {};
  export let initialOrganizationSettings: Partial<OrganizationSettings> = {};
  export let showLoadingIndicator = true;
  export let showErrorMessages = true;
  export let debug = false;

  // State
  let loading = false;
  let error: string | null = null;
  let eventSettings: Partial<EventSettings> = { ...initialEventSettings };
  let organizationSettings: Partial<OrganizationSettings> = { ...initialOrganizationSettings };
  let leaderboard: PlayerScore[] = [...initialScores];
  let qrCodeDataUrl: string | null = null;
  let isFullscreen = false;
  let showFullscreenButton = false;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let realtimeChannel: any = null;
  let currentEvent = eventSettings?.title || event || '';
  let isMounted = false;

  // Derived state
  $: topScores = leaderboard.slice(0, 5);
  $: bottomScores = leaderboard.slice(5, 10);
  $: hasScores = leaderboard.length > 0;

  // Combined data loading function
  async function loadData() {
    if (!browser) return;
    
    try {
      loading = true;
      error = null;
      
      if (hydrateFromSupabase) {
        // Load all data in parallel
        await Promise.all([
          loadEventSettings(),
          loadOrganizationSettings(),
          loadLeaderboard()
        ]);
      }
      
      // Generate QR code after we have all the data
      await generateQRCode();
      updateAccentColor();
      
      // Set up realtime updates if enabled
      if (realtimeUpdates) {
        setupRealtimeSubscription();
      }
      
    } catch (err) {
      console.error('Error loading data:', err);
      error = err instanceof Error ? err.message : 'Failed to load data';
      throw err; // Re-throw to be caught by the caller
    } finally {
      if (isMounted) {
        loading = false;
      }
    }
  }

  // Lifecycle
  onMount(async () => {
    isMounted = true;
    if (!browser) return;

    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    
    // Initial data load
    await loadData().catch(() => {
      // Error is already handled in loadData
    });
    
    return () => {
      isMounted = false;
      cleanup();
    };
  });

  // Data loading
  async function loadLeaderboard() {
    if (!browser) return;
    
    try {
      // Fetch all scorecard entries for the event
      const { data, error: err } = await supabase
        .from('scorecard')
        .select('player_id, name, score, hole_number, hole_in_ones, published')
        .eq('event_id', event)
        .eq('published', true);
        
      if (err) throw err;
      
      if (!data || data.length === 0) {
        // No scores yet
        leaderboard = [];
        return [];
      }
      
      // Process the raw scorecard data into player scores
      const processedScores = processScores(data || []);
      
      // Sort by total score (ascending for golf - lower is better)
      const sortedScores = [...processedScores].sort((a, b) => a.totalScore - b.totalScore);
      
      // Only update if component is still mounted
      if (isMounted) {
        leaderboard = sortedScores;
      }
      
      return sortedScores;
      
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      error = 'Failed to load leaderboard data';
      throw err; // Re-throw to be caught by the caller
    }
  }

  async function loadEventSettings() {
    if (!browser) return;
    
    try {
      const { data, error: err } = await supabase
        .from('event_settings')
        .select('*')
        .eq('event_id', event)
        .single();
        
      if (err) throw err;
      
      if (!data) {
        throw new Error('Event settings not found');
      }
      
      // Type-safe assignment with defaults
      eventSettings = {
        id: data.id || event,
        title: data.title || 'Event',
        hole_count: data.hole_count || 9,
        accent_color: data.accent_color || '#4CAF50',
        logo_url: data.logo_url || '',
        enable_ads: data.enable_ads ?? true,
        ads_text: data.ads_text || '',
        ads_url: data.ads_url || '',
        ads_image_url: data.ads_image_url || null,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      currentEvent = eventSettings.title;
      
    } catch (err) {
      console.error('Error loading event settings:', err);
      error = 'Failed to load event settings';
      throw err; // Re-throw to be caught by the caller
    }
  }

  async function loadOrganizationSettings() {
    try {
      const { data, error: err } = await supabase
        .from('organizations')
        .select('settings_json')
        .eq('slug', org)
        .single();

      if (err) throw err;
      organizationSettings = data?.settings_json || {};
    } catch (err) {
      console.error('Error loading organization settings:', err);
    }
  }

  function processScores(rows: any[]): PlayerScore[] {
    const playerMap = new Map<string, PlayerScore>();
    const holesPlayed: Record<string, number> = {};
    const holeCount = eventSettings.hole_count || 9;

    for (const row of rows) {
      const id = row.player_id || row.name;
      holesPlayed[id] = (holesPlayed[id] || 0) + 1;

      if (!playerMap.has(id)) {
        playerMap.set(id, {
          id,
          name: row.name,
          totalScore: 0,
          holeInOnes: 0
        });
      }

      const player = playerMap.get(id)!;
      player.totalScore += row.score ?? 0;
      player.holeInOnes += row.hole_in_ones ?? 0;
    }

    return Array.from(playerMap.values())
      .filter(player => holesPlayed[player.id] === holeCount);
  }

  // Fullscreen handling
  function toggleFullscreen(): void {
    if (!fullscreenable || !browser) return;
    
    try {
      if (!document.fullscreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch((err: Error) => {
            console.error('Error attempting to enable fullscreen:', err);
            error = 'Fullscreen mode is not available';
          });
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch((err: Error) => {
            console.error('Error attempting to exit fullscreen:', err);
            error = 'Failed to exit fullscreen mode';
          });
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
      error = 'Failed to toggle fullscreen mode';
    }
  }

  function handleMouseMove(): void {
    if (!fullscreenable || !isFullscreen || !browser) return;
    
    if (!showFullscreenButton) {
      showFullscreenButton = true;
    }
    
    // Clear any existing timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    
    // Set a new timeout to hide the button
    hideTimeout = window.setTimeout(() => {
      if (isMounted) {
        showFullscreenButton = false;
      }
      hideTimeout = null;
    }, 2000);
  }

  function handleFullscreenChange(): void {
    if (!browser) return;
    
    isFullscreen = !!document.fullscreenElement;
    if (!isFullscreen) {
      showFullscreenButton = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (!browser || !isFullscreen) return;
    
    try {
      if (event.key === 'Escape') {
        event.preventDefault();
        toggleFullscreen();
      }
    } catch (err) {
      console.error('Error handling keydown:', err);
    }
  }

  function updateAccentColor(): void {
    if (browser && event?.accent_color) {
      document.documentElement.style.setProperty('--accent-color', event.accent_color);
      
      // Debug logging
      if (debug) {
        console.log('EventLeaderboardView state:', {
          event,
          organizationSettings,
          leaderboard,
          loading,
          error
        });
      }
    }
  }

  // QR Code Generation
  async function generateQRCode(): Promise<void> {
    if (!browser || !org || !event || !eventSettings) return;
    
    const scorecardUrl = `${window.location.origin}/${org}/${event}/scorecard`;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(scorecardUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: eventSettings.accent_color || '#000000',
          light: '#ffffff00' // Transparent background
        },
        errorCorrectionLevel: 'H' // High error correction
      });
    } catch (err) {
      console.error('Error generating QR code:', err);
      error = 'Failed to generate QR code';
    }
  }

  // Realtime updates
  function setupRealtimeSubscription(): void {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }
    
    realtimeChannel = supabase
      .channel(`leaderboard:${event}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'scorecard',
        filter: `event_id=eq.${event}`
      }, loadLeaderboard)
      .subscribe();
  }

  function cleanup(): void {
    if (!browser) return;
    
    try {
      // Cleanup realtime subscription
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
      
      // Cleanup event listeners
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      
      // Clear any pending timeouts
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // Reset fullscreen if needed
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  }

  onDestroy(() => {
    isMounted = false;
    cleanup();
  });
</script>

<!-- Global Styles -->
<style global>
  @import '$lib/styles/theme.css';
  @import '$lib/styles/leaderboard.css';
  
  /* Loading and Error States */
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }
  
  .loading-dots {
    display: inline-block;
    width: 1.5em;
    overflow: hidden;
    vertical-align: bottom;
    animation: loadingDots 1.5s infinite;
  }
  
  @keyframes loadingDots {
    0% { width: 0.5em; }
    33% { width: 1em; }
    66% { width: 1.5em; }
    100% { width: 0.5em; }
  }
  
  .error-message {
    background-color: #ffebee;
    color: #c62828;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 800px;
    margin: 1rem auto;
    border-left: 4px solid #c62828;
  }
  
  .error-message i {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  
  .error-message p {
    margin: 0;
    flex-grow: 1;
  }
  
  .retry-button {
    background-color: #c62828;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.2s;
    flex-shrink: 0;
  }
  
  .retry-button:hover {
    background-color: #b71c1c;
  }
  
  /* Fullscreen styles */
  .main-wrapper.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    background: white;
    overflow-y: auto;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .error-message {
      flex-direction: column;
      text-align: center;
    }
    
    .error-message i {
      margin-bottom: 0.5rem;
    }
    
    .retry-button {
      width: 100%;
      margin-top: 0.5rem;
    }
  }
</style>


{#if showLoadingIndicator && loading}
  <div class="loading-overlay">
    <LoadingSpinner 
      size="xl" 
      color="var(--accent-color, #4CAF50)" 
      label="Loading leaderboard..."
      showLabel={true}
      center={true}
    />
  </div>
{/if}

{#if error && showErrorMessages}
  <div class="error-overlay" role="alert" aria-live="assertive">
    <div class="error-message">
      <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
      <p id="error-text">{error}</p>
      <button 
        class="retry-button" 
        on:click={loadData}
        aria-label="Retry loading data"
        on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? loadData() : null}
      >
        Retry
      </button>
    </div>
  </div>
{/if}

<div class:main-wrapper class:fullscreen={isFullscreen}>
  <header class="header">
    <div class="header-content">
      {#if organizationSettings?.logo_url || eventSettings?.logo_url}
        <div class="logos-container">
          {#if organizationSettings?.logo_url}
            <div class="logo-container org-logo">
              <img 
                src={organizationSettings.logo_url} 
                alt="Organization Logo" 
                class="logo" 
                on:error={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target) target.style.display = 'none';
                }}
                loading="lazy"
              />
            </div>
          {/if}
          {#if eventSettings?.logo_url}
            <div class="logo-container event-logo">
              <img 
                src={eventSettings.logo_url} 
                alt="Event Logo" 
                class="logo" 
                on:error={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target) target.style.display = 'none';
                }}
                loading="lazy"
              />
            </div>
          {/if}
        </div>
      {/if}
      <div class="titles">
        <h1>Mini-Golf Leaderboard</h1>
        <h2 class="event-title">
          {eventSettings?.title || currentEvent || 'Loading...'}
          {#if loading}
            <span class="loading-dots">...</span>
          {/if}
        </h2>
      </div>
    </div>
  </header>

<!-- 🧾 MAIN CONTENT -->
<div class="content">
  <!-- 📊 SCORE TABLES -->
  <div class="leaderboard-tables">

    <!-- 🥇 Table 1: Players 1–5 -->
    <div class="score-table">
      <div class="row header-row">
        <div class="rank">
          <i class="fa-solid fa-medal"></i>
        </div>
        <div class="name">
          <i class="fa-solid fa-user"></i> Player
        </div>
        <div class="score-label">
          <i class="fa-solid fa-golf-ball-tee"></i>Score
        </div>
      </div>
      {#each leaderboard.slice(0, 5) as player, index}
        <div class="row">
          <div class="rank">{index + 1}</div>
          <div class="name">
            {player.name}
            {#if player.holeInOnes > 0}
              <div class="hio-note">
                <i class="fa-solid fa-fire"></i> <b>{player.holeInOnes}</b> hole-in-one{player.holeInOnes > 1 ? 's' : ''}
              </div>
            {/if}
          </div>
          <div class="score-pill">{player.totalScore}</div>
        </div>
      {/each}
    </div>

    <!-- 🥈 Table 2: Players 6–10 -->
    <div class="score-table">
     <div class="row header-row">
        <div class="rank">
          <i class="fa-solid fa-medal"></i>
        </div>
        <div class="name">
          <i class="fa-solid fa-user"></i> Player
        </div>
        <div class="score-label">
          <i class="fa-solid fa-golf-ball-tee"></i>Score
        </div>
      </div>

      {#each leaderboard.slice(5, 10) as player, index}
        <div class="row">
          <div class="rank">{index + 6}</div>
          <div class="name">
            {player.name}
            {#if player.holeInOnes > 0}
              <div class="hio-note">
                <i class="fa-solid fa-fire"></i> <b>{player.holeInOnes}</b> hole-in-one{player.holeInOnes > 1 ? 's' : ''}
              </div>
            {/if}
          </div>
          <div class="score-pill">{player.totalScore}</div>
        </div>
      {/each}
    </div>

  </div>




  <!-- 📢 SIDEBAR -->
  <div class="sidebar">
  <!-- 📢 Ad Image -->
  {#if organizationSettings?.ad_image_url || eventSettings.ads_image_url}
    <div class="ad-container">
      <a href={eventSettings.ads_url || '#'} class="ad-banner">
        <img 
          src={eventSettings.ads_image_url || organizationSettings.ad_image_url} 
          alt={eventSettings.ads_text || 'Advertisement'}
          class="ad-image"
        />
        {#if eventSettings.ads_text}
          <div class="ad-text">{eventSettings.ads_text}</div>
        {/if}
      </a>
    </div>
  {:else if eventSettings.ads_text}
    <div class="ad-container">
      <a href={eventSettings.ads_url || '#'} class="ad-banner text-only">
        {eventSettings.ads_text}
      </a>
    </div>
  {/if}
  <!-- 📲 QR Code -->
  <div class="qr-box">
    <div class="qr-title">
      <h2>Scan to Play!</h2>
      <p>Scan to enter scores</p>
    </div>
    {#if qrCodeDataUrl}
      <div class="qr-code-container">
        <img 
          src={qrCodeDataUrl} 
          alt="Scorecard QR Code" 
          class="qr-code"
        />
      </div>
    {:else}
      <div class="qr-placeholder">Generating QR Code...</div>
    {/if}
  </div>
</div>

</div>

</div>
<button 
  class="fullscreen-toggle {showFullscreenButton ? 'show' : ''}" 
  on:click={toggleFullscreen}
  on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? toggleFullscreen() : null}
  aria-label="Toggle fullscreen mode"
>
  <i class="fa-solid fa-expand"></i> Fullscreen
</button>



