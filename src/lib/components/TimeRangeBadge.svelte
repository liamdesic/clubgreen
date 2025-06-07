<!--
  TimeRangeBadge.svelte
  A simple badge component to display the current time range filter
-->
<script lang="ts">
  import type { ScoreTimeRange } from '$lib/utils/timeFilters';
  import { getTimeRangeLabel } from '$lib/utils/timeFilters';
  
  // Props
  export let timeRange: ScoreTimeRange = 'all_time';
  export let showLabel: boolean = true;
  export let compact: boolean = false;
</script>

<div class="time-range-badge {compact ? 'compact' : ''}">
  {#if showLabel}
    <span class="label">Time Filter:</span>
  {/if}
  <span class="value">{getTimeRangeLabel(timeRange)}</span>
</div>

<style>
  .time-range-badge {
    display: inline-flex;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.8);
    border-radius: 1rem;
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .time-range-badge.compact {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    background-color: rgba(0, 0, 0, 0.6);
  }
  
  .label {
    margin-right: 0.375rem;
    font-weight: 500;
    opacity: 0.8;
  }
  
  .value {
    font-weight: 600;
    letter-spacing: 0.01em;
  }
</style>
