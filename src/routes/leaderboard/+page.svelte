<script>
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  // ------ 🧠 STATE ------
  let leaderboard = [];
  let loading = true;
  let error = null;

  // Settings (with safe defaults)
  let eventName = 'Live Leaderboard';
  let logoUrl = '';
  let accentColor = '#00c853';
  let adsText = '';
  let showAds = false;
  let holeCount = 9;
  let adsUrl = '';
  let qrImageUrl = '';
  let showFullscreenButton = false;

  let hideTimeout = null;
  let realtimeChannel;

  // ------ ⚙️ LOAD SETTINGS ------
  async function loadSettings() {
    const { data, error } = await supabase
      .from('leaderboard_settings')
      .select('*')
      .eq('published', true)
      .single();

    if (error) {
      console.error('❌ Error loading leaderboard settings:', error.message);
      return;
    }

    eventName = data.event_name || eventName;
    holeCount = data.hole_count || holeCount;
    logoUrl = data.logo_url || '';
    accentColor = data.accent_color || accentColor;
    showAds = data.enable_ads ?? false;
    adsText = data.ads_text || '';
    adsUrl = data.ads_url || '';
    qrImageUrl = data.qr_image_url || '';

    console.log('✅ SETTINGS:', {
      adsUrl,
      logoUrl,
      qrImageUrl
    });
  }

  // ------ 📊 LOAD SCORES ------
  async function loadLeaderboard() {
    loading = true;
    error = null;

    const { data, error: fetchError } = await supabase
      .from('scorecard')
      .select('player_id, name, score, hole_number, hole_in_ones');

    if (fetchError) {
      error = fetchError.message;
      loading = false;
      return;
    }

    const playerMap = new Map();
    const holesPlayed = {};

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
      .filter(player => holesPlayed[player.id] === holeCount)
      .sort((a, b) => a.totalScore - b.totalScore);

    loading = false;
  }

  // ------ 🔁 INIT + FULLSCREEN ------
  function toggleFullscreen() {
    if (typeof document !== 'undefined') {
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
        elem.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  }

  function handleMouseMove() {
    showFullscreenButton = true;
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      showFullscreenButton = false;
    }, 2000);
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove);
    }

    loadSettings().then(loadLeaderboard);

    realtimeChannel = supabase
      .channel('public:scorecard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scorecard' }, loadLeaderboard)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'scorecard' }, loadLeaderboard)
      .subscribe();
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleMouseMove);
    }
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  });
</script>


<!-- 🏁 HTML-->

<!-- 🏁 HEADER -->

<div class="main-wrapper">

  <header class="header">
    <link rel="stylesheet" href="https://use.typekit.net/kic0xlz.css">
    <div class="logo">
      {#if logoUrl}
        <img src={logoUrl} alt="Event Logo" on:error={() => console.error('❌ image failed to load:', logoUrl)} />
      {:else}
        LOGO
      {/if}
    </div>
    <div class="title-block">
      <h1>Mini-Golf Leaderboard</h1>
      <h2>{eventName}</h2>
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
  <div class="ad-box">
  <img src={adsUrl} alt="Ad">
  </div>
  <!-- 📲 QR Code -->
  <div class="qr-box">
    <div class="qr-title"><h2>Scan to Play!</h2></div>
      <img src={qrImageUrl} alt="QR Code" style="max-width: 100%; max-height: 100%;" />
    
  </div>
</div>

</div>

</div>
<div class="fullscreen-toggle {showFullscreenButton ? 'show' : ''}" on:click={toggleFullscreen}>
  <i class="fa-solid fa-expand"></i> Fullscreen
</div>



<div class="event-message" style="display:inline; font-size: 2rem; padding: 1.5rem; background: none !important;">
<h3 style="background: none !important;"> Mothers Day Gift for 1st Place at the start of every hour </h3>
</div>




<style>
:global(body) {
    background: #082c2c;
    color: white;
    font-family: 'obviously', sans-serif;
    margin: 0;
    padding: 0;
  }

  .main-wrapper {
    padding: 2rem;

  }

  /*-------- 🏁 Header ----------*/
  .header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .logo {
    width: 10rem;
    height: 10rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .title-block h1 {
    font-size: 3rem;
    margin: 0;
  }

  .title-block h2 {
    font-size: 2rem;
    color: #00c853;
    margin-top: 0.5rem;
  }

  /*------- 📊 Content --------*/
/* -------------------- 🧱 LAYOUT STRUCTURE -------------------- */

.content {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  align-items: flex-start;
}

.leaderboard-tables {
  display: flex;
  flex: 1;
  gap: 2rem;
}

/* -------------------- 📋 SCORE TABLES -------------------- */

.score-table {
  background: rgba(255, 255, 255, 0.1);
  color: black;
  border-radius: 18px;
  padding: 0.8rem;
  flex: 1;
  box-sizing: border-box;
  overflow: hidden;
}

/* -------------------- 🏷️ HEADER ROW -------------------- */

.score-table .header-row {
  padding: 1.2rem;
  margin-bottom: 1rem;
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  background: #00c853 !important;
}
.header-row .rank {
  text-align: left;
  font-size: 1.4rem;
  color: white;
}

.header-row .name {
  flex: 1;
  padding-left: 2rem;
  display: flex;
  align-items: center;
  font-size: 1.6rem !important;
  gap: 0.5rem;
  color: white;
}

.header-row .score-label {
  
  text-align: center;
  display: flex;
  gap: 0.8rem;
  align-items: center;
  font-size: 1.6rem !important;
  opacity: 1;
  color: white;
  margin-right: 4px;
}

/* -------------------- 🧑‍🤝‍🧑 PLAYER ROWS -------------------- */

.score-table .row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  background: white;
  color: #0f2f2e;
  border-radius: 12px;
  margin-bottom: 0.75rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  font-weight: bold;
  font-size: 1.1rem;
}

.score-table .row:nth-child(even) {
  background: rgba(255, 255, 255, 1);
}

.score-table .row:nth-child(odd) {
  background: rgba(255, 255, 255, 0.85);
}

/* -------------------- 🥇 COLUMN: RANK -------------------- */

.rank {
  font-size: 2rem;
  padding-left: 1rem;
  width: 2rem;
  color: #00c853;
  flex: 0 0 2.5rem;
}

/* -------------------- 🙋 COLUMN: NAME -------------------- */

.name {
  flex: 1;
  font-weight: 700;
  padding-left: 2rem;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: left;
}

/* Hole-in-one note */

.hio-note {
  font-size: 0.85rem;
  font-weight: 500;
  padding-left: 2rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.hio-note i {
  color: #e53935;
}

/* -------------------- 🟢 COLUMN: SCORE -------------------- */

.score-pill {
  background: #00c853;
  color: white;
  font-weight: bold;
  border-radius: 999px;
  padding: 0.4rem;
  margin-right: 20px;
  text-align: center;
  min-width: 40px;
  font-size: 1.8rem;
}


.logo img {
  max-width: 100%;
  max-height: 100%;
  display: block;
  object-fit: contain;
}


  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    width: 200px;
    flex-shrink: 0;
  }

  .ad-box img{
  border-radius: 12px;
  object-fit: cover;
  width: 100%;
  height: 100%;
  }
  .qr-box {
    background: white;
    color: black;
    border-radius: 12px;
    padding: 0.5rem;
    text-align: center;
    font-weight: bold;
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

.qr-box h2 {
margin-block-start: 0em !important;
margin-block-end: 0em !important;
}

.qr-box img {
object-fit: contain;
}

  /* 📱 iPad support */
  @media (max-width: 1024px) {
    .content {
      flex-direction: column;
      align-items: center;
    }

    .leaderboard-tables {
      flex-direction: column;
      width: 100%;
    }

    .sidebar {
      flex-direction: row;
      justify-content: center;
      width: 100%;
    }
  }

  .fullscreen-toggle {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 0.7rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  z-index: 9999;
}

:global(.fullscreen-toggle i) {
  margin-right: 0.5rem;
}

:global(body):has(.fullscreen-toggle:hover) .fullscreen-toggle,
:global(body):has(.fullscreen-toggle:focus) .fullscreen-toggle {
  opacity: 1 !important;
  pointer-events: auto;
}

.fullscreen-toggle.show {
  opacity: 1;
  pointer-events: auto;
}

</style>
