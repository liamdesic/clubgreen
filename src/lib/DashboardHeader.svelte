<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import '$lib/styles/theme.css';
  import '$lib/styles/dashboard.css';
  import ChevronRight from 'lucide-svelte/icons/chevron-right';
  import { getTimeRangeLabel } from '$lib/utils/timeFilters';
  import type { ScoreTimeRange } from '$lib/utils/timeFilters';
  
  export let organizationName: string = '';
  export let eventTitle: string = '';
  export let timeRange: ScoreTimeRange = 'all_time';
  export let accentColor: string = '#4CAF50';
  
  function goToDashboard() {
    goto('/dashboard');
  }
  
  $: showTimeRange = timeRange && timeRange !== 'all_time';
  $: timeRangeLabel = getTimeRangeLabel(timeRange);
</script>

<header class="dashboard-header">
  <button 
    type="button" 
    class="logo-button" 
    on:click={goToDashboard}
    on:keydown={e => e.key === 'Enter' && goToDashboard()}
    aria-label="Go to dashboard"
  >
  <img src="/logos/ldrb-logo-colourlight.svg" alt="ldrboard logo" class="dashboard-logo" />
  </button>
  
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol>
      <li>
        <a href="/dashboard" class="breadcrumb-item">
          <span>{organizationName}'s Dashboard</span>
        </a>
      </li>
      {#if eventTitle}
        <li>
          <ChevronRight size={16} class="breadcrumb-separator" aria-hidden="true" />
          <span class="breadcrumb-item current" aria-current="page">
            {eventTitle}
            {#if showTimeRange}
              <span class="time-range-pill" style="--accent-color: {accentColor}">
                Scores from {timeRangeLabel}
              </span>
            {/if}
          </span>
        </li>
      {/if}
    </ol>
  </nav>
</header>

<style>
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: var(--gradient-dark);
    background-attachment: fixed;
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 100%;
    position: relative;
    z-index: 10;
    margin: 0;
  }
  
  .dashboard-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--gradient-dark);
    z-index: -1;
  }
  
  .logo-button {
    background: none;
    border: none;
    padding: 0.5rem;
    margin: -0.5rem;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .logo-button:hover,
  .logo-button:focus {
    background-color: rgba(255, 255, 255, 0.1);
    outline: none;
  }
  
  .dashboard-logo {
    height: 32px;
    width: auto;
    display: block;
  }
  
  .breadcrumb ol {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.9rem;
  }
  
  .breadcrumb li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  

  
  .breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #9ca3af;
    text-decoration: none;
    transition: color 0.2s;
    white-space: nowrap;
  }
  
  .breadcrumb-item:hover,
  .breadcrumb-item:focus {
    color: #e5e7eb;
    outline: none;
  }
  
  .breadcrumb-item.current {
    color: #ffffff;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .time-range-pill {
    background: white;
    color: var(--accent-color, #4CAF50);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    white-space: nowrap;
  }
</style>
