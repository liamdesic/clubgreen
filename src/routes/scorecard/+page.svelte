<script>
  import '../../lib/style.css';
  import { onMount } from 'svelte';
  import confetti from 'canvas-confetti';
  import { supabase } from '$lib/supabaseClient';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import LeaderboardModal from '$lib/components/LeaderboardModal.svelte';
  import { v4 as uuidv4 } from 'uuid'; 
  // 

  const customEase = cubicOut;

  // 🧬 FETCH SETTINGS FROM SUPABASE
  let leaderboardSettings = null;

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('leaderboard_settings')
      .select('*')
      .eq('published', true)
      .single();

    if (error) {
      console.error('Error fetching leaderboard settings:', error.message);
    } else {
      leaderboardSettings = data;
      console.log('✅ Loaded leaderboard settings:', leaderboardSettings);
    }
  };

  loadSettings();

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


  // ------ 🙋 PLAYER ENTRY FUNCTIONS ------

function addPlayer() {
  const trimmed = playerName.trim();
  if (!trimmed || players.length >= 6) return;

  players = [
    ...players,
    {
      id: uuidv4(), // 🧬 Generate once and persist!
      name: trimmed,
      scores: Array(leaderboardSettings?.hole_count || 9).fill(null),
      holeInOnes: 0,
      totalScore: 0
    }
  ];

  playerName = '';
}

  function removePlayer(index) {
    players = players.slice(0, index).concat(players.slice(index + 1));
  }

  function addTestPlayers() {
  const holeCount = leaderboardSettings?.hole_count || 9;
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
    statusMessage = `Hole ${currentHole} – ${players[0].name}'s turn`;
  }

  // ------ ⛳ GAMEPLAY FUNCTIONS ------
  function recordScore(strokes) {
    const index = editingPlayerIndex !== null ? editingPlayerIndex : currentPlayerIndex;
    const player = players[index];

    player.scores[currentHole - 1] = strokes;
    player.holeInOnes = player.scores.filter(s => s === 1).length;
    player.totalScore = player.scores.reduce((sum, val) => sum + (val || 0), 0);
    players = [...players];

    const reactions = {
      1: '<i class="fa-solid fa-trophy"></i> Hole-in-One! Absolute legend!',
      2: '<i class="fa-solid fa-fire"></i> Two strokes — clean and mean!',
      3: '<i class="fa-solid fa-dumbbell"></i> Not bad! You\'re warming up!',
      4: '<i class="fa-regular fa-face-smile"></i> Solid swing!',
      5: '<i class="fa-regular fa-face-meh"></i> Could be worse!',
      6: '<i class="fa-regular fa-face-frown"></i> Hang in there...',
      7: '<i class="fa-solid fa-golf-ball-tee"></i> Oof — at least you got there!'
    };
    statusMessage = reactions[strokes] || `Nice! You scored ${strokes} strokes.`;

    if (strokes === 1) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    if (editingPlayerIndex !== null) {
      editingPlayerIndex = null;
      currentPlayerIndex = savedTurnIndex;
    } else if (currentPlayerIndex < players.length - 1) {
      currentPlayerIndex++;
    } else {
      allScored = true;
    }

    setTimeout(() => {
  if (editingPlayerIndex !== null) {
    statusMessage = `${players[currentPlayerIndex].name}'s turn (continued)`;
  } else if (!allScored) {
    statusMessage = `${players[currentPlayerIndex].name}'s turn`;
  } else {
    const isFinalHole = currentHole === (leaderboardSettings?.hole_count || 9);
    statusMessage = isFinalHole
      ? `🎉 All done! Ready to submit scores`
      : `All players done – ready for Hole ${currentHole + 1}`;
  }
}, 1700);

  }

  function editScore(index) {
    savedTurnIndex = currentPlayerIndex;
    editingPlayerIndex = index;
    statusMessage = `Editing ${players[index].name}'s score`;
  }

  // ------ 🏁 FINAL SCORES LOGIC ------
async function showFinalScreen() {
  players.sort((a, b) => {
    const adjustedA = a.totalScore - 2 * a.holeInOnes;
    const adjustedB = b.totalScore - 2 * b.holeInOnes;
    return adjustedA - adjustedB;
  });

  const finalHole = leaderboardSettings?.hole_count || 9;
  const rowsToInsert = [];

  for (const player of players) {
    for (let hole = 1; hole <= finalHole; hole++) {
      const strokes = player.scores[hole - 1];
      if (strokes == null) continue;

      rowsToInsert.push({
  player_id: player.id, // 🧠 Now using consistent ID
  name: player.name,
  score: strokes,
  hole_number: hole,
  hole_in_ones: strokes === 1 ? 1 : 0
});

    }
  }

  console.log("📝 Prepared rows to insert:", rowsToInsert);

  if (rowsToInsert.length > 0) {
    const { error } = await supabase.from('scorecard').insert(rowsToInsert);
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

  const finalHole = leaderboardSettings?.hole_count || 9;
  if (currentHole >= finalHole) {
    console.log("🎯 Reached final hole — showing final screen.");
    await showFinalScreen(); // ⬅️ Make sure we await final save
    return;
  }

  currentHole++;
  currentPlayerIndex = 0;
  allScored = false;
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
<header class="app-header">
  <div class="header-inner">
    <div class="leaderboard-link">
      <button class="leaderboard-button" on:click={() => showLeaderboardModal = !showLeaderboardModal}>
        <i class="fa-solid fa-trophy"></i> Live Leaderboard
      </button>
      
    </div>
    <div class="event-title">
      <h2>{leaderboardSettings?.event_name || 'Live Leaderboard'}</h2>
    </div>
  </div>

  {#if !showFinal}
    <div class="game-header">
      <i class="fa-solid fa-flag flag-background"></i>

      <div class="hole-indicator">
        {#if !gameStarted}
          <div class="hole-number">
            <span class="hole-label">Add Players</span>
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


<!-- 🏆 Leaderboard Modal -->
{#if showLeaderboardModal}
  <LeaderboardModal
    visible={showLeaderboardModal}
    on:close={() => showLeaderboardModal = false}
  />
{/if}



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




<!-- 🎬 PLAYER ENTRY SCREEN -->
{#if !gameStarted}
  <!-- 🧾 Entry Card -->
  <div class="player-entry-card">

    <input class="player-input" bind:value={playerName} placeholder="Name" />

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


    <div class="entry-buttons">
      <button class="add-player-circle" on:click={addPlayer}>
        <i class="fa-solid fa-plus"></i>
      </button>
    </div>

    
  </div>

<!-- 🚀 Bottom green bar -->
<div class="bottom-buttons">
  <button class="bottom-bar-button" on:click={startGame}>Start Game</button>
<!------ <button class="bottom-bar-button outline" on:click={addTestPlayers}>Add Test Players</button> ------>
</div>


{/if}


<!-- 🏌️ SCORING SCREEN -->
{#if gameStarted && !showFinal}
  <div class="main-content">
    {#each players as player, index}
      {#if (index === currentPlayerIndex && player.scores[currentHole - 1] == null) || index === editingPlayerIndex}
        <!-- 🎯 Active Player Card -->
        <div class="player-card dark current-player-card">
          <div class="name-centered">{player.name}</div>
          <div class="score-buttons">
            {#each [1, 2, 3, 4, 5, 6] as stroke}
              <button on:click={() => recordScore(stroke)}>{stroke}</button>
            {/each}
          </div>
        </div>
      {:else}
        <!-- 🔇 Inactive Player Card -->
        <div class="player-card dark">
          <div class="player-header">
            <span>{player.name}</span>
            <div class="score-edit">
              <span>{player.scores[currentHole - 1] ?? ''}</span>
              {#if player.scores[currentHole - 1] != null}
                <button class="edit-btn" on:click={() => editScore(index)}>
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    {/each}
  </div>

  <button class="bottom-bar-button" on:click={nextHole}>
  {currentHole === (leaderboardSettings?.hole_count || 9) ? 'Submit Scores' : 'Next Hole'}
</button>

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
          <div class="cell rank">{index + 1}</div>
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
      <img src="https://images.squarespace-cdn.com/content/v1/66f47f43360134029ba42149/a7914e99-7939-42b0-b318-c99c685120eb/Asset+5.png?format=1500w" alt="Club Green logo" class="logo" />
    </div>
  </div>

  <button class="bottom-bar-button" on:click={resetGame}>New Game</button>
{/if}

<!-- 🔻 Footer -->
<footer class="app-footer">
  <div class="footer-inner">
    <div class="footer-copy">
      © Club Green {new Date().getFullYear()}
    </div>
    <div class="footer-promo">
      Want Club Green mini-golf for your event?
      <a href="https://clubgreen.au" target="_blank" rel="noopener noreferrer">
        Learn More &rsaquo;
      </a>
    </div>
  </div>
</footer>
