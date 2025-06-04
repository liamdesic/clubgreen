<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { supabase } from '$lib/supabaseClient';
  import { browser } from '$app/environment';
  import QRCode from 'qrcode';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import TimeRangeBadge from '$lib/components/TimeRangeBadge.svelte';
  import { getTimeRangeLabel } from '$lib/utils/timeFilters';
  import type { ScoreTimeRange } from '$lib/utils/timeFilters';
  import type { Event, Organization } from '$lib/types/database';
  import type { 
    PlayerScore, 
    EventSettings, 
    OrganizationSettings,
    EventLeaderboardViewProps 
  } from '$lib/types/application/leaderboard';
  
  // Props with defaults
  export let organization: Organization; // Organization object from server
  export let event: Event; // Event object from server
  export let scorecard: any[] = []; // Scorecard data from server
  
  // Props for LeaderboardManager compatibility
  export let org: string = ''; // Organization slug (alternative to organization.slug)
  export let organizationSettings: OrganizationSettings = {}; // Organization settings
  export let showQr: boolean = true;
  export let showAds: boolean = true;
  export let preloadedLeaderboard: PlayerScore[] = []; // Pre-loaded leaderboard data
  
  // Optional props
  export let hydrateFromSupabase = false; // Default to false since data comes from server
  export let showErrorMessages = true;
  export let realtimeUpdates = true; // Enable realtime updates by default
  export let showLoadingIndicator = true; // Show loading indicator by default
  
  // No debug mode needed
  
  // Use the settings_json type from the EventSettings interface
  type EventSettingsJson = NonNullable<EventSettings['settings_json']>;

  // Derived values - using reactive declarations
  $: org = organization?.slug || '';
  $: eventId = event?.id || '';
  $: eventSettings = {
    id: event?.id || '',
    title: event?.title || 'Event',
    hole_count: event?.settings_json?.hole_count || 9,
    settings_json: {
      accent_color: event?.settings_json?.accent_color || '#4CAF50',
      score_time_range: (event?.settings_json?.score_time_range as ScoreTimeRange) || 'all_time'
    } as EventSettingsJson,
    logo_url: event?.settings_json?.logo_url || '',
    enable_ads: event?.settings_json?.enable_ads ?? true,
    ads_text: event?.settings_json?.ads_text || '',
    ads_url: event?.settings_json?.ads_url || '',
    ads_image_url: event?.settings_json?.ads_image_url || null,
    created_at: event?.created_at,
    updated_at: event?.updated_at
  };
  
  // Use organization settings from props if provided, otherwise from organization object
  $: organizationSettings = organizationSettings || (organization?.settings_json as OrganizationSettings) || {};
  
  // Use preloaded leaderboard data if available
  $: leaderboard = preloadedLeaderboard?.length ? preloadedLeaderboard : [];

  // State
  let loading = false;
  let error: string | null = null;
  let qrCodeDataUrl: string | null = null;
  let realtimeChannel: any = null;
  let currentEvent = event?.title || '';
  
  // Use showQr and showAds props to control visibility
  $: qrCodeVisible = showQr && !loading && !error;
  $: adVisible = showAds && organizationSettings?.ad_image_url && !loading && !error;
  let isMounted = false;
  
  // Process scorecard data into leaderboard format
  $: {
    if (scorecard && scorecard.length > 0) {
      leaderboard = processScores(scorecard);
      // Sort by total score (ascending for golf - lower is better)
      leaderboard.sort((a, b) => a.totalScore - b.totalScore);
    }
  }
  
  // Derived state
  $: topScores = leaderboard.slice(0, 5);
  $: bottomScores = leaderboard.slice(5, 10);
  $: hasScores = leaderboard.length > 0;
  // This is already handled by the reactive declaration above

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
  onMount(() => {
    isMounted = true;
    
    if (browser) {
      // Add event listeners
      document.addEventListener('keydown', handleKeydown);
      
      // Always try to generate QR code on mount
      generateQRCode();
    }
    
    // Return cleanup function
    return () => {
      isMounted = false;
      
      if (browser) {
        // Remove event listeners
        document.removeEventListener('keydown', handleKeydown);
      }
    };
  });

  // Data loading
  async function loadLeaderboard() {
    if (!browser) return;
    
    try {
      // Get the time range setting from the event, default to 'all_time'
      const timeRange = event?.settings_json?.score_time_range || 'all_time';
      
      // Import the time filter utility
      const { getTimeRangeCutoff } = await import('$lib/utils/timeFilters');
      
      // Get the cutoff timestamp for the specified time range
      const cutoffTimestamp = getTimeRangeCutoff(timeRange);
      
      // Build the query
      let query = supabase
        .from('scorecard')
        .select('player_id, name, score, hole_number, hole_in_ones, published, created_at')
        .eq('event_id', eventId)
        .eq('published', true);
      
      // Apply time filter if a cutoff timestamp is specified
      if (cutoffTimestamp) {
        query = query.gte('created_at', cutoffTimestamp);
        console.log(`[EventLeaderboardView] Filtering scores with time range: ${timeRange}, cutoff: ${cutoffTimestamp}`);
      }
      
      // Execute the query
      const { data, error: err } = await query;
      
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
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
        
      if (err) throw err;
      
      if (!data) {
        throw new Error('Event settings not found');
      }
      
      // Parse settings_json from the events table
      const settingsJson = data.settings_json as Record<string, any> || {};
      
      // Type-safe assignment with defaults
      eventSettings = {
        id: data.id || event.id,
        title: data.title || 'Event',
        hole_count: settingsJson.hole_count || 9,
        settings_json: {
          accent_color: settingsJson.accent_color || '#4CAF50',
          score_time_range: (settingsJson.score_time_range as ScoreTimeRange) || 'all_time'
        } as EventSettingsJson,
        logo_url: settingsJson.logo_url || '',
        enable_ads: settingsJson.enable_ads ?? true,
        ads_text: settingsJson.ads_text || '',
        ads_url: settingsJson.ads_url || '',
        ads_image_url: settingsJson.ads_image_url || null,
        created_at: data.created_at,
        updated_at: data.created_at // events table might not have updated_at
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
      organizationSettings = (data?.settings_json as OrganizationSettings) || {};
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
          hole_in_ones: 0,
          player_id: row.player_id || id
        });
      }

      const player = playerMap.get(id)!;
      player.totalScore += row.score ?? 0;
      player.hole_in_ones = (player.hole_in_ones || 0) + (row.hole_in_ones ?? 0);
    }

    return Array.from(playerMap.values())
      .filter(player => holesPlayed[player.id] === holeCount);
  }

  function handleKeydown(e: KeyboardEvent): void {
    try {
      // Keydown handler (fullscreen functionality removed)
    } catch (err) {
      console.error('Error handling keydown:', err);
    }
  }

  // QR Code Generation
  async function generateQRCode() {
    if (!browser) return;
    
    try {
      // Generate a QR code for the secure scorecard URL using the short_code
      // Format: /org-slug/short_code-access_uuid
      const scorecardUrl = `${window.location.origin}/${org}/${event.short_code}-${event.access_uuid}`;
      
      qrCodeDataUrl = await QRCode.toDataURL(scorecardUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('[Leaderboard] Error generating QR code:', err);
      error = 'Failed to generate QR code';
    }
  }

  // Realtime updates
  function setupRealtimeSubscription(): void {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }
    
    realtimeChannel = supabase
      .channel(`leaderboard:${eventId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'scorecard',
        filter: `event_id=eq.${eventId}`
      }, handleScoreUpdate)
      .subscribe();
  }
  
  // Handle score update from realtime subscription
  async function handleScoreUpdate(payload: any): Promise<void> {
    if (!browser || !isMounted) return;
    
    console.log(`[EventLeaderboardView] Received scorecard update:`, payload);
    
    // Get the created_at timestamp from the payload
    const scoreCreatedAt = payload.new?.created_at;
    
    // Check if the score should be included based on the time range
    const timeRange = event?.settings_json?.score_time_range || 'all_time';
    
    // If it's 'all_time', we always include it
    if (timeRange !== 'all_time' && scoreCreatedAt) {
      // Import the time filter utility
      const { getTimeRangeCutoff } = await import('$lib/utils/timeFilters');
      const cutoffTimestamp = getTimeRangeCutoff(timeRange);
      
      // If the score is older than the cutoff, ignore it
      if (cutoffTimestamp && new Date(scoreCreatedAt) < new Date(cutoffTimestamp)) {
        console.log(`[EventLeaderboardView] Ignoring score update as it's outside the time range ${timeRange}`);
        return;
      }
    }
    
    // Score is within the time range or we're showing all time, reload the leaderboard
    await loadLeaderboard();
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
      document.removeEventListener('keydown', handleKeydown);
      
      // Clear any pending timeouts
      // Fullscreen reset code removed
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
  
  /* Loading and Error States */
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    color: white;
  }
  
  .loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 5px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: var(--accent-color, #4CAF50);
    animation: spin 1s ease-in-out infinite;
  }
  
  .spinner-label {
    margin-top: 1rem;
    font-size: 1rem;
    color: white;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
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
  
  .time-filter-pill {
    display: inline-flex;
    align-items: center;
    background: white;
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.35rem 1rem;
    border-radius: 1rem;
    margin-left: 0.75rem;
    vertical-align: middle;
    white-space: nowrap;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .pill-prefix {
    color: var(--accent-color-900);
    margin-right: 0.25rem;
  }
  
  .pill-time-range {
    color: var(--accent-color);
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
  
  /* Rank badge styling */
  .rank-badge {
    width: 50px;
    height: 50px;
    margin-left: -10px;
    margin-top: 10px;
    object-fit: contain;
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
    <div class="loading-spinner">
      <div class="spinner"></div>
      <div class="spinner-label">Loading leaderboard...</div>
    </div>
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

<div class="main-wrapper">
  <!-- Header with logos and event title -->
  <div class="event-header">
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
                style="min-width: 200px; max-width: 350px; width: auto;"
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
                style="min-width: 200px; max-width: 350px; width: auto;"
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
          {#if eventSettings?.settings_json?.score_time_range}
            <span class="time-filter-pill" style="--accent-color: {eventSettings?.settings_json?.accent_color || '#4CAF50'}">
              <span class="pill-prefix">Scores from</span> <span class="pill-time-range">{getTimeRangeLabel(eventSettings.settings_json.score_time_range)}</span>
            </span>
          {/if}
        </h2>
      </div>
    </div>
  </div>

<!-- MAIN CONTENT -->
<div class="content">
  <!-- SCORE TABLES -->
  <div class="leaderboard-tables">

    <!-- Table 1: Players 1–5 -->
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
          <div class="rank">
            {#if index === 0}
              <img src="/badges/gold-badge.png" alt="1st Place" class="rank-badge" />
            {:else if index === 1}
              <img src="/badges/silver-badge.png" alt="2nd Place" class="rank-badge" />
            {:else if index === 2}
              <img src="/badges/bronze-badge.png" alt="3rd Place" class="rank-badge" />
            {:else}
              {index + 1}
            {/if}
          </div>
          <div class="name">
            {player.name}
            {#if player.hole_in_ones && player.hole_in_ones > 0}
              <div class="hio-note">
                <i class="fa-solid fa-fire"></i> <b>{player.hole_in_ones}</b> hole-in-one{player.hole_in_ones > 1 ? 's' : ''}
              </div>
            {/if}
          </div>
          <div class="score-pill">{player.totalScore}</div>
        </div>
      {/each}
    </div>

    <!-- Table 2: Players 6–10 -->
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
            {#if player.hole_in_ones && player.hole_in_ones > 0}
              <div class="hio-note">
                <i class="fa-solid fa-fire"></i> <b>{player.hole_in_ones}</b> hole-in-one{player.hole_in_ones > 1 ? 's' : ''}
              </div>
            {/if}
          </div>
          <div class="score-pill">{player.totalScore}</div>
        </div>
      {/each}
    </div>

  </div>




  <!-- SIDEBAR -->
  <div class="sidebar">
  <!-- Ad Image -->
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
  <!-- QR Code -->
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
