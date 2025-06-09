import type { TimeFilter } from '$lib/validations/timeFilter';

/**
 * Utility functions for time-based filtering of scores
 */

/**
 * Get the timestamp for the cutoff date based on the specified time range
 * @param timeRange - The time range to calculate the cutoff for
 * @returns ISO timestamp string for the cutoff date, or null for 'all_time'
 */
export function getTimeRangeCutoff(timeRange: TimeFilter): string | null {
  // For 'all_time', return null (no filtering)
  if (timeRange === 'all_time') {
    return null;
  }

  const now = new Date();
  let cutoffDate: Date;

  switch (timeRange) {
    case 'last_hour':
      cutoffDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case 'last_day':
      cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'last_week':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'last_month':
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'since_start_of_hour':
      cutoffDate = new Date(now);
      cutoffDate.setMinutes(0, 0, 0);
      break;
    case 'since_start_of_day':
      cutoffDate = new Date(now);
      cutoffDate.setHours(0, 0, 0, 0);
      break;
    case 'since_start_of_month':
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
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
export function getTimeRangeLabel(timeRange: TimeFilter): string {
  switch (timeRange) {
    case 'last_hour':
      return 'Last Hour';
    case 'last_day':
      return 'Last 24 Hours';
    case 'last_week':
      return 'Last 7 Days';
    case 'last_month':
      return 'Last 30 Days';
    case 'since_start_of_hour':
      return 'This Hour';
    case 'since_start_of_day':
      return 'Today';
    case 'since_start_of_month':
      return 'This Month';
    case 'all_time':
    default:
      return 'All Time';
  }
}
