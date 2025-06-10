<script lang="ts">
  import { rotationStore } from '$lib/stores/view/RotationStore';
  import type { Board } from '$lib/stores/view/RotationStore';
  import type { Event } from '$lib/validations';
  import type { Organization } from '$lib/validations';
  import LeaderboardHeader from './LeaderboardHeader.svelte';
  import LeaderboardScores from './LeaderboardScores.svelte';
  import LeaderboardSidebar from './LeaderboardSidebar.svelte';
  import TransitionOverlay from './TransitionOverlay.svelte';
  import LeaderboardRotationStatus from './LeaderboardRotationStatus.svelte';

  export let organization: Organization;
  export let event: Event;
  export let loading = false;
  export let error: string | null = null;
</script>

<div class="leaderboard-layout">
  {#if loading}
    <div class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div class="spinner-label">Loading leaderboard...</div>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="error-overlay" role="alert" aria-live="assertive">
      <div class="error-message">
        <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
        <p id="error-text">{error}</p>
        <button 
          class="retry-button" 
          on:click={() => window.location.reload()}
          aria-label="Retry loading data"
        >
          Retry
        </button>
      </div>
    </div>
  {/if}

  <div class="main-wrapper">
    <LeaderboardHeader {organization} {event} />
    
    <div class="content">
      <LeaderboardScores {event} />
      <LeaderboardSidebar {event} {organization} />
    </div>

    <LeaderboardRotationStatus />
  </div>

  <TransitionOverlay />
</div>

<style>
  /* Root Variables */
  :global(:root) {
    --accent-color: #00c853; /* Default accent color - will be overridden by event settings */
    --accent-color-dark: #006622; /* Darker version of default */
  }

  /* Dynamic Accent Color */
  :global([style*="--accent-color"]) {
    --accent-h: 138;
    --accent-s: 10%;
    --accent-l: 119%;
    --accent-color-dark: color-mix(in srgb, var(--accent-color) 20%, #101010);
  }

  /* Global Body Styles */
  :global(body) {
    background: #082c2c;
    color: white;
    font-family: 'obviously', sans-serif;
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }

  /* Layout Styles */
  .leaderboard-layout {
    background: black;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 2rem;
    align-items: flex-start;
    width: 100%;
    height: 100vh;
    position: relative;
    overflow: hidden;
  }

  .main-wrapper {
    padding: 3rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; /* Allows content to scroll if needed */
    max-width: 100%;
    box-sizing: border-box;
  }

  .content {
    display: flex;
    gap: 1.5rem;
    flex: 1;
    min-height: 0;
    width: 100%;
    align-items: flex-start;
    box-sizing: border-box;
  }

  /* Loading & Error States */
  .loading-overlay,
  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    z-index: 1000;
  }

  .loading-spinner {
    text-align: center;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--accent-color);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner-label {
    margin-top: 1rem;
    color: white;
  }

  .error-message {
    background: var(--error-color);
    padding: 2rem;
    border-radius: 8px;
    text-align: center;
    max-width: 80%;
  }

  .retry-button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Responsive Styles */
  @media (max-width: 1024px) {
    .content {
      flex-direction: column;
      align-items: center;
    }
  }
</style> 