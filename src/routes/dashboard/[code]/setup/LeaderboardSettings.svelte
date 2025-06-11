<script lang="ts">
  import { getTimeRangeLabel } from '$lib/utils/timeFiltersUtils';
  import type { TimeFilter } from '$lib/validations/timeFilter';
  import { timeFilterSchema } from '$lib/validations/timeFilter';
  import '$lib/styles/EditEvent.css';

  export let showOnMainLeaderboard: boolean;
  export let onShowOnMainLeaderboardChange: (val: boolean) => void;
  export let timeFilters: TimeFilter[] = [];
  export let onTimeFiltersChange: (filters: TimeFilter[]) => void;

  const timeFilterOptions: TimeFilter[] = timeFilterSchema.options;

  function handleTimeFilterToggle(filter: TimeFilter, event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target) return;
    const checked = target.checked;
    const newFilters = checked
      ? [...timeFilters, filter]
      : timeFilters.filter(f => f !== filter);
    onTimeFiltersChange(newFilters);
  }

  function handleShowOnMainLeaderboardChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target) return;
    onShowOnMainLeaderboardChange(target.checked);
  }
</script>

<section class="form-block">
  <h3 class="form-block-title">Leaderboard Settings</h3>
  <div class="form-group">
    <label class="checkbox-container">
      <input type="checkbox" checked={showOnMainLeaderboard} on:change={handleShowOnMainLeaderboardChange} />
      <span class="checkmark"></span>
      Show this event on the main leaderboard on event day when scores are being submitted
    </label>
    <p class="helper-text">
      When enabled, this event will automatically appear on the organization's main leaderboard on the event day when scores are being submitted.
    </p>
  </div>

  <div class="form-group">
    <h4>Time Filters</h4>
    <p class="helper-text">Select which time filters to show in rotation</p>
    <div class="time-filter-options">
      {#each timeFilterOptions as filter}
        <label class="checkbox-container">
          <input 
            type="checkbox" 
            checked={timeFilters.includes(filter)} 
            on:change={e => handleTimeFilterToggle(filter, e)} 
          />
          <span class="checkmark"></span>
          {getTimeRangeLabel(filter)}
        </label>
      {/each}
    </div>
  </div>
</section> 