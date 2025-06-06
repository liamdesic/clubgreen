<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Organization } from '$lib/types/database';
  import { showToast } from '$lib/toastStore.js';
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { Plus } from 'lucide-svelte';
  import { generateUniqueShortCode, generateUniqueAccessUUID } from '$lib/utils/codeUtils';

  // Props
  export let organization: Organization | null = null;
  export let showCreateModal = false;

  // State
  let newTitle = '';
  let newDate = '';
  let eventType: 'single' | 'ongoing' = 'single';
  let creating = false;
  let createError = '';

  const dispatch = createEventDispatcher();

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
      logStep('Verifying user authentication...');
      const authStart = Date.now();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      logStep(`Auth check completed in ${Date.now() - authStart}ms`);
      
      if (authError || !user) {
        const errorMsg = 'Your session has expired. Please log in again.';
        console.error('❌ [createEvent] Authentication error:', {
          error: authError,
          hasUser: !!user,
          userId: user?.id
        });
        showToast(errorMsg, 'error');
        
        // Add a small delay to ensure toast is visible
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        logStep('Signing out user...');
        await supabase.auth.signOut();
        logStep('Redirecting to login...');
        goto('/login');
        return;
      }

      // Validate organization
      if (!organization || !organization.id) {
        const errorMsg = 'No organization found. Please refresh the page.';
        console.error('❌ [createEvent] Validation error:', errorMsg);
        createError = errorMsg;
        creating = false;
        logStep(`Validation failed: ${errorMsg}`);
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
      
      if (eventType === 'single' && !newDate) {
        const errorMsg = 'Please select a date for the event';
        console.error('❌ [createEvent] Validation error:', errorMsg);
        createError = errorMsg;
        creating = false;
        return;
      }

      // Prepare event date
      let event_date = null;
      if (eventType === 'single' && newDate) {
        // Ensure we're sending a proper ISO string to Supabase
        event_date = new Date(newDate).toISOString();
      }

      // Generate short code and access UUID
      const [short_code, access_uuid] = await Promise.all([
        generateUniqueShortCode(),
        generateUniqueAccessUUID()
      ]);
      
      // Prepare event data
      const eventData = { 
        title: newTitle, 
        event_date, 
        organization_id: organization.id,
        settings_json: {
          hole_count: holeCount
        },
        created_at: new Date().toISOString(),
        published: false,
        short_code,
        access_uuid
      };
      
      console.log('🔑 [createEvent] Generated codes:', { short_code, access_uuid });

      logStep('Event data prepared');
      console.log('📝 [createEvent] Prepared data:', eventData);

      try {
        logStep('Starting database insert...');
        const insertStart = Date.now();
        
        // Log the exact query we're about to make
        console.log('🔍 [createEvent] Supabase insert query:', {
          table: 'events',
          data: eventData
        });
        
        // Try direct insert first
        const { data: insertData, error: insertErr } = await supabase
          .from('events')
          .insert(eventData)
          .select();
        
        logStep(`Database insert completed in ${Date.now() - insertStart}ms`);
        
        let createdEvents = insertData;
        
        if (insertErr) {
          console.error('❌ [createEvent] Insert error:', {
            code: insertErr.code,
            details: insertErr.details,
            hint: insertErr.hint,
            message: insertErr.message
          });
        }

        // If direct insert fails with RLS error, try with RPC
        if (insertErr?.code === '42501' || insertErr?.message?.includes('permission denied')) {
          logStep('Direct insert failed with RLS, trying RPC...');
          console.log('⚠️ [createEvent] Direct insert failed with RLS, trying RPC...');
          
          const rpcStart = Date.now();
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('create_event', {
              event_data: eventData
            });
          
          logStep(`RPC call completed in ${Date.now() - rpcStart}ms`);
          
          if (rpcData) {
            console.log('✅ [createEvent] RPC successful:', rpcData);
            createdEvents = Array.isArray(rpcData) ? rpcData : [rpcData];
          } else if (rpcError) {
            console.error('❌ [createEvent] RPC error:', {
              code: rpcError?.code,
              details: rpcError?.details,
              hint: rpcError?.hint,
              message: rpcError?.message,
              stack: rpcError?.stack
            });
            throw new Error(`RPC failed: ${rpcError.message}`);
          }
        } else if (insertErr) {
          throw insertErr;
        }

        if (!createdEvents || createdEvents.length === 0) {
          throw new Error('No event was created. Please try again.');
        }

        const newEvent = createdEvents[0];
        console.log('✅ [createEvent] Event created successfully:', newEvent);
        
        showToast(`Event "${newTitle}" created successfully!`, 'success');
        
        // Reset form
        newTitle = '';
        newDate = '';
        eventType = 'single';
        
        // Close modal and notify parent
        dispatch('close');
        
        // Navigate to event setup
        console.log(`🔄 [createEvent] Navigating to /dashboard/${newEvent.id}/setup`);
        goto(`/dashboard/${newEvent.id}/setup`);
        
      } catch (error: any) {
        console.error('❌ [createEvent] Error creating event:', {
          error,
          name: error?.name,
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint
        });
        
        createError = error.message || 'Failed to create event. Please try again.';
        showToast(createError, 'error');
      }
      
    } catch (error: any) {
      console.error('🔥 [createEvent] Unexpected error:', error);
      createError = 'An unexpected error occurred. Please try again.';
    } finally {
      console.log('🏁 [createEvent] Operation completed');
      creating = false;
    }
  }

  function closeModal() {
    newTitle = '';
    newDate = '';
    eventType = 'single';
    createError = '';
    dispatch('close');
  }
</script>

{#if !showCreateModal}
  <button 
    class="add-card-button" 
    on:click={() => dispatch('open')}
    on:keydown={(e) => e.key === 'Enter' && dispatch('open')}
    aria-label="Add new event"
  >
    <Plus size="48" />
    <span>Add Event</span>
  </button>
{:else}
  <div class="add-event-form">
    <div class="modal-header">
      <h3>Add New Event</h3>
      <button class="close-button" on:click={closeModal} aria-label="Close modal">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="form-group">
      <label for="event-title">Event Name</label>
      <input 
        id="event-title" 
        type="text" 
        bind:value={newTitle}
        placeholder="Summer Tournament"
      />
    </div>
    <div class="form-group">
      <label>
        <input type="radio" bind:group={eventType} value="single" />
        Single Day Event
      </label>
      <label>
        <input type="radio" bind:group={eventType} value="ongoing" />
        Ongoing Event
      </label>
    </div>
    {#if eventType === 'single'}
      <div class="form-group">
        <label for="event-date">Event Date</label>
        <input 
          id="event-date" 
          type="date" 
          bind:value={newDate}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
    {/if}
    <div class="form-actions">
      <button class="cancel-button" on:click|preventDefault={closeModal}>Cancel</button>
      <button 
        class="save-button" 
        on:click|preventDefault={createEvent}
        disabled={!newTitle || (eventType === 'single' && !newDate) || creating}
      >
        {creating ? 'Creating...' : 'Create Event'}
      </button>
    </div>
    {#if createError}
      <p class="error-message">{createError}</p>
    {/if}
  </div>
{/if}

<style>
  .add-card-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 1.5rem;
    transition: all 0.2s ease;
  }
  
  .add-card-button:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
  
  .add-card-button:focus-visible {
    outline: 2px solid var(--accent-color, #4f46e5);
    outline-offset: 2px;
    border-radius: 4px;
  }
  
  /* This style is applied to the svg inside the add-card-button */
  :global(.add-card-button svg) {
    margin: 0;
  }
  
  .add-card-button span {
    font-size: 1rem;
    font-weight: 500;
  }

  .add-event-form {
    padding: 1.5rem;
    width: 100%;
    box-sizing: border-box;
    max-width: 100%;
  }

  .add-event-form h3 {
    margin-bottom: 1.5rem;
    width: 100%;
    color: white;
    font-family: 'Inter', sans-serif;
    box-sizing: border-box;
  }

  .form-group {
    margin-bottom: 1rem;
    width: 100%;
    box-sizing: border-box;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    width: 100%;
    color: rgba(255, 255, 255, 0.9);
    box-sizing: border-box;
  }

  .form-group input[type="text"],
  .form-group input[type="date"] {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    color: white;
    font-size: 1rem;
    font-family: 'Inter', sans-serif;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .form-group input[type="text"]:focus,
  .form-group input[type="date"]:focus {
    outline: none;
    border-color: var(--color-accent-purple);
    box-shadow: 0 0 0 2px rgba(110, 78, 244, 0.2);
  }

  .form-group input[type="text"]::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .form-group input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
    opacity: 0.7;
  }

  .form-group input[type="date"]::-webkit-datetime-edit {
    color: white;
  }

  .form-group input[type="date"]::-webkit-datetime-edit-fields-wrapper {
    color: white;
  }

  .form-group label[for] {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    color: rgba(255, 255, 255, 0.9);
    box-sizing: border-box;
  }

  .form-group input[type="radio"] {
    appearance: none;
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
  }

  .form-group input[type="radio"]:checked {
    border-color: var(--color-accent-purple);
    background: var(--color-accent-purple);
  }

  .form-group input[type="radio"]:checked::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0.5rem;
    height: 0.5rem;
    background: white;
    border-radius: 50%;
  }

  .form-group input[type="radio"]:hover {
    border-color: var(--color-accent-purple);
    background: rgba(110, 78, 244, 0.1);
  }

  .form-group input[type="radio"]:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(110, 78, 244, 0.3);
  }

  .form-group label:not([for]) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    color: rgba(255, 255, 255, 0.9);
    box-sizing: border-box;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
    width: 100%;
    box-sizing: border-box;
  }

  .cancel-button,
  .save-button {
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    min-width: 100px;
    box-sizing: border-box;
    font-family: 'Inter', sans-serif;
  }

  .cancel-button {
    background-color: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
  }

  .save-button {
    background: var(--color-accent-purple);
    color: white;
    border: none;
    border-radius: 0.75rem;
    padding: 0.75rem 1.5rem;
    font-weight: 500;
    cursor: pointer;
    min-width: 100px;
    box-sizing: border-box;
    font-family: 'Inter', sans-serif;
    transition: all 0.2s ease;
  }

  .save-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-accent-purple) 80%, white);
    transform: translateY(-1px);
  }

  .save-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    color: #e53e3e;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    width: 100%;
    box-sizing: border-box;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    width: 100%;
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

  .close-button svg {
    width: 1.5rem;
    height: 1.5rem;
  }
</style>
