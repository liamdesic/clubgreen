// generalUtils.ts
// General-purpose utility functions for date/time, data transformation, and formatting
// All functions are type-safe and documented

/**
 * Formats a JS Date or ISO string to a consistent, human-friendly format.
 * Example: "8 Jun 2025, 3:00 PM"
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
