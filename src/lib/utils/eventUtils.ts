import { supabase } from '$lib/supabaseClient';
import { getEventStatus } from './eventStatus';
import type { Database } from '$lib/database.types';
import { showToast } from '$lib/stores/toastStore';

type Event = Database['public']['Tables']['events']['Row'];

/**
 * Fetches all events for an organization
 */
async function getEventsForOrg(orgId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organization_id', orgId);

  if (error) {
    console.error('Error fetching events:', error);
    showToast('Unable to load events', 'error');
    return [];
  }

  return data || [];
}

/**
 * Counts scores for a batch of events
 */
export async function countScoresForEvents(events: Event[]): Promise<Array<{ event: Event; scoreCount: number }>> {
  const eventIds = events.map(e => e.id);
  
  const { data, error } = await supabase
    .from('scorecard')
    .select('event_id')
    .in('event_id', eventIds);

  if (error) {
    console.error('Error counting scores:', error);
    showToast('Unable to count scores', 'error');
    return events.map(event => ({ event, scoreCount: 0 }));
  }

  // Count scores per event
  const scoreCounts = new Map<string, number>();
  data?.forEach(row => {
    const count = scoreCounts.get(row.event_id || '') || 0;
    scoreCounts.set(row.event_id || '', count + 1);
  });

  return events.map(event => ({
    event,
    scoreCount: scoreCounts.get(event.id) || 0
  }));
}

/**
 * Gets all live and visible events for an organization
 * Filters based on:
 * 1. show_on_main_leaderboard flag
 * 2. Event status (must be live)
 * 3. Score count (must have scores)
 */
export async function getLiveVisibleEventsForOrg(orgId: string): Promise<Event[]> {
  try {
    // 1. Get all events for org
    const allEvents = await getEventsForOrg(orgId);
    
    // 2. Count scores for all events
    const withScores = await countScoresForEvents(allEvents);
    
    // 3. Filter to only live, visible events
    return withScores
      .filter(({ event, scoreCount }) => 
        event.show_on_main_leaderboard && 
        getEventStatus(event, scoreCount).isLive
      )
      .map(({ event }) => event);
      
  } catch (err) {
    console.error('Error in getLiveVisibleEventsForOrg:', err);
    showToast('Unable to load live events', 'error');
    return [];
  }
}

/**
 * Generates leaderboard boards for all live events and their time filters
 * Used for organization leaderboard rotation
 */
export async function generateOrgLeaderboardBoards(liveEvents: Event[]): Promise<import('$lib/runtime/board.types').LeaderboardBoard[]> {
  const boards: import('$lib/runtime/board.types').LeaderboardBoard[] = [];
  
  for (const event of liveEvents) {
    // Get time filters from event, default to ['all_time'] if not set
    let timeFilters: string[] = ['all_time'];
    
    if (event.time_filters) {
      try {
        const parsed = typeof event.time_filters === 'string' 
          ? JSON.parse(event.time_filters) 
          : event.time_filters;
        if (Array.isArray(parsed)) {
          timeFilters = parsed;
        }
      } catch (err) {
        console.warn('Failed to parse time_filters for event', event.id, err);
      }
    }
    
    // Get all snapshots for this event's time filters
    const { data: snapshots } = await supabase
      .from('leaderboard_snapshot')
      .select('id, time_filter, scores')
      .eq('event_id', event.id)
      .in('time_filter', timeFilters);

    if (!snapshots?.length) continue;
    
    // Create a board for each snapshot
    for (const snapshot of snapshots) {
      boards.push({
        id: snapshot.id, // Use snapshot UUID as board ID
        eventId: event.id,
        timeFilter: snapshot.time_filter as import('$lib/validations/timeFilter').TimeFilter,
        title: `${event.title} (${getTimeFilterLabel(snapshot.time_filter)})`,
        priority: 1
      });
    }
  }
  
  return boards;
}

/**
 * Gets a human-readable label for a time filter
 */
function getTimeFilterLabel(timeFilter: string): string {
  const labels: Record<string, string> = {
    'all_time': 'All Time',
    'last_hour': 'Last Hour',
    'last_day': 'Last Day', 
    'last_week': 'Last Week',
    'last_month': 'Last Month',
    'since_start_of_hour': 'This Hour',
    'since_start_of_day': 'Today',
    'since_start_of_month': 'This Month'
  };
  return labels[timeFilter] || timeFilter;
} 