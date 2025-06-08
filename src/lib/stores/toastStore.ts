import { writable } from 'svelte/store';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

/**
 * A Svelte store containing an array of active toast notifications
 */
export const toasts = writable<Toast[]>([]);

/**
 * Shows a toast notification
 * @param message - The message to display
 * @param type - The type of toast (default: 'success')
 * @param duration - How long to show the toast in ms (default: 3000ms, set to 0 for persistent)
 * @returns The toast ID (can be used to manually remove the toast)
 */
export function showToast(
  message: string, 
  type: ToastType = 'success', 
  duration = 3000
): number {
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
 * @param id - The ID of the toast to remove
 */
export function removeToast(id: number): void {
  toasts.update((all) => all.filter((t) => t.id !== id));
}

/**
 * Shows a success toast
 * @param message - The success message to display
 * @param duration - How long to show the toast in ms (default: 3000ms)
 */
export function showSuccessToast(message: string, duration = 3000): number {
  return showToast(message, 'success', duration);
}

/**
 * Shows an error toast
 * @param message - The error message to display
 * @param duration - How long to show the toast in ms (default: 5000ms)
 */
export function showErrorToast(message: string, duration = 5000): number {
  return showToast(message, 'error', duration);
}

/**
 * Shows an info toast
 * @param message - The info message to display
 * @param duration - How long to show the toast in ms (default: 3000ms)
 */
export function showInfoToast(message: string, duration = 3000): number {
  return showToast(message, 'info', duration);
}
