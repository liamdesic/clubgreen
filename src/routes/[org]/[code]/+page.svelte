<script lang="ts">
  import '$lib/styles/base.css';
  import '$lib/styles/theme.css';
  import '$lib/styles/scorecard.css';
  
  // Import scorecard.css only when needed
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import confetti from 'canvas-confetti';
  import { supabase } from '$lib/supabaseClient';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { showToast } from '$lib/stores/toastStore';
  import LeaderboardModal from '$lib/components/scorecard/LeaderboardModal.svelte';
  import { v4 as uuidv4 } from 'uuid';
  import profanity from 'leo-profanity';
  import { goto } from '$app/navigation';
  import { Trophy, Flag, Plus, X, Edit, Medal, Flame, Circle } from 'lucide-svelte';
  import RecoveryPrompt from '$lib/components/scorecard/RecoveryPrompt.svelte';
  import { createBlankPlayer, isValidScore, isRoundComplete, formatScore, generateGameId } from '$lib/utils/scorecardUtils';
  import { triggerLeaderboardUpdate } from '$lib/runtime/scoreSnapshot';
  import { timeFilterSchema, type TimeFilter } from '$lib/validations/timeFilter';
  import type { ScorecardInsert } from '$lib/validations';
  
  // Only import scorecard.css if we're in the browser and on the scorecard page
  if (browser && window.location.pathname.includes('/scorecard')) {
    import('$lib/styles/scorecard.css');
  }

  const customEase = cubicOut;

  // 🧬 FETCH SETTINGS FROM EVENTS AND ORGANIZATIONS TABLES
  let eventSettings = {
    title: 'Live Leaderboard',  // Default value
    hole_count: 9,  // Default value
    accent_color: '#00c853',  // Default value
    ads_text: '',
    ads_url: ''
  };
  let orgSettings = {
    logo_url: null,
    name: null
  };
  let currentOrg = '';
  let currentCode = '';
  let eventId = '';
  let orgId = '';
  
  // State management
  type PageState = 'loading' | 'ready' | 'error';
  let state: PageState = 'loading';
  let errorMsg: string | null = null;
  
  // Add recovery state
  let showRecoveryPrompt = false;
  let hasRecoveredGame = false;

  // Function to save game state to localStorage
  function saveGameState() {
    if (!browser) return;
    
    const gameState = {
      players,
      currentHole,
      gameStarted,
      allScored,
      showFinal,
      eventId,
      orgId,
      eventSettings,
      orgSettings
    };
    
    localStorage.setItem(`scorecard_${eventId}`, JSON.stringify(gameState));
  }

  // Function to load game state from localStorage
  function loadGameState() {
    if (!browser) return null;
    
    const savedState = localStorage.getItem(`scorecard_${eventId}`);
    if (!savedState) return null;
    
    try {
      return JSON.parse(savedState);
    } catch (e) {
      console.error('Error parsing saved game state:', e);
      return null;
    }
  }

  // Function to clear saved game state
  function clearGameState() {
    if (!browser) return;
    localStorage.removeItem(`scorecard_${eventId}`);
  }

  // Watch for changes to save game state
  $: if (browser && gameStarted && !showFinal) {
    saveGameState();
  }

  // Type definitions
  interface Player {
    id: string;
    name: string;
    scores: (number|null)[];
    holeInOnes: number;
    totalScore: number;
    isActive?: boolean;
  }
  
  const loadEventSettings = async () => {
    console.log('Loading event settings for code:', currentCode);
    
    // First, only fetch minimal data to check access
    // Try with the exact code first
    let { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, title, access_uuid')
      .eq('short_code', currentCode)
      .single();
      
    // If no event found, try with the code as a substring (in case URL encoding issues)
    if (eventError && eventError.code === 'PGRST116') {
      console.log('Event not found with exact code, trying alternative query');
      const { data: altData, error: altError } = await supabase
        .from('events')
        .select('id, title, access_uuid')
        .ilike('short_code', `%${currentCode}%`)
        .limit(1);
        
      if (!altError && altData && altData.length > 0) {
        eventData = altData[0];
        eventError = null;
        console.log('Found event with alternative query:', eventData.id);
      }
    }

    if (eventError) {
      console.error('Error fetching event:', eventError.message);
      // If the event doesn't exist, throw a 404 error
      if (eventError.code === 'PGRST116') {
        throw new Error('404');
      }
      errorMsg = eventError.message;
      state = 'error';
      return;
    }

    // Verify access before loading any sensitive data
    if (eventData && eventData.access_uuid) {
      const urlParams = new URLSearchParams(window.location.search);
      const providedUuid = urlParams.get('access');
      
      // Log access check details for debugging
      console.log('Access check:', { 
        required: eventData.access_uuid,
        provided: providedUuid || 'none'
      });
      
      if (!providedUuid) {
        console.error('Access denied: Missing access UUID');
        errorMsg = 'Access denied: This scorecard requires an access code. Please use the provided link or QR code.';
        state = 'error';
        console.log('🔴 Access denied - State set to:', state);
        return;
      }
      
      if (providedUuid !== eventData.access_uuid) {
        console.error('Access denied: Invalid access UUID');
        errorMsg = 'Access denied: The provided access code is invalid.';
        state = 'error';
        console.log('🔴 Access denied - State set to:', state);
        return;
      }
      
      console.log('🟢 Access granted!');
    }
    
    // Access is granted, now load the full event data
    const { data: fullEventData, error: fullEventError } = await supabase
      .from('events')
      .select('id, title, hole_count, accent_color, ads_text, ads_url, organization_id')
      .eq('short_code', currentCode)
      .single();
      
    if (fullEventError) {
      console.error('Error fetching full event data:', fullEventError.message);
      errorMsg = fullEventError.message;
      state = 'error';
      return;
    }

    // Use the fullEventData for all settings since access is granted
    eventId = fullEventData.id;
    orgId = fullEventData.organization_id;
    
    eventSettings = {
      ...eventSettings,
      title: fullEventData.title || eventSettings.title,
      hole_count: fullEventData.hole_count || eventSettings.hole_count,
      accent_color: fullEventData.accent_color || eventSettings.accent_color,
      ads_text: fullEventData.ads_text || eventSettings.ads_text,
      ads_url: fullEventData.ads_url || eventSettings.ads_url
    };
    
    console.log('✅ Loaded event settings:', eventSettings);
  };
  
  const loadOrgSettings = async () => {
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('logo_url, name')
      .eq('id', orgId)
      .single();
      
    if (orgError) {
      console.error('Error fetching organization:', orgError.message);
      return;
    }
    
    if (orgData) {
      orgSettings = {
        logo_url: orgData.logo_url || null,
        name: orgData.name || null
      };
      console.log('✅ Loaded organization settings:', orgSettings);
    }
  };
  
  // Update CSS when accent color changes
  $: if (browser && eventSettings?.accent_color) {
    document.documentElement.style.setProperty('--accent-color', eventSettings.accent_color);
  }

  // Load settings when component mounts
  // Initialize scorecard data and UI after access is granted
  const initializeScorecard = async () => {
    console.log('🏌️ Initializing scorecard data and UI...');
    
    // Load organization settings if we have an organization ID
    if (orgId) {
      await loadOrgSettings();
    }
    
    // Load any player data or other sensitive information here
    // This ensures this data is only loaded when access is properly granted
    
    // Additional initialization code could go here, such as:
    // - Loading saved player data from local storage or database
    // - Setting up event listeners
    // - Initializing game state
    
    console.log('🟢 Scorecard initialization complete');
  };

  onMount(async () => {
    showToast('Loading event settings...', 'info');
    console.log('🟡 Component mounted, state:', state);
    currentOrg = $page.params.org;
    currentCode = $page.params.code;
    
    try {
      await loadEventSettings();
      
      // Only initialize scorecard if access is granted (not in error state)
      if (state !== 'error') {
        // Check for saved game state
        const savedState = loadGameState();
        if (savedState && !hasRecoveredGame) {
          showRecoveryPrompt = true;
        } else {
          // Initialize scorecard data and UI
          await initializeScorecard();
        }
        
        // Set state to ready after initialization
        state = 'ready';
        console.log('🟢 Scorecard ready, state:', state);
      } else {
        console.log('🔴 Access denied, displaying error overlay');
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message === '404') {
        // Redirect to the catch-all route for 404
        goto('/[...rest]');
        return;
      }
      errorMsg = error.message || 'Failed to load event settings';
      state = 'error';
      console.log('❌ Error in loadEventSettings:', errorMsg);
    }
    
    profanity.loadDictionary('en');
    
    // Log CSS loading for debugging
    if (browser) {
      console.log('[CSS Debug] Checking loaded stylesheets:');
      const cssFiles = Array.from(document.styleSheets).map(sheet => sheet.href);
      cssFiles.forEach(href => console.log(href));
      
      const scorecardCssLoaded = cssFiles.some(href => href && href.includes('scorecard.css'));
      console.log(`[CSS Debug] Scorecard CSS loaded: ${scorecardCssLoaded}`);
    }
  });

  // ------ 🧠 STATE VARIABLES ------
  let playerName = '';
  let players: Player[] = [];
  let currentHole = 1;
  let currentPlayerIndex = 0;
  let gameStarted = false;
  let allScored = false;
  let statusMessage = "Let's play! Add players to get started...";
  let showFinal = false;
  let editingPlayerIndex: number | null = null;
  let savedTurnIndex: number | null = null;
  let showLeaderboardModal = false;
  let currentScore = 1; // Track the current score for display

  // ------ 🙋 PLAYER ENTRY FUNCTIONS ------

  function addPlayer() {
    const trimmed = playerName.trim();
    console.log('Adding player:', trimmed);
    
    if (!trimmed) {
      console.log('Empty name, not adding');
      return;
    }
    
    if (players.length >= 6) {
      console.log('Max players reached, showing toast');
      console.log('Calling showToast with:', 'Maximum of 6 players allowed', 'error');
      const toastId = showToast('Maximum of 6 players allowed', 'error');
      console.log('showToast returned:', toastId);
      return;
    }
    
    if (profanity.check(trimmed)) {
      console.log('Profanity detected in name');
      showToast('Please use appropriate language for player names', 'error');
      return;
    }
    
    players = [...players, createBlankPlayer(trimmed, eventSettings.hole_count)];
    playerName = '';
    console.log('Player added successfully');
  }

  function removePlayer(index) {
    players = players.slice(0, index).concat(players.slice(index + 1));
  }

  function addTestPlayers() {
  const holeCount = eventSettings.hole_count;
  players = [
    createBlankPlayer('Mark', holeCount),
    createBlankPlayer('Lisa', holeCount),
    createBlankPlayer('Jim', holeCount),
    createBlankPlayer('Pam', holeCount)
  ];
}

  function startGame() {
    // Check if there's any text in the input field
    if (playerName.trim()) {
      // If there's text, try to add the player first
      addPlayer();
    }

    // Check if we have at least one player
    if (players.length === 0) {
      showToast('Please add at least one player to start', 'error');
      return;
    }

    gameStarted = true;
    
    // Initialize players with active state
    players = players.map((player, index) => ({
      ...player,
      isActive: index === 0 // First player is active by default
    }));
    
    updateStatusMessage();
  }
  
  // Update the status message based on current game state
  function updateStatusMessage() {
    if (!gameStarted) {
      statusMessage = "Let's play! Add players to get started...";
      return;
    }
    
    const activePlayer = players.find(p => p.isActive);
    
    if (activePlayer) {
      statusMessage = `Hole ${currentHole} – ${activePlayer.name}'s turn`;
    } else if (allScored) {
      const isFinalHole = currentHole === eventSettings.hole_count;
      statusMessage = isFinalHole
        ? `🎉 All done! Ready to submit scores`
        : `All players done – ready for Hole ${currentHole + 1}`;
    } else {
      // Find the first player who hasn't scored for this hole
      const nextPlayer = findNextUnscoredPlayer();
      if (nextPlayer) {
        // Make them active
        selectPlayer(nextPlayer);
      } else {
        statusMessage = `No active player selected`;
      }
    }
  }
  
  // Find the first player who hasn't scored for the current hole
  function findNextUnscoredPlayer() {
    return players.find(p => p.scores[currentHole - 1] === null);
  }

  // ------ ⛳ GAMEPLAY FUNCTIONS ------
  function recordScore(strokes) {
    let playerToUpdate;
    
    // Determine which player's score to update
    if (editingPlayerIndex !== null) {
      playerToUpdate = players[editingPlayerIndex];
    } else {
      playerToUpdate = players.find(p => p.isActive);
      if (!playerToUpdate) return; // No active player found
    }

    // Record the score
    playerToUpdate.scores[currentHole - 1] = strokes;
    playerToUpdate.holeInOnes = playerToUpdate.scores.filter(s => s === 1).length;
    playerToUpdate.totalScore = playerToUpdate.scores.reduce((sum, val) => (sum || 0) + (val || 0), 0);
    
    // Show confetti for hole-in-one
    if (strokes === 1) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    
    // Mark the player as inactive if we're not editing
    if (editingPlayerIndex === null) {
      playerToUpdate.isActive = false;
    }

    // Check if all players have scored for this hole
    const allPlayersScored = players.every(p => p.scores[currentHole - 1] !== null);
    allScored = allPlayersScored;

    // If editing, return to previous player's turn
    if (editingPlayerIndex !== null) {
      const playerBeingEdited = players[editingPlayerIndex];
      playerBeingEdited.isActive = false;
      
      if (savedTurnIndex !== null && players[savedTurnIndex]) {
        players[savedTurnIndex].isActive = true;
      }
      
      editingPlayerIndex = null;
      savedTurnIndex = null;
    } else {
      // Find the next player who hasn't scored and make them active
      const nextPlayer = findNextUnscoredPlayer();
      if (nextPlayer) {
        nextPlayer.isActive = true;
      }
    }
    
    // Trigger reactivity
    players = [...players];

    // Save state immediately after recording score
    saveGameState();

    // Update the status message
    setTimeout(() => {
      updateStatusMessage();
    }, 500);
  }

  function editScore(player) {
    const playerIndex = players.findIndex(p => p.id === player.id);
    if (playerIndex === -1) return;
    
    // Save the currently active player index
    const activePlayerIndex = players.findIndex(p => p.isActive);
    savedTurnIndex = activePlayerIndex !== -1 ? activePlayerIndex : null;
    
    // Set the editing state
    editingPlayerIndex = playerIndex;
    
    // Set the current score to the player's existing score for this hole
    currentScore = player.scores[currentHole - 1] || 1;
    
    // Update status message
    statusMessage = `Editing ${player.name}'s score`;
  }
  
  // Function to select a player (make them active)
  function selectPlayer(player) {
    if (!gameStarted || showFinal) return;
    
    // If editing, don't change selection
    if (editingPlayerIndex !== null) return;
    
    // Deactivate all players
    players.forEach(p => p.isActive = false);
    
    // Activate the selected player
    player.isActive = true;
    
    // Trigger reactivity
    players = [...players];
    
    // Update status message
    updateStatusMessage();
  }

  // ------ 🏁 FINAL SCORES LOGIC ------
  async function showFinalScreen() {
    // First sort by total score
    players.sort((a, b) => a.totalScore - b.totalScore);

    // Generate a single game_id for this game session
    const gameId = generateGameId();

    // Show final scores
    showFinal = true;

    // Clear localStorage since game is finished
    clearGameState();

    const finalHole = eventSettings?.hole_count || 9;
    const rowsToInsert = [];

    for (const player of players) {
      for (let hole = 1; hole <= finalHole; hole++) {
        const strokes = player.scores[hole - 1];
        if (strokes == null) continue;

        rowsToInsert.push({
          player_id: player.id,
          game_id: gameId,
          name: player.name,
          score: strokes,
          hole_number: hole,
          hole_in_ones: strokes === 1 ? 1 : 0,
          event_id: eventId,  // Add event_id from the current event
          published: true     // Mark as published by default
        });
      }
    }

    console.log("📝 Prepared rows to insert:", rowsToInsert);

    if (rowsToInsert.length > 0) {
      const { error } = await supabase
        .from('scorecard')
        .insert(rowsToInsert)
        .select();
      if (error) {
        console.error('❌ Error inserting final scores:', error);
      } else {
        console.log(`✅ Inserted ${rowsToInsert.length} rows to Supabase`);
        
        // Trigger leaderboard updates for all time filters
        try {
          const timeFilters = ['all_time', 'today', 'this_week', 'this_month'];
          for (const filter of timeFilters) {
            await triggerLeaderboardUpdate(eventId, filter);
          }
          console.log('✅ Triggered leaderboard updates for all time filters');
        } catch (err) {
          console.error('❌ Error triggering leaderboard updates:', err);
        }
      }
    } else {
      console.warn("⚠️ No scores found to insert.");
    }

    showFinal = true;
  }

  async function nextHole() {
    if (!allScored) return;

    const finalHole = eventSettings?.hole_count || 9;
    if (currentHole >= finalHole) {
      console.log("🎯 Reached final hole — showing final screen.");
      await showFinalScreen(); // ⬅️ Make sure we await final save
      return;
    }

    currentHole++;
    currentPlayerIndex = 0;
    allScored = false;
    
    // Reset all players to inactive except the first player
    players = players.map((player, index) => ({
      ...player,
      isActive: index === 0 // Make the first player active
    }));
    
    // Save state after moving to next hole
    saveGameState();
    
    statusMessage = `Hole ${currentHole} – ${players[0].name}'s turn`;
  }

  async function saveScoresToSupabaseForHole(hole) {
    for (const player of players) {
      const strokes = player.scores[hole - 1];
      if (strokes == null) continue;

      const { error } = await supabase.from('scorecard').insert({
        name: player.name,
        score: strokes,
        hole_number: hole,
        hole_in_ones: strokes === 1 ? 1 : 0
      });

      if (error) {
        console.error(`❌ Error saving ${player.name} (hole ${hole})`, error);
      } else {
        console.log(`✅ Saved ${player.name} (hole ${hole})`);
      }
    }
  }

  function resetGame() {
    players = [];
    playerName = '';
    currentHole = 1;
    currentPlayerIndex = 0;
    allScored = false;
    showFinal = false;
    gameStarted = false;
    editingPlayerIndex = null;
    savedTurnIndex = null;
    statusMessage = '';
    clearGameState();
  }

  // Function to recover saved game
  function recoverGame() {
    const savedState = loadGameState();
    if (savedState) {
      players = savedState.players;
      currentHole = savedState.currentHole;
      gameStarted = savedState.gameStarted;
      allScored = savedState.allScored;
      showFinal = savedState.showFinal;
      eventSettings = savedState.eventSettings;
      orgSettings = savedState.orgSettings;
      hasRecoveredGame = true;
      showRecoveryPrompt = false;
      updateStatusMessage();
    }
  }

  // Function to start new game
  function startNewGame() {
    clearGameState();
    resetGame();
    showRecoveryPrompt = false;
  }
</script>


<!-------------HTML------------------->
{@html `<script>console.log('Current state value:', '${state}', 'Error message:', '${errorMsg || "none"}');</script>`}
<!-- Error State - Completely blocks access to the app -->
{#if state === 'error'}
  <div style="position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background-color: #1e1a26; background-image: linear-gradient(to bottom right, rgba(0,0,0,0.8), rgba(0,0,0,0.95)); z-index: 1000; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="padding: 2.5rem; max-width: 90%; width: 450px; text-align: center; color: white; background-color: rgba(255, 255, 255, 0.05); border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);">
      <h2 style="margin-top: 0; font-family: 'Inter'; font-size: 28px; font-weight: 600; margin-bottom: 24px; color: var(--accent-color, #00c853);">Access Denied</h2>
      <p style="font-size: 18px; color: white; line-height: 1.5; margin-bottom: 16px; opacity: 0.9;">{errorMsg || 'An error occurred loading the scorecard'}</p>
      <p style="font-size: 18px; color: white; line-height: 1.5; margin-bottom: 16px; opacity: 0.9;">Please scan the QR code again to access the scorecard.</p>
    </div>
  </div>
{:else}
<!-- 🌟 Persistent UI Elements -->
<div class="scorecard-content">
  <div class="header-container">
  <header class="app-header">
  <div class="header-inner">
    <div class="leaderboard-link">
      <button class="leaderboard-button" on:click={() => showLeaderboardModal = !showLeaderboardModal}>
        <Trophy size={20} /> Live Leaderboard
      </button>
      
    </div>
    <div class="event-title">
      <h2>{eventSettings?.title || 'Live Leaderboard'}</h2>
    </div>
  </div>

  {#if !showFinal}
    <div class="game-header">
      <Flag size={80} class="flag-background" />

      <div class="hole-indicator">
        {#if !gameStarted}
          <div class="hole-number">
            <span class="hole-label">Scorecard</span>
          </div>
        {:else}
          <div class="hole-number">
            <span class="hole-label">HOLE</span>
            <span class="hole-circle">{currentHole}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}

</header>
<!-- ✅ Status bar -->
{#if !showFinal}
  <!-- ✅ Status bar -->
  <div class="status-bar">
    <div class="status-inner">
      {#key statusMessage}
        <div
          class="status-text"
          in:fly={{ x: -100, duration: 400, delay: 100, easing: customEase }}
          out:fly={{ x: 100, duration: 300, easing: customEase }}
        >
          {@html statusMessage}
        </div>
      {/key}
    </div>
  </div>
{/if}
</div>


<!-- 🏆 Leaderboard Modal -->
{#if showLeaderboardModal}
  <LeaderboardModal
    visible={showLeaderboardModal}
    eventId={eventId}
    on:close={() => showLeaderboardModal = false}
  />
{/if}






<!-- 🎬 PLAYER ENTRY SCREEN -->
{#if !gameStarted}
    <!-- 🧾 Entry Card -->
     <div class="main-content-container">
    <div class="main-content player-entry-card">
      <form on:submit|preventDefault={() => addPlayer()}>
        <label for="player-name-input" class="player-input-label">Add players</label>
        <div class="input-with-button">
          <input 
            id="player-name-input"
            class="player-input" 
            bind:value={playerName}
            on:input={(e) => {
              const input = e.currentTarget;
              const value = input.value;
              
              // Check length
              if (value.length === 18) {
                showToast('Name is too long, sorry!', 'error');
              }
              
              // Check for profanity as user types
              if (profanity.check(value)) {
                showToast('Please use appropriate language for player names', 'error');
              }
              
              // The maxlength attribute will prevent going over 18 chars
              playerName = value.slice(0, 18);
            }}
            placeholder="Name" 
            maxlength="18"
            on:keydown={(e) => e.key === 'Enter' && addPlayer()}
          />
          <button 
            type="submit" 
            class="submit-plus-button" 
            aria-label="Add player"
            disabled={!playerName.trim()}
          >
            <Plus size={20} />
          </button>
        </div>
      </form>

      {#if players.length > 0}
  <ul class="player-list">
    {#each players as p, i}
      <li>
        {p.name}
        <button class="remove-player" on:click={() => removePlayer(i)}>
          <X size={20} />
        </button>
      </li>
    {/each}
  </ul>
{/if}


    <!-- Removed add-player-circle button as we now use the inline plus button -->

  </div>

<!-- 🚀 Bottom green bar -->
<div class="bottom-buttons">
  <button class="bottom-bar-button" on:click={startGame}>Start Game</button>
<!------//button class="bottom-bar-button outline" on:click={addTestPlayers}>Add Test Players button// ------>
</div>
</div>

{/if}


<!-- 🏌️ SCORING SCREEN -->
{#if gameStarted && !showFinal}
<div class="main-content-container">
  <div class="main-content">
    {#each players as player, index}
      {#if player.isActive || index === editingPlayerIndex}
        <!-- 🎯 Active Player Card -->
        <div class="player-card player-card-active{player.scores[currentHole - 1] === null ? ' player-card-unscored' : ''}">
          <div class="name-centered">{player.name}</div>
          <div class="score-buttons">
            {#each [1, 2, 3, 4, 5, 6] as stroke}
              <button on:click={() => recordScore(stroke)}>{stroke}</button>
            {/each}
          </div>
        </div>
      {:else}
        <!-- 🔇 Inactive Player Card - Clickable to select player -->
        <div 
          class="player-card player-card-inactive{player.scores[currentHole - 1] === null ? ' player-card-unscored' : ''}" 
          on:click={() => selectPlayer(player)}
          on:keydown={(e) => e.key === 'Enter' && selectPlayer(player)}
          role="button"
          tabindex="0"
          aria-label={`Select ${player.name}`}
        >
          <div class="player-header">
            <span>{player.name}</span>
            <div class="score-edit">
              <span>{player.scores[currentHole - 1] ?? ''}</span>
              {#if player.scores[currentHole - 1] != null}
                <button 
                  class="edit-btn" 
                  on:click={(e) => {
                    e.stopPropagation(); // Prevent triggering the card click
                    editScore(player);
                  }}
                  aria-label={`Edit ${player.name}'s score`}
                >
                  <Edit size={16} />
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    {/each}
  </div>

  <style>
    /* Player card styles */
    .player-card-unscored {
      border-left: 4px solid var(--accent-color);
    }
    
    .player-card-inactive {
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    
    .player-card-inactive:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    /* Error styles */
  .error-container {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #1e1a26;
    background-image: linear-gradient(to bottom right, rgba(0,0,0,0.8), rgba(0,0,0,0.95));
    z-index: 1000;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .error-message {
    padding: 2.5rem;
    max-width: 90%;
    width: 450px;
    text-align: center;
    color: white;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }
  
  .error-message h2 {
    margin-top: 0;
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 24px;
    color: var(--accent-color, #00c853);
  }
  
  .error-message p {
    font-size: 18px;
    line-height: 1.5;
    margin-bottom: 16px;
    opacity: 0.9;
  }
</style>

  <button class="bottom-bar-button" on:click={nextHole}>
  {currentHole === eventSettings.hole_count ? 'Submit Scores' : 'Next Hole'}
</button>
</div>
{/if}

<!-- 🏁 FINAL SCORE SCREEN -->
{#if showFinal}
  <div class="main-content final-screen" style="background-color: var(--accent-color-800);">
    <div class="final-header">
      <h1>Congratulations!</h1>
      <Trophy size={60} class="trophy-bg" />
    </div>

    <div class="final-table">
      <div class="final-row header">
        <div class="cell rank"><Medal size={16} /></div>
        <div class="cell name">Name</div>
        <div class="cell score"><Circle size={16} /> Score</div>
      </div>

      {#each players as player, index}
        <div class="final-row {index % 2 === 0 ? 'even' : 'odd'}">
          <div class="cell rank">
            {index + 1}
          </div>
          <div class="cell name">
            {#if index === 0} 🥇{/if}
            {#if index === 1} 🥈{/if}
            {#if index === 2} 🥉{/if}
            {player.name}
            {#if player.holeInOnes > 0}
              <div class="hio-note">
                <Flame size={16} style="color: #fc4138;" />
                {player.holeInOnes} hole-in-one{player.holeInOnes > 1 ? 's' : ''}
              </div>
            {/if}
          </div>
          <div class="cell score-pill">{player.totalScore}</div>
        </div>
      {/each}
    </div>

    <div class="thanks">
      <p>Thanks for playing!</p>
    </div>

    <button class="bottom-bar-button" on:click={resetGame}>New Game</button>
  </div>
{/if}

<!-- 🔻 Footer -->
<footer class="app-footer">
  <div class="footer-inner">
    {#if orgSettings.logo_url}
      <img src={orgSettings.logo_url} alt="Organization logo" class="org-logo" />
    {:else}
      <img src="https://images.squarespace-cdn.com/content/v1/66f47f43360134029ba42149/a7914e99-7939-42b0-b318-c99c685120eb/Asset+5.png?format=1500w" alt="Club Green logo" class="logo" />
    {/if}
  
    {#if eventSettings?.ads_text && eventSettings?.ads_url}
      <a href={eventSettings.ads_url} class="footer-promo" target="_blank" rel="noopener noreferrer">
        {eventSettings.ads_text}
      </a>
    {/if}
  </div>
</footer>
</div>

<!-- Add recovery prompt modal -->
<RecoveryPrompt
  visible={showRecoveryPrompt}
  onContinue={recoverGame}
  onStartNew={startNewGame}
/>
{/if}
