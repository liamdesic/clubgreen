<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { browser } from '$app/environment';

  // Props
  export let events: any[] = [];
  export let currentEventId: string;
  export let timeRemaining: number;
  export let rotationInterval: number;
  export let accentColor: string = '#4CAF50';
  
  // Constants that can be used internally but aren't needed as reactive props
  export const currentEventIndex: number = 0;
  export const totalEvents: number = 0;

  // For the circular timer
  $: progress = (typeof timeRemaining === 'number' ? timeRemaining : parseInt(timeRemaining)) / (rotationInterval / 1000);
  $: radius = 30; // New smaller radius
  $: circumference = 2 * Math.PI * radius;
  $: strokeDashoffset = circumference * (1 - progress);
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
            {event.title}
          </div>
        </div>
      {/each}
    </div>
    <div class="timer-container">
      <svg class="progress-ring" width="70" height="70">
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
          stroke-dasharray={circumference}
          stroke-dashoffset={strokeDashoffset}
          style="transition: stroke-dashoffset 0.5s;"
        />
      </svg>
      <span class="timer-text">{timeRemaining}</span>
    </div>
    
    <!-- Time range pill removed as requested -->
  </div>
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
  justify-content: flex-end;
  flex-shrink: 0;
}
.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
  transform: rotate(-90deg);
}
.progress-ring-bg {
  opacity: 0.25;
}
.progress-ring-fg {
  transition: stroke-dashoffset 1s ease-in-out;
}
.timer-text {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.8rem;
  color: #6fa088;
  font-weight: 500;
  letter-spacing: 0.05em;
  user-select: none;
}
/* Removed unused time-range and time-filter-pill CSS */
/* Removed unused CSS selector */
@media (max-width: 900px) {
  .rotation-status-inner { padding: 0.3rem 1.5rem 0.3rem 1.2rem; gap: 1.5rem; }
  .board-item { font-size: 1rem; padding: 0.4rem 1rem; }
  .board-item.active { font-weight: 700; }
  .timer-container, .progress-ring { width: 40px; height: 40px; }
  .timer-text { font-size: 0.9rem; }
  .progress-ring-bg, .progress-ring-fg { stroke-width: 6; r: 17; cx: 20; cy: 20; }
  .progress-ring { transform: rotate(-90deg); }
}
</style> 