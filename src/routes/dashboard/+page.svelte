<script lang="ts">
  import { onMount } from 'svelte';
  import type { Event, Organization } from '$lib/validations';
  import { showToast } from '$lib/stores/toastStore';
  import '$lib/styles/base.css';
  import '$lib/styles/theme.css';
  import '$lib/styles/dashboard.css';
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { invalidate } from '$app/navigation';
  import { eventSource } from '$lib/stores/source/eventSource';
  import { scoresSource } from '$lib/stores/source/scoresSource';
  import EventSections from '$lib/components/dashboard/index.svelte';
  import NewRoundModal from '$lib/components/dashboard/NewRoundModal.svelte';
  import QRCodeModal from '$lib/components/dashboard/QRCodeModal.svelte';
  import DashboardMainHeader from '$lib/components/dashboard/DashboardMainHeader.svelte';
  import DashboardSkeleton from '$lib/components/dashboard/DashboardSkeleton.svelte';
  import { countScoresForEvents } from '$lib/utils/eventUtils';
  import Skeleton from '$lib/components/Skeleton.svelte';

  // --- DATA FROM SERVER ---
  export let data: {
    user: any;
    organizations: Organization[];
    events: Event[];
  };

  console.log('Dashboard data:', {
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
    organizationCount: data.organizations?.length || 0,
    eventCount: data.events?.length || 0
  });

  // --- STATE ---
  let organization: Organization | null = null;
  let loading = true;
  let error = '';
  let showCreateModal = false;
  let showQrModal = false;
  let selectedEvent: Event | null = null;
  let scoreCounts: Record<string, number> = {};
  let playerCounts: Record<string, number> = {};

  // Initialize data from server
  $: {
    if (data.organizations?.[0]) {
      organization = data.organizations[0];
      console.log('📦 [Dashboard] Organization loaded:', organization.name);
    }
  }

  // Initialize events in store and load score counts after
  $: if (organization && organization.id) {
    (async () => {
      console.log('🔄 [Dashboard] Fetching events for org:', organization.id);
      await eventSource.fetchEvents(organization.id);
      // loadScoreCounts will be called automatically when $eventSource updates
    })();
  }

  // Make score counts reactive to event source changes
  $: if ($eventSource && $eventSource.length > 0) {
    console.log('📊 [Dashboard] Events loaded, fetching score counts');
    loadScoreCounts();
  }

  // Load score counts for events
  async function loadScoreCounts() {
    if (!$eventSource?.length) return;

    try {
      console.log('🔢 [Dashboard] Loading score counts for events');
      const results = await countScoresForEvents($eventSource);
      
      // Update local state for the EventSections component
      scoreCounts = Object.fromEntries(
        results.map(({ event, scoreCount }) => [event.id, scoreCount])
      );
      
      // For now, we'll use the same count for player counts since we don't have that data
      playerCounts = { ...scoreCounts };

      console.log('✅ [Dashboard] Score counts loaded:', scoreCounts);
      loading = false;
    } catch (err) {
      console.error('❌ [Dashboard] Error in loadScoreCounts:', err);
      error = 'Failed to load score counts';
      loading = false;
    }
  }

  // --- INITIAL CLIENT-SIDE AUTH VERIFICATION ---
  onMount(async () => {
    try {
      console.log('🔐 [Dashboard] Verifying auth state');
      const { data: authData, error } = await supabase.auth.getUser();
      
      if (error || !authData?.user) {
        const errorMessage = 'Your session has expired. Please log in again.';
        console.error('❌ [Dashboard] Auth error:', error);
        
        setTimeout(async () => {
          await supabase.auth.signOut();
          goto(`/login?redirectTo=/dashboard&error=${encodeURIComponent(errorMessage)}`);
        }, 100);
        
        return;
      }
      
      console.log('✅ [Dashboard] Auth verified');
      showToast('Dashboard loaded', 'success');
      
    } catch (err) {
      console.error('❌ [Dashboard] Error during client-side initialization:', err);
      showToast('An error occurred. Please refresh the page.', 'error');
      loading = false;
    }
  });

  // --- EVENT HANDLERS ---
  function handleAddEvent() {
    if (!organization) {
      showToast('No organization found. Please refresh the page.', 'error');
      return;
    }
    showCreateModal = true;
  }

  function handleQrModal(e: CustomEvent<Event>) {
    selectedEvent = e.detail;
    showQrModal = true;
  }

  function handleEdit(e: CustomEvent<Event>) {
    if (!organization?.slug) {
      showToast('Error accessing event setup', 'error');
      return;
    }
    const event = e.detail;
    if (!event.short_code) {
      console.error('Event is missing short_code:', event);
      showToast('Error: Event is missing required information', 'error');
      return;
    }
    goto(`/dashboard/${event.short_code}/setup`);
  }

  async function handleEventCreated(event: CustomEvent) {
    if (event.detail?.event) {
      await invalidate('app:dashboard');
    }
  }

  function handleArchived({ detail }: { detail: { eventId: string; action: 'archive' | 'unarchive' } }) {
    if (!organization) return;
    
    eventSource.updateEvent(detail.eventId, { archived: detail.action === 'archive' });
    showToast(`Event ${detail.action === 'archive' ? 'archived' : 'unarchived'} successfully`, 'success');
  }

  function handleDeleted({ detail }: any) {
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
        <div class="loading-container">
          <Skeleton type="card" count={3} className="dashboard-skeleton" />
        </div>
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

  /* Add fade-in animation for event cards */
  :global(.event-card) {
    animation: fadeInUp 0.5s ease-out forwards;
    opacity: 0;
    transform: translateY(20px);
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Stagger the animation for each card */
  :global(.event-card:nth-child(1)) { animation-delay: 0.1s; }
  :global(.event-card:nth-child(2)) { animation-delay: 0.2s; }
  :global(.event-card:nth-child(3)) { animation-delay: 0.3s; }
  :global(.event-card:nth-child(4)) { animation-delay: 0.4s; }
  :global(.event-card:nth-child(5)) { animation-delay: 0.5s; }
  :global(.event-card:nth-child(6)) { animation-delay: 0.6s; }

  .loading-container {
    min-height: 400px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
</style> 