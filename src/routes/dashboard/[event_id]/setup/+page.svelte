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

  interface Settings {
    event_name: string;
    hole_count: number;
    accent_color: string;
    show_hole_in_ones: boolean;
    published: boolean;
    enable_ads: boolean;
    ads_text: string;
    scorecard_ad_text: string;
    scorecard_ad_url: string;
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
    show_hole_in_ones: true,
    published: false,
    enable_ads: false,
    ads_text: '',
    scorecard_ad_text: '',
    scorecard_ad_url: 'https://clubgreen.au'
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
        event_name: data.title || '',
        published: data.published ?? false
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
      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: settings.event_name,
          published: settings.published,
          settings_json: {
            hole_count: settings.hole_count,
            accent_color: settings.accent_color,
            show_hole_in_ones: settings.show_hole_in_ones,
            enable_ads: settings.enable_ads,
            ads_text: settings.ads_text,
            scorecard_ad_text: settings.scorecard_ad_text,
            scorecard_ad_url: settings.scorecard_ad_url
          }
        })
        .eq('id', eventUuid);

      if (updateError) throw updateError;

      // Update player visibilities
      const updates = [];
      for (const [playerId, newStatus] of modifiedScores.entries()) {
        updates.push(
          supabase
            .from('scorecard')
            .update({ published: newStatus })
            .eq('player_id', playerId)
            .eq('event_id', eventUuid)
        );
      }
      
      if (updates.length > 0) {
        const results = await Promise.all(updates);
        const errors = results.filter((r: any) => r.error).map((r: any) => r.error);
        if (errors.length > 0) {
          console.error('Some player updates failed:', errors);
        }
      }

      modifiedScores.clear();
      unsavedChanges = false;
      showToast('Settings saved successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      showToast(`Error: ${err.message}`, 'error');
      error = err.message;
    } finally {
      saving = false;
    }
  }

  function togglePublishedLocally(playerId: string) {
    const index = playerScores.findIndex(p => p.id === playerId);
    if (index === -1) return;

    const updatedPlayer = {
      ...playerScores[index],
      published: !playerScores[index].published
    };

    playerScores = [
      ...playerScores.slice(0, index),
      updatedPlayer,
      ...playerScores.slice(index + 1)
    ] as PlayerScore[];

    modifiedScores.set(playerId, updatedPlayer.published);
    unsavedChanges = true;
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
      <div class="settings-grid">
        <!-- Left Column: Event Settings -->
        <div class="settings-column">
          <h2>Event Settings</h2>
          
          <div class="form-group">
            <label for="event-name">Event Name</label>
            <input 
              id="event-name"
              type="text" 
              bind:value={settings.event_name}
              placeholder="Enter event name"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="hole-count">Number of Holes</label>
            <input 
              id="hole-count"
              type="number" 
              min="1" 
              max="18" 
              bind:value={settings.hole_count}
              class="form-control"
            />
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={settings.show_hole_in_ones}
                class="form-checkbox"
              />
              <span>Show Holes-in-One</span>
            </label>
          </div>

          <div class="form-group">
            <label for="accent-color">Accent Color</label>
            <div class="color-picker">
              <input 
                id="accent-color"
                type="color" 
                bind:value={settings.accent_color}
                class="form-color"
              />
              <span class="color-value">{settings.accent_color}</span>
            </div>
          </div>

          <div class="form-group">
            <h3>Advertisement Settings</h3>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={settings.enable_ads}
                class="form-checkbox"
              />
              <span>Enable Ads</span>
            </label>
            
            {#if settings.enable_ads}
              <div class="form-group">
                <label for="ad-text">Ad Text</label>
                <input 
                  id="ad-text"
                  type="text" 
                  bind:value={settings.ads_text}
                  placeholder="Enter ad text"
                  class="form-control"
                />
              </div>
            {/if}

            <div class="form-group">
              <h3>Scorecard Ad</h3>
              <div class="form-group">
                <label for="scorecard-ad-text">Ad Text</label>
                <input 
                  id="scorecard-ad-text"
                  type="text" 
                  bind:value={settings.scorecard_ad_text}
                  placeholder="e.g., Want Club Green mini-golf for your event?"
                  class="form-control"
                />
              </div>
              <div class="form-group">
                <label for="scorecard-ad-url">Ad Link URL</label>
                <input 
                  id="scorecard-ad-url"
                  type="url" 
                  bind:value={settings.scorecard_ad_url}
                  placeholder="https://clubgreen.au"
                  class="form-control"
                />
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button 
              type="submit" 
              class="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            
            <label class="publish-toggle">
              <span>Publish Event:</span>
              <label class="switch">
                <input 
                  type="checkbox" 
                  bind:checked={settings.published}
                />
                <span class="slider round"></span>
              </label>
              <span class="publish-status">
                {settings.published ? 'Published' : 'Draft'}
              </span>
            </label>
          </div>
        </div>

        <!-- Right Column: Player Management -->
        <div class="settings-column">
          <h2>Player Management</h2>
          
          {#if playerScores.length === 0}
            <div class="empty-state">
              <p>No players found for this event.</p>
            </div>
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
                          <input 
                            type="checkbox"
                            checked={player.published}
                            on:change={() => togglePublishedLocally(player.id)}
                          />
                          <span class="slider round"></span>
                        </label>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      </div>
    </form>
  {/if}
</div>
