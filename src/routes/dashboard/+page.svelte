<script lang="ts">
  import { onMount } from 'svelte';
  import type { Event, Organization } from '$lib/types';
  import { showToast } from '$lib/toastStore.js';
  import '$lib/styles/theme.css';
  import '$lib/styles/dashboard.css';
  import QRCodeModal from '$lib/QRCodeModal.svelte';
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import {
    CloudUpload, Link, Calendar, Pencil, QrCode, Plus, User, Settings
  } from 'lucide-svelte';
  import TrialStatus from '$lib/TrialStatus.svelte';

  // --- DATA FROM SERVER ---
  export let data: {
    user: any;
    organizations: Organization[];
    events: Event[];
  };

  console.log('📦 [dashboard] Received data from server:', {
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
    organizationCount: data.organizations?.length || 0,
    eventCount: data.events?.length || 0
  });

  // --- STATE ---
  let organization: Organization | null = null;
  let events: Event[] = [];
  let loading = false;
  let error = '';

  // Initialize data from server
  $: {
    if (data.organizations?.[0]) {
      console.log('🏢 [dashboard] Initializing organization from server data');
      
      // Set trial_ends_at to 14 days from now if not set
      const trialEndsAt = data.organizations[0].trial_ends_at || 
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      
      organization = {
        id: data.organizations[0].id,
        name: data.organizations[0].name,
        slug: data.organizations[0].slug,
        trial_ends_at: trialEndsAt,
        settings_json: data.organizations[0].settings_json || {}
      };
      
      console.log('✅ [dashboard] Organization initialized:', {
        ...organization,
        hasTrialEndsAt: !!organization.trial_ends_at,
        trialEndsAtValue: organization.trial_ends_at
      });
    } else {
      console.log('ℹ️ [dashboard] No organization data received from server');
    }
    
    if (data.events) {
      events = data.events;
      console.log(`📅 [dashboard] Loaded ${events.length} events`);
    }
  }

  let showCreateModal = false;
  let newTitle = '';
  let newDate = '';
  let eventType: 'single' | 'ongoing' = 'single';
  let creating = false;
  let createError = '';

  let selectedEvent: Event | null = null;
  let showQrModal = false;

  // --- UTILS ---
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // --- MODALS ---
  function openQrModal(event: Event) {
    selectedEvent = event;
    showQrModal = true;
  }
  function closeQrModal() {
    showQrModal = false;
    selectedEvent = null;
  }

  // --- SIGN OUT ---
  async function signOut() {
    await supabase.auth.signOut();
    goto('/login');
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

      // Validate inputs
      logStep('Validating inputs...');
      
      if (!newTitle) {
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
      
      if (!organization?.id) {
        const errorMsg = 'No organization found. Please refresh the page.';
        console.error('❌ [createEvent] Organization error:', errorMsg);
        console.log('Current organization state:', organization);
        createError = errorMsg;
        creating = false;
        logStep(`Validation failed: ${errorMsg}`);
        return;
      }
      
      logStep('Input validation passed');

      console.log('🔍 [createEvent] Creating event with:', {
        title: newTitle,
        eventType,
        hasDate: !!newDate,
        organizationId: organization.id
      });

      logStep('Preparing event data...');
      
      // Generate slug and format date
      const slug = newTitle.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');
        
      const event_date = eventType === 'single' ? newDate : null;
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
          data: eventData,
          select: '*',
          order: { column: 'created_at', ascending: false }
        });
        
        let { data: createdEvents, error: insertErr } = await supabase
          .from('events')
          .insert([eventData])
          .select('*')
          .order('created_at', { ascending: false });
          
        logStep(`Database insert completed in ${Date.now() - insertStart}ms`);
        
        if (insertErr) {
          console.error('❌ [createEvent] Database insert error details:', {
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
          
          try {
            const rpcStart = Date.now();
            const { data: rpcResult, error: rpcError } = await supabase
              .rpc('create_event', { event_data: eventData });
              
            logStep(`RPC call completed in ${Date.now() - rpcStart}ms`);
            
            if (rpcError) {
              console.error('❌ [createEvent] RPC error details:', {
                code: rpcError.code,
                message: rpcError.message,
                details: rpcError.details,
                hint: rpcError.hint
              });
              throw rpcError;
            }
            
            console.log('✅ [createEvent] Event created via RPC:', rpcResult);
            createdEvents = rpcResult ? [rpcResult] : null;
            
          } catch (rpcError) {
            console.error('🔥 [createEvent] RPC failed with error:', {
              error: rpcError,
              name: rpcError?.name,
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
        
        // Show success message
        showToast(`🎉 ${newEvent.title} event created!`, 'success');
        
        // Reset form
        newTitle = '';
        newDate = '';
        eventType = 'single';
        showCreateModal = false;
        
        // Navigate to event setup
        console.log(`🔄 [createEvent] Navigating to /dashboard/${newEvent.id}/setup`);
        goto(`/dashboard/${newEvent.id}/setup`);
        
      } catch (error) {
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
      
    } catch (error) {
      console.error('🔥 [createEvent] Unexpected error:', error);
      createError = 'An unexpected error occurred. Please try again.';
    } finally {
      console.log('🏁 [createEvent] Operation completed');
      creating = false;
    }
  }

  // --- INITIAL CLIENT-SIDE AUTH VERIFICATION ---
  onMount(async () => {
    console.log('🚀 [dashboard] Client-side mount started');
    console.log('🔍 [dashboard] Initial data state:', {
      hasUser: !!data.user,
      organizationCount: data.organizations?.length || 0
    });
    
    try {
      console.log('🔄 [dashboard] Verifying authentication...');
      const authStartTime = Date.now();
      
      // Verify the user's session is still valid
      const { data: authData, error } = await supabase.auth.getUser();
      const authEndTime = Date.now();
      
      console.log(`⏱️ [dashboard] Auth check took ${authEndTime - authStartTime}ms`);
      
      if (error || !authData?.user) {
        console.error('❌ [dashboard] Client-side auth verification failed:', {
          error: error?.message,
          hasUser: !!authData?.user,
          userId: authData?.user?.id
        });
        
        showToast('Session expired. Please log in again.', 'error');
        
        // Add a small delay before redirecting to ensure the toast is visible
        setTimeout(async () => {
          console.log('🔒 [dashboard] Signing out and redirecting to login...');
          await supabase.auth.signOut();
          goto('/login');
        }, 1000);
        
        return;
      }
      
      const { user } = authData;
      console.log('✅ [dashboard] Client-side auth verified:', {
        email: user.email,
        userId: user.id,
        isAuthenticated: true
      });
      
      showToast('Dashboard loaded', 'success');
      
      // Debug organization data
      console.log('🏢 [dashboard] Organization data:', {
        hasOrganizations: data.organizations?.length > 0,
        count: data.organizations?.length || 0,
        firstOrg: data.organizations?.[0] ? {
          id: data.organizations[0].id,
          name: data.organizations[0].name,
          slug: data.organizations[0].slug
        } : null
      });
      
      // Check if we have data but no organization
      if (data.user && (!data.organizations || data.organizations.length === 0)) {
        console.log('ℹ️ [dashboard] User has no organizations, redirecting to onboarding');
        goto('/onboarding');
      } else {
        console.log('🏁 [dashboard] Client-side initialization complete');
      }
      
    } catch (error) {
      console.error('🔥 [dashboard] Error during client-side initialization:', {
        error: error?.message,
        name: error?.name,
        stack: error?.stack
      });
      showToast('An error occurred. Please refresh the page.', 'error');
    }
  });
</script>


<div class="dashboard-wrapper">
  <!-- Header -->
    <div class="dashboard-main">
  <header class="dashboard-header">
    <div class="dashboard-title">
      <h2>Your Events</h2> 
    </div>
    <img src="/logos/ldrb-logo-colourlight.svg" alt="ldrboard logo" class="dashboard-logo" />
    <div class="header-right">
      <div class="header-pills">
        {#if organization?.trial_ends_at}
          <TrialStatus 
            trialEndsAt={organization.trial_ends_at} 
            organizationId={organization.id} 
          />
        {/if}
        {#if organization}
        <a 
          href="/dashboard/settings"
          class="user-pill" 
          aria-label="Account settings"
        >
          <User size="16" />
          <span>{organization.name || 'My Organization'}</span>
          <Settings size="16" class="gear-button" title="Settings" />
        </a>
      {:else if loading}
        <div class="user-pill">
          <div class="skeleton-loader" style="width: 120px; height: 24px;"></div>
        </div>
      {:else}
        <a href="/dashboard/settings" class="user-pill">
          <User size="16" />
          <span>Set Up Organization</span>
        </a>
      {/if}
    </div>


  </header>

  <!-- Debug Info -->
  {#if loading}
    <div class="loading">Loading events...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if !events.length}
    <div class="no-events">No events found. Create your first event!</div>
  {/if}

  <!-- Events Grid -->
  <div class="event-grid">
    {#each events as event}
      <div class="event-card">
        <h2 class="event-title">{event.title}</h2>
        <p class="event-line"><Link color="blue" size="14" /> {organization?.slug}/{event.slug}</p>
        <p class="event-line"><Calendar color="orange" size="14" /> {event.event_date ? new Date(event.event_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}</p>
        <div class="event-buttons">
          <a class="edit-button" href={`/dashboard/${event.slug}/setup`}><Pencil size="16" /> Edit</a>
          <button class="qr-button" on:click={() => openQrModal(event)}><QrCode size="16" /> Get Links</button>
        </div>
      </div>
    {/each}
    
    <!-- Add Event card -->
    <div class="event-card {showCreateModal ? 'add-card-active' : 'add-card'}" role="region" aria-label="Add new event">
      {#if !showCreateModal}
        <button 
          class="add-card-button" 
          on:click={() => showCreateModal = true}
          on:keydown={(e) => e.key === 'Enter' && (showCreateModal = true)}
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
            <button class="cancel-button" on:click|preventDefault={() => {
              showCreateModal = false;
              newTitle = '';
              newDate = '';
              eventType = 'single';
              createError = '';
            }}>Cancel</button>
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
    </div>
  </div>

  <footer class="dashboard-footer">
    &copy; 2025 Club Green
  </footer>
</div>


  
  {#if showQrModal && selectedEvent}
    <QRCodeModal
      baseUrl={`${window.location.origin}/${organization?.slug || 'org'}/${selectedEvent.slug}`}
      onClose={closeQrModal}
    />
  {/if}
</div>

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
  
  .add-card-button svg {
    margin: 0;
  }
  
  .add-card-button span {
    font-size: 1rem;
    font-weight: 500;
  }
</style>
