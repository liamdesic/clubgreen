// generalUtils.ts
// General-purpose utility functions for date/time, data transformation, and formatting
// All functions are type-safe and documented

// --- Date Utilities ---

/**
 * Convert a value to a Date if it's a valid date string
 */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Convert a value to an ISO string if it's a Date or date string
 */
export function toISOString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

/**
 * Formats a JS Date or ISO string to a consistent, human-friendly format.
 * @example
 * formatDateTime('2025-06-08T10:30:00Z') // Returns formatted date string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Returns a string like "2 hours ago", "just now", etc.
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000); // seconds
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) === 1 ? '' : 's'} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) === 1 ? '' : 's'} ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) === 1 ? '' : 's'} ago`;
  return formatDateTime(d);
}

/**
 * Checks if a date is today.
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/**
 * Checks if a date is within the current week (Sunday-Saturday).
 */
export function isThisWeek(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  // Get start of week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  // Get end of week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return d >= startOfWeek && d <= endOfWeek;
}

/**
 * Groups an array of objects by a key.
 * Example: groupBy(players, 'team')
 */
export function groupBy<T, K extends keyof T>(arr: T[], key: K): Record<T[K] extends PropertyKey ? T[K] : never, T[]>;
/**
 * Groups an array of objects by a function that returns a key.
 * Example: groupBy(players, p => p.team)
 */
export function groupBy<T, K extends PropertyKey>(arr: T[], key: (item: T) => K): Record<K, T[]>;
/**
 * Groups an array of objects by a key or function.
 * @example
 * // Group by direct property
 * groupBy(players, 'team')
 * // Group by computed key
 * groupBy(players, p => p.name[0].toUpperCase())
 */
export function groupBy<T, K extends keyof T | ((item: T) => PropertyKey)>(arr: T[], key: K): any {
  return arr.reduce((acc, item) => {
    const group = typeof key === 'function' 
      ? (key as (item: T) => PropertyKey)(item) 
      : item[key as keyof T];
    
    if (!acc[group as keyof typeof acc]) {
      acc[group as keyof typeof acc] = [];
    }
    acc[group as keyof typeof acc].push(item);
    return acc;
  }, {} as Record<PropertyKey, T[]>);
}

/**
 * Type-safe sorting by a property or function.
 * Example: sortBy(scores, s => s.totalScore)
 */
export function sortBy<T>(arr: T[], selector: (item: T) => number | string, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...arr].sort((a, b) => {
    const aVal = selector(a);
    const bVal = selector(b);
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Composable filter helpers for arrays.
 * Example: filterBy(events, e => e.isActive)
 */
export function filterBy<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  return arr.filter(predicate);
}

/**
 * Truncates text to a max length, adding ellipsis if needed.
 * Example: truncateText("Hello world", 5) // "Hello…"
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Creates a debounced version of a function that delays its execution until after a specified delay.
 * @example
 * const debouncedSave = debounce((data) => saveToDatabase(data), 1000);
 * debouncedSave(formData); // Will only execute after 1 second of no calls
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
