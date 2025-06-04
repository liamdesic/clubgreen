<script lang="ts">
  import { Link, Calendar, Pencil, QrCode, User, CloudUpload } from 'lucide-svelte';
  import type { Event, Organization } from '$lib/types/database';
  import { createEventDispatcher } from 'svelte';

  // Props
  export let event: Event;
  export let organization: Organization | null = null;
  export let scoreCount: number = 0;
  export let playerCount: number = 0;

  const dispatch = createEventDispatcher();

  function openQrModal() {
    dispatch('openQrModal', event);
  }

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Get event status
  $: eventStatus = (() => {
    const today = new Date().toISOString().split('T')[0];
    const eventDate = event.event_date;
    
    // If no event date, it's an ongoing event
    if (!eventDate) {
      return scoreCount > 0 
        ? { text: 'Live', color: '#E53935', isLive: true } // Red
        : { text: 'Waiting for Scores', color: '#9E9E9E' }; // Grey
    }
    
    const isToday = eventDate === today;
    const isFuture = new Date(eventDate) > new Date(today);
    
    if (isFuture) {
      return { text: 'Upcoming', color: '#2196F3' }; // Blue
    } else if (isToday) {
      return scoreCount > 0
        ? { text: 'Live', color: '#E53935', isLive: true } // Red
        : { text: 'Waiting for Scores', color: '#9E9E9E' }; // Grey
    } else {
      return { text: 'Archived', color: '#757575' }; // Dark Grey
    }
  })();
</script>

<div class="event-card">
  <div class="event-status" style="--status-color: {eventStatus.color}">
    <div class="status-dot {eventStatus.isLive ? 'flashing' : ''}"></div>
    {eventStatus.text}
  </div>
  <h2 class="event-title">{event.title}</h2>
  <div class="event-shortcode"><code>/{event.short_code}</code></div>
  <div class="event-stats">
    <div class="stat">
      <Calendar size={14} />
      <span>{event.event_date ? formatDate(event.event_date) : 'Ongoing'}</span>
    </div>
    <div class="stat">
      <User size={14} />
      <span>{playerCount} {playerCount === 1 ? 'Player' : 'Players'}</span>
    </div>
  </div>
  <div class="event-buttons">
    <a class="edit-button" href={`/dashboard/${event.slug}/setup`}>
      <Pencil size="16" /> Edit
    </a>
    <button class="qr-button" on:click={openQrModal}>
      <QrCode size="16" /> Get Links
    </button>
  </div>
</div>

<style>
  .event-card {
    background: var(--gradient-light);
    padding: 1.5rem;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform 0.2s ease;
    position: relative;
  }

  .event-card:hover {
    transform: translateY(-4px);
  }

  .event-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: var(--status-color);
    font-family: 'Inter', sans-serif;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--status-color);
    transition: background 0.2s;
  }

  .status-dot.flashing {
    animation: status-flash 1.2s infinite alternate;
  }

  @keyframes status-flash {
    0% { opacity: 1; }
    100% { opacity: 0.3; }
  }

  .event-title {
    position: initial;
    font-family: 'Obviously Bold', 'Inter', sans-serif;
    font-weight: 900;
    margin-bottom: 0.25rem;
    color: var(--color-black);
    letter-spacing: 0.01em;
    line-height: 1.1;
    font-size: 1.25rem;
  }

  .event-shortcode {
    margin-bottom: 0.5rem;
    font-family: 'JetBrains Mono', 'Fira Mono', 'Menlo', monospace;
    font-size: 0.92rem;
    color: #888;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 400;
  }

  .event-shortcode code {
    font-size: 0.92em;
    font-family: inherit;
    color: #666;
    letter-spacing: 0.02em;
  }

  .event-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    background: rgba(245, 245, 250, 0.95);
    border-radius: 10px;
    padding: 0.35rem 0.75rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.85rem;
    color: #222;
    font-weight: 500;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
    white-space: nowrap;
  }

  .event-buttons {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
    gap: 0.5rem;
  }

  .edit-button,
  .qr-button {
    padding: 0.4rem 0.75rem;
    font-weight: 600;
    border-radius: var(--radius);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: none;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .edit-button {
    background: var(--gradient-color);
    color: white;
  }

  .qr-button {
    background: white;
    color: var(--color-black);
  }
</style>
