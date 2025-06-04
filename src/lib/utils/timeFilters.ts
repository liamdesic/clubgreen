/**
 * Utility functions for time-based filtering of scores
 */

export type ScoreTimeRange = 'all_time' | 'past_day' | 'past_hour' | 'past_week' | 'past_month';

/**
 * Get the timestamp for the cutoff date based on the specified time range
 * @param timeRange - The time range to calculate the cutoff for
 * @returns ISO timestamp string for the cutoff date, or null for 'all_time'
 */
export function getTimeRangeCutoff(timeRange: ScoreTimeRange): string | null {
  // For 'all_time', return null (no filtering)
  if (timeRange === 'all_time') {
    return null;
  }

  const now = new Date();
  let cutoffDate: Date;

  switch (timeRange) {
    case 'past_hour':
      cutoffDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      break;
    case 'past_day':
      cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      break;
    case 'past_week':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      break;
    case 'past_month':
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      break;
    default:
      return null;
  }

  return cutoffDate.toISOString();
}

/**
 * Get a human-readable label for a time range
 * @param timeRange - The time range to get a label for
 * @returns Human-readable label for the time range
 */
export function getTimeRangeLabel(timeRange: ScoreTimeRange): string {
  switch (timeRange) {
    case 'all_time':
      return 'All Time';
    case 'past_hour':
      return 'Past Hour';
    case 'past_day':
      return 'Past 24 Hours';
    case 'past_week':
      return 'Past Week';
    case 'past_month':
      return 'Past Month';
    default:
      return 'All Time';
  }
}
