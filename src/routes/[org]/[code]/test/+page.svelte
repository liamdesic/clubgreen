<script lang="ts">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabaseClient';
    import { triggerLeaderboardUpdate } from '$lib/utils/leaderboardUtils';
    import { timeFilterSchema, type TimeFilter } from '$lib/validations/timeFilter';
    import type { ScorecardInsert } from '$lib/validations';
    import { showToast } from '$lib/stores/toastStore';
    import { generateAccessUUID } from '$lib/utils/codeUtils';
    import { normalizeEvent } from '$lib/validations';
  
    let loading = false;
    let success = false;
    let error: string | null = null;
    let eventId: string | null = null;
    let holeCount = 9;
    let access_uuid = '';
    let eventName = '';
    let enabledTimeFilters: TimeFilter[] = [];
    
    const TEST_PLAYERS = [
      'Tiger Woods', 'Rory McIlroy', 'Jon Rahm', 'Scottie Scheffler',
      'Jordan Spieth', 'Justin Thomas', 'Collin Morikawa', 'Viktor Hovland'
    ];
  
    const generateRandomScore = () => Math.floor(Math.random() * 5) + 2;
  
    onMount(async () => {
      console.log('🔄 [test/+page.svelte] onMount started');
      const shortcode = $page.params.code;
      console.log('🔑 [test/+page.svelte] Looking up event with shortcode:', shortcode);
      
      try {
        const { data, error: fetchError } = await supabase
          .from('events')
          .select('*')
          .eq('short_code', shortcode)
          .maybeSingle();
  
        console.log('📥 [test/+page.svelte] Supabase response:', { data, fetchError });
  
        if (fetchError) {
          console.error('❌ [test/+page.svelte] Fetch error:', fetchError);
          error = 'Failed to load event.';
          showToast('Failed to load event data', 'error');
          return;
        }

        if (!data) {
          console.warn('⚠️ [test/+page.svelte] No event found for shortcode:', shortcode);
          error = 'Event not found.';
          showToast('Event not found', 'error');
          return;
        }
  
        console.log('✅ [test/+page.svelte] Event found:', data);
        const normalizedEvent = normalizeEvent(data);
        if (!normalizedEvent.id) {
          throw new Error('Event ID is required');
        }
        eventId = normalizedEvent.id;
        holeCount = normalizedEvent.hole_count || 9;
        access_uuid = normalizedEvent.access_uuid;
        eventName = normalizedEvent.title;
        enabledTimeFilters = normalizedEvent.time_filters || ['all_time'];
        console.log('📝 [test/+page.svelte] Event details set:', { 
          eventId, 
          holeCount, 
          access_uuid, 
          eventName,
          enabledTimeFilters 
        });
      } catch (err) {
        console.error('🔥 [test/+page.svelte] Unexpected error:', err);
        error = 'An unexpected error occurred';
        showToast('An unexpected error occurred', 'error');
      }
    });
  
    async function insertTestScores() {
      if (!eventId) return;
  
      loading = true;
      error = null;
      success = false;
  
      try {
        const rows: ScorecardInsert[] = [];
  
        TEST_PLAYERS.forEach((player) => {
          const playerId = generateAccessUUID();
          for (let hole = 1; hole <= holeCount; hole++) {
            const score = generateRandomScore();
            rows.push({
              event_id: eventId!,
              player_id: playerId,
              name: player,
              score,
              hole_number: hole,
              hole_in_ones: score === 1 ? 1 : 0,
              published: true,
              game_id: null,
              tiebreaker_rank: null
            });
          }
        });
  
        const { error: insertError } = await supabase.from('scorecard').insert(rows);
  
        if (insertError) {
          throw insertError;
        }
  
        // Only trigger snapshots for enabled time filters
        console.log('🔄 [test/+page.svelte] Triggering snapshots for enabled filters:', enabledTimeFilters);
        for (const filter of enabledTimeFilters) {
          if (timeFilterSchema.safeParse(filter).success) {
            await triggerLeaderboardUpdate(eventId, filter);
          } else {
            console.warn('⚠️ [test/+page.svelte] Skipping invalid time filter:', filter);
          }
        }
  
        success = true;
      } catch (err: any) {
        error = err.message || 'Unknown error';
      } finally {
        loading = false;
      }
    }
  </script>
  
  <div class="container">
    <h1>Test Leaderboard</h1>
    {#if eventId}
      <p>Event: <strong>{eventName}</strong></p>
      <p>Event ID: <code>{eventId}</code></p>
      <p>Access UUID: <code>{access_uuid}</code></p>
  
      <button on:click={insertTestScores} disabled={loading}>
        {loading ? 'Inserting Scores...' : 'Insert Test Scores'}
      </button>
  
      {#if success}
        <p class="success">✅ Test scores inserted and snapshot triggered!</p>
        <a class="button" href={`/ob/${access_uuid}`}>View Leaderboard</a>
      {/if}
  
      {#if error}
        <p class="error">❌ {error}</p>
      {/if}
    {:else}
      <p>Loading event data...</p>
    {/if}
  </div>
  
  <style>
    .container {
      max-width: 700px;
      margin: 2rem auto;
      padding: 1rem;
    }
  
    button {
      padding: 0.6rem 1.2rem;
      font-size: 1rem;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 4px;
    }
  
    button:disabled {
      background: #ccc;
    }
  
    .success {
      margin-top: 1rem;
      color: green;
    }
  
    .error {
      margin-top: 1rem;
      color: red;
    }
  
    .button {
      display: inline-block;
      margin-top: 1rem;
      background: #2196f3;
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
    }
  </style>
  