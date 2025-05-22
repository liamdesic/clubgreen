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
  CloudUpload,
  Link,
  Calendar,
  Pencil,
  QrCode,
  Plus,
  User,
  Settings
} from 'lucide-svelte';

  // Import page data from server-side load function
  export let data;



  let events: Event[] = [];
  let eventDate = '';
  let loading = true;
  let error = '';
  let organization: Organization | null = null;

  let showCreateModal = false;
  let newTitle = '';
  let newDate = '';
  let eventType: 'single' | 'ongoing' = 'single';
  let creating = false;
  let createError = '';
  let selectedEvent: Event | null = null;
  let showQrModal = false;

  function openQrModal(event: Event) {
    selectedEvent = event;
    showQrModal = true;
  }

  function closeQrModal() {
    showQrModal = false;
    selectedEvent = null;
  }

  onMount(async () => {
    showToast('🚀 Dashboard loaded', 'info');
    loading = true;

    // Use the user data from the server-side load function
    const user = data.user;
    console.log('User authenticated:', user.email);
    
    try {
      // Get their organization
      const { data: orgs, error: orgErr } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1);

      if (orgErr) {
        throw new Error(orgErr.message);
      }
      
      if (!orgs || orgs.length === 0) {
        error = 'No organization found';
        loading = false;
        return;
      }

      organization = orgs[0];
      console.log('Organization loaded:', organization.name);

      // Get events for their org
      const { data: eventData, error: eventErr } = await supabase
        .from('events')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (eventErr) {
        throw new Error(eventErr.message);
      }
      
      events = eventData || [];
      console.log(`Loaded ${events.length} events`);
    } catch (err: unknown) {
      console.error('Error loading dashboard data:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });

  async function signOut() {
  await supabase.auth.signOut();
  goto('/login');
}

async function createEvent() {
  creating = true;
  createError = '';

  if (!newTitle || (eventType === 'single' && !newDate)) {
    createError = 'Please enter a title and date (if not ongoing).';
    creating = false;
    return;
  }

  if (!organization) {
    createError = 'No organization found. Please refresh the page.';
    creating = false;
    return;
  }

  const slug = newTitle
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');

  const event_date = eventType === 'single' ? newDate : null;

  const { error: insertErr } = await supabase.from('events').insert({
    title: newTitle,
    slug,
    event_date,
    organization_id: organization.id
  });

  if (insertErr) {
    createError = insertErr.message;
  } else {
    showCreateModal = false;
    
    // Re-fetch events to get the new event with its ID
    const { data: refreshed } = await supabase
      .from('events')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });
      
    events = refreshed;
    
    // Open edit panel for the newly created event and show success toast
    if (refreshed && refreshed.length > 0) {
      const newEvent = refreshed[0];
      showToast(`🎉 ${newEvent.title} event created!`, 'success');
      // Redirect to the new event's setup page
      window.location.href = `/dashboard/${newEvent.id}/setup`;
    }
    
    newTitle = '';
    newDate = '';
    eventType = 'single';
  }

  creating = false;
}

</script>

<div class="dashboard-wrapper">
  <!-- Header -->
    <div class="dashboard-main">
  <header class="dashboard-header">
    <div class="dashboard-title">
   <h2>Your Events</h2> 
  </div>
    <img src="/logos/ldrb-logo-colourlight.svg" alt="ldrboard logo" class="dashboard-logo" />
   <a 
     href="/dashboard/settings"
     class="user-pill" 
     aria-label="Account settings"
   >
    <User size="16" />
    <span>{organization?.name}</span>
    <Settings size="16" class="gear-button" title="Settings" />
  </a>


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
