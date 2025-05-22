<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  export let visible = false;
  const dispatch = createEventDispatcher();
  let leaderboardData = [];
  let leaderboardSettings = null;
  let loading = false;

  async function fetchLeaderboardData() {
    loading = true;

    // Fetch settings
    const settingsRes = await supabase
      .from('leaderboard_settings')
      .select('*')
      .eq('published', true)
      .single();

    if (settingsRes.error) {
      console.error('❌ Error loading leaderboard settings:', settingsRes.error.message);
      loading = false;
      return;
    }

    leaderboardSettings = settingsRes.data;

    // Fetch all scores
    const { data, error } = await supabase
      .from('scorecard')
      .select('player_id, name, score, hole_number, hole_in_ones, created_at, published');

    if (error) {
      console.error('❌ Error loading leaderboard:', error.message);
      loading = false;
      return;
    }

    const playerMap = new Map();
    const now = new Date();
    let cutoff = null;

    if (leaderboardSettings.time_filter === 'last_hour') {
      cutoff = new Date(now.getTime() - 60 * 60000);
    } else if (leaderboardSettings.time_filter === 'last_2_hours') {
      cutoff = new Date(now.getTime() - 120 * 60000);
    } else if (leaderboardSettings.time_filter === 'custom') {
      const minutes = leaderboardSettings.time_window_minutes || 120;
      cutoff = new Date(now.getTime() - minutes * 60000);
    }

    for (const row of data) {
      if (!row.published) continue;
      const createdAt = new Date(row.created_at);
      if (cutoff && createdAt < cutoff) continue;

      const id = row.player_id;
      if (!id) continue;

      if (!playerMap.has(id)) {
        playerMap.set(id, {
          id,
          name: row.name,
          totalScore: 0,
          holeInOnes: 0
        });
      }

      const player = playerMap.get(id);
      player.totalScore += row.score;
      player.holeInOnes += row.hole_in_ones;
    }

    leaderboardData = Array.from(playerMap.values())
  .sort((a, b) => a.totalScore - b.totalScore)
  .slice(0, 10);

    loading = false;
  }

  $: if (visible) {
    fetchLeaderboardData();
  }
</script>

<!-- 🏆 Leaderboard Modal -->
<div class="leaderboard-modal" transition:fly={{ y: -20, duration: 300 }}>
  <div class="modal-header">
    <h2><i class="fa-solid fa-trophy" style="color: orange;"></i> Live Leaderboard</h2>
    <button on:click={() => dispatch('close')} class="close-btn">
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>

  {#if loading}
    <div class="loading">Loading leaderboard...</div>
  {:else}
  <div class="leaderboard-grid">
    <div class="grid-row grid-header">
      <div><i class="fa-solid fa-medal"></i></div>
      <div>Name</div>
      <div>
        <i class="fa-solid fa-fire" style="color: #e53935;"></i>
        <br>
        <span>Hole-in-One</span>
      </div>
      <div>
        <i class="fa-solid fa-golf-ball-tee"></i>
        <br>
        <span>Score</span>
      </div>
    </div>

    {#each leaderboardData as player, index}
      <div class="grid-row {index % 2 === 0 ? 'even' : 'odd'}">
        <div>{index + 1}</div>
        <div>
          {player.name}
          {#if index === 0} 🥇{/if}
          {#if index === 1} 🥈{/if}
          {#if index === 2} 🥉{/if}
        </div>
        <div class="hio-text">{player.holeInOnes}</div>
        <div class="score-pill">{player.totalScore}</div>
      </div>
    {/each}
  </div>
  {/if}
</div>

<style>
  .leaderboard-modal {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    color: #0f2f2e;
    padding: 1.5rem;
    border-radius: 0 0 20px 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    z-index: 30;
    width: 100%;
    max-width: 600px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #333;
    cursor: pointer;
  }

  .loading {
    text-align: center;
    font-weight: 600;
    padding: 1rem;
    font-size: 1.1rem;
  }

  .leaderboard-grid {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
  }

  .grid-row {
    display: grid;
    grid-template-columns: 0.5fr 2fr 1fr 1fr;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    text-align: center;
  }

  .grid-header {
    font-weight: bold;
    background: none;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #ccc;
  }

  .grid-row.even {
    background-color: #f9f9f9;
  }

  .grid-row.odd {
    background-color: #f1f1f1;
  }

  .score-pill {
    background: var(--accent-color, #00c853);
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-weight: 600;
    text-align: center;
    width: fit-content;
    margin-inline: auto;
  }

  .hio-text {
    color: #e53935;
    font-weight: bold;
  }

  @media (max-width: 500px) {
    .grid-row {
      grid-template-columns: 0.5fr 1.5fr 1fr 1fr;
      font-size: 0.9rem;
      padding: 0.5rem 0.75rem;
    }

    .modal-header h2 {
      font-size: 1.2rem;
    }

    .score-pill, .hio-text {
      font-size: 0.9rem;
    }
  }
</style>
