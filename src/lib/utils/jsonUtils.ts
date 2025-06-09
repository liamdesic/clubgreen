/**
 * JSON utility functions
 * Centralized handling of JSON parsing with type safety
 */

import { z } from 'zod';

/**
 * Parse a JSON field with a given schema, handling both string and object inputs
 */
export function parseJSONField<T>(
  value: unknown, 
  schema: z.ZodType<T>
): T | null {
  if (value == null) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return schema.parse(parsed);
  } catch {
    return null;
  }
}
