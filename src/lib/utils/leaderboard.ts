import type { Event } from '$lib/types/event';

/**
 * Get today's date in ISO format (YYYY-MM-DD) in the local timezone
 */
export function getTodayISO(): string {
  const today = new Date();
  const tzOffsetMs = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - tzOffsetMs).toISOString().split('T')[0];
}

/**
 * Check if an event should be displayed based on its settings and scores
 */
export function shouldDisplayEvent(event: Event, scoreCount: number, today: string): boolean {
  // Must be published
  if (!event.published) return false;
  
  // Check if explicitly hidden in settings (defaults to true if not set)
  const showInLeaderboard = event.settings_json?.show_on_main_leaderboard ?? true;
  if (!showInLeaderboard) return false;
  
  // Event date must be today
  if (event.event_date !== today) return false;
  
  // Must have at least one score
  return scoreCount > 0;
}

/**
 * Get events that should be displayed on the leaderboard
 * @param events - Array of events to filter
 * @param scoreCounts - Object mapping event IDs to their score counts
 * @param limit - Maximum number of events to return (default: no limit)
 * @returns Filtered and sorted array of events
 */
export function getDisplayableEvents(
  events: Event[], 
  scoreCounts: Record<string, number> = {},
  limit = Infinity
): Event[] {
  if (!events?.length) return [];
  
  const today = getTodayISO();
  
  const filteredEvents = events
    .filter(event => shouldDisplayEvent(event, scoreCounts[event.id] || 0, today));
    
  return sortDisplayableEvents(filteredEvents).slice(0, limit);
}

/**
 * Check if an event has displayable scores
 */
export function hasDisplayableScores(eventId: string, scoreCounts: Record<string, number>): boolean {
  return (scoreCounts[eventId] || 0) > 0;
}

/**
 * Sort events based on custom display order
 * Primary sort: event_date (newest first)
 * Secondary sort: created_at (newest first) for tie-breaking
 */
export function sortDisplayableEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    // First try to sort by event_date (newest first)
    if (a.event_date && b.event_date) {
      const dateCompare = b.event_date.localeCompare(a.event_date);
      if (dateCompare !== 0) return dateCompare;
    }
    
    // Fall back to created_at for tie-breaking
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
