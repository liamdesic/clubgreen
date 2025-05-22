import { writable } from 'svelte/store';

/** @type {import('svelte/store').Writable<Array<{id: number, message: string, type: string}>>} */
export const toasts = writable([]);

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {'success' | 'error' | 'info'} [type='success'] - The type of toast
 * @param {number} [duration=3000] - How long to show the toast in ms
 * @returns {number} The toast ID (can be used to manually remove the toast)
 */
export function showToast(message, type = 'success', duration = 3000) {
  const id = Date.now() + Math.random(); // Add random to ensure unique IDs
  
  toasts.update((all) => [...all, { id, message, type }]);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
  
  return id;
}

/**
 * Removes a toast by its ID
 * @param {number} id - The ID of the toast to remove
 */
export function removeToast(id) {
  toasts.update((all) => all.filter((t) => t.id !== id));
}
