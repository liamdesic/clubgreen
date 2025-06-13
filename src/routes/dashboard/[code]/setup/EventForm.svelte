<script lang="ts">
  import { DatePicker } from '@svelte-plugins/datepicker';
  import { Calendar, Check } from 'lucide-svelte';
  import HoleSelector from '$lib/components/dashboard/HoleSelector.svelte';
  import type { Event as EventType, Organization } from '$lib/validations';
  import type { TimeFilter } from '$lib/validations/timeFilter';
  import { eventSource } from '$lib/stores/source/eventSource';
  import { showToast } from '$lib/stores/toastStore';
  import { getTimeRangeLabel } from '$lib/utils/timeFiltersUtils';
  import { createEventDispatcher } from 'svelte';
  import '$lib/styles/dashboard.css';
  import { timeFilterSchema, eventTimeFiltersSchema } from '$lib/validations/timeFilter';
  import { eventSchema } from '$lib/validations';
  import { nullableDateSchema } from '$lib/validations/dateSchemas';
  import { debounce } from '$lib/utils/generalUtils';
  import { onMount } from 'svelte';
  import ColorPalette from '$lib/components/dashboard/ColorPalette.svelte';

  export let event: EventType;
  export let organization: Organization;

  const dispatch = createEventDispatcher();

  // Test toast on mount
  onMount(() => {
    showToast('Event settings loaded', 'info');
  });

  let saving = false;
  let formData: Partial<EventType> = {
    title: event.title,
    hole_count: event.hole_count,
    accent_color: event.accent_color,
    ads_text: event.ads_text,
    ads_url: event.ads_url,
    show_on_main_leaderboard: event.show_on_main_leaderboard,
    time_filters: event.time_filters
  };
  let eventDate = event.event_date;
  let selectedTimeFilters = new Set(event.time_filters || []);
  let hasUnsavedChanges = false;

  // Track last saved state for comparison
  let lastSavedData = { ...formData, event_date: eventDate };

  // Debounced save function
  const debouncedSave = debounce(async (data: Partial<EventType> & { event_date: string | null }) => {
    if (saving) return;
    
    try {
      saving = true;
      const validatedData = eventSchema.partial().parse(data);
      await eventSource.updateEvent(event.id, validatedData);
      lastSavedData = { ...data };
      hasUnsavedChanges = false;
      showToast('Settings saved', 'success');
      dispatch('change');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast('Failed to save settings', 'error');
    } finally {
      saving = false;
    }
  }, 1000);

  // Watch for changes and trigger auto-save
  $: {
    const currentData = { ...formData, event_date: eventDate };
    if (JSON.stringify(currentData) !== JSON.stringify(lastSavedData)) {
      hasUnsavedChanges = true;
      debouncedSave(currentData);
    }
  }

  async function handleTimeFilterChange(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
    const target = e.currentTarget;
    const value = target.value as TimeFilter;
    
    // Create a new Set to trigger reactivity
    const newSelectedFilters = new Set(selectedTimeFilters);
    
    if (target.checked) {
      newSelectedFilters.add(value);
    } else {
      newSelectedFilters.delete(value);
    }

    // Update local state immediately for responsive UI
    selectedTimeFilters = newSelectedFilters;
    formData.time_filters = Array.from(newSelectedFilters);
    
    // The watcher will handle the save
  }

  function handleInputChange(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
    const target = e.currentTarget;
    const field = target.name;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    
    // Update local state immediately for responsive UI
    formData = { ...formData, [field]: value };
    
    // The watcher will handle the save
  }

  function handleEventNameChange(val: string) {
    formData.title = val;
    // The watcher will handle the save
  }

  function handleHoleCountChange(val: number) {
    formData.hole_count = val;
    // The watcher will handle the save
  }

  function handleAccentColorChange(val: string) {
    formData.accent_color = val;
    // The watcher will handle the save
  }

  function handleAdTextChange(val: string) {
    formData.ads_text = val;
    // The watcher will handle the save
  }

  function handleAdUrlChange(val: string) {
    formData.ads_url = val;
    // The watcher will handle the save
  }

  function handleShowOnMainLeaderboardChange(val: boolean) {
    formData.show_on_main_leaderboard = val;
    // The watcher will handle the save
  }

  function handleDateChange(date: Date | null) {
    eventDate = date ? date.toISOString() : null;
    // The watcher will handle the save
  }

  // Manual save function for explicit user action
  async function handleSubmit() {
    if (saving) return;
    
    try {
      saving = true;
      const currentData = { ...formData, event_date: eventDate };
      const validatedData = eventSchema.partial().parse(currentData);
      await eventSource.updateEvent(event.id, validatedData);
      lastSavedData = currentData;
      hasUnsavedChanges = false;
      showToast('Settings saved', 'success');
      dispatch('change');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast('Failed to save settings', 'error');
    } finally {
      saving = false;
    }
  }

  // Initialize date state
  let isDatePickerOpen = false;
  let selectedDate: Date | null = event.event_date ? new Date(event.event_date) : null;

  // Get available time filters from the schema
  const availableTimeFilters = timeFilterSchema.options;
</script>

<form on:submit|preventDefault={handleSubmit} class="add-event-form">
  <section class="live-section">
    <h3>Event Details</h3>
    
    <div class="form-group">
      <label for="event-name">Event Name</label>
      <input 
        id="event-name" 
        type="text" 
        bind:value={formData.title} 
        on:input={e => handleEventNameChange((e.target as HTMLInputElement).value)} 
        placeholder="Enter event name" 
      />
    </div>

    <div class="form-group">
      <label for="event-date">Event Date</label>
      {#if event.event_date === null}
        <div class="ongoing-course">
          <span>Round set to Ongoing Course</span>
        </div>
      {:else}
        <DatePicker 
          bind:isOpen={isDatePickerOpen}
          bind:startDate={selectedDate}
          theme="dark"
          enableFutureDates
        >
          <button 
            class="date-picker-button"
            on:click={() => isDatePickerOpen = true}
            type="button"
          >
            <div class="date-picker-content">
              <Calendar size={32} />
              <span>Change date</span>
            </div>
          </button>
        </DatePicker>
      {/if}
    </div>

    <div class="form-group">
      <label for="hole-count">Hole Count</label>
      <HoleSelector 
        id="hole-count" 
        value={formData.hole_count ?? 9} 
        on:change={e => handleHoleCountChange(e.detail.value)} 
      />
    </div>

    <div class="form-group">
      <label for="accent-color">Color for scorecard and leaderboard</label>
      <div class="color-picker">
        <ColorPalette 
          colors={Array.isArray(organization.color_palette) ? organization.color_palette : ['#00c853']}
          mode="select"
          selectedColor={formData.accent_color}
          on:select={(e) => handleAccentColorChange(e.detail.color)}
        />
      </div>
    </div>
  </section>

  <section class="live-section">
    <h3>Leaderboard Settings</h3>
    
    <div class="form-group">
      <label>Time Filters</label>
      <div class="event-grid">
        {#each availableTimeFilters as filter}
          <label class="checkbox-label">
            <input 
              type="checkbox"
              name="time_filters"
              value={filter}
              checked={selectedTimeFilters.has(filter)}
              on:change={handleTimeFilterChange}
              disabled={saving}
            />
            <span>{getTimeRangeLabel(filter)}</span>
          </label>
        {/each}
      </div>
    </div>

    <div class="form-group">
      <label class="checkbox-label">
        <input 
          type="checkbox"
          name="show_on_main_leaderboard"
          bind:checked={formData.show_on_main_leaderboard}
          on:change={handleInputChange}
          disabled={saving}
        />
        <span>Show on Main Leaderboard</span>
      </label>
    </div>
  </section>

  <section class="live-section">
    <h3>Advertisement Settings</h3>
    
    <div class="form-group">
      <label for="ad-text">Advertisement Text</label>
      <input 
        id="ad-text" 
        type="text" 
        bind:value={formData.ads_text}
        on:input={e => handleAdTextChange((e.target as HTMLInputElement).value)}
        placeholder="Enter advertisement text"
      />
    </div>

    <div class="form-group">
      <label for="ad-url">Advertisement URL</label>
      <input 
        id="ad-url" 
        type="text" 
        bind:value={formData.ads_url}
        on:input={e => handleAdUrlChange((e.target as HTMLInputElement).value)}
        placeholder="Enter advertisement URL"
      />
    </div>
  </section>

  <div class="form-actions">
    <button 
      type="submit" 
      class="save-button" 
      disabled={saving || !hasUnsavedChanges}
      class:has-unsaved-changes={hasUnsavedChanges}
    >
      {#if saving}
        <span class="saving">Saving...</span>
      {:else if !hasUnsavedChanges}
        <Check size={16} />
        <span>Saved</span>
      {:else}
        <span>Save Changes</span>
      {/if}
    </button>
  </div>
</form>

<style>
  .form-actions {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .save-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--card-bg);
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .save-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .save-button.has-unsaved-changes {
    background: var(--accent-color, #4CAF50);
    color: white;
    border-color: var(--accent-color, #4CAF50);
  }

  .save-button.has-unsaved-changes:hover {
    background: var(--accent-color-hover, #45a049);
  }

  .saving {
    opacity: 0.7;
  }

  .ongoing-course {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    color: white;
    font-family: 'Inter', sans-serif;
    backdrop-filter: blur(10px);
  }
</style> 