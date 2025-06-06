<script lang="ts">
  import { Link, Calendar, Pencil, QrCode, User, CloudUpload } from 'lucide-svelte';
  import type { Database } from '$lib/database.types';
  import { createEventDispatcher } from 'svelte';
  import Tippy from 'tippy.js';
  import '$lib/styles/tippy.css';
  import { getEventStatus } from '$lib/utils/eventStatus';

  type Event = Database['public']['Tables']['events']['Row'] & {
    settings_json?: {
      accent_color?: string;
      score_time_range?: string;
      hole_count?: number;
      show_hole_in_ones?: boolean;
      show_ads?: boolean;
      ad_image_url?: string;
      ad_link?: string;
      show_leaderboard?: boolean;
      show_scorecard?: boolean;
      show_leaderboard_ads?: boolean;
      ads_image_url?: string;
    } | null;
  };

  // Props
  export let organizationSlug: string;
  export let orgLeaderboardCodes: { code: string }[] = [];
  export let events: Event[] = [];
  export let scoreCounts: Record<string, number> = {};

  const dispatch = createEventDispatcher();

  // Placeholder for transition time value
  let transitionTime = '10s'; // Default value

  const transitionOptions = [
    { value: '5s', label: '5 seconds' },
    { value: '10s', label: '10 seconds' },
    { value: '15s', label: '15 seconds' },
    { value: '30s', label: '30 seconds' },
    { value: '60s', label: '1 minute' }
  ];

  // Construct the example URL
  $: leaderboardUrl = organizationSlug && orgLeaderboardCodes?.length > 0 
    ? `https://www.ldrboard.co/${organizationSlug}/ob/${orgLeaderboardCodes[0].code}` 
    : '';

  // Check if any events are live
  $: hasLiveEvents = events.some(event => {
    const status = getEventStatus(event, scoreCounts[event.id] || 0);
    return status.isLive;
  });

  // Initialize Tippy tooltip
  let statusElement: HTMLElement;
  $: if (statusElement) {
    Tippy(statusElement, {
      content: !hasLiveEvents ? 
        "To make an event go live:<br>1. Create an event<br>2. Add players and scores<br>3. The event will automatically appear in the main leaderboard when it has scores" : 
        undefined,
      allowHTML: true,
      placement: 'top',
      theme: 'glass',
      arrow: true
    });
  }

  async function copyUrl() {
    if (leaderboardUrl) {
      try {
        await navigator.clipboard.writeText(leaderboardUrl);
        alert('URL copied to clipboard!'); // Simple feedback
      } catch (err) {
        console.error('Failed to copy URL: ', err);
        alert('Failed to copy URL.');
      }
    }
  }
</script>

<div class="main-leaderboard-card">
  <div class="card-header">
    <div class="event-status {!hasLiveEvents ? 'waiting' : ''}" bind:this={statusElement}>
      <div class="status-dot {hasLiveEvents ? 'flashing' : ''}"></div>
      {hasLiveEvents ? 'Live' : 'Waiting for live leaderboards'}
    </div>
    <h3 class="card-title">Main Leaderboard</h3>
  </div>

  <div class="card-section">
    <label for="leaderboard-url">URL</label>
    <div class="url-input-container">
      <input
        id="leaderboard-url"
        type="text"
        value={leaderboardUrl}
        readonly
        aria-label="Main Leaderboard URL"
      />
      <button class="copy-button" aria-label="Copy URL" on:click={copyUrl}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-copy"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
        </svg>
      </button>
    </div>
  </div>

  <div class="card-section">
    <label for="transition-time">Interval Time</label>
    <p class="setting-description">How long to display each leaderboard before rotating to the next one</p>
    <select id="transition-time" bind:value={transitionTime}>
      {#each transitionOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>
</div>

<style>
  .main-leaderboard-card {
    background-color: #181828;
    border-radius: 1.5rem;
    padding: 1.5rem;
    color: #fff;
    font-family: 'Inter', sans-serif;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 300px;
    max-width: 350px;
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .card-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .event-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #ff4444;
    font-family: 'Inter', sans-serif;
    cursor: help;
  }

  .event-status.waiting {
    color: #fff;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ff4444;
    display: inline-block;
    animation: pulse 2s infinite;
  }

  .event-status.waiting .status-dot {
    background-color: #9c27b0;
    animation: none;
  }

  .status-dot.flashing {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
    }
    
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 6px rgba(255, 68, 68, 0);
    }
    
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(255, 68, 68, 0);
    }
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: flex-start;
    color: #fff;
    font-family: 'Obviously', sans-serif;
    text-align: left;
    justify-content: center;
    width: 100%;
    letter-spacing: 0.5px;
  }

  .card-section {
    display: flex;
    flex-direction: column;
  }

  .card-section label {
    font-size: 0.9rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 0.5rem;
  }

  .setting-description {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 0.5rem 0;
  }

  .url-input-container {
    display: flex;
    background-color: rgba(255, 255, 255, 0.08);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .url-input-container input[type="text"] {
    flex-grow: 1;
    background: none;
    border: none;
    padding: 0.75rem 1rem;
    color: #fff;
    font-size: 1rem;
    font-family: 'Inter', sans-serif;
    outline: none;
  }

  .copy-button {
    background: none;
    border: none;
    padding: 0.75rem 1rem;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease-in-out;
  }

  .copy-button:hover {
    color: #fff;
  }

  select {
    width: 100%;
    padding: 0.75rem 1rem;
    background-color: rgba(255, 255, 255, 0.08);
    border: none;
    border-radius: 0.5rem;
    color: #fff;
    font-size: 1rem;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    outline: none;
  }

  select option {
    background-color: #181828;
    color: #fff;
  }
</style> 