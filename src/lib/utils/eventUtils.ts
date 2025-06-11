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
async function countScoresForEvents(events: Event[]): Promise<Array<{ event: Event; scoreCount: number }>> {
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