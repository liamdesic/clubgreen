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
  import AddEventModal from '$lib/components/AddEventModal.svelte';
  import EventCard from '$lib/components/EventCard.svelte';

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
      <EventCard 
        {event} 
        {organization} 
        on:openQrModal={(e: CustomEvent<Event>) => openQrModal(e.detail)}
      />
    {/each}
    
    <!-- Add Event card -->
    <div class="event-card {showCreateModal ? 'add-card-active' : 'add-card'}" role="region" aria-label="Add new event">
      <AddEventModal 
        {organization}
        {showCreateModal}
        on:open={() => showCreateModal = true}
        on:close={() => showCreateModal = false}
      />
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
  /* Styles for the add-card-button have been moved to the AddEventModal component */
</style>
