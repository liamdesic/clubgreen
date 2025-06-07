<script lang="ts">
  import { DatePicker } from '@svelte-plugins/datepicker';
  import { Calendar } from 'lucide-svelte';
  import HoleSelector from '$lib/components/HoleSelector.svelte';
  import type { Writable } from 'svelte/store';
  import type { Event } from '$lib/types/event';
  import type { ScoreTimeRange } from '$lib/utils/timeFilters';
  import '$lib/styles/EditEvent.css';

  export let eventName: string;
  export let onEventNameChange: (name: string) => void;
  export let eventDate: string;
  export let onEventDateChange: (date: string) => void;
  export let holeCount: number;
  export let onHoleCountChange: (count: number) => void;
  export let accentColor: string;
  export let colorPalette: string[];
  export let onAccentColorChange: (color: string) => void;
  export let isDatePickerOpen: boolean;
  export let setDatePickerOpen: (open: boolean) => void;

  let selectedDate: Date | null = eventDate ? new Date(eventDate) : null;
  $: if (selectedDate) onEventDateChange(selectedDate.toISOString().split('T')[0]);
</script>

<section class="form-block">
  <h2 class="form-block-title">Event Details</h2>
  <label for="event-name" class="form-label">Event Name</label>
  <input id="event-name" class="input" type="text" bind:value={eventName} on:input={e => onEventNameChange((e.target as HTMLInputElement).value)} placeholder="Enter event name" />

  <label for="event-date" class="form-label">Event Date</label>
  <DatePicker 
    bind:isOpen={isDatePickerOpen}
    bind:startDate={selectedDate}
    theme="dark"
    enableFutureDates
  >
    <button 
      class="date-picker-button"
      on:click={() => setDatePickerOpen(true)}
      type="button"
    >
      <div class="date-picker-content">
        <Calendar size={32} />
        <span>{eventDate ? new Date(eventDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Select date'}</span>
      </div>
    </button>
  </DatePicker>

  <label for="hole-count" class="form-label">Hole Count</label>
  <HoleSelector id="hole-count" bind:value={holeCount} on:change={e => onHoleCountChange(e.detail.value)} />

  <label for="accent-color" class="form-label">Accent Colour</label>
  <div class="color-picker">
    <div class="color-palette">
      {#each colorPalette as color}
        <button 
          type="button" 
          class="color-swatch {accentColor === color ? 'selected' : ''}" 
          style="background: {color};"
          on:click={() => onAccentColorChange(color)}
          aria-label="Select color {color}"
          title="Click to select this color"
        ></button>
      {/each}
    </div>
  </div>
</section> 