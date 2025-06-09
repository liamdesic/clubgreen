import { z } from 'zod';

export const timeFilterSchema = z.enum([
  'all_time',
  'last_hour',
  'last_day',
  'last_week',
  'last_month',
  'since_start_of_hour',
  'since_start_of_day',
  'since_start_of_month',
]);

export type TimeFilter = z.infer<typeof timeFilterSchema>;

/**
 * Schema for time filter settings in events
 */
export const eventTimeFiltersSchema = z.array(timeFilterSchema).default(['all_time']);

export type EventTimeFilters = z.infer<typeof eventTimeFiltersSchema>;

/**
 * Validates a time filter value
 */
export function validateTimeFilter(value: unknown): TimeFilter | null {
  const result = timeFilterSchema.safeParse(value);
  return result.success ? result.data : null;
}
