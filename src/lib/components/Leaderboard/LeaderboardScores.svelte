<script lang="ts">
  import type { Event } from '$lib/validations';
  import type { LeaderboardScore } from '$lib/validations/leaderboardView';
  import { fade } from 'svelte/transition';

  export let event: Event;
  export let leaderboard: LeaderboardScore[] = [];
</script>

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
      <div class="row" in:fade={{ duration: 300, delay: index * 50 }}>
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
          {#if player.holeInOnes && player.holeInOnes > 0}
            <div class="hio-note">
              <i class="fa-solid fa-fire"></i> <b>{player.holeInOnes}</b> hole-in-one{player.holeInOnes > 1 ? 's' : ''}
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
      <div class="row" in:fade={{ duration: 300, delay: (index + 5) * 50 }}>
        <div class="rank">{index + 6}</div>
        <div class="name">
          {player.name}
          {#if player.holeInOnes && player.holeInOnes > 0}
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

<style>
  .leaderboard-tables {
    display: flex;
    flex: 1;
    min-height: 0;
    width: 100%;
    gap: 2rem;
  }

  .score-table {
    background: rgba(255, 255, 255, 0.1);
    color: black;
    border-radius: 18px;
    padding: 0.8rem;
    flex: 1;
    box-sizing: border-box;
    overflow: hidden;
  }

  .score-table .header-row {
    padding: 1.2rem;
    margin-bottom: 1rem;
    border-top-left-radius: 18px;
    border-top-right-radius: 18px;
    background: var(--accent-color) !important;
  }

  .score-table .header-row .rank {
    text-align: left;
    font-size: 2.2rem;
    color: white;
  }

  .score-table .header-row .name {
    flex: 1;
    padding-left: 2rem;
    display: flex;
    align-items: center;
    font-size: 2.2rem !important;
    gap: 0.5rem;
    color: white;
  }

  .score-table .header-row .score-label {
    text-align: center;
    display: flex;
    gap: 1.2rem;
    align-items: center;
    font-size: 2.2rem !important;
    opacity: 1;
    color: white;
    margin-right: 8px;
  }

  .score-table .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.2rem;
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

  .rank {
    font-size: 2rem;
    padding-left: 1rem;
    width: 2rem;
    color: var(--accent-color);
    flex: 0 0 3rem;
  }

  .rank-badge {
    width: 32px;
    height: 32px;
  }

  .name {
    flex: 1;
    font-weight: 700;
    padding-left: 2rem;
    font-size: 2.6rem;
    display: flex;
    align-items: center;
    justify-content: left;
  }

  .hio-note {
    font-size: 1.2rem;
    color: #e53935;
    margin-left: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .score-pill {
    background: var(--accent-color);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 1.8rem;
    min-width: 4rem;
    text-align: center;
  }

  /* Responsive Styles */
  @media (max-width: 1024px) {
    .leaderboard-tables {
      flex-direction: column;
      width: 100%;
    }
  }
</style> 