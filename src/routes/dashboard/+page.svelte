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
    CloudUpload, Link, Calendar, Pencil, QrCode, Plus, User, Settings, Palette
  } from 'lucide-svelte';
  import Tv from 'lucide-svelte/icons/tv';
  import TrialStatus from '$lib/TrialStatus.svelte';
  import AddEventModal from '$lib/components/AddEventModal.svelte';
  import EventCard from '$lib/components/EventCard.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

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

  // Sort events by status
  function getEventStatus(event: Event) {
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
    <header class="dashboard-header">
      <div class="dashboard-title">
        {#if organization?.settings_json?.logo_url}
          <img 
            src={organization.settings_json.logo_url} 
            alt="{organization.name} logo" 
            class="org-logo"
          />
        {:else}
          <h2>Your Events</h2>
        {/if}
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
          href="/dashboard/customise"
          class="user-pill" 
          aria-label="Customise your leaderboard"
        >
          <Palette size="16" />
          <span>Customise</span>
        </a>
        <a 
          href="/dashboard/settings"
          class="user-pill" 
          aria-label="Account settings"
        >
          <User size="16" />
          <span>{organization.name || 'My Organization'}</span>
          <Settings size="16" class="gear-button" />
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

    <!-- Live Section -->
    {#if organization} <!-- Always show live section if organization exists -->
      <section class="live-section" style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 1.5rem; margin-bottom: 2.5rem; box-shadow: 0 4px 24px 0 rgba(0,0,0,0.12); position: relative; background: #181828; border-radius: 1.5rem; max-width: 1100px; margin: 0 auto 2.5rem auto;">
        {#if liveEvents.length > 0}
          <!-- Removed debug paragraph -->
        {:else}
          <p style="margin: 0 0 1.5rem 0; font-family: 'Inter', sans-serif; color: rgba(255, 255, 255, 0.8);">Add events to make them live on your leaderboard.</p>
        {/if}
        <div class="live-event-grid">
          <!-- Main Leaderboard Card -->
          <div class="main-leaderboard-card">
            <div class="card-header">
              <span class="live-indicator"><span class="flashing-circle"></span> Live</span>
              <h3 class="card-title main-leaderboard-card-title">
                <Tv size="20" style="margin-right: 0.5rem;" />
                Main Leaderboard
              </h3>
            </div>

            <div class="card-section url-section">
              <label for="leaderboard-url" style="font-family: 'Inter', sans-serif;">URL</label>
              <div class="url-input-container">
                <input
                  id="leaderboard-url"
                  type="text"
                  value={`https://ldrboard.co/${organization?.slug || ''}/${organization?.org_leaderboard_codes?.[0] || ''}`}
                  readonly
                  aria-label="Main Leaderboard URL"
                  style="font-family: 'Inter', sans-serif;"
                />
                <button class="copy-button" aria-label="Copy URL">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="lucide lucide-copy"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                  </svg>
                </button>
              </div>
            </div>

            <div class="card-section settings-section">
              <label for="transition-time" style="font-family: 'Inter', sans-serif;">Settings</label>
              <div class="transition-time-dropdown">
                <label for="transition-time" style="font-family: 'Inter', sans-serif;">Transition Time</label>
                <select id="transition-time" style="font-family: 'Inter', sans-serif;">
                  <option value="3">3 seconds</option>
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                  <option value="15">15 seconds</option>
                  <option value="20">20 seconds</option>
                </select>
                <span class="dropdown-arrow">▼</span>
              </div>
            </div>
          </div>

          {#each liveEvents as event}
            <EventCard 
              {event} 
              {organization} 
              scoreCount={scoreCounts[event.id] || 0}
              playerCount={playerCounts[event.id] || 0}
              on:openQrModal={(e: CustomEvent<Event>) => openQrModal(e.detail)}
            />
          {/each}
        </div>
      </section>
    {/if}

    <!-- Events Grid -->
    {#if !scoreCountsLoaded}
      <div class="event-grid-loading">
        <LoadingSpinner />
      </div>
    {:else}
      <div class="event-grid">
        {#each nonLiveEvents as event}
          <EventCard 
            {event} 
            {organization} 
            scoreCount={scoreCounts[event.id] || 0}
            playerCount={playerCounts[event.id] || 0}
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
    {/if}

    <footer class="dashboard-footer">
      &copy; 2025 Club Green
    </footer>
  </div>


  
  {#if showQrModal && selectedEvent}
    <QRCodeModal
      organization={organization?.slug || 'org'}
      shortCode={selectedEvent.short_code || ''}
      accessUuid={selectedEvent.access_uuid || ''}
      onClose={closeQrModal}
    />
  {/if}
</div>

<style>
  /* Styles for the add-card-button have been moved to the AddEventModal component */
  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0;
    margin-bottom: 2rem;
    font-family: 'Inter', sans-serif; /* Apply Inter font */
  }

  .dashboard-title {
    display: flex;
    align-items: center;
    min-height: 40px;
  }

  .org-logo {
    height: 40px;
    width: auto;
    object-fit: contain;
    display: block;
  }

  .live-section {
    background: rgba(0,0,0,0.12);
    border-radius: 1.5rem;
    padding: 1.5rem;
    margin-bottom: 2.5rem;
    box-shadow: 0 4px 24px 0 rgba(0,0,0,0.12);
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.15); /* Subtle border */
    max-width: 1200px; /* Limit the maximum width */
    margin: 0 auto 2.5rem auto; /* Center the section and add bottom margin */
  }
  .live-section-label {
    position: absolute;
    top: 1rem;
    left: 1.5rem;
    color: #fff;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    opacity: 0.85;
    z-index: 2;
    font-family: 'Inter', sans-serif; /* Apply Inter font */
  }
  .live-event-grid {
    display: flex;
    gap: 1.5rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  /* Styles for the Main Leaderboard Card */
  .main-leaderboard-card {
    background-color: #181828; /* Dark background */
    border-radius: 1.5rem; /* Rounded corners */
    padding: 1.5rem;
    color: #fff; /* White text - fallback */
    font-family: 'Inter', sans-serif; /* Inter font - fallback */
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 300px;
    max-width: 350px;
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.15); /* Subtle border */
  }

  .main-leaderboard-card .card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    justify-content: center; /* Center header content */
  }

  .main-leaderboard-card .live-indicator {
    font-size: 0.9rem;
    font-weight: 600;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .main-leaderboard-card .main-leaderboard-card-title { /* Updated selector */
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center; /* Vertically align icon and text */
    color: #fff; /* Ensure text color is white */
    font-family: 'Inter', sans-serif; /* Ensure Inter font is applied */
    text-align: center; /* Center text within the title element */
    justify-content: center; /* Center flex items (icon and text) */
    width: 100%; /* Allow title to take full width for centering */
  }

  .main-leaderboard-card .card-section {
    display: flex;
    flex-direction: column;
  }

  .main-leaderboard-card .card-section label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 0.5rem;
    font-family: 'Inter', sans-serif; /* Apply Inter font */
  }

  .main-leaderboard-card .url-input-container {
    display: flex;
    background-color: rgba(255, 255, 255, 0.08); /* Slightly lighter input background */
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .main-leaderboard-card .url-input-container input[type="text"] {
    flex-grow: 1;
    background: none;
    border: none;
    padding: 0.75rem 1rem;
    color: #fff;
    font-size: 1rem;
    font-family: 'Inter', sans-serif; /* Apply Inter font */
    outline: none;
  }

  .main-leaderboard-card .copy-button {
    background: none;
    border: none;
    padding: 0.75rem 1rem;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.7); /* Icon color */
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease-in-out;
  }

  .main-leaderboard-card .copy-button:hover {
    color: #fff;
  }

  .main-leaderboard-card .transition-time-dropdown {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  .main-leaderboard-card .transition-time-dropdown label {
      /* Hide this label visually if the section label is sufficient */
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
  }

  .main-leaderboard-card .transition-time-dropdown select {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 1rem; /* Adjust padding for arrow */
    background-color: rgba(255, 255, 255, 0.08); /* Slightly lighter dropdown background */
    border: none;
    border-radius: 0.5rem;
    color: #fff;
    font-size: 1rem;
    font-family: 'Inter', sans-serif; /* Apply Inter font */
    -webkit-appearance: none; /* Remove default arrow */
    -moz-appearance: none; /* Remove default arrow */
    appearance: none; /* Remove default arrow */
    cursor: pointer;
    outline: none;
  }

  .main-leaderboard-card .dropdown-arrow {
    position: absolute;
    top: 50%;
    right: 1rem;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.7); /* Arrow color */
    pointer-events: none; /* Don't block clicks on the select */
  }

  /* Styles for the Add Event card to match the others */
  .event-grid .event-card {
    max-width: 350px; /* Apply the same max-width as other cards */
    width: 100%; /* Ensure it behaves correctly in flex layout */
    /* Inherits other styles from .event-card */
  }

  /* Flashing red circle animation */
  .flashing-circle {
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: red;
    border-radius: 50%;
    animation: pulse 1.5s infinite ease-out;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.8);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.6;
    }
    100% {
      transform: scale(0.8);
      opacity: 1;
    }
  }
</style>
