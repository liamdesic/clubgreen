import { writable, derived } from 'svelte/store';
import type { Event } from '$lib/types/event';
import type { ScoreTimeRange } from '$lib/utils/timeFilters';
import { supabase } from '$lib/supabaseClient';
import { getDisplayableEvents } from '$lib/utils/leaderboard';

// Types
interface Score {
  id: string;
  player_id: string;
  event_id: string;
  created_at: string;
  hole_in_ones: number;
  score: number;
  name: string;
  total_score?: number;
}

interface PlayerScore extends Score {
  total_score: number;
  hole_in_ones: number;
}

interface LeaderboardState {
  loading: boolean;
  error: string | null;
  events: Event[];
  displayableEvents: Event[];
  currentEventIndex: number;
  currentFilterIndex: number;
  scoreCounts: Record<string, number>;
  eventLeaderboards: Record<string, Partial<Record<ScoreTimeRange, PlayerScore[]>>>;
  timeFilters: ScoreTimeRange[];
  currentTimeFilter: ScoreTimeRange;
}

// Create the store with initial state
function createLeaderboardStore() {
  const initialState: LeaderboardState = {
    loading: true,
    error: null,
    events: [],
    displayableEvents: [],
    currentEventIndex: 0,
    currentFilterIndex: 0,
    scoreCounts: {},
    eventLeaderboards: {},
    timeFilters: ['all_time'],
    currentTimeFilter: 'all_time'
  };

  const { subscribe, set, update } = writable<LeaderboardState>(initialState);

  // Cleanup function for subscriptions
  let realtimeChannel: any = null;

  return {
    subscribe,
    
    // Initialize the store with organization data
    async initialize(organizationId: string) {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        // Load events for this organization
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('organization_id', organizationId);
          
        if (eventsError) throw new Error(eventsError.message);
        
        // Load score counts for all events
        const eventIds = events.map(event => event.id);
        const { data: allScorecardEntries, error: scorecardsError } = await supabase
          .from('scorecard')
          .select('event_id') // Select only event_id for counting
          .in('event_id', eventIds);

        if (scorecardsError) throw new Error(scorecardsError.message);

        // Process score counts client-side
        const scoreCounts: Record<string, number> = {};
        // Initialize counts for all eventIds to 0
        for (const id of eventIds) {
            scoreCounts[id] = 0;
        }
        // Count occurrences
        if (allScorecardEntries) {
            for (const entry of allScorecardEntries) {
                if (entry.event_id) {
                    scoreCounts[entry.event_id]++;
                }
            }
        }
        
        // Update displayable events
        const displayableEvents = getDisplayableEvents(events, scoreCounts);
        
        // Set up initial time filters based on first event
        let timeFilters: ScoreTimeRange[] = ['all_time'];
        if (displayableEvents.length > 0) {
          const firstEvent = displayableEvents[0];
          timeFilters = [
            firstEvent.settings_json?.score_time_range || 'all_time',
            ...(firstEvent.settings_json?.additional_time_filters || [])
          ] as ScoreTimeRange[];
        }
        
        // Update the store
        update(state => ({
          ...state,
          loading: false,
          events,
          displayableEvents,
          scoreCounts,
          timeFilters,
          currentTimeFilter: timeFilters[0],
          currentEventIndex: 0,
          currentFilterIndex: 0
        }));
        
        // If we have displayable events, load the first one
        if (displayableEvents.length > 0) {
          await this.loadLeaderboardForEvent(displayableEvents[0].id, timeFilters[0]);
        }
        
        // Set up realtime subscription
        this.setupRealtimeSubscription(eventIds);
        
      } catch (err) {
        console.error('Error initializing leaderboard store:', err);
        update(state => ({ 
          ...state, 
          loading: false, 
          error: err instanceof Error ? err.message : 'Failed to load leaderboard data' 
        }));
      }
    },
    
    // Load leaderboard data for a specific event and time filter
    async loadLeaderboardForEvent(eventId: string, timeFilter: ScoreTimeRange = 'all_time') {
      console.log(`[LeaderboardStore] Loading leaderboard for event ${eventId} with time filter ${timeFilter}`);
      update(state => ({ ...state, loading: true }));
      
      try {
        // Find the event
        let state: LeaderboardState;
        update(s => {
          state = s;
          return s;
        });
        
        const event = state.events.find(e => e.id === eventId);
        if (!event) {
          console.error(`[LeaderboardStore] Event ${eventId} not found in state.events:`, state.events);
          throw new Error(`Event ${eventId} not found`);
        }
        
        console.log(`[LeaderboardStore] Found event:`, event);
        
        try {
          console.log(`[LeaderboardStore] Loading scores for event ${eventId} with time filter ${timeFilter}`);
          
          // Build the query based on the time filter
          console.log(`[LeaderboardStore] Building query for event ${eventId}`);
          
          // Let's first check what columns are available in the scorecard table
          try {
            const { data: tableInfo, error: tableError } = await supabase
              .from('scorecard')
              .select('*')
              .limit(1);
              
            if (tableError) {
              console.error(`[LeaderboardStore] Error checking scorecard table:`, tableError);
            } else {
              console.log(`[LeaderboardStore] Scorecard table sample:`, tableInfo);
              if (tableInfo && tableInfo[0]) {
                console.log(`[LeaderboardStore] Available columns:`, Object.keys(tableInfo[0]));
              }
            }
          } catch (tableCheckErr) {
            console.error(`[LeaderboardStore] Exception checking table structure:`, tableCheckErr);
          }
          
          // Now build the actual query
          let query = supabase
            .from('scorecard')
            .select('id, player_id, event_id, created_at, hole_in_ones, score, name')
            .eq('event_id', eventId);
            
          // Apply time filter if not all_time
          if (timeFilter !== 'all_time') {
            const cutoffTimestamp = getTimeFilterCutoff(timeFilter);
            if (cutoffTimestamp) {
              query = query.gte('created_at', cutoffTimestamp);
              console.log(`[LeaderboardStore] Applying time filter cutoff: ${cutoffTimestamp}`);
            }
          }
          
          // Add published filter
          query = query.eq('published', true);
          
          // Log the query we're about to execute
          console.log(`[LeaderboardStore] Executing query for event ${eventId}:`, query);
          
          // Execute query
          console.log(`[LeaderboardStore] About to execute query...`);
          const { data, error } = await query;
          
          if (error) {
            console.error(`[LeaderboardStore] Error fetching scores:`, error);
            throw error;
          }
          
          // Process scores
          if (!data || data.length === 0) {
            console.log(`[LeaderboardStore] No scores found for event ${eventId} with time filter ${timeFilter}`);
            update(state => ({ 
              ...state, 
              loading: false
            }));
            return;
          }
          
          console.log(`[LeaderboardStore] Fetched ${data.length} scores for event ${eventId}:`, data);
          
          // Process scores
          const scores = this.processScores(data);
          
          // Update the store with the new scores
          update(s => {
            const newEventLeaderboards = { ...s.eventLeaderboards };
            if (!newEventLeaderboards[eventId]) {
              newEventLeaderboards[eventId] = {};
            }
            newEventLeaderboards[eventId][timeFilter] = scores;
            
            return {
              ...s,
              loading: false,
              eventLeaderboards: newEventLeaderboards,
              currentTimeFilter: timeFilter,
              currentFilterIndex: s.timeFilters.indexOf(timeFilter)
            };
          });
        } catch (err) {
          console.error(`[LeaderboardStore] Error loading leaderboard for event ${eventId}:`, err);
          update(state => ({ 
            ...state, 
            loading: false, 
            error: err instanceof Error ? err.message : `Failed to load leaderboard for event ${eventId}` 
          }));
        }
        
      } catch (err) {
        console.error(`Error loading leaderboard for event ${eventId}:`, err);
        update(state => ({ 
          ...state, 
          loading: false, 
          error: err instanceof Error ? err.message : `Failed to load leaderboard for event ${eventId}` 
        }));
      }
    },
    
    // Process scores from scorecard data
    processScores(rows: Score[]): PlayerScore[] {
      if (!rows) return [];
      const playerMap = new Map<string, PlayerScore>();
      
      for (const row of rows) {
        const playerId = row.player_id;
        
        if (!playerMap.has(playerId)) {
          playerMap.set(playerId, {
            ...row,
            total_score: row.score || 0,
            hole_in_ones: row.hole_in_ones || 0
          });
        } else {
          const existing = playerMap.get(playerId)!;
          existing.total_score += row.score || 0;
          existing.hole_in_ones += row.hole_in_ones || 0;
        }
      }
      
      // Convert to array and sort by score (ascending)
      return Array.from(playerMap.values())
        .sort((a, b) => a.total_score - b.total_score);
    },
    
    // Set up realtime subscription for score updates
    setupRealtimeSubscription(eventIds: string[]) {
      // Clean up any existing subscription
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
      
      // Set up new subscription
      realtimeChannel = supabase
        .channel('public:scorecards')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'scorecards',
          filter: `event_id=in.(${eventIds.join(',')})`
        }, (payload) => {
          this.handleScoreUpdate(payload);
        })
        .subscribe();
    },
    
    // Handle score update from realtime subscription
    handleScoreUpdate(payload: any) {
      const eventId = payload.new?.event_id;
      if (!eventId) return;
      
      // Debounce updates - in a real implementation, we'd use a proper debounce mechanism
      setTimeout(async () => {
        try {
          // Get current state
          let state: LeaderboardState;
          update(s => {
            state = s;
            return s;
          });
          
          // Reload the leaderboard for this event if it's the current event
          if (state.displayableEvents[state.currentEventIndex]?.id === eventId) {
            await this.loadLeaderboardForEvent(eventId, state.currentTimeFilter);
          }
          
          // Update score counts
          const { data, error } = await supabase
            .from('scorecard')
            .select('count(*)')
            .eq('event_id', eventId)
            .single();
            
          if (!error && data) {
            update(s => ({
              ...s,
              scoreCounts: {
                ...s.scoreCounts,
                [eventId]: parseInt(data.count)
              }
            }));
          }
        } catch (err) {
          console.error('Error processing score update:', err);
        }
      }, 500);
    },
    
    // Rotate to the next event or time filter
    async rotateNext() {
      update(state => {
        // First try to rotate through time filters if there are multiple
        if (state.timeFilters.length > 1) {
          const nextFilterIndex = (state.currentFilterIndex + 1) % state.timeFilters.length;
          const nextTimeFilter = state.timeFilters[nextFilterIndex];
          
          // If we already have this data cached, just update the current filter
          if (state.displayableEvents[state.currentEventIndex]?.id &&
              state.eventLeaderboards[state.displayableEvents[state.currentEventIndex].id]?.[nextTimeFilter]) {
            return {
              ...state,
              currentFilterIndex: nextFilterIndex,
              currentTimeFilter: nextTimeFilter
            };
          }
        }
        
        // If we can't rotate through time filters, rotate to the next event
        if (state.displayableEvents.length <= 1) {
          return state;
        }
        
        const nextEventIndex = (state.currentEventIndex + 1) % state.displayableEvents.length;
        const nextEvent = state.displayableEvents[nextEventIndex];
        
        // Update time filters for the next event
        const nextTimeFilters = [
          nextEvent.settings_json?.score_time_range || 'all_time',
          ...(nextEvent.settings_json?.additional_time_filters || [])
        ] as ScoreTimeRange[];
        
        return {
          ...state,
          currentEventIndex: nextEventIndex,
          timeFilters: nextTimeFilters,
          currentFilterIndex: 0,
          currentTimeFilter: nextTimeFilters[0]
        };
      });
      
      // Load the leaderboard for the new event/filter if needed
      let state: LeaderboardState;
      update(s => {
        state = s;
        return s;
      });
      
      const currentEvent = state.displayableEvents[state.currentEventIndex];
      if (currentEvent?.id) {
        await this.loadLeaderboardForEvent(currentEvent.id, state.currentTimeFilter);
      }
    },
    
    // Rotate to the previous event
    async rotatePrevious() {
      update(state => {
        if (state.displayableEvents.length <= 1) {
          return state;
        }
        
        // Calculate the previous event index
        const prevEventIndex = state.currentEventIndex === 0 
          ? state.displayableEvents.length - 1 
          : state.currentEventIndex - 1;
          
        const prevEvent = state.displayableEvents[prevEventIndex];
        
        // Update time filters for the previous event
        const prevTimeFilters = [
          prevEvent.settings_json?.score_time_range || 'all_time',
          ...(prevEvent.settings_json?.additional_time_filters || [])
        ] as ScoreTimeRange[];
        
        return {
          ...state,
          currentEventIndex: prevEventIndex,
          timeFilters: prevTimeFilters,
          currentFilterIndex: 0,
          currentTimeFilter: prevTimeFilters[0]
        };
      });
      
      // Load the leaderboard for the new event/filter if needed
      let state: LeaderboardState;
      update(s => {
        state = s;
        return s;
      });
      
      const currentEvent = state.displayableEvents[state.currentEventIndex];
      if (currentEvent?.id) {
        await this.loadLeaderboardForEvent(currentEvent.id, state.currentTimeFilter);
      }
    },
    
    // Clean up resources
    cleanup() {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
      }
    }
  };
}

// Create and export the store
export const leaderboardStore = createLeaderboardStore();

// Derived stores for convenience
export const currentEvent = derived(leaderboardStore, $store => 
  $store.displayableEvents[$store.currentEventIndex] || null
);

export const currentLeaderboard = derived(leaderboardStore, $store => {
  const event = $store.displayableEvents[$store.currentEventIndex];
  if (!event) return [];
  
  return $store.eventLeaderboards[event.id]?.[$store.currentTimeFilter] || [];
});

export const hasEvents = derived(leaderboardStore, $store => 
  $store.displayableEvents.length > 0
);
