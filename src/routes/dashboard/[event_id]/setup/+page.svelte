<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { page } from '$app/stores';
  import { showToast } from '$lib/toastStore';
  import DashboardHeader from '$lib/DashboardHeader.svelte';
  import type { Event } from '$lib/types/event';
  import type { Score } from '$lib/types/score';
  import '$lib/styles/theme.css';
  import '$lib/styles/dashboard.css';
  import '$lib/styles/EditEvent.css';
  import { Plus, Minus } from 'lucide-svelte';

  interface Settings {
    event_name: string;
    hole_count: number;
    accent_color: string;
    archived: boolean;
    scorecard_ad_text: string;
    scorecard_ad_url: string;
    show_on_main_leaderboard?: boolean;
    event_type?: 'single' | 'ongoing';
  }

  interface PlayerScore {
    id: string;
    name: string;
    totalScore: number;
    holeInOnes: number;
    published: boolean;
  }

  let eventId = '';
  let eventUuid = ''; // Will store the actual UUID of the event
  let event: Event | null = null;
  let organization: { name: string } | null = null;
  let settings: Settings = {
    event_name: '',
    hole_count: 9,
    accent_color: '#00c853',
    archived: false,
    scorecard_ad_text: '',
    scorecard_ad_url: 'https://clubgreen.au',
    show_on_main_leaderboard: true,
    event_type: 'single'
  };
  
  let playerScores: PlayerScore[] = [];
  let modifiedScores = new Map<string, boolean>();
  let unsavedChanges = false;
  let loading = true;
  let saving = false;
  let error: string | null = null;
  let subscription: any = null;

  $: eventId = $page.params.event_id;

  async function loadEventAndSettings() {
    try {
      loading = true;
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        error = 'Not logged in';
        loading = false;
        return;
      }
      
      // Get organization
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
      
      organization = orgs[0];
      
      
      // First try to fetch by ID (UUID)
      let query = supabase
        .from('events')
        .select('*');
      
      // Check if the eventId is a valid UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);
      
      if (isUuid) {
        query = query.eq('id', eventId);
      } else {
        // If not a UUID, try to fetch by slug
        query = query.eq('slug', eventId);
      }
      
      const { data, error: fetchError } = await query.single();

      if (fetchError || !data) {
        throw new Error(fetchError?.message || 'Event not found');
      }
      
      // Store the actual UUID for database operations
      eventUuid = data.id;

      event = data;
      settings = { 
        ...settings, 
        ...(data.settings_json || {}),
        event_name: data.title || ''
      };
      
      await loadPlayerScores();
      loading = false;
    } catch (err: any) {
      error = err.message;
      showToast(`Error loading event: ${err.message}`, 'error');
      loading = false;
    }
  }

  async function loadPlayerScores() {
    if (!eventUuid) {
      console.error('❌ Event UUID is not available');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('scorecard')
        .select('player_id, name, score, hole_in_ones, published')
        .eq('event_id', eventUuid)
        .order('created_at', { ascending: true }); // Sort by creation time

      if (error) throw error;
      if (!data?.length) {
        console.log('ℹ️ No scorecard data found for this event');
        playerScores = [];
        return;
      }

      const playerMap = new Map();

      for (const row of data) {
        const id = row.player_id || row.name;
        if (!playerMap.has(id)) {
          playerMap.set(id, {
            id,
            name: row.name,
            totalScore: 0,
            holeInOnes: 0,
            published: row.published ?? false // Default to false if null
          });
        }

        const player = playerMap.get(id);
        // Ensure we're working with numbers
        player.totalScore += Number(row.score) || 0;
        player.holeInOnes += Number(row.hole_in_ones) || 0;
        
        // Update published status if it was modified
        if (modifiedScores.has(id)) {
          player.published = modifiedScores.get(id);
        }
      }


      // Convert to array and sort by player name for consistent ordering
      playerScores = Array.from(playerMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
    } catch (error) {
      console.error('❌ Failed to load player scores:', error);
      showToast('Failed to load player scores', 'error');
    }
  }

  async function uploadFileToSupabase(file: File, folder: string): Promise<string> {
    const filename = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('public-assets')
      .upload(`${folder}/${filename}`, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data } = supabase.storage
      .from('public-assets')
      .getPublicUrl(`${folder}/${filename}`);

    return data.publicUrl;
  }

  async function saveSettings() {
    try {
      saving = true;
      error = null;

      if (!event) throw new Error('No event loaded');

      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: settings.event_name,
          settings_json: {
            ...settings,
            event_name: undefined // Remove the duplicate field
          }
        })
        .eq('id', eventUuid);

      if (updateError) throw updateError;

      showToast('Settings saved successfully!', 'success');
      unsavedChanges = false;
    } catch (err: any) {
      console.error('Error saving settings:', err);
      error = err.message;
      showToast(`Error saving settings: ${err.message}`, 'error');
    } finally {
      saving = false;
    }
  }

  async function archiveEvent() {
    if (!confirm('Are you sure you want to archive this event? This action cannot be undone.')) {
      return;
    }
    
    try {
      saving = true;
      error = null;
      
      const { error: updateError } = await supabase
        .from('events')
        .update({
          settings_json: {
            ...settings,
            archived: true,
            event_name: undefined
          }
        })
        .eq('id', eventUuid);
        
      if (updateError) throw updateError;
      
      settings.archived = true;
      showToast('Event archived successfully', 'success');
      unsavedChanges = false;
    } catch (err: any) {
      console.error('Error archiving event:', err);
      error = err.message;
      showToast(`Error archiving event: ${err.message}`, 'error');
    } finally {
      saving = false;
    }
  }

  async function togglePublishedLocally(playerId: string) {
    try {
      const player = playerScores.find(p => p.id === playerId);
      if (!player) return;
      
      const newStatus = !player.published;
      
      // Update local state immediately for better UX
      modifiedScores.set(playerId, newStatus);
      player.published = newStatus;
      
      // Update the database
      const { error } = await supabase
        .from('scorecard')
        .update({ published: newStatus })
        .eq('player_id', playerId)
        .eq('event_id', eventUuid);
        
      if (error) throw error;
      
      showToast(`Score ${newStatus ? 'published' : 'unpublished'} successfully`, 'success');
    } catch (err) {
      console.error('Error updating publish status:', err);
      showToast('Failed to update publish status', 'error');
      
      // Revert local changes on error
      const player = playerScores.find(p => p.id === playerId);
      if (player) {
        player.published = !player.published;
        modifiedScores.set(playerId, player.published);
      }
    }
  }
  
  function cancelChanges() {
    // Reload the event to discard changes
    loadEventAndSettings();
  }

  onMount(() => {
    loadEventAndSettings();
    setupRealtimeUpdates();
    
    return () => {
      // Cleanup subscription on component destroy
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  });
  
  function setupRealtimeUpdates() {
    if (!eventUuid) return;
    
    // Remove existing subscription if any
    if (subscription) {
      supabase.removeChannel(subscription);
    }
    
    // Subscribe to changes in the scorecard table for this event
    subscription = supabase
      .channel('scorecard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scorecard',
          filter: `event_id=eq.${eventUuid}`
        },
        (payload) => {
          console.log('Scorecard change detected:', payload);
          loadPlayerScores(); // Reload scores when changes occur
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
  }
</script>

<style>
  .event-settings-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  /* Checkbox styling */
  .checkbox-container {
    display: flex;
    align-items: flex-start;
    position: relative;
    padding-left: 35px;
    margin-bottom: 12px;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1.5;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  
  .checkbox-container input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }
  
  .checkmark {
    position: absolute;
    top: 0;
    left: 0;
    height: 24px;
    width: 24px;
    background-color: #fff;
    border: 2px solid #ccc;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .checkbox-container:hover input ~ .checkmark {
    border-color: var(--accent-color, #00c853);
  }
  
  .checkbox-container input:checked ~ .checkmark {
    background-color: var(--accent-color, #00c853);
    border-color: var(--accent-color, #00c853);
  }
  
  .checkmark:after {
    content: "";
    position: absolute;
    display: none;
  }
  
  .checkbox-container input:checked ~ .checkmark:after {
    display: block;
  }
  
  .checkbox-container .checkmark:after {
    left: 7px;
    top: 3px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    -webkit-transform: rotate(45deg);
    -ms-transform: rotate(45deg);
    transform: rotate(45deg);
  }
  
  .helper-text {
    color: #666;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    margin-left: -35px;
    padding-left: 35px;
    line-height: 1.4;
  }
</style>

<DashboardHeader 
  organizationName={organization?.name || 'My'}
  eventTitle={event?.title || 'Event Setup'}
/>

<div class="event-settings-container">
  {#if loading}
    <div class="loading">Loading event settings...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else}
    <form on:submit|preventDefault={saveSettings} class="event-settings-form">
      <div class="event-sections-wrapper">
        <section class="event-section">
          <h2>Event Settings</h2>
          <label for="event-name" class="form-label">Event Title</label>
          <input id="event-name" type="text" bind:value={settings.event_name} placeholder="Enter event name" />

          <label for="hole-count" class="form-label" style="margin-top: var(--spacing-md);">Number of Holes</label>
          <div style="display: flex; align-items: center; gap: var(--spacing-lg);">
            <input
              id="hole-count"
              class="number-box"
              type="number"
              min="1"
              bind:value={settings.hole_count}
              on:input={() => { settings.hole_count = Math.max(1, +settings.hole_count); unsavedChanges = true; }}
              style="width: 60px; text-align: center;"
            />
            <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
              <button type="button" class="number-btn" on:click={() => { settings.hole_count = +settings.hole_count + 1; unsavedChanges = true; }} aria-label="Increase holes"><Plus size={28} /></button>
              <button type="button" class="number-btn" on:click={() => { if (+settings.hole_count > 1) { settings.hole_count = +settings.hole_count - 1; unsavedChanges = true; } }} aria-label="Decrease holes" disabled={+settings.hole_count <= 1}><Minus size={28} /></button>
            </div>
          </div>

          <label class="form-label" style="margin-top: var(--spacing-md);">Accent Colour</label>
          <div class="color-picker">
            <button 
              type="button" 
              class="color-swatch" 
              style="background: {settings.accent_color};"
              on:click={() => document.getElementById('color-input')?.click()}
              aria-label="Pick a color"
              title="Click to choose a color"
            ></button>
            <input 
              id="color-input"
              type="color" 
              bind:value={settings.accent_color}
              on:input={() => {
                unsavedChanges = true;
                // Update the hex display
                const hexDisplay = document.querySelector('.hex-display');
                if (hexDisplay) hexDisplay.textContent = settings.accent_color.toUpperCase();
              }}
              style="position: absolute; opacity: 0; width: 1px; height: 1px;"
              aria-hidden="true"
            />
            <div class="hex-input">
              <span class="hex-prefix">#</span>
              <input 
                type="text" 
                class="hex-value" 
                value={settings.accent_color.startsWith('#') ? settings.accent_color.slice(1).toUpperCase() : settings.accent_color.toUpperCase()}
                on:input={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '');
                  if (value.length <= 6) {
                    settings.accent_color = '#' + value;
                    unsavedChanges = true;
                  }
                }}
                on:blur={() => {
                  // Ensure we always have a valid color
                  if (settings.accent_color === '#') {
                    settings.accent_color = '#000000';
                  }
                }}
                maxlength="6"
                aria-label="Hex color code"
                placeholder="RRGGBB"
              />
              <span class="hex-display" on:click={() => {
                const input = document.querySelector('.hex-value');
                if (input) input.focus();
              }}>
                {settings.accent_color.startsWith('#') ? settings.accent_color.slice(1).toUpperCase() : settings.accent_color.toUpperCase()}
              </span>
            </div>
          </div>

          <h3 style="margin-top: var(--spacing-lg);">Advertisement Settings</h3>
          <div class="form-group" style="margin-top: var(--spacing-lg);">
            <label class="checkbox-container">
              <input 
                type="checkbox" 
                bind:checked={settings.show_on_main_leaderboard}
                on:change={() => unsavedChanges = true}
              />
              <span class="checkmark"></span>
              {#if settings.event_type === 'ongoing'}
                Show this event on the main leaderboard when scores are being submitted
              {:else}
                Show this event on the main leaderboard on event day when scores are being submitted
              {/if}
            </label>
            <p class="helper-text">
              When enabled, this event will automatically appear on the organization's main leaderboard 
              {settings.event_type === 'ongoing' ? 'whenever scores are being submitted' : 'on the event day when scores are being submitted'}.
            </p>
          </div>

          <h3 style="margin-top: var(--spacing-lg);">Advertisement Settings</h3>
          <label for="scorecard-ad-text" class="form-label">Ad Text</label>
          <input id="scorecard-ad-text" type="text" bind:value={settings.scorecard_ad_text} placeholder="e.g., Want Club Green mini-golf for your event?" />
          <label for="scorecard-ad-url" class="form-label">Ad Link URL</label>
          <input id="scorecard-ad-url" type="url" bind:value={settings.scorecard_ad_url} placeholder="https://clubgreen.au" />

          <div class="form-actions" style="margin-top: var(--spacing-md); display: flex; gap: var(--spacing-md);">
            <button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
            <button type="button" class="btn btn-secondary" on:click={cancelChanges} disabled={!unsavedChanges}>Cancel</button>
            <button type="button" class="btn btn-danger" on:click={archiveEvent} disabled={saving || settings.archived}>{settings.archived ? 'Archived' : 'Archive Event'}</button>
          </div>
        </section>
        <div class="event-divider"></div>
        <section class="event-section">
          <h2>Player Management</h2>
          {#if playerScores.length === 0}
            <div class="empty-state"><p>No players found for this event.</p></div>
          {:else}
            <div class="player-table-container">
              <table class="player-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Hole-in-Ones</th>
                    <th>Visible</th>
                  </tr>
                </thead>
                <tbody>
                  {#each playerScores as player}
                    <tr>
                      <td>{player.name}</td>
                      <td>{player.totalScore}</td>
                      <td>{player.holeInOnes || 0}</td>
                      <td>
                        <label class="switch">
                          <input type="checkbox" checked={player.published} on:change={() => togglePublishedLocally(player.id)} />
                          <span class="slider round"></span>
                        </label>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </section>
      </div>
    </form>
  {/if}
</div>
