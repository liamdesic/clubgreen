<!-- src/lib/components/Leaderboard/RotationStatus.svelte -->
<script lang="ts">
  import { rotationStore } from '$lib/stores/view/RotationStore';
  import { getTimeRangeLabel } from '$lib/utils/timeFiltersUtils';
  import { fade } from 'svelte/transition';
  import type { LeaderboardBoard } from '$lib/validations/leaderboardView';

  // Subscribe to rotation store for current board and progress
  $: ({ currentBoard, boards, progress } = $rotationStore);
  $: timeRemaining = $rotationStore.timeRemaining;
</script>

<div class="rotation-status">
  <div class="boards">
    {#each boards as board, i}
      <div 
        class="board-indicator" 
        class:active={currentBoard?.eventId === board.eventId && currentBoard?.timeFilter === board.timeFilter}
      >
        <span class="event">{board.eventId}</span>
        <span class="filter">{getTimeRangeLabel(board.timeFilter)}</span>
      </div>
    {/each}
  </div>

  {#if currentBoard}
    <div class="countdown" transition:fade>
      <div class="progress-bar" style="width: {progress}%"></div>
      <span class="time">{Math.ceil(timeRemaining / 1000)}s</span>
    </div>
  {/if}
</div>

<style>
  .rotation-status {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    z-index: 100;
  }

  .boards {
    display: flex;
    gap: 0.5rem;
  }

  .board-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.1);
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.2s ease;
  }

  .board-indicator.active {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .event {
    font-weight: 500;
  }

  .filter {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .countdown {
    width: 100%;
    height: 2px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 1px;
    position: relative;
  }

  .progress-bar {
    height: 100%;
    background: white;
    border-radius: 1px;
    transition: width 1s linear;
  }

  .time {
    position: absolute;
    right: 0;
    top: -1.5rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
  }
</style> 