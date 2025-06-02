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
  // Debug log for filtering
  console.log(`[Leaderboard Debug] Checking event ${event.id} - ${event.title}:`, {
    showInLeaderboard: event.settings_json?.show_on_main_leaderboard ?? true,
    event_date: event.event_date,
    today: today,
    scoreCount: scoreCount
  });
  
  // Note: published flag check removed as it's deprecated
  
  // Check if explicitly hidden in settings (defaults to true if not set)
  const showInLeaderboard = event.settings_json?.show_on_main_leaderboard ?? true;
  if (!showInLeaderboard) {
    console.log(`[Leaderboard Debug] Event ${event.id} filtered out: show_on_main_leaderboard is false`);
    return false;
  }
  
  // Event date logic:
  // - If event_date is null, always show it (ongoing event)
  // - If event_date is set, it must be today (one-day event)
  if (event.event_date !== null && event.event_date !== today) {
    console.log(`[Leaderboard Debug] Event ${event.id} filtered out: date ${event.event_date} is not today (${today})`);
    return false;
  }
  
  // Must have at least one score
  if (scoreCount <= 0) {
    console.log(`[Leaderboard Debug] Event ${event.id} filtered out: no scores (count: ${scoreCount})`);
    return false;
  }
  
  console.log(`[Leaderboard Debug] Event ${event.id} WILL BE DISPLAYED`);
  return true;
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
