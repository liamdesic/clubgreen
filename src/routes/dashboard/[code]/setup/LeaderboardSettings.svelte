<script lang="ts">
  import TimeRangeSelector from '$lib/components/TimeRangeSelector.svelte';
  import '$lib/styles/EditEvent.css';

  export let showOnMainLeaderboard: boolean;
  export let onShowOnMainLeaderboardChange: (val: boolean) => void;
  export let scoreTimeRange: string;
  export let onScoreTimeRangeChange: (val: string) => void;
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
      label="Leaderboard Time Filter"
      helpText="Filter scores on the leaderboard by when they were submitted"
      on:change={e => onScoreTimeRangeChange(e.detail.value)}
    />
  </div>
</section> 