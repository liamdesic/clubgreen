import type { Event } from '$lib/types';

export type EventStatus = {
  code: number;
  label: string;
  isLive: boolean;
  color: string;
};

/**
 * Determines the status of an event based on its date and score count
 * @param event The event to check
 * @param scoreCount The number of scores for this event
 * @returns EventStatus object with code, label, isLive flag, and color
 */
export function getEventStatus(event: Event, scoreCount: number = 0): EventStatus {
  const today = new Date().toISOString().split('T')[0];
  const eventDate = event.event_date;
  
  // If manually archived, it's always archived
  if (event.settings_json?.archived) {
    return {
      code: 3,
      label: 'Archived',
      isLive: false,
      color: '#757575' // Dark Grey
    };
  }
  
  // If no event date, it's an ongoing event
  if (!eventDate) {
    return scoreCount > 0 
      ? {
          code: 0,
          label: 'Live',
          isLive: true,
          color: '#E53935' // Red
        }
      : {
          code: 1,
          label: 'Waiting for Scores',
          isLive: false,
          color: '#9E9E9E' // Grey
        };
  }
  
  const isToday = eventDate === today;
  const isFuture = new Date(eventDate) > new Date(today);
  
  if (isFuture) {
    return {
      code: 2,
      label: 'Upcoming',
      isLive: false,
      color: '#2196F3' // Blue
    };
  }
  
  if (isToday) {
    return scoreCount > 0
      ? {
          code: 0,
          label: 'Live',
          isLive: true,
          color: '#E53935' // Red
        }
      : {
          code: 1,
          label: 'Waiting for Scores',
          isLive: false,
          color: '#9E9E9E' // Grey
        };
  }
  
  return {
    code: 3,
    label: 'Archived',
    isLive: false,
    color: '#757575' // Dark Grey
  };
} 