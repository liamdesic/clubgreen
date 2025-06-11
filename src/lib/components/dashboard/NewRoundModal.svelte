<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  // Import necessary icons from lucide-svelte/icons
  import { X, HelpCircle, Calendar } from 'lucide-svelte/icons'; // Corrected import
  import tippy from 'tippy.js'; // Import Tippy
  import '$lib/styles/tippy.css'; // Custom Tippy CSS
  import { eventSource } from '$lib/stores/source/eventSource';
  import { showToast } from '$lib/stores/toastStore';
  import { goto } from '$app/navigation';
  import { generateUniqueShortCode, generateUniqueAccessUUID } from '$lib/utils/codeUtils';
  import { DatePicker } from '@svelte-plugins/datepicker';
  import { format } from 'date-fns';
  import HoleSelector from './HoleSelector.svelte';
  import type { Event, Organization } from '$lib/validations';
  import { eventSchema } from '$lib/validations';
  import type { TimeFilter } from '$lib/validations/timeFilter';

  // Props
  export let showModal = false;
  export let organization: Organization | null = null;

  // State
  let selectedType: 'ongoing' | 'single' | null = null;
  let newTitle = '';
  let newDate = new Date();
  let holeCount = 9;
  let creating = false;
  let createError = '';
  let isDatePickerOpen = false;
  let dateFormat = 'dd/MM/yyyy';
  let displayFormat = 'd MMMM yyyy';

  const formatDate = (dateString: string | Date) => {
    if (isNaN(new Date(dateString).getTime())) {
      return '';
    }
    return dateString && format(new Date(dateString), dateFormat) || '';
  };

  const formatDisplayDate = (dateString: string | Date) => {
    if (isNaN(new Date(dateString).getTime())) {
      return '';
    }
    return dateString && format(new Date(dateString), displayFormat) || '';
  };

  let formattedDate = formatDate(newDate);
  let displayDate = formatDisplayDate(newDate);

  const onChange = () => {
    newDate = new Date(formattedDate);
  };

  $: formattedDate = formatDate(newDate);
  $: displayDate = formatDisplayDate(newDate);

  const dispatch = createEventDispatcher();

  function closeModal() {
    showModal = false;
    selectedType = null;
    newTitle = '';
    newDate = new Date();
    holeCount = 9;
    createError = '';
    dispatch('close');
  }

  function selectType(type: 'ongoing' | 'single') {
    selectedType = type;
  }

  // Optional: Close modal on escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }

  // --- EVENT CREATION ---
  async function createEvent() {
    const startTime = Date.now();
    console.log('🚀 [createEvent] Starting event creation...');
    createError = '';
    creating = true;

    const logStep = (step: string) => {
      const timeElapsed = Date.now() - startTime;
      console.log(`⏱️ [createEvent][${timeElapsed}ms] ${step}`);
    };

    try {
      // Validate organization
      if (!organization || !organization.id) {
        const errorMsg = 'No organization found. Please refresh the page.';
        console.error('❌ [createEvent] Validation error:', errorMsg);
        createError = errorMsg;
        creating = false;
        return;
      }

      // Validate event title
      if (!newTitle.trim()) {
        const errorMsg = 'Please enter a title';
        console.error('❌ [createEvent] Validation error:', errorMsg);
        createError = errorMsg;
        creating = false;
        return;
      }
      
      if (selectedType === 'single' && !newDate) {
        const errorMsg = 'Please select a date for the event';
        console.error('❌ [createEvent] Validation error:', errorMsg);
        createError = errorMsg;
        creating = false;
        return;
      }

      // Generate short code and access UUID
      const [short_code, access_uuid] = await Promise.all([
        generateUniqueShortCode(),
        generateUniqueAccessUUID()
      ]);
      
      logStep('Generated short_code and access_uuid');
      console.log('Generated codes:', { short_code, access_uuid });
      
      // Prepare event data according to schema
      const eventData = {
        title: newTitle,
        event_date: selectedType === 'single' ? newDate.toISOString() : null,
        organization_id: organization.id,
        hole_count: holeCount,
        created_at: null, // Let Supabase handle the created_at timestamp
        published: true,
        short_code,
        access_uuid,
        logo_url: null,
        ads_image_url: null,
        accent_color: null,
        show_on_main_leaderboard: true,
        archived: false,
        ads_text: null,
        ads_url: null,
        time_filters: ['all_time'] as TimeFilter[],
        settings_json: {}
      };

      // Validate the event data
      const validationResult = eventSchema.safeParse(eventData);
      if (!validationResult.success) {
        console.error('❌ [createEvent] Validation error:', validationResult.error);
        createError = 'Invalid event data. Please try again.';
        creating = false;
        return;
      }

      logStep('Event data validated successfully');

      // Use eventSource to create the event
      try {
        await eventSource.addEvent(eventData);
        logStep('Event created successfully');
        showToast(`Event "${newTitle}" created successfully!`, 'success');
        
        // Reset form and close modal
        closeModal();
        
        // Dispatch event created
        dispatch('eventCreated', { event: eventData });
      } catch (error: any) {
        console.error('❌ [createEvent] Error from eventSource.addEvent:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error; // Re-throw to be caught by outer try-catch
      }
      
    } catch (error: any) {
      console.error('🔥 [createEvent] Unexpected error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      createError = error.message || 'An unexpected error occurred. Please try again.';
      showToast(createError, 'error');
    } finally {
      creating = false;
    }
  }

  // Initialize tooltips on mount
  onMount(() => {
    // Initialize tooltip for Ongoing Course
    tippy('#ongoing-tooltip', {
      content: 'Use this if your venue has a permanent setup.<br/><br/>For example: If your course has 18 holes but customers often book only 9, create a separate course round for each 9-hole option. This keeps scoring clean and accurate for each play session.', // Ongoing Course Tooltip
      allowHTML: true, // Allow HTML for line breaks
      animation: 'fade',
      theme: 'glass',
      placement: 'bottom', // Adjust placement as needed
    });

    // Initialize tooltip for Single Event
    tippy('#single-event-tooltip', {
      content: 'Choose this for private bookings, one-off parties, weddings, or tournaments.<br/><br/>Ideal when the round is for a specific group and not part of regular daily play.', // Single Event Tooltip
      allowHTML: true, // Allow HTML for line breaks
      animation: 'fade',
      theme: 'glass',
      placement: 'bottom', // Adjust placement as needed
    });
  });
</script>

{#if showModal}
  <div class="modal-overlay" 
       on:click|self={closeModal}
       on:keydown={handleKeydown}
       role="presentation">
    <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h3 id="modal-title">
          {#if !selectedType}
            What type of round?
          {:else if selectedType === 'ongoing'}
            Create Ongoing Course
          {:else}
            Create Single Event
          {/if}
        </h3>
        <button class="close-button" on:click={closeModal} aria-label="Close modal">
          <X size="24" />
        </button>
      </div>

      {#if !selectedType}
        <div class="type-selection-grid">
          <!-- Ongoing Course Card -->
          <div 
            class="type-card {selectedType === 'ongoing' ? 'selected' : ''}" 
            on:click={() => selectType('ongoing')}
            role="button"
            tabindex="0"
            on:keydown={e => (e.key === 'Enter' || e.key === ' ') && selectType('ongoing')}
          >
            <div class="card-image-wrapper">
              <img src="/skeleton/CoursePre.png" alt="Ongoing Course Illustration" class="card-image pre" />
              <img src="/skeleton/CoursePost.png" alt="Ongoing Course Illustration Selected" class="card-image post" />
            </div>
            <div class="card-content">
              <h4>Ongoing Course</h4>
              <p>Track daily scores on your permanent course. Ideal for venues with continuous play.</p>
              <div class="tooltip-icon" id="ongoing-tooltip">
                <HelpCircle size="16" />
              </div>
            </div>
          </div>

          <!-- Single Event Card -->
          <div 
            class="type-card {selectedType === 'single' ? 'selected' : ''}" 
            on:click={() => selectType('single')}
            role="button"
            tabindex="0"
            on:keydown={e => (e.key === 'Enter' || e.key === ' ') && selectType('single')}
          >
            <div class="card-image-wrapper">
              <img src="/skeleton/EventPre.png" alt="Single Event Illustration" class="card-image pre" />
              <img src="/skeleton/EventPost.png" alt="Single Event Illustration Selected" class="card-image post" />
            </div>
            <div class="card-content">
              <h4>Single Event</h4>
              <p>Create a one-time round for a party, tournament, or private booking.</p>
              <div class="tooltip-icon" id="single-event-tooltip">
                <HelpCircle size="16" />
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="form-container">
          <div class="form-group">
            <label for="event-title">
              {selectedType === 'ongoing' ? 'Course Name' : 'Event Name'}
            </label>
            <p class="subtitle">
              {selectedType === 'ongoing' 
                ? 'Can be simple like holes 1-9 or use your fun name'
                : 'Eg. [Your Org name\'s] Christmas Party'}
            </p>
            <input 
              id="event-title"
              type="text"
              bind:value={newTitle}
              placeholder="Enter event title..."
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="hole-count" class="form-label">Number of Holes</label>
              <HoleSelector bind:value={holeCount} />
            </div>

            {#if selectedType === 'single'}
              <div class="form-group">
                <label for="event-date">Event Date</label>
                <DatePicker 
                  bind:isOpen={isDatePickerOpen}
                  bind:startDate={newDate}
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
                      <span>{displayDate || 'Select date'}</span>
                    </div>
                  </button>
                </DatePicker>
              </div>
            {/if}
          </div>

          <div class="form-actions">
            <button class="back-button" on:click={() => selectedType = null}>
              Back
            </button>
            <button 
              class="create-button" 
              on:click={createEvent}
              disabled={!newTitle || (selectedType === 'single' && !newDate) || creating}
            >
              {creating ? 'Creating...' : selectedType === 'ongoing' ? 'Create Course' : 'Create Event'}
            </button>
          </div>

          {#if createError}
            <p class="error-message">{createError}</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>

  /* Basic Modal Overlay and Container */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
    overflow-y: auto;
  }

  .modal-container {
    width: 600px; /* Adjust max-width as needed */
    max-width: 95vw;
    background: rgba(24, 24, 40, 0.7); /* Darker glass background */
    border-radius: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1); /* Subtle border */
    overflow: visible; /* Changed from hidden to visible */
    padding: 2rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    color: white; /* Default text color */
    font-family: 'Inter', sans-serif;
    position: relative; /* Needed for absolute positioning of tooltip/graphics */
  }

   .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5rem;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 600;
    color: white;
    text-align: center; /* Center header text */
    flex-grow: 1; /* Allow title to take available space */
  }

  .close-button {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .close-button:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  /* Type Selection Grid */
  .type-selection-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 600px) {
    .type-selection-grid {
      grid-template-columns: 1fr;
    }
  }

  .type-card {
    background: rgba(255, 255, 255, 0.05); /* Card background */
    border: 1px solid rgba(255, 255, 255, 0.1); /* Card border */
    border-radius: 1rem;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative; /* For positioning image and tooltip */
    overflow: visible; /* Allow content, especially the image, to overflow */
  }

  .type-card:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1); /* Keep card shadow */
  }

  .type-card.selected {
    border-color: var(--color-accent-purple, #8B5CF6); /* Use theme purple */
    box-shadow: 0 0 0 2px var(--color-accent-purple, #8B5CF6);
  }

  .card-image-wrapper {
    position: relative; /* Positioning context for absolute image */
    width: 100%; /* Take full width */
    height: 150px; /* Define the height of the image area */
    overflow: visible; /* Allow image to overflow */
    margin-top: -80px; /* Adjust negative margin to pull image up and overflow */
    margin-bottom: 0.5rem; /* Space below the image area */
  }

  .card-image {
    display: block;
    position: absolute; /* Position relative to wrapper */
    top: 0; /* Position at the top of the wrapper */
    left: 50%; /* Start at 50% from the left */
    transform: translateX(-50%); /* Pull back by half its width to center */
    max-height: 180px; /* Max height of the image */
    object-fit: contain;
    height: auto;
    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s ease; /* Smooth transitions */
  }

  .card-image.post {
    opacity: 0;
  }

   .card-image.pre {
    opacity: 1;
  }

  .type-card:hover .card-image.pre,
  .type-card.selected .card-image.pre {
    opacity: 0;
  }

  .type-card:hover .card-image.post,
  .type-card.selected .card-image.post {
    opacity: 1;
  }

  .type-card:hover .card-image {
    transform: translateX(-50%) translateY(-20px); /* Maintain horizontal center and add vertical lift */
    filter: drop-shadow(0 10px 12px rgba(0, 0, 0, 0.3)); /* Add drop shadow */
  }

  .card-content {
    margin-top: 40px; /* Adjust margin top to leave space for the image area */
    flex-grow: 1; /* Push content down */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center; /* Center content vertically */
    position: relative; /* To contain tooltip */
    width: 100%;
  }

  .card-content h4 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
  }

  .card-content p {
    margin: 0 0 1rem;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .tooltip-icon {
    position: absolute; /* Position relative to .card-content */
    bottom: -1rem;
    right: -0.5rem;
    color: rgba(255, 255, 255, 0.6);
    cursor: help; /* Indicate it's a tooltip */
  }

  .tooltip-icon:hover {
    color: white;
  }


  /* Prevent body scroll when modal is open */
  :global(body.modal-open) {
    overflow: hidden;
  }

  .form-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
    max-width: 100%;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .form-group label {
    font-size: 1rem;
    font-weight: 500;
    color: white;
  }

  .subtitle {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }

  .form-group input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    color: white;
    font-size: 1rem;
    font-family: 'Inter', sans-serif;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--color-accent-purple);
    box-shadow: 0 0 0 2px rgba(110, 78, 244, 0.2);
  }

  .form-group input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .form-actions {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1rem;
  }

  .back-button,
  .create-button {
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    min-width: 100px;
    font-family: 'Inter', sans-serif;
    transition: all 0.2s ease;
  }

  .back-button {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .create-button {
    background: var(--color-accent-purple);
    color: white;
    border: none;
  }

  .create-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-accent-purple) 80%, white);
    transform: translateY(-1px);
  }

  .create-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .create-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    color: #e53e3e;
    margin-top: 0.5rem;
    font-size: 0.875rem;
  }

  /* Dark theme for datepicker */
  :global(.datepicker[data-picker-theme="dark"]) {
    --datepicker-container-background: rgba(24, 24, 40, 0.95);
    --datepicker-container-border: 1px solid rgba(255, 255, 255, 0.1);
    --datepicker-calendar-header-text-color: white;
    --datepicker-calendar-dow-color: rgba(255, 255, 255, 0.7);
    --datepicker-calendar-day-color: white;
    --datepicker-calendar-day-color-disabled: rgba(255, 255, 255, 0.3);
    --datepicker-calendar-range-selected-background: var(--color-accent-purple);
    --datepicker-calendar-range-selected-color: white;
    --datepicker-calendar-range-hover-background: rgba(139, 92, 246, 0.2);
    --datepicker-calendar-range-hover-color: white;
    --datepicker-calendar-today-background: rgba(139, 92, 246, 0.1);
    --datepicker-calendar-today-color: white;
    --datepicker-calendar-today-border: 1px solid var(--color-accent-purple);
  }

  .form-row {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }

  /* Ensure the datepicker dropdown is visible */
  :global(.datepicker) {
    position: fixed;
    z-index: 1001;
  }

  /* Add a portal container for the datepicker */
  :global(.datepicker-portal) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 1000;
  }

  :global(.datepicker-portal > *) {
    pointer-events: auto;
  }

  .date-picker-button {
    width: fit-content;
    min-width: 200px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    color: white;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }

  .date-picker-button:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .date-picker-button:active {
    transform: translateY(0);
  }

  .date-picker-button:not(:has(span:not(:empty))) span {
    color: rgba(255, 255, 255, 0.5);
  }

</style>

<!-- You might want to add a transition for the modal appearance --> 