<script>
  import '$lib/styles/base.css';
  import '$lib/styles/theme.css';
  import '$lib/styles/scorecard.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import confetti from 'canvas-confetti';
  import { supabase } from '$lib/supabaseClient';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { showToast } from '$lib/toastStore';
  import LeaderboardModal from '$lib/components/LeaderboardModal.svelte';
  import { v4 as uuidv4 } from 'uuid';
  import profanity from 'leo-profanity'; 
  
  const customEase = cubicOut;

  // 🧬 FETCH SETTINGS FROM EVENTS AND ORGANIZATIONS TABLES
  let eventSettings = {
    title: 'Live Leaderboard',  // Default value
    hole_count: 9,  // Default value
    accent_color: '#00c853',  // Default value
    scorecard_ad_text: '',
    scorecard_ad_url: ''
  };
  let orgSettings = {
    logo_url: null,
    name: null
  };
  let currentOrg = '';
  let currentEvent = '';
  let eventId = '';
  let orgId = '';
  

  
  // Type definitions using JSDoc
  /**
   * @typedef {Object} Player
   * @property {string} id - Player's unique identifier
   * @property {string} name - Player's name
   * @property {(number|null)[]} scores - Array of scores for each hole
   * @property {number} holeInOnes - Number of hole-in-ones
   * @property {number} totalScore - Total score
   */
  
  const loadEventSettings = async () => {
    // Get the event details including settings_json
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, title, settings_json, organization_id')
      .eq('slug', currentEvent)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError.message);
      return;
    }

    eventId = eventData.id;
    orgId = eventData.organization_id;
    
    // Merge default settings with any settings from the database
    eventSettings = {
      ...eventSettings,
      title: eventData.title || eventSettings.title,
      ...(eventData.settings_json || {})
    };
    
    console.log('✅ Loaded event settings:', eventSettings);
    
    // Now fetch organization data
    if (orgId) {
      await loadOrgSettings();
    }
  };
  
  const loadOrgSettings = async () => {
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('settings_json')
      .eq('id', orgId)
      .single();
      
    if (orgError) {
      console.error('Error fetching organization:', orgError.message);
      return;
    }
    
    if (orgData && orgData.settings_json) {
      orgSettings = {
        ...orgSettings,
        ...(orgData.settings_json || {})
      };
      console.log('✅ Loaded organization settings:', orgSettings);
    }
  };
  
  // Update CSS when accent color changes
  $: if (browser && eventSettings?.accent_color) {
    document.documentElement.style.setProperty('--accent-color', eventSettings.accent_color);
  }

  // Load settings when component mounts
  onMount(() => {
    showToast('Loading event settings...', 'info');
    currentOrg = $page.params.org;
    currentEvent = $page.params.event;
    loadEventSettings();
    profanity.loadDictionary('en');
  });

  // ------ 🧠 STATE VARIABLES ------
  let playerName = '';
  let players = [];
  let currentHole = 1;
  let currentPlayerIndex = 0;
  let gameStarted = false;
  let allScored = false;
  let statusMessage = "Let's play! Add players to get started...";
  let showFinal = false;
  let editingPlayerIndex = null;
  let savedTurnIndex = null;
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
    
    players = [...players, { 
      id: uuidv4(), 
      name: trimmed, 
      scores: Array(eventSettings.hole_count).fill(null), 
      holeInOnes: 0, 
      totalScore: 0 
    }];
    playerName = '';
    console.log('Player added successfully');
  }

  function removePlayer(index) {
    players = players.slice(0, index).concat(players.slice(index + 1));
  }

  function addTestPlayers() {
  const holeCount = eventSettings.hole_count;
  players = [
    { id: uuidv4(), name: 'Mark', scores: Array(holeCount).fill(null), holeInOnes: 0, totalScore: 0 },
    { id: uuidv4(), name: 'Lisa', scores: Array(holeCount).fill(null), holeInOnes: 0, totalScore: 0 },
    { id: uuidv4(), name: 'Jim', scores: Array(holeCount).fill(null), holeInOnes: 0, totalScore: 0 },
    { id: uuidv4(), name: 'Pam', scores: Array(holeCount).fill(null), holeInOnes: 0, totalScore: 0 }
  ];
}

  function startGame() {
    if (players.length < 2) {
      alert('Please enter at least 2 players to start');
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
  
    // Show final scores
    showFinal = true;
  
    const finalHole = eventSettings?.hole_count || 9;
    const rowsToInsert = [];

    for (const player of players) {
      for (let hole = 1; hole <= finalHole; hole++) {
        const strokes = player.scores[hole - 1];
        if (strokes == null) continue;

        rowsToInsert.push({
          player_id: player.id,
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
  }
</script>


<!-------------HTML------------------->
<!-- 🌟 Persistent UI Elements -->
<div class="scorecard-content">
  <div class="header-container">
  <header class="app-header">
  <div class="header-inner">
    <div class="leaderboard-link">
      <button class="leaderboard-button" on:click={() => showLeaderboardModal = !showLeaderboardModal}>
        <i class="fa-solid fa-trophy"></i> Live Leaderboard
      </button>
      
    </div>
    <div class="event-title">
      <h2>{eventSettings?.title || 'Live Leaderboard'}</h2>
    </div>
  </div>

  {#if !showFinal}
    <div class="game-header">
      <i class="fa-solid fa-flag flag-background"></i>

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
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </form>

      {#if players.length > 0}
  <ul class="player-list">
    {#each players as p, i}
      <li>
        {p.name}
        <button class="remove-player" on:click={() => removePlayer(i)}>
          <i class="fa-solid fa-xmark"></i>
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
                  <i class="fa-solid fa-pen-to-square"></i>
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
  </style>

  <button class="bottom-bar-button" on:click={nextHole}>
  {currentHole === eventSettings.hole_count ? 'Submit Scores' : 'Next Hole'}
</button>
</div>
{/if}

<!-- 🏁 FINAL SCORE SCREEN -->
{#if showFinal}
  <div class="main-content final-screen">
    <div class="final-header">
      <h1>Congratulations!</h1>
      <i class="fa-solid fa-trophy trophy-bg"></i>
    </div>

    <div class="final-table">
      <div class="final-row header">
        <div class="cell rank"><i class="fa-solid fa-medal"></i></div>
        <div class="cell name">Name</div>
        <div class="cell score"><i class="fa-solid fa-golf-ball-tee"></i> Score</div>
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
                <i class="fa-solid fa-fire" style="color: #fc4138;"></i>
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
  
    {#if eventSettings?.scorecard_ad_text && eventSettings?.scorecard_ad_url}
      <a href={eventSettings.scorecard_ad_url} class="footer-promo" target="_blank" rel="noopener noreferrer">
        {eventSettings.scorecard_ad_text}
      </a>
    {/if}
  </div>
</footer>
</div>
