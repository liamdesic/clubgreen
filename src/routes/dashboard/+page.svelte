<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Event, Organization } from '$lib/validations';
  import { showToast } from '$lib/stores/toastStore.js';
  import  '$lib/styles/base.css'
  import '$lib/styles/theme.css';
  import '$lib/styles/dashboard.css';
  import { slide } from 'svelte/transition';
  import QRCodeModal from '$lib/components/dashboard/QRCodeModal.svelte';
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { invalidate } from '$app/navigation';
  import {
    CloudUpload, Link, Calendar, Pencil, QrCode, Plus, User, Settings,
    Palette
  } from 'lucide-svelte/icons';
  import Tv from 'lucide-svelte/icons/tv';
  import TrialStatus from '$lib/components/dashboard/TrialStatus.svelte';
  import NewRoundModal from '$lib/components/dashboard/NewRoundModal.svelte';
  import EventCard from '$lib/components/dashboard/EventCard.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import MainLeaderboardCard from '$lib/components/dashboard/MainLeaderboardCard.svelte';
  import EmptyDashboard from '$lib/components/dashboard/EmptyDashboard.svelte';
  import DashboardMainHeader from '$lib/components/dashboard/DashboardMainHeader.svelte';
  import ArchivedEventsSection from '$lib/components/dashboard/ArchivedEventsSection.svelte';

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
  let scoreCounts: Record<string, number> = {};
  let playerCounts: Record<string, number> = {};
  let scoreCountsLoaded = false;
  let showCreateModal = false;
  let showQrModal = false;
  let selectedEvent: Event | null = null;
  let liveEvents: Event[] = [];
  let nonLiveEvents: Event[] = [];
  let emptyState: HTMLDivElement | null = null;
  let subscription: any = null;
  let showArchivedEvents = false;
  let deletingEvent: string | null = null;

  $: archivedEvents = sortedEvents?.filter(event => event.settings_json?.archived) || [];
  $: activeEvents = sortedEvents?.filter(event => !event.settings_json?.archived) || [];

  // Sort events by status
  function getEventStatus(event: Event) {
    // Check if manually archived
    if (event.settings_json?.archived) {
      return { code: 3, label: 'Archived' };
    }

    // Access the current score count from the shared state
    const hasScores = (scoreCounts[event.id] || 0) > 0;
    const today = new Date().toISOString().split('T')[0];
    const eventDate = event.event_date;
    
    // If no event date, it's an ongoing event
    if (!eventDate) {
      return hasScores 
        ? { code: 0, label: 'Live' }
        : { code: 1, label: 'Waiting for Scores' };
    }
    
    const isToday = eventDate === today;
    const isFuture = new Date(eventDate) > new Date(today);
    
    if (isFuture) return { code: 2, label: 'Upcoming' };
    if (isToday) {
      return hasScores
        ? { code: 0, label: 'Live' }
        : { code: 1, label: 'Waiting for Scores' };
    }
    return { code: 3, label: 'Archived' };
  }

  // Sort events by status and then by date
  $: sortedEvents = [...events].sort((a, b) => {
    const statusA = getEventStatus(a).code;
    const statusB = getEventStatus(b).code;
    
    console.log(`[DEBUG] Sorting ${a.title} (${statusA}) vs ${b.title} (${statusB})`);
    
    // First sort by status
    if (statusA !== statusB) {
      console.log(`[DEBUG] Different status: ${a.title}(${statusA}) vs ${b.title}(${statusB}) → ${statusA < statusB ? a.title : b.title} comes first`);
      return statusA - statusB;
    }
    
    // If same status, sort by date
    const dateA = a.event_date ? new Date(a.event_date).getTime() : Infinity;
    const dateB = b.event_date ? new Date(b.event_date).getTime() : Infinity;
    
    console.log(`[DEBUG] Same status (${statusA}): ${a.title} vs ${b.title}, dates: ${a.event_date || 'none'} vs ${b.event_date || 'none'}`);
    
    // For Live and Waiting events, most recent first
    if (statusA <= 1) {
      console.log(`[DEBUG] Live/Waiting event sort: ${a.title} vs ${b.title} → ${dateB < dateA ? a.title : b.title} comes first`);
      return dateB - dateA;
    }
    
    // For Upcoming and Archived, chronological order
    console.log(`[DEBUG] Upcoming/Archived sort: ${a.title} vs ${b.title} → ${dateA < dateB ? a.title : b.title} comes first`);
    return dateA - dateB;
  });

  // Filter for live events (status 0)
  // Explicitly track scoreCounts to ensure reactivity
  $: {
    // Force reactivity by tracking when scoreCounts changes
    const keys = Object.keys(scoreCounts);
    console.log(`[DEBUG] scoreCounts updated with ${keys.length} keys:`, keys);
  }
  
  // Create a derived value that will trigger UI updates
  $: scoreCountsState = { ...scoreCounts };
  
  // Create a derived reactive variable to track when sorting occurs
  $: { 
    sortedEvents; 
    console.log(`[DEBUG] sortedEvents updated: ${sortedEvents.length} events`);
    // Force recomputation of all dependent variables
    sortedEventsChanged = Date.now();
  }
  let sortedEventsChanged = 0;
  
  // Filter for live events (status 0) - depends on both sortedEvents and scoreCountsState
  $: {
    // This block will re-run whenever scoreCounts or sortedEvents changes
    sortedEventsChanged;
    scoreCountsState;
    
    // Compute live events
    liveEvents = sortedEvents.filter(event => {
      const status = getEventStatus(event);
      return status.code === 0;
    });
    
    console.log(`[DEBUG] liveEvents updated: now has ${liveEvents.length} events`);
    if (liveEvents.length > 0) {
      console.log(`[DEBUG] Live events titles: ${liveEvents.map(e => e.title).join(', ')}`);
    }
  }
  
  // Filter for non-live events - also depends on scoreCountsState
  $: {
    sortedEventsChanged;
    scoreCountsState;
    nonLiveEvents = sortedEvents.filter(event => getEventStatus(event).code !== 0);
  }
  
  // Debug output for live events whenever they change
  $: if (liveEvents.length > 0) {
    console.log('[Dashboard] Live events found:', liveEvents.map(e => ({ 
      id: e.id, 
      title: e.title, 
      status: getEventStatus(e),
      scoreCount: scoreCounts[e.id] || 0
    })));
  }

  // Initialize data from server
  $: {
    if (data.organizations?.[0]) {
      console.log('🏢 [dashboard] Initializing organization from server data');

      // Set trial_ends_at to 14 days from now if not set
      const trialEndsAt = data.organizations[0].trial_ends_at ||
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // Use the organization data directly and potentially update trial_ends_at if needed
      organization = data.organizations[0];
      if (!organization.trial_ends_at) {
          organization.trial_ends_at = trialEndsAt;
      }
       if (!organization.settings_json) {
           organization.settings_json = {}; // Ensure settings_json is an object if null/undefined
       }

      console.log('✅ [dashboard] Organization initialized:', {
        ...organization,
        hasTrialEndsAt: !!organization.trial_ends_at,
        trialEndsAtValue: organization.trial_ends_at
      });
    } else {
      console.log('ℹ️ [dashboard] No organization data received from server');
    }
  }

  // Separately handle events initialization to ensure proper reactivity
  $: if (data.events) {
    // Create a copy with useful debug output
    events = [...data.events];
    console.log(`📅 [dashboard] Loaded ${events.length} events:`, 
      events.map(e => ({
        id: e.id,
        title: e.title,
        date: e.event_date,
        shortCode: e.short_code
      }))
    );
    
    // Temporarily inject test data to verify sorting logic
    // Using the real data from the server
    events = [...data.events];
    console.log(`[DEBUG] Using real server data: ${events.length} events`);
  }

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

  // --- NEW ROUND MODAL ---
  function openNewRoundModal() {
    console.log('Attempting to open NewRoundModal');
    if (!organization) {
      showToast('No organization found. Please refresh the page.', 'error');
      return;
    }
    showCreateModal = true;
  }

  function closeNewRoundModal() {
    console.log('Attempting to close NewRoundModal');
    showCreateModal = false;
  }

  // --- SIGN OUT ---
  async function signOut() {
    await supabase.auth.signOut();
    goto('/login');
  }

  // Function to refresh events from the database
  async function refreshEvents() {
    try {
      console.log('🔄 [dashboard] Refreshing events...');
      
      // Invalidate the layout data to trigger a fresh server load
      await invalidate('app:dashboard');
      
      // Directly fetch the latest events from Supabase as a backup mechanism
      if (organization) {
        const { data: freshEvents, error } = await supabase
          .from('events')
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching events:', error);
        } else if (freshEvents) {
          console.log(`📊 [dashboard] Directly fetched ${freshEvents.length} events from Supabase`);
          events = freshEvents;
        }
      }
      
      await loadScoreCounts(); // Refresh score counts after data is reloaded
      console.log('✅ [dashboard] Events refreshed successfully');
      
      // Detailed logging of events after refresh
      console.log('📋 [DEBUG] Current events after refresh:', events.map(e => ({
        id: e.id,
        title: e.title,
        date: e.event_date,
        archived: e.settings_json?.archived,
        status: getEventStatus(e).label
      })));
      
      console.log('📋 [DEBUG] Active events after refresh:', activeEvents.map(e => ({
        id: e.id,
        title: e.title,
        date: e.event_date,
        status: getEventStatus(e).label
      })));
      
      // Force UI update by triggering reactivity
      events = [...events];
    } catch (err) {
      console.error('Error refreshing events:', err);
      showToast('Failed to refresh events', 'error');
    }
  }

  // --- INITIAL CLIENT-SIDE AUTH VERIFICATION ---
  onMount(async () => {
    console.log('🚀 [dashboard] Client-side mount started');
    await autoArchiveEvents(); // Auto-archive past events on mount
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
        
        const errorMessage = 'Your session has expired. Please log in again.';
        
        // Add a small delay before redirecting to ensure the toast is visible
        setTimeout(async () => {
          console.log('🔒 [dashboard] Signing out and redirecting to login...');
          await supabase.auth.signOut();
          goto(`/login?redirectTo=/dashboard&error=${encodeURIComponent(errorMessage)}`);
        }, 100);
        
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
      
    } catch (err) {
      console.error('[Dashboard] Error during client-side initialization:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        name: err instanceof Error ? err.name : 'Unknown',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      showToast('An error occurred. Please refresh the page.', 'error');
    }
  });

  // Auto-archive past events that aren't manually archived
  async function autoArchiveEvents() {
    const today = new Date().toISOString().split('T')[0];
    const pastEvents = events.filter(event => 
      event.event_date && 
      event.event_date < today && 
      !event.settings_json?.archived
    );

    if (pastEvents.length > 0) {
      console.log(`[Dashboard] Auto-archiving ${pastEvents.length} past events`);
      
      for (const event of pastEvents) {
        const newSettings = {
          ...event.settings_json,
          archived: true,
          autoArchived: true // Flag to indicate this was automatic
        };

        const { error } = await supabase
          .from('events')
          .update({ settings_json: newSettings })
          .eq('id', event.id);

        if (error) {
          console.error(`Error auto-archiving event ${event.id}:`, error);
        } else {
          // Update local state
          event.settings_json = newSettings;
        }
      }
    }
  }

  // Load score counts for all events
  async function loadScoreCounts() {
    if (!events.length) return;
    console.log('[Dashboard] Loading score counts for events:', events.length);
    console.log('[DEBUG] Events before loading scores:', events.map(e => ({ id: e.id, title: e.title })));
    
    try {
      // Get event IDs
      const eventIds = events.map(event => event.id);
      
      // Initialize counts for all events to 0
      const counts: Record<string, number> = {};
      const playerCountsMap: Record<string, number> = {};
      eventIds.forEach(id => {
        counts[id] = 0;
        playerCountsMap[id] = 0;
      });
      
      // Fetch all published scorecards for these events
      const { data, error: err } = await supabase
        .from('scorecard')
        .select('event_id, player_id')
        .in('event_id', eventIds)
        .eq('published', true);
      
      if (err) throw err;
      
      // Log the raw score data to check what we're getting from Supabase
      console.log(`[DEBUG] Raw score data from Supabase: ${data?.length || 0} scores`, 
        (data || []).slice(0, 5).map((s: any) => ({ 
          event_id: s.event_id,
          player_id: s.player_id,
          created_at: s.created_at?.substring(0, 10) // Just show date part
        }))
      );
      
      // Process score counts and player counts
      const playerSets: Record<string, Set<string>> = {};
      
      // Initialize player sets
      eventIds.forEach(id => {
        playerSets[id] = new Set<string>();
      });
      
      // Process score counts and player counts
      (data || []).forEach((score: any) => {
        if (!score.event_id) return;
        
        const eventId = score.event_id;
        counts[eventId] = (counts[eventId] || 0) + 1;
        
        // Track unique players per event
        if (score.player_id) {
          playerSets[eventId].add(score.player_id);
        }
      });
      
      // Convert player Sets to counts
      Object.keys(playerSets).forEach(eventId => {
        playerCountsMap[eventId] = playerSets[eventId].size;
      });
      
      // Log events that should be marked as live based on score counts
      const potentialLiveEvents = Object.entries(counts)    
      // Force the reactive update by creating new objects
      scoreCounts = { ...counts };
      playerCounts = { ...playerCountsMap };
      console.log(`[Dashboard] Loaded score counts:`, scoreCounts);
      console.log(`[Dashboard] Loaded player counts:`, playerCounts);
      
      // Create a new scoreCounts object to ensure reactivity
      scoreCounts = { ...counts };
      
      // Log the status that each event would have
      console.log('[DEBUG] Event statuses after loading scoreCounts:');
      events.forEach(e => {
        const status = getEventStatus(e);
        console.log(`[DEBUG] ${e.title} (${e.id}): ${status.label} (${status.code})`);
      });
      
      // Set this last to trigger the reactive debug output
      scoreCountsLoaded = true;
      
    } catch (err) {
      console.error('Error loading score counts:', err);
      scoreCountsLoaded = true; // Avoid infinite loading on error
    }
  }

  // Load score counts when events change, but avoid infinite loops
  $: if (events.length > 0 && !scoreCountsLoaded) {
    loadScoreCounts();
  }

  // Debug output for all event statuses after scoreCounts is loaded
  $: if (scoreCountsLoaded) {
    console.log('[Dashboard] Event statuses after scoreCounts loaded:');
    events.forEach(e => {
      console.log(`- ${e.title} (${e.id}):`, getEventStatus(e));
    });
  }
</script>


<div class="dashboard-wrapper">
  <div class="dashboard-main">
    <!-- Header -->
    <DashboardMainHeader {organization} {loading} />

    <!-- Debug Info -->
    {#if loading}
      <div class="loading">Loading events...</div>
    {:else if error}
      <div class="error">{error}</div>
    {:else if !events.length}
      <EmptyDashboard on:createEvent={() => showCreateModal = true} />
    {/if}

    <!-- Live Section -->
    {#if organization && events.length > 0}
      <section class="live-section">
        <MainLeaderboardCard 
          organizationSlug={organization.slug} 
          orgLeaderboardCodes={
            Array.isArray(organization.org_leaderboard_codes) && 
            organization.org_leaderboard_codes.every(code => 
              typeof code === 'object' && code !== null && 'code' in code && typeof code.code === 'string'
            ) 
              ? organization.org_leaderboard_codes as { code: string }[] 
              : []
          }
          {events}
          {scoreCounts}
        />
      </section>
    {/if}

    <!-- Active Events Grid -->
    {#if !scoreCountsLoaded && events.length > 0}
      <div class="event-grid-loading">
        <LoadingSpinner />
      </div>
    {:else if activeEvents.length > 0}
      <div class="event-grid">
        {#each activeEvents.filter(e => !e.settings_json?.archived) as event}
          <EventCard 
            {event} 
            scoreCount={scoreCounts[event.id] || 0}
            playerCount={playerCounts[event.id] || 0}
            organization={organization}
            on:openQrModal={(e) => {
              selectedEvent = e.detail;
              showQrModal = true;
            }}
          />
        {/each}
        <button 
          class="add-round-card"
          on:click={openNewRoundModal}
          on:keydown={(e) => e.key === 'Enter' && openNewRoundModal()}
          aria-label="Add new round"
        >
          <div class="add-round-content">
            <Plus size={48} />
            <span>Add Round</span>
          </div>
        </button>
      </div>
    {/if}

    <ArchivedEventsSection 
      events={archivedEvents}
      on:eventDeleted={({ detail }) => {
        events = events.filter(e => e.id !== detail.eventId);
      }}
    />

    <!-- Add Event Modal -->
    {#if showCreateModal && organization}
      <NewRoundModal 
        bind:showModal={showCreateModal} 
        {organization}
        on:close={closeNewRoundModal}
        on:eventCreated={async (event) => {
          console.log('📣 [dashboard] Received eventCreated event:', event.detail);
          // First add the new event to the local array to ensure immediate UI update
          if (event.detail && event.detail.event) {
            console.log('➕ [dashboard] Adding new event to local state:', event.detail.event.title);
            events = [event.detail.event, ...events];
          }
          // Then refresh all events from the server
          await refreshEvents();
        }}
      />
    {/if}

    <footer class="dashboard-footer">
      &copy; 2025 Club Green
    </footer>
  </div>

  <!-- QR Code Modal -->
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
  :global(body) {
    margin: 0;
    padding: 0;
  }

  .dashboard-wrapper {
    min-height: 100vh;
    background: #0f0f1a;
  }

  .dashboard-main {
    padding: 2rem;
  }

  .live-section {
    background: rgba(0,0,0,0.12);
    border-radius: 1.5rem;
    padding: 1.5rem;
    margin-bottom: 2.5rem;
    box-shadow: 0 4px 24px 0 rgba(0,0,0,0.12);
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.15);
    max-width: 1200px;
    margin: 0 auto 2.5rem auto;
  }

  .event-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
    padding: 1rem 0;
    max-width: 1200px;
    margin: 0 auto;
  }

  .event-grid-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    color: white;
  }

  .error {
    color: #ff6b6b;
  }

  .dashboard-footer {
    text-align: center;
    padding: 1.5rem;
    color: #666;
    font-size: 0.875rem;
    margin-top: 2rem;
  }

  .add-round-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5rem;
    padding: 2rem;
    width: 100%;
    height: 100%;
    min-height: 280px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .add-round-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .add-round-card:active {
    transform: translateY(-2px);
  }

  .add-round-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .add-round-content span {
    font-size: 1.25rem;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
  }

  .add-round-content :global(svg) {
    color: rgba(255, 255, 255, 0.9);
    transition: transform 0.3s ease;
  }

  .add-round-card:hover :global(svg) {
    transform: scale(1.1);
  }


</style>
