<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { getTodayISO, shouldDisplayEvent } from '$lib/utils/leaderboard';
  import EventLeaderboardView from '$lib/components/EventLeaderboardView.svelte';
  import type { PageData } from './$types';
  
  // Types
  interface PlayerScore {
    id: string;
    name: string;
    totalScore: number;h
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
  const { org, event: eventId } = $page.params;
  
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
    
    loading = true;
    error = null;
    
    try {
      // Load event data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (eventError) throw eventError;
      if (!eventData) throw new Error('Event not found');
      
      // Check if event should be displayed
      const today = getTodayISO();
      const { count: scoreCount } = await supabase
        .from('scorecard')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);
      
      if (!shouldDisplayEvent(eventData, scoreCount || 0, today)) {
        throw new Error('This event is not currently available for viewing');
      }
      
      event = eventData;
      
      // Load organization data
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', org)
        .single();
      
      if (orgError) throw orgError;
      organization = orgData;
      
      // Load leaderboard data
      const { data: scoreData, error: scoreError } = await supabase
        .from('scorecard')
        .select('*')
        .eq('event_id', eventId);
      
      if (scoreError) throw scoreError;
      
      // Process scores
      leaderboard = processScores(scoreData || []);
      
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
    player_name?: string;
    score?: number;
    hole_in_one?: boolean;
  }>): PlayerScore[] {
    const playerMap = new Map<string, PlayerScore>();
    
    for (const row of rows) {
      const playerId = row.player_id;
      
      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          id: playerId,
          name: row.player_name || `Player ${playerId.slice(0, 6)}`,
          totalScore: 0,
          holeInOnes: 0
        });
      }
      
      const player = playerMap.get(playerId)!;
      player.totalScore += row.score || 0;
      if (row.hole_in_one) player.holeInOnes++;
    }
    
    return Array.from(playerMap.values())
      .sort((a, b) => a.totalScore - b.totalScore);
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
    loadData();
    
    // Check for debug mode
    if (browser) {
      const urlParams = new URLSearchParams(window.location.search);
      debug = urlParams.has('debug') || localStorage.getItem('leaderboardDebug') === 'true';
    }
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
      event={event}
      organizationSettings={organization?.settings_json || {}}
      leaderboard={leaderboard}
      showQr={true}
      showAds={true}
      debug={debug}
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
    position: relative;
    min-height: 100vh;
    background-color: #f5f5f5;
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
