<script lang="ts">
  import TimeRangeSelector from '$lib/components/TimeRangeSelector.svelte';
  import { getTimeRangeLabel } from '$lib/utils/timeFilters';
  import type { ScoreTimeRange } from '$lib/utils/timeFilters';
  import '$lib/styles/EditEvent.css';

  export let showOnMainLeaderboard: boolean;
  export let onShowOnMainLeaderboardChange: (val: boolean) => void;
  export let scoreTimeRange: ScoreTimeRange;
  export let onScoreTimeRangeChange: (val: ScoreTimeRange) => void;
  export let additionalTimeFilters: ScoreTimeRange[] = [];
  export let onAdditionalTimeFiltersChange: (filters: ScoreTimeRange[]) => void;

  const timeFilterOptions: ScoreTimeRange[] = ['all_time', 'past_hour', 'past_day', 'past_week', 'past_month', 'on_the_hour'];

  function handleTimeFilterToggle(filter: ScoreTimeRange, event: Event) {
    const checked = (event.target as HTMLInputElement)?.checked ?? false;
    const newFilters = checked
      ? [...additionalTimeFilters, filter]
      : additionalTimeFilters.filter(f => f !== filter);
    onAdditionalTimeFiltersChange(newFilters);
  }
</script>

<section class="form-block">
  <h3 class="form-block-title">Leaderboard Settings</h3>
  <div class="form-group">
    <label class="checkbox-container">
      <input type="checkbox" bind:checked={showOnMainLeaderboard} on:change={e => onShowOnMainLeaderboardChange(e.target.checked)} />
      <span class="checkmark"></span>
      Show this event on the main leaderboard on event day when scores are being submitted
    </label>
    <p class="helper-text">
      When enabled, this event will automatically appear on the organization's main leaderboard on the event day when scores are being submitted.
    </p>
  </div>
  <div class="form-group">
    <TimeRangeSelector 
      value={scoreTimeRange}
      label="Primary Time Filter"
      helpText="The default time filter for this event's leaderboard"
      on:change={e => onScoreTimeRangeChange(e.detail.value)}
    />
  </div>

  <div class="form-group">
    <h4>Additional Time Filters</h4>
    <p class="helper-text">Select which time filters to show in rotation</p>
    <div class="time-filter-options">
      {#each timeFilterOptions.filter(f => f !== scoreTimeRange) as filter}
        <label class="checkbox-container">
          <input 
            type="checkbox" 
            checked={additionalTimeFilters.includes(filter)} 
            on:change={e => handleTimeFilterToggle(filter, e)} 
          />
          <span class="checkmark"></span>
          {getTimeRangeLabel(filter)}
        </label>
      {/each}
    </div>
  </div>
</section> 