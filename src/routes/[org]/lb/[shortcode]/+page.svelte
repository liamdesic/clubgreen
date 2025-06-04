<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { getTodayISO, shouldDisplayEvent } from '$lib/utils/leaderboard';
  import EventLeaderboardView from '$lib/components/EventLeaderboardView.svelte';
  import type { PageData } from './$types';
  import '$lib/styles/theme.css';
  import '$lib/styles/leaderboard.css';
  
  // Types
  interface PlayerScore {
    id: string;
    name: string;
    totalScore: number;
    holeInOnes: number;
  }
  
  interface Event {
    id: string;
    title: string;
    hole_count: number;
    accent_color: string;
    logo_url?: string;
    enable_ads?: boolean;
    ads_text?: string;
    ads_url?: string;
    ads_image_url?: string | null;
  }
  
  interface Organization {
    id: string;
    name: string;
    slug: string;
    settings_json?: {
      logo_url?: string;
      ad_image_url?: string;
      [key: string]: any;
    };
  }
  
  // Get route parameters
  export let data: PageData;
  const { org, shortcode } = $page.params;
  
  // State
  let loading = true;
  let error: string | null = null;
  let event: Event | null = null;
  let organization: Organization | null = null;
  let leaderboard: PlayerScore[] = [];
  let debug = false;
  
  // Load data
  async function loadData() {
    if (!browser) return;
    
    console.log(`[Leaderboard] Starting data load for org: ${org}, shortcode: ${shortcode}`);
    loading = true;
    error = null;
    
    try {
      // Load event data
      console.log(`[Leaderboard] Fetching event data for short_code: ${shortcode}`);
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('short_code', shortcode)
        .single();
      
      if (eventError) {
        console.error(`[Leaderboard] Error fetching event data:`, eventError);
        throw eventError;
      }
      if (!eventData) {
        console.error(`[Leaderboard] Event not found for short_code: ${shortcode}`);
        throw new Error('Event not found');
      }
      console.log(`[Leaderboard] Event data retrieved:`, eventData);
      
      // Set the accent color CSS variable on the document root
      if (browser && eventData?.settings_json?.accent_color) {
        document.documentElement.style.setProperty('--accent-color', eventData.settings_json.accent_color);
        console.log(`[Leaderboard] Set accent color to ${eventData.settings_json.accent_color}`);
      }
      
      // Check scorecard count (for informational purposes only)
      const today = getTodayISO();
      console.log(`[Leaderboard] Checking scorecard count for event ID: ${eventData.id}, today: ${today}`);
      const { count: scoreCount, error: countError } = await supabase
        .from('scorecard')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventData.id);
      
      if (countError) {
        console.error(`[Leaderboard] Error counting scorecards:`, countError);
      }
      
      console.log(`[Leaderboard] Scorecard count: ${scoreCount || 0}`);
      
      // For specific event pages, we always show the event regardless of date or score count
      // The shouldDisplayEvent function is still used for the organization-level leaderboard
      // This is just logging for debugging purposes
      if (!shouldDisplayEvent(eventData, scoreCount || 0, today)) {
        console.log(`[Leaderboard] Note: This event wouldn't be shown on the org leaderboard (date: ${eventData.event_date} vs today: ${today}, scores: ${scoreCount})`);
      }
      
      event = eventData;
      
      // Load organization data
      console.log(`[Leaderboard] Fetching organization data for slug: ${org}`);
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', org)
        .single();
      
      if (orgError) {
        console.error(`[Leaderboard] Error fetching organization data:`, orgError);
        throw orgError;
      }
      console.log(`[Leaderboard] Organization data retrieved:`, orgData);
      organization = orgData;
      
      // Load leaderboard data
      console.log(`[Leaderboard] Fetching scorecard data for event ID: ${eventData.id}`);
      const { data: scoreData, error: scoreError } = await supabase
        .from('scorecard')
        .select('*')
        .eq('event_id', eventData.id);
      
      if (scoreError) {
        console.error(`[Leaderboard] Error fetching scorecard data:`, scoreError);
        throw scoreError;
      }
      
      console.log(`[Leaderboard] Retrieved ${scoreData?.length || 0} scorecard entries`);
      
      // Process scores
      console.time('[Leaderboard] Score processing');
      leaderboard = processScores(scoreData || []);
      console.timeEnd('[Leaderboard] Score processing');
      console.log(`[Leaderboard] Processed leaderboard with ${leaderboard.length} players`);
      
    } catch (err) {
      console.error('Error loading data:', err);
      error = err instanceof Error ? err.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  }
  
  // Process scores from scorecard data
  function processScores(rows: Array<{
    player_id: string;
    name?: string; // Changed from player_name
    score?: number;
    hole_in_ones?: number; // Changed from hole_in_one (boolean) to hole_in_ones (number)
  }>): PlayerScore[] {
    console.log(`[Leaderboard] Processing ${rows.length} scorecard rows`);
    const playerMap = new Map<string, PlayerScore>();
    
    for (const row of rows) {
      const playerId = row.player_id;
      
      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          id: playerId,
          name: row.name || `Player ${playerId.slice(0, 6)}`, // Use row.name
          totalScore: 0,
          holeInOnes: 0
        });
      }
      
      const player = playerMap.get(playerId)!;
      player.totalScore += row.score || 0;
      player.holeInOnes += row.hole_in_ones || 0; // Sum row.hole_in_ones (number)
    }
    
    const result = Array.from(playerMap.values())
      .sort((a, b) => a.totalScore - b.totalScore);
    
    console.log(`[Leaderboard] Processed scores for ${result.length} unique players`);
    if (debug) {
      console.table(result);
    }
    
    return result;
  }
  
  // Toggle debug mode
  function toggleDebug() {
    debug = !debug;
    if (browser) {
      localStorage.setItem('leaderboardDebug', String(debug));
      const url = new URL(window.location.href);
      if (debug) {
        url.searchParams.set('debug', 'true');
      } else {
        url.searchParams.delete('debug');
      }
      window.history.replaceState({}, '', url);
    }
  }
  
  // Initialize
  onMount(() => {
    // Log CSS loading for debugging
    if (browser) {
      console.log('[CSS Debug] Checking loaded stylesheets:');
      const cssFiles = Array.from(document.styleSheets).map(sheet => sheet.href);
      cssFiles.forEach(href => console.log(href));
      
      const leaderboardCssLoaded = cssFiles.some(href => href && href.includes('leaderboard.css'));
      console.log(`[CSS Debug] Leaderboard CSS loaded: ${leaderboardCssLoaded}`);
    }
    // Check for debug mode first so logs can be more detailed if debug is enabled
    if (browser) {
      const urlParams = new URLSearchParams(window.location.search);
      debug = urlParams.has('debug') || localStorage.getItem('leaderboardDebug') === 'true';
      console.log(`[Leaderboard] Debug mode: ${debug ? 'enabled' : 'disabled'}`);
    }
    
    console.log(`[Leaderboard] Component mounted, loading data...`);
    loadData();
  });
</script>

<div class="leaderboard-page">
  {#if error}
    <div class="error-message" role="alert">
      <p>{error}</p>
      <button 
        class="retry-button" 
        on:click={() => window.location.reload()}
        aria-label="Retry loading leaderboard"
      >
        Retry
      </button>
    </div>
  {:else if loading}
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading leaderboard...</p>
    </div>
  {:else if event}
    <EventLeaderboardView
      organization={organization}
      event={event}
      organizationSettings={organization?.settings_json || {}}
      preloadedLeaderboard={leaderboard}
      showQr={true}
      showAds={true}
    />
  {/if}
  {#if debug}
    <div class="debug-controls">
      <button 
        class="debug-toggle" 
        on:click={toggleDebug}
        title="Toggle debug mode"
      >
        {debug ? '🔴' : '⚪'} Debug
      </button>
    </div>
  {/if}
</div>

<style>
  .leaderboard-page {
    padding: 0 !important;
    position: relative;
    min-height: 100vh;
    background: linear-gradient(135deg, var(--accent-color-700), var(--accent-color-800), var(--accent-color-900));  }
  
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
  
  .debug-controls {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 1000;
  }
  
  .debug-toggle {
    padding: 0.5rem 1rem;
    background: #333;
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.875rem;
    opacity: 0.8;
    transition: opacity 0.2s;
  }
  
  .debug-toggle:hover {
    opacity: 1;
  }
  
  /* Loading overlay */
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.9);
    z-index: 1000;
  }
  
  .loading-overlay .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid var(--accent-color, #4CAF50);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
