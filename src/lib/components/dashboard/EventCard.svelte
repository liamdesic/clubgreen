<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Database } from '$lib/database.types';
  type Event = Database['public']['Tables']['events']['Row'];
  type Organization = Database['public']['Tables']['organizations']['Row'];
  import { QrCode, User } from 'lucide-svelte';
  import Trophy from 'lucide-svelte/icons/trophy.svelte';
  import EventManagement from './EventManagement.svelte';
  import { getEventStatus } from '$lib/utils/eventStatus';
  import type { LucideIcon } from 'lucide-svelte';

  // Props
  export let event: Event;
  export let organization: Organization;
  export let scoreCount = 0;
  export let playerCount = 0;

  const dispatch = createEventDispatcher();

  // Get event status
  $: eventStatus = getEventStatus(event, scoreCount);

  function handleQrClick() {
    dispatch('openQrModal', event);
  }

  function handleEdit(e: CustomEvent<{ event: Event }>) {
    console.log('🎯 [EventCard] Handling edit event:', {
      id: e.detail.event.id,
      title: e.detail.event.title,
      short_code: e.detail.event.short_code
    });
    dispatch('edit', e.detail.event);
  }

  function handleArchived() {
    dispatch('archived', { eventId: event.id });
  }

  function handleDeleted() {
    dispatch('deleted', { eventId: event.id });
  }
</script>

<div class="event-card">
  <div class="event-header">
    <div class="title-section">
      <h3>{event.title}</h3>
      <div class="event-status" style="--status-color: {eventStatus.color}">
        <div class="status-dot {eventStatus.isLive ? 'flashing' : ''}"></div>
        {eventStatus.label}
      </div>
    </div>
    <EventManagement 
      {organization}
      {event}
      on:edit={handleEdit}
      on:archived={handleArchived}
      on:deleted={handleDeleted}
    />
  </div>

  <div class="event-stats">
    <div class="stat">
      <Trophy size={20} />
      <span>{scoreCount} scores</span>
    </div>
    <div class="stat">
      <User size={20} />
      <span>{playerCount} players</span>
    </div>
  </div>

  <div class="event-actions">
    <button 
      class="qr-button"
      on:click={handleQrClick}
      aria-label="Show QR code"
    >
      <QrCode size={24} />
      <span>Show QR</span>
    </button>
  </div>
</div>

<style>
  .event-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5rem;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .event-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .title-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .event-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
  }

  .event-stats {
    display: flex;
    gap: 1rem;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.875rem;
  }

  .stat :global(svg) {
    color: rgba(255, 255, 255, 0.6);
  }

  .event-actions {
    display: flex;
    justify-content: flex-end;
  }

  .qr-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 0.75rem;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .qr-button:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .qr-button:active {
    transform: translateY(0);
  }

  .qr-button :global(svg) {
    color: rgba(255, 255, 255, 0.9);
  }

  .event-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--status-color);
    font-weight: 500;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--status-color);
  }

  .status-dot.flashing {
    animation: flash 1.5s infinite;
  }

  @keyframes flash {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
  }
</style>
