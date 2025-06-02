<script lang="ts">
  import { Link, Calendar, Pencil, QrCode } from 'lucide-svelte';
  import type { Event, Organization } from '$lib/types';
  import { createEventDispatcher } from 'svelte';

  // Props
  export let event: Event;
  export let organization: Organization | null = null;

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
</script>

<div class="event-card">
  <h2 class="event-title">{event.title}</h2>
  <p class="event-line">
    <Link color="blue" size="14" /> 
    {organization?.slug}/{event.slug}
  </p>
  <p class="event-line">
    <Calendar color="orange" size="14" /> 
    {event.event_date ? formatDate(event.event_date) : 'Ongoing'}
  </p>
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

  .event-title {
    position: initial;
    font-size: 1.1rem;
    font-weight: 800;
    margin-bottom: 1rem;
    color: var(--color-black);
  }

  .event-line {
    display: flex;
    align-items: center;
    background: white;
    padding: 0.5rem;
    border-radius: 80px;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
    gap: 0.5rem;
    color: #222;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
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
