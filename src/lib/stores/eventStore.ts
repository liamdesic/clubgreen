import { writable, derived } from 'svelte/store';
import type { Event } from '$lib/types';
import { getEventStatus } from '$lib/utils/eventStatus';

// Create a writable store for events
const events = writable<Event[]>([]);
const scoreCounts = writable<Record<string, number>>({});

// Helper function to check if an event is archived
function isEventArchived(event: Event): boolean {
  const settings = event.settings_json as { archived?: boolean } | null;
  return settings?.archived ?? false;
}

// Derived store for active events
export const activeEvents = derived(events, $events => 
  $events.filter(event => !isEventArchived(event))
);

// Derived store for archived events
export const archivedEvents = derived(events, $events => 
  $events.filter(event => isEventArchived(event))
);

// Derived store for live events
export const liveEvents = derived([events, scoreCounts], ([$events, $scoreCounts]) => {
  console.log('Calculating live events from', $events.length, 'total events');
  const live = $events.filter(event => {
    const scoreCount = $scoreCounts[event.id] || 0;
    const status = getEventStatus(event, scoreCount);
    console.log('Event', event.id, 'status:', status, 'scoreCount:', scoreCount);
    return status.isLive;
  });
  console.log('Found', live.length, 'live events');
  return live;
});

// Derived store for upcoming events
export const upcomingEvents = derived([events, scoreCounts], ([$events, $scoreCounts]) => 
  $events.filter(event => {
    const scoreCount = $scoreCounts[event.id] || 0;
    const status = getEventStatus(event, scoreCount);
    return status.code === 2;
  })
);

// Store methods
export const eventStore = {
  subscribe: events.subscribe,
  set: events.set,
  update: events.update,
  add: (event: Event) => {
    events.update(current => [...current, event]);
  },
  updateEvent: (updatedEvent: Event) => {
    events.update(current => 
      current.map(event => event.id === updatedEvent.id ? updatedEvent : event)
    );
  },
  remove: (eventId: string) => {
    events.update(current => current.filter(event => event.id !== eventId));
  },
  clear: () => {
    events.set([]);
  }
};

// Score count methods
export const scoreStore = {
  subscribe: scoreCounts.subscribe,
  set: scoreCounts.set,
  update: scoreCounts.update,
  setScoreCount: (eventId: string, count: number) => {
    scoreCounts.update(current => ({
      ...current,
      [eventId]: count
    }));
  },
  clear: () => {
    scoreCounts.set({});
  }
}; 