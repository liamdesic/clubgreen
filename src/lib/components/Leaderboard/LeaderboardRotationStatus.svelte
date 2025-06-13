<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { browser } from '$app/environment';
  import { boardRuntime, runtimeStatus } from '$lib/runtime';

  import { getTimeRangeLabel } from '$lib/utils/timeFiltersUtils';
  import type { ScoreTimeRange } from '$lib/utils/timeFilterUtils';
  import type { Event } from '$lib/validations';
  import type { BoardRuntimeStatus } from '$lib/runtime';
  import type { TimeFilter } from '$lib/validations/timeFilter';

  // Props
  export let events: Event[] = [];
  export let currentEventId: string;
  export let currentTimeFilter: TimeFilter;
  export let timeRemaining: number | null = null;
  export let rotationInterval: number;
  export let accentColor: string = '#4CAF50';
  
  // Constants that can be used internally but aren't needed as reactive props
  export const currentEventIndex: number = 0;
  export const totalEvents: number = 0;

  let status: BoardRuntimeStatus = {
    activeBoardId: null,
    timeUntilRotation: 0,
    isRotating: false,
    lastUpdated: null,
    boardCount: 0
  };

  let clientTimeRemaining = 0;
  let clientTimer: ReturnType<typeof setInterval> | null = null;

  // Standard SVG progress ring setup
  const radius = 30;
  const circumference = 2 * Math.PI * radius; // ~188.5
  
  // Progress: 0 = empty ring, 1 = full ring
  // For countdown: start at 1 (full) and go to 0 (empty)
  $: progress = status.isRotating && rotationInterval 
    ? Math.max(0, Math.min(1, clientTimeRemaining / rotationInterval))
    : 0;
    
  // Standard stroke-dashoffset: circumference - (progress * circumference)
  // When progress = 1: offset = 0 (full ring visible)
  // When progress = 0: offset = circumference (no ring visible)
  $: strokeDashoffset = circumference - (progress * circumference);
  

  onMount(() => {
    const unsubscribe = runtimeStatus.subscribe(value => {
      status = value;
      // Sync client countdown when runtime status updates
      if (value.timeUntilRotation !== null && value.timeUntilRotation > 0) {
        const newTimeRemaining = Math.max(0, Math.ceil(value.timeUntilRotation / 1000));
        clientTimeRemaining = newTimeRemaining;
      }
    });

    // Simple countdown timer - decrements every second
    clientTimer = setInterval(() => {
      if (status.isRotating && clientTimeRemaining > 0) {
        clientTimeRemaining = Math.max(0, clientTimeRemaining - 1);
      }
    }, 1000);

    return () => {
      unsubscribe();
      if (clientTimer) {
        clearInterval(clientTimer);
      }
    };
  });
</script>

<div class="rotation-status-outer">
  <div class="rotation-status-inner">
    <div class="boards-list">
      {#each events as event, i}
        <div class="board-item-wrapper">
          <div class="board-item" 
               class:active={event.id === currentEventId}
               style="{event.id === currentEventId ? `background:${accentColor}; color: white;` : 'color: rgba(255, 255, 255, 0.8);'}"
          >
            {event.title || 'Untitled Event'}
          </div>
          {#if event.id === currentEventId}
            <div class="time-filter-pill" style="background: {accentColor}">
              {getTimeRangeLabel(currentTimeFilter)}
            </div>
          {/if}
        </div>
      {/each}
    </div>
    <div class="timer-container">
      <svg class="progress-ring" width="70" height="70" viewBox="0 0 70 70">
        <circle
          class="progress-ring-bg"
          stroke="rgba(255,255,255,0.08)"
          stroke-width="10"
          fill="transparent"
          r={radius}
          cx="35"
          cy="35"
        />
        <circle
          class="progress-ring-fg"
          stroke={accentColor}
          stroke-width="10"
          fill="transparent"
          r={radius}
          cx="35"
          cy="35"
          stroke-dasharray="{circumference} {circumference}"
          stroke-dashoffset={strokeDashoffset}
        />
      </svg>
      <span class="timer-text" style="color: {accentColor}">{clientTimeRemaining}</span>
    </div>
  </div>
</div>

<div class="rotation-status">
  {#if status.isRotating}
    <div class="countdown" transition:fade>
      <div class="progress-bar" style="width: {(status.timeUntilRotation / 10000) * 100}%"></div>
      <span class="time">{clientTimeRemaining}</span>
    </div>
  {/if}
</div>

<style>
.rotation-status-outer {
  position: fixed;
  bottom: 2.5rem;
  right: 2.5rem;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  font-family: 'Inter', sans-serif;
}
.rotation-status-inner {
  display: flex;
  align-items: center;
  background: rgba(20,40,30,0.3);
  border-radius: 8rem;
  box-shadow: 0 2px 24px 0 rgba(0,0,0,0.18);
  padding: 0.5rem 1rem 0.5rem 1.3rem;
  gap: 1.5rem;
  border: 2px solid rgba(255,255,255,0.08);
}
.boards-list {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  position: relative;
}
.board-item-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.board-item {
  position: relative;
  z-index: 1;
  font-size: 1.5rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  padding: 0.5rem 1.5rem;
  border-radius: 2rem;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.board-item.active {
  font-weight: 700;
  background: #4CAF50;
  color: white;
}
.timer-container {
  position: relative;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.progress-ring {
  transform: rotate(-90deg);
  transform-origin: center;
}
.progress-ring-bg {
  opacity: 0.25;
}
.progress-ring-fg {
  transition: stroke-dashoffset 0.3s ease-out;
}
.timer-text {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.8rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  user-select: none;
  z-index: 2;
}
.time-filter-pill {
  position: absolute;
  top: -1rem;
  right: 0.5rem;
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 1rem;
  color: white;
  font-weight: 500;
  white-space: nowrap;
  z-index: 2;
}
@media (max-width: 900px) {
  .rotation-status-inner { padding: 0.3rem 1.5rem 0.3rem 1.2rem; gap: 1.5rem; }
  .board-item { font-size: 1rem; padding: 0.4rem 1rem; }
  .board-item.active { font-weight: 700; }
  .timer-container, .progress-ring { width: 40px; height: 40px; }
  .timer-text { font-size: 0.9rem; }
  .progress-ring-bg, .progress-ring-fg { stroke-width: 6; r: 17; cx: 20; cy: 20; }
  .progress-ring { transform: rotate(-90deg); }
}

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