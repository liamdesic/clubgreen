<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import type { Event, EventSettings } from '$lib/types/event';
  import type { ScoreTimeRange } from '$lib/utils/timeFilterUtils';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { showToast } from '$lib/toastStore';
  import DashboardHeader from '$lib/DashboardHeader.svelte';
  import EventDetailsForm from './EventDetailsForm.svelte';
  import LeaderboardSettings from './LeaderboardSettings.svelte';
  import AdvertisementSettings from './AdvertisementSettings.svelte';
  import PlayerManagementTable from './PlayerManagementTable.svelte';
  import EventActions from './EventActions.svelte';
  import BackToDashboardButton from './BackToDashboardButton.svelte';
  import '$lib/styles/EditEvent.css';

  interface FormSettings extends EventSettings {
    event_name: string;
    hole_count: number;
    accent_color: string;
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
    settings_json?: { color_palette?: string[] };
  }

  let eventDate: string = '';
  let isDatePickerOpen = false;
  let eventCode = '';
  let eventUuid = '';
  let event: any = null;
  let organization: Organization = { name: '', settings_json: { color_palette: ['#00c853'] } };
  let settings: FormSettings = {
    event_name: '',
    hole_count: 9,
    accent_color: '#00c853',
    archived: false,
    scorecard_ad_text: '',
    scorecard_ad_url: 'https://clubgreen.au',
    show_on_main_leaderboard: true,
    event_type: 'single',
    score_time_range: 'all_time',
    additional_time_filters: []
  };
  let playerScores: PlayerScore[] = [];
  let modifiedScores = new Map<string, boolean>();
  let unsavedChanges = false;
  let loading = true;
  let saving = false;
  let error: string | null = null;
  let subscription: any = null;

  $: eventCode = $page.params.code;

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
      organization = {
        name: orgs[0].name,
        settings_json: {
          color_palette: orgs[0].settings_json?.color_palette || ['#00c853']
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
        event_name: eventData.title || '',
        hole_count: eventData.settings_json?.hole_count ?? 9,
        accent_color: eventData.settings_json?.accent_color ?? '#00c853',
        archived: eventData.settings_json?.archived ?? false,
        scorecard_ad_text: eventData.settings_json?.scorecard_ad_text ?? '',
        scorecard_ad_url: eventData.settings_json?.scorecard_ad_url ?? 'https://clubgreen.au',
        show_on_main_leaderboard: eventData.settings_json?.show_on_main_leaderboard ?? true,
        event_type: eventData.settings_json?.event_type ?? 'single',
        score_time_range: (eventData.settings_json as EventSettings)?.score_time_range ?? 'all_time',
        additional_time_filters: (eventData.settings_json as EventSettings)?.additional_time_filters ?? []
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
          title: settings.event_name,
          event_date: eventDate || null,
          settings_json: { ...settings, event_name: undefined }
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
        .update({ settings_json: { ...settings } })
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
    settings.event_name = val;
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
  function handleScoreTimeRangeChange(val: ScoreTimeRange) {
    settings.score_time_range = val;
    // Remove the new primary filter from additional filters if it exists
    settings.additional_time_filters = settings.additional_time_filters?.filter(f => f !== val) ?? [];
    unsavedChanges = true;
  }

  function handleAdditionalTimeFiltersChange(filters: ScoreTimeRange[]) {
    settings.additional_time_filters = filters;
    unsavedChanges = true;
  }
  function handleAdTextChange(val: string) {
    settings.scorecard_ad_text = val;
    unsavedChanges = true;
  }
  function handleAdUrlChange(val: string) {
    settings.scorecard_ad_url = val;
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
          eventName={settings.event_name}
          onEventNameChange={handleEventNameChange}
          eventDate={eventDate}
          onEventDateChange={handleEventDateChange}
          holeCount={settings.hole_count}
          onHoleCountChange={handleHoleCountChange}
          accentColor={settings.accent_color}
          colorPalette={organization.settings_json?.color_palette || ['#00c853']}
          onAccentColorChange={handleAccentColorChange}
          isDatePickerOpen={isDatePickerOpen}
          setDatePickerOpen={v => isDatePickerOpen = v}
        />
        <LeaderboardSettings
          showOnMainLeaderboard={settings.show_on_main_leaderboard}
          onShowOnMainLeaderboardChange={handleShowOnMainLeaderboardChange}
          scoreTimeRange={settings.score_time_range}
          onScoreTimeRangeChange={handleScoreTimeRangeChange}
          additionalTimeFilters={settings.additional_time_filters}
          onAdditionalTimeFiltersChange={handleAdditionalTimeFiltersChange}
        />
        <AdvertisementSettings
          adText={settings.scorecard_ad_text}
          onAdTextChange={handleAdTextChange}
          adUrl={settings.scorecard_ad_url}
          onAdUrlChange={handleAdUrlChange}
        />
        <EventActions
          saving={saving}
          archived={settings.archived}
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
