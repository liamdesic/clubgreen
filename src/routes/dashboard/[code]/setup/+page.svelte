<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import type { TimeFilter } from '$lib/validations/timeFilter';
  import { timeFilterSchema } from '$lib/validations/timeFilter';
  import type { Event } from '$lib/validations';
  import type { Database } from '$lib/database.types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { showToast } from '$lib/stores/toastStore';
  import DashboardHeader from '$lib/components/dashboard/DashboardPageHeader.svelte';
  import EventDetailsForm from './EventDetailsForm.svelte';
  import LeaderboardSettings from './LeaderboardSettings.svelte';
  import AdvertisementSettings from './AdvertisementSettings.svelte';
  import PlayerManagementTable from './PlayerManagementTable.svelte';
  import EventActions from './EventActions.svelte';
  import BackToDashboardButton from './BackToDashboardButton.svelte';
  import '$lib/styles/EditEvent.css';

  type EventRow = Database['public']['Tables']['events']['Row'];
  type EventUpdate = Database['public']['Tables']['events']['Update'];
  type Json = Database['public']['Tables']['events']['Row']['settings_json'];

  interface FormSettings {
    event_name: string;
    hole_count: number;
    accent_color: string;
    archived: boolean;
    scorecard_ad_text: string;
    scorecard_ad_url: string;
    show_on_main_leaderboard: boolean;
    event_type: 'single' | 'ongoing';
    score_time_range: TimeFilter;
    additional_time_filters: TimeFilter[];
  }

  interface PlayerScore {
    id: string;
    name: string;
    totalScore: number;
    holeInOnes: number;
    published: boolean;
  }

  interface Organization {
    name: string;
    settings_json?: {
      color_palette?: string[];
    };
  }

  let eventDate: string = '';
  let isDatePickerOpen = false;
  let eventCode = '';
  let eventUuid = '';
  let event: EventRow | null = null;
  let organization: Organization = { name: '', settings_json: { color_palette: ['#00c853'] } };
  let settings: EventUpdate = {
    title: '',
    hole_count: 9,
    accent_color: '#00c853',
    archived: false,
    ads_text: '',
    ads_url: 'https://clubgreen.au',
    show_on_main_leaderboard: true,
    time_filters: ['all_time'] as TimeFilter[]
  };
  let playerScores: PlayerScore[] = [];
  let modifiedScores = new Map<string, boolean>();
  let unsavedChanges = false;
  let loading = true;
  let saving = false;
  let error: string | null = null;
  let subscription: any = null;

  $: eventCode = $page.params.code;
  $: timeFilters = (settings.time_filters as TimeFilter[] | undefined) ?? ['all_time'];
  $: eventName = settings.title ?? '';
  $: holeCount = settings.hole_count ?? 9;
  $: accentColor = settings.accent_color ?? '#00c853';
  $: showOnMainLeaderboard = settings.show_on_main_leaderboard ?? true;
  $: adText = settings.ads_text ?? '';
  $: adUrl = settings.ads_url ?? 'https://clubgreen.au';
  $: isArchived = settings.archived ?? false;

  async function loadEventAndSettings() {
    try {
      loading = true;
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        error = 'Not logged in';
        loading = false;
        return;
      }
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1);
      if (orgError || !orgs || orgs.length === 0) {
        error = 'No organization found';
        loading = false;
        return;
      }
      // Defensive fallback for color_palette
      const orgSettings = orgs[0].settings_json as { color_palette?: string[] } | null;
      organization = {
        name: orgs[0].name,
        settings_json: {
          color_palette: orgSettings?.color_palette || ['#00c853']
        }
      };
      // Use the shortcode to find the event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('short_code', eventCode)
        .single();
      if (eventError) throw new Error(eventError.message);
      if (!eventData) throw new Error('Event not found');
      eventUuid = eventData.id;
      event = eventData;
      settings = {
        title: eventData.title || '',
        hole_count: eventData.hole_count ?? 9,
        accent_color: eventData.accent_color ?? '#00c853',
        archived: eventData.archived ?? false,
        ads_text: eventData.ads_text ?? '',
        ads_url: eventData.ads_url ?? 'https://clubgreen.au',
        show_on_main_leaderboard: eventData.show_on_main_leaderboard ?? true,
        time_filters: (eventData.time_filters as TimeFilter[] | null) ?? ['all_time']
      };
      eventDate = eventData.event_date ? new Date(eventData.event_date).toISOString().split('T')[0] : '';
      await loadPlayerScores();
      loading = false;
    } catch (err: any) {
      error = err.message;
      showToast(`Error loading event: ${err.message}`, 'error');
      loading = false;
    }
  }

  async function loadPlayerScores() {
    if (!eventUuid) return;
    try {
      const { data, error } = await supabase
        .from('scorecard')
        .select('player_id, name, score, hole_in_ones, published')
        .eq('event_id', eventUuid)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!data?.length) {
        playerScores = [];
        return;
      }
      const playerMap = new Map<string, PlayerScore>();
      for (const row of data) {
        const id = row.player_id || row.name;
        if (!playerMap.has(id)) {
          playerMap.set(id, {
            id,
            name: row.name,
            totalScore: 0,
            holeInOnes: 0,
            published: row.published ?? false
          });
        }
        const player = playerMap.get(id)!;
        player.totalScore += Number(row.score) || 0;
        player.holeInOnes += Number(row.hole_in_ones) || 0;
        if (modifiedScores.has(id)) {
          player.published = modifiedScores.get(id)!;
        }
      }
      playerScores = Array.from(playerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      showToast('Failed to load player scores', 'error');
    }
  }

  async function saveSettings() {
    try {
      saving = true;
      error = null;
      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: settings.title,
          event_date: eventDate || null,
          hole_count: settings.hole_count,
          accent_color: settings.accent_color,
          archived: settings.archived,
          ads_text: settings.ads_text,
          ads_url: settings.ads_url,
          show_on_main_leaderboard: settings.show_on_main_leaderboard,
          time_filters: settings.time_filters
        })
        .eq('id', eventUuid);
      if (updateError) throw updateError;
      showToast('Settings saved successfully!', 'success');
      unsavedChanges = false;
    } catch (err: any) {
      error = err.message;
      showToast(`Error saving settings: ${err.message}`, 'error');
    } finally {
      saving = false;
    }
  }

  async function archiveEvent() {
    if (!confirm('Are you sure you want to archive this event? This action cannot be undone.')) return;
    try {
      saving = true;
      error = null;
      settings.archived = true;
      const { error: updateError } = await supabase
        .from('events')
        .update({ archived: true })
        .eq('id', eventUuid);
      if (updateError) throw updateError;
      showToast('Event archived successfully', 'success');
      unsavedChanges = false;
    } catch (err: any) {
      settings.archived = false;
      error = err.message;
      showToast(`Error archiving event: ${err.message}`, 'error');
    } finally {
      saving = false;
    }
  }

  function cancelChanges() {
    loadEventAndSettings();
  }

  function handleBack() {
    goto('/dashboard');
  }

  function handleEventNameChange(val: string) {
    settings.title = val;
    unsavedChanges = true;
  }

  function handleEventDateChange(val: string) {
    eventDate = val;
    unsavedChanges = true;
  }

  function handleHoleCountChange(val: number) {
    settings.hole_count = val;
    unsavedChanges = true;
  }

  function handleAccentColorChange(val: string) {
    settings.accent_color = val;
    unsavedChanges = true;
  }

  function handleShowOnMainLeaderboardChange(val: boolean) {
    settings.show_on_main_leaderboard = val;
    unsavedChanges = true;
  }

  function handleTimeFilterToggle(filter: TimeFilter, checked: boolean) {
    if (!settings.time_filters) settings.time_filters = ['all_time'];
    const filters = settings.time_filters as TimeFilter[];
    if (checked) {
      if (!filters.includes(filter)) {
        settings.time_filters = [...filters, filter];
      }
    } else {
      settings.time_filters = filters.filter(f => f !== filter);
    }
    unsavedChanges = true;
  }

  function handleTimeFiltersChange(filters: TimeFilter[]) {
    settings.time_filters = filters;
    unsavedChanges = true;
  }

  function handleAdTextChange(val: string) {
    settings.ads_text = val;
    unsavedChanges = true;
  }

  function handleAdUrlChange(val: string) {
    settings.ads_url = val;
    unsavedChanges = true;
  }

  function handleTogglePublished(id: string) {
    // Implement publish toggle logic as needed
  }

  onMount(() => {
    loadEventAndSettings();
  });
</script>

<DashboardHeader organizationName={organization.name || 'My'} eventTitle={event?.title || 'Event Setup'} />
<BackToDashboardButton onBack={handleBack} />

<div class="event-settings-container">
  {#if loading}
    <div class="loading">Loading event settings...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else}
    <div class="event-sections-wrapper">
      <section class="event-section">
        <EventDetailsForm
          eventName={eventName}
          onEventNameChange={handleEventNameChange}
          eventDate={eventDate}
          onEventDateChange={handleEventDateChange}
          holeCount={holeCount}
          onHoleCountChange={handleHoleCountChange}
          accentColor={accentColor}
          colorPalette={organization.settings_json?.color_palette || ['#00c853']}
          onAccentColorChange={handleAccentColorChange}
          isDatePickerOpen={isDatePickerOpen}
          setDatePickerOpen={v => isDatePickerOpen = v}
        />
        <LeaderboardSettings
          showOnMainLeaderboard={showOnMainLeaderboard}
          onShowOnMainLeaderboardChange={handleShowOnMainLeaderboardChange}
          timeFilters={timeFilters}
          onTimeFiltersChange={handleTimeFiltersChange}
        />
        <AdvertisementSettings
          adText={adText}
          onAdTextChange={handleAdTextChange}
          adUrl={adUrl}
          onAdUrlChange={handleAdUrlChange}
        />
        <EventActions
          saving={saving}
          archived={isArchived}
          onSave={saveSettings}
          onCancel={cancelChanges}
          onArchive={archiveEvent}
          unsavedChanges={unsavedChanges}
        />
      </section>
      <div class="event-divider"></div>
      <section class="event-section">
        <PlayerManagementTable
          playerScores={playerScores}
          onTogglePublished={handleTogglePublished}
        />
      </section>
    </div>
  {/if}
</div>
