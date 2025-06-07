<script lang="ts">
  import { onMount } from 'svelte';
  import type { Event, Organization } from '$lib/types';
  import { showToast } from '$lib/toastStore.js';
  import '$lib/styles/base.css';
  import '$lib/styles/theme.css';
  import '$lib/styles/dashboard.css';
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { invalidate } from '$app/navigation';
  import { eventStore, scoreStore } from '$lib/stores/eventStore';
  import EventSections from '$lib/components/EventSections/index.svelte';
  import NewRoundModal from '$lib/components/NewRoundModal.svelte';
  import QRCodeModal from '$lib/QRCodeModal.svelte';
  import DashboardMainHeader from '$lib/components/DashboardMainHeader.svelte';

  // --- DATA FROM SERVER ---
  export let data: {
    user: any;
    organizations: Organization[];
    events: Event[];
  };

  console.log('🚀 [dashboard-new] Page initialized with data:', {
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
    organizationCount: data.organizations?.length || 0,
    eventCount: data.events?.length || 0
  });

  // --- STATE ---
  let organization: Organization | null = null;
  let loading = false;
  let error = '';
  let showCreateModal = false;
  let showQrModal = false;
  let selectedEvent: Event | null = null;
  let scoreCounts: Record<string, number> = {};
  let playerCounts: Record<string, number> = {};

  // Initialize data from server
  $: {
    if (data.organizations?.[0]) {
      console.log('🏢 [dashboard-new] Initializing organization from server data:', {
        id: data.organizations[0].id,
        name: data.organizations[0].name,
        slug: data.organizations[0].slug
      });
      organization = data.organizations[0];
    } else {
      console.log('⚠️ [dashboard-new] No organization data received from server');
    }
  }

  // Initialize events in store
  $: if (data.events) {
    console.log('📅 [dashboard-new] Loading events into store:', {
      count: data.events.length,
      events: data.events.map(e => ({
        id: e.id,
        title: e.title,
        date: e.event_date,
        shortCode: e.short_code
      }))
    });
    eventStore.set(data.events);
    loadScoreCounts(); // Load scores when events are available
  }

  // Load score counts for events
  async function loadScoreCounts() {
    if (!data.events?.length) {
      console.log('ℹ️ [dashboard-new] No events to load scores for');
      return;
    }

    console.log('📊 [dashboard-new] Starting to load score counts for events:', {
      eventIds: data.events.map(e => e.id)
    });

    try {
      const eventIds = data.events.map(event => event.id);
      const { data: scores, error } = await supabase
        .from('scorecard')
        .select('event_id, player_id')
        .in('event_id', eventIds)
        .eq('published', true);

      if (error) {
        console.error('❌ [dashboard-new] Error loading scores:', error);
        return;
      }

      console.log('✅ [dashboard-new] Successfully loaded scores:', {
        scoreCount: scores.length,
        uniqueEventIds: [...new Set(scores.map(s => s.event_id))].length
      });

      // Calculate score and player counts
      const counts: Record<string, number> = {};
      const playerSets: Record<string, Set<string>> = {};

      eventIds.forEach(id => {
        counts[id] = 0;
        playerSets[id] = new Set<string>();
      });

      scores.forEach(score => {
        if (!score.event_id) return;
        counts[score.event_id]++;
        if (score.player_id) {
          playerSets[score.event_id].add(score.player_id);
        }
      });

      // Update the scoreStore with the counts
      scoreStore.set(counts);
      
      // Update local state for the EventSections component
      scoreCounts = counts;
      playerCounts = Object.fromEntries(
        Object.entries(playerSets).map(([id, set]) => [id, set.size])
      );

      console.log('📈 [dashboard-new] Calculated counts:', {
        scoreCounts,
        playerCounts
      });
    } catch (err) {
      console.error('❌ [dashboard-new] Error in loadScoreCounts:', err);
    }
  }

  // --- INITIAL CLIENT-SIDE AUTH VERIFICATION ---
  onMount(async () => {
    console.log('🔐 [dashboard-new] Starting client-side auth verification');
    
    try {
      const { data: authData, error } = await supabase.auth.getUser();
      
      if (error || !authData?.user) {
        console.error('❌ [dashboard-new] Client-side auth verification failed:', error);
        const errorMessage = 'Your session has expired. Please log in again.';
        
        setTimeout(async () => {
          await supabase.auth.signOut();
          goto(`/login?redirectTo=/dashboard-new&error=${encodeURIComponent(errorMessage)}`);
        }, 100);
        
        return;
      }
      
      console.log('✅ [dashboard-new] Client-side auth verification successful:', {
        userId: authData.user.id,
        email: authData.user.email
      });
      
      showToast('Dashboard loaded', 'success');
      
    } catch (err) {
      console.error('❌ [dashboard-new] Error during client-side initialization:', err);
      showToast('An error occurred. Please refresh the page.', 'error');
    }
  });

  // --- EVENT HANDLERS ---
  function handleAddEvent() {
    console.log('➕ [dashboard-new] Add event button clicked');
    if (!organization) {
      console.warn('⚠️ [dashboard-new] No organization found when trying to add event');
      showToast('No organization found. Please refresh the page.', 'error');
      return;
    }
    showCreateModal = true;
  }

  function handleQrModal(event: Event) {
    console.log('📱 [dashboard-new] QR modal requested for event:', {
      id: event.id,
      title: event.title
    });
    selectedEvent = event;
    showQrModal = true;
  }

  function handleEdit(e: CustomEvent<Event>) {
    console.log('🎮 [dashboard-new] Handling edit event:', {
      id: e.detail.id,
      title: e.detail.title,
      short_code: e.detail.short_code
    });
    if (!organization?.slug) {
      console.error('❌ [dashboard-new] No organization slug available');
      showToast('Error accessing event setup', 'error');
      return;
    }
    goto(`/${organization.slug}/${e.detail.short_code}/setup`);
  }

  async function handleEventCreated(event: CustomEvent) {
    console.log('🎉 [dashboard-new] New event created:', event.detail?.event);
    if (event.detail?.event) {
      eventStore.addEvent(event.detail.event);
      await invalidate('app:dashboard');
    }
  }

  function handleArchived({ detail }: any) {
    console.log('📦 [dashboard-new] Event archived:', detail);
    // The event store will handle the update automatically
  }

  function handleDeleted({ detail }: any) {
    console.log('🗑️ [dashboard-new] Event deleted:', detail);
    // The event store will handle the update automatically
  }
</script>

<div class="dashboard-wrapper">
  <div class="dashboard-main">
    <!-- Header -->
    <DashboardMainHeader {organization} {loading} />

    <!-- Main Content -->
    <main class="dashboard-content">
      {#if loading}
        <div class="loading">Loading events...</div>
      {:else if error}
        <div class="error">{error}</div>
      {:else if organization}
        <EventSections
          {organization}
          {scoreCounts}
          {playerCounts}
          on:addEvent={handleAddEvent}
          on:qrModal={handleQrModal}
          on:edit={handleEdit}
          on:archived={handleArchived}
          on:deleted={handleDeleted}
        />
      {/if}
    </main>
  </div>

  <!-- Modals -->
  {#if showCreateModal && organization}
    <NewRoundModal 
      bind:showModal={showCreateModal} 
      {organization}
      on:close={() => showCreateModal = false}
      on:eventCreated={handleEventCreated}
    />
  {/if}

  {#if showQrModal && selectedEvent && organization}
    <QRCodeModal
      organization={organization.slug}
      shortCode={selectedEvent.short_code}
      accessUuid={selectedEvent.access_uuid}
      onClose={() => {
        showQrModal = false;
        selectedEvent = null;
      }}
    />
  {/if}
</div>

<style>
  .dashboard-wrapper {
    min-height: 100vh;
    background: #0f0f1a;
    color: white;
  }

  .dashboard-main {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .dashboard-content {
    margin-top: 2rem;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
  }

  .error {
    color: #ff6b6b;
  }
</style> 