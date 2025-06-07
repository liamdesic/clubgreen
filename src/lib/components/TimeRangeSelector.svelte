<!--
  TimeRangeSelector.svelte
  A reusable component for selecting a time range for leaderboard score filtering
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ScoreTimeRange } from '$lib/utils/timeFilters';
  import { getTimeRangeLabel } from '$lib/utils/timeFilters';
  
  // Props
  export let value: ScoreTimeRange = 'all_time';
  export let disabled: boolean = false;
  export let label: string = 'Score Time Range';
  export let helpText: string = 'Filter scores by when they were created';
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    change: { value: ScoreTimeRange }
  }>();
  
  // Available time ranges
  const timeRanges: ScoreTimeRange[] = [
    'all_time',
    'past_month',
    'past_week',
    'past_day',
    'past_hour',
    'on_the_hour'
  ];
  
  // Handle change
  function handleChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const newValue = select.value as ScoreTimeRange;
    value = newValue;
    dispatch('change', { value });
  }
</script>

<div class="form-group">
  <label for="time-range-selector">{label}</label>
  <select 
    id="time-range-selector"
    class="form-control"
    {disabled}
    value={value}
    on:change={handleChange}
  >
    {#each timeRanges as range}
      <option value={range}>{getTimeRangeLabel(range)}</option>
    {/each}
  </select>
  {#if helpText}
    <small class="form-text text-muted">{helpText}</small>
  {/if}
</div>

<style>
  .form-group {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .form-control {
    display: block;
    width: 100%;
    padding: 0.375rem 0.75rem;
    font-size: 1rem;
    line-height: 1.5;
    color: #495057;
    background-color: #fff;
    background-clip: padding-box;
    border: 1px solid #ced4da;
    border-radius: 0.25rem;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }
  
  .form-control:focus {
    color: #495057;
    background-color: #fff;
    border-color: #80bdff;
    outline: 0;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
  
  .form-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.875rem;
  }
  
  select.form-control {
    appearance: auto;
  }
</style>
