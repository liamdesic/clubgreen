<script lang="ts">
  import '$lib/styles/base.css';
  import '$lib/styles/theme.css';
  import '$lib/styles/leaderboard.css';
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { browser } from '$app/environment';
  import type { RealtimeChannel } from '@supabase/supabase-js';
  import QRCode from 'qrcode';
  
  // Types
  interface PlayerScore {
    id: string;
    name: string;
    totalScore: number;
    holeInOnes: number;
  }
  
  interface EventSettings {
    title: string;
    hole_count: number;
    accent_color: string;
    logo_url: string;
    enable_ads: boolean;
    ads_text: string;
    ads_url: string;
    qr_image_url: string;
  }



  // ------ 🧠 STATE ------
  let leaderboard = [];
  let loading = true;
  let error = null;
  let currentOrg = '';
  let currentEvent = '';
  let eventId = '';
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let realtimeChannel: RealtimeChannel | null = null;
  let showFullscreenButton = false;
  let qrCodeDataUrl = ''; // To store the generated QR code
  
  // Update CSS when accent color changes
  $: if (browser && eventSettings?.accent_color) {
    console.log('Event settings:', eventSettings);
    console.log('Setting accent color to:', eventSettings.accent_color);
    
    // Set the CSS variable
    document.documentElement.style.setProperty('--accent-color', eventSettings.accent_color);
    
    // Force update and log the computed style
    const computedColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    console.log('CSS variable --accent-color is now set to:', computedColor);
    
    // Also check the actual computed color of the element
    if (browser) {
      requestAnimationFrame(() => {
        const title = document.querySelector('.event-title');
        if (title) {
          const style = getComputedStyle(title);
          console.log('Computed color of .event-title:', style.color);
        }
      });
    }
    
    generateQRCode();
  }

  // Organization settings
  let organizationSettings = {
    logo_url: ''
  };

  // Event settings (with safe defaults)
  let eventSettings = {
    title: 'Live Leaderboard',
    hole_count: 9,
    accent_color: '#00c853',
    logo_url: '',
    enable_ads: false,
    ads_text: '',
    ads_url: '',
    qr_image_url: ''
  };

  // ------ ⚙️ LOAD SETTINGS ------
  // Load organization settings
  async function loadOrganizationSettings() {
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('settings_json')
        .eq('slug', currentOrg)
        .single();
        
      if (orgError) throw orgError;
      
      if (orgData?.settings_json) {
        organizationSettings = {
          logo_url: orgData.settings_json.logo_url || ''
        };
      }
    } catch (err) {
      console.error('Error loading organization settings:', err);
    }
  }

  // Load event settings
  async function loadEventSettings() {
    try {
      // Load organization settings first
      await loadOrganizationSettings();
      // Get the event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, settings_json')
        .eq('slug', currentEvent)
        .single();

      if (eventError) throw eventError;
      if (!eventData) throw new Error('Event not found');

      eventId = eventData.id;
      
          // Merge default settings with any settings from the database
      eventSettings = {
        ...eventSettings,
        title: eventData.title || eventSettings.title,
        ...(eventData.settings_json || {})
      };
      

      
      console.log('✅ EVENT SETTINGS:', eventSettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error loading event settings:', errorMessage);
      error = errorMessage;
    }
  }

  // ------ 📊 LOAD SCORES ------
  async function loadLeaderboard() {
    if (!eventId) return; // Wait until we have an event ID
    
    loading = true;
    error = null;

    const { data, error: fetchError } = await supabase
      .from('scorecard')
      .select('player_id, name, score, hole_number, hole_in_ones')
      .eq('event_id', eventId)  // Only get scores for this event
      .eq('published', true);    // Only get published scores

    if (fetchError) {
      error = fetchError.message;
      loading = false;
      return;
    }

    const playerMap = new Map();
    const holesPlayed: Record<string, number> = {};

    for (const row of data) {
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

      const player = playerMap.get(id);
      player.totalScore += row.score ?? 0;
      player.holeInOnes += row.hole_in_ones ?? 0;
    }

    leaderboard = Array.from(playerMap.values())
      .filter(player => holesPlayed[player.id] === eventSettings.hole_count)
      .sort((a, b) => a.totalScore - b.totalScore);

    loading = false;
  }

  // ------ 🔁 INIT + FULLSCREEN ------
  function toggleFullscreen() {
    if (typeof document !== 'undefined') {
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      } else {
        document.exitFullscreen().catch(err => {
          console.error('Error attempting to exit fullscreen:', err);
        });
      }
    }
  }

  function handleMouseMove() {
    // Only handle mouse movement in fullscreen mode
    if (!isFullscreen) return;
    
    if (!showFullscreenButton) {
      showFullscreenButton = true;
    }
    
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      if (isFullscreen) { // Only hide if still in fullscreen
        showFullscreenButton = false;
      }
    }, 2000);
  }

  // Track fullscreen state
  let isFullscreen = false;
  
  // Update fullscreen state and button visibility
  function onFullscreenChange() {
    isFullscreen = !!document.fullscreenElement;
    if (!isFullscreen) {
      // Always show button when exiting fullscreen
      showFullscreenButton = true;
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    } else {
      // In fullscreen, hide the button initially
      showFullscreenButton = false;
    }
  }

  // Generate QR code for the current scorecard URL
  async function generateQRCode() {
    if (!browser || !currentOrg || !currentEvent || !eventSettings) return;
    
    const scorecardUrl = `${window.location.origin}/${currentOrg}/${currentEvent}/scorecard`;
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

  // Set up realtime subscription
  function setupRealtimeSubscription() {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }
    
    realtimeChannel = supabase
      .channel('public:scorecard')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'scorecard' 
      }, loadLeaderboard)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'scorecard' 
      }, loadLeaderboard)
      .subscribe();
  }

  onMount(() => {
    // Use an IIFE to handle the async operations
    (async () => {
    // Initialize current org and event from URL params
    if ($page.params.org && $page.params.event) {
      currentOrg = $page.params.org;
      currentEvent = $page.params.event;
      await loadEventSettings();
      await loadLeaderboard();
    }

    // Set up realtime subscription
    if (browser) {
      setupRealtimeSubscription();
      
      // Add event listeners for fullscreen and mouse movement
      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('mousemove', handleMouseMove);
      
      // Set initial state based on fullscreen status
      isFullscreen = !!document.fullscreenElement;
      showFullscreenButton = !isFullscreen; // Show if not in fullscreen
    }

    })(); // End of async IIFE
    
    // Return cleanup function
    return () => {
      // Clean up event listeners and realtime subscription
      if (browser) {
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('mousemove', handleMouseMove);
      }
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleMouseMove);
    }
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  });
</script>


<div class="main-wrapper">
  <header class="header">
    <link rel="stylesheet" href="https://use.typekit.net/kic0xlz.css">
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
              />
            </div>
          {/if}
        </div>
      {/if}
      <div class="titles">
        <h1>Mini-Golf Leaderboard</h1>
        <h2 class="event-title">{eventSettings?.title || currentEvent}</h2>
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
  {#if eventSettings.enable_ads && eventSettings.ads_text}
    <a href={eventSettings.ads_url} class="ad-banner">
      {eventSettings.ads_text}
    </a>
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



