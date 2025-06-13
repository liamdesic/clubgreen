<script lang="ts">
  import type { Event, Organization } from '$lib/validations';
  import type { TimeFilter } from '$lib/validations/timeFilter';
  import { getTimeRangeLabel } from '$lib/utils/timeFiltersUtils';

  export let organization: Organization;
  export let event: Event;
  export let loading = false;
  export let timeFilter: TimeFilter = 'all_time';

  $: eventName = event?.name || '';
  $: courseName = event?.course_name || '';
  $: courseHoleCount = event?.hole_count || 18;
  $: organizationId = organization?.id;
  $: organizationSlug = organization?.slug;
  $: organizationName = organization?.name || '';
  $: accentColor = organization?.color_palette?.[0] || '#4CAF50';
</script>

<div class="event-header">
  <div class="header-content">
    {#if organization?.logo_url || event?.logo_url}
      <div class="logos-container">
        {#if organization?.logo_url}
          <div class="logo-container org-logo">
            <img 
              src={organization.logo_url} 
              alt="Organization Logo" 
              class="logo" 
              on:error={(e) => {
                const target = e.target as HTMLImageElement;
                if (target) target.style.display = 'none';
              }}
              loading="lazy"
            />
          </div>
        {/if}
        {#if event?.logo_url}
          <div class="logo-container event-logo">
            <img 
              src={event.logo_url} 
              alt="Event Logo" 
              class="logo" 
              on:error={(e) => {
                const target = e.target as HTMLImageElement;
                if (target) target.style.display = 'none';
              }}
              loading="lazy"
            />
          </div>
        {/if}
      </div>
    {/if}
    <div class="titles">
      <h1>Mini-Golf Leaderboard</h1>
      <h2 class="event-title">
        {eventName}
        {#if loading}
          <span class="loading-dots">...</span>
        {/if}
      </h2>
    </div>
  </div>
  
  <div class="time-filter">
    {#if loading}
      <span class="loading-dots">...</span>
    {:else}
      <span class="time-filter-pill" style="--accent-color: {event?.accent_color || '#4CAF50'}">
        <span class="pill-prefix">Scores from</span> <span class="pill-time-range">{getTimeRangeLabel(timeFilter)}</span>
      </span>
    {/if}
  </div>
</div>

<style>
  .event-header {
    padding: 2rem 2rem 1.5rem;
    margin-bottom: 2rem;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    max-width: 100%;
    margin: 0;
    width: 100%;
  }

  .logos-container {
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-right: 2.5rem;
  }

  .logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: auto;
  }

  .logo-container.org-logo {
    min-width: 200px;
    max-width: 350px;
  }

  .logo-container.event-logo {
    min-width: 200px;
    max-width: 350px;
  }

  .logo {
    display: block;
    height: auto;
    max-height: 400px;
    width: 100%;
    object-fit: contain;
    border-radius: 8px;
  }

  .titles {
    line-height: 1.2;
    text-align: left;
  }

  .titles h1 {
    margin: 0;
    font-size: 5rem;
    color: white;
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .event-title {
    margin: 0.5rem 0 0 0 !important;
    font-size: 4rem !important;
    color: var(--accent-color, #00c853) !important;
    font-weight: 600 !important;
    letter-spacing: -0.25px !important;
  }

  .loading-dots {
    animation: dots 1.5s infinite;
  }

  .time-filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: var(--accent-color);
    color: white;
    border-radius: 1rem;
    font-size: 0.875rem;
  }

  .pill-prefix {
    opacity: 0.8;
  }

  @keyframes dots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60%, 100% { content: '...'; }
  }

  /* Responsive Styles */
  @media (max-width: 900px) {
    .header-content {
      flex-direction: column;
      text-align: center;
    }

    .titles h1 {
      font-size: 2.2rem;
    }

    .event-title {
      font-size: 1.5rem !important;
    }
  }
</style> 