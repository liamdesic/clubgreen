<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Organization } from '$lib/types';
  import { showToast } from '$lib/toastStore.js';
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { Plus } from 'lucide-svelte';

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
        const errorMsg = 'Please enter an event title';
        console.error('❌ [createEvent] Validation error:', errorMsg);
        createError = errorMsg;
        creating = false;
        logStep(`Validation failed: ${errorMsg}`);
        return;
      }
      
      if (eventType === 'single' && !newDate) {
        const errorMsg = 'Please select a date for the event';
        console.error('❌ [createEvent] Validation error:', errorMsg);
        createError = errorMsg;
        creating = false;
        logStep(`Validation failed: ${errorMsg}`);
        return;
      }

      // Generate a slug from the title
      const slug = newTitle
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')  // Remove special chars except spaces and hyphens
        .replace(/\s+/g, '-')      // Replace spaces with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
        .trim();
      
      if (!slug) {
        const errorMsg = 'Unable to generate a valid URL for this event title. Please use a different title.';
        console.error('❌ [createEvent] Validation error:', errorMsg);
        createError = errorMsg;
        creating = false;
        logStep(`Validation failed: ${errorMsg}`);
        return;
      }

      // Prepare event date
      let event_date = null;
      if (eventType === 'single' && newDate) {
        event_date = new Date(newDate).toISOString();
      }

      // Prepare event data
      const eventData = { 
        title: newTitle, 
        slug, 
        event_date, 
        organization_id: organization.id,
        settings_json: {},
        created_at: new Date().toISOString(),
        published: false
      };

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
    <h3>Create New Event</h3>
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
    padding: 1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .form-group input[type="text"],
  .form-group input[type="date"] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .cancel-button,
  .save-button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
  }

  .cancel-button {
    background-color: transparent;
    border: 1px solid #ddd;
  }

  .save-button {
    background-color: var(--accent-color, #4f46e5);
    color: white;
    border: none;
  }

  .save-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .error-message {
    color: #e53e3e;
    margin-top: 0.5rem;
    font-size: 0.875rem;
  }
</style>
