<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Database } from '$lib/database.types';
  import type { Event, Organization } from '$lib/validations';
  import { QrCode, User, Trophy, MoreVertical, Edit, Archive, Trash2, RotateCcw } from 'lucide-svelte';
  import { getEventStatus } from '$lib/utils/eventStatus';
  import type { LucideIcon } from 'lucide-svelte';

  // Convert hex to RGB for glow effect
  function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
  }

  // Props
  export let event: Event;
  export let organization: Organization;
  export let scoreCount = 0;
  export let playerCount = 0;

  const dispatch = createEventDispatcher();
  let showMenu = false;

  // Get event status
  $: eventStatus = getEventStatus(event, scoreCount);

  function handleQrClick() {
    dispatch('openQrModal', event);
  }

  function handleEdit() {
    dispatch('edit', event);
  }

  function handleArchived() {
    dispatch('archived', { eventId: event.id, action: event.archived ? 'unarchive' : 'archive' });
    showMenu = false;
  }

  function handleDeleted() {
    dispatch('deleted', { eventId: event.id });
    showMenu = false;
  }

  function toggleMenu() {
    showMenu = !showMenu;
  }

  // Close menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-container')) {
      showMenu = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="event-card" style="--accent-color: {event.accent_color || '#ffffff'}; --accent-color-rgb: {hexToRgb(event.accent_color || '#ffffff')}">
  <div class="event-header">
    <div class="title-section">
      <h3>{event.title}</h3>
      <div class="event-status" style="--status-color: {eventStatus.color}">
        <div class="status-dot {eventStatus.isLive ? 'flashing' : ''}"></div>
        {eventStatus.label}
      </div>
    </div>
    <div class="menu-container">
      <button 
        class="menu-button"
        on:click|stopPropagation={toggleMenu}
        aria-label="More options"
      >
        <MoreVertical size={20} />
      </button>
      {#if showMenu}
        <div class="menu-dropdown">
          <button class="menu-item" on:click={handleArchived}>
            {#if event.archived}
              <RotateCcw size={16} />
              <span>Unarchive</span>
            {:else}
              <Archive size={16} />
              <span>Archive</span>
            {/if}
          </button>
          <button class="menu-item delete" on:click={handleDeleted}>
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      {/if}
    </div>
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
      class="edit-button"
      on:click={handleEdit}
      aria-label="Edit event"
    >
      <Edit size={20} />
      <span>Edit</span>
    </button>
    <button 
      class="qr-button"
      on:click={handleQrClick}
      aria-label="Show QR code"
    >
      <QrCode size={20} />
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
    position: relative;
    will-change: transform, opacity;
    border-top: 3px solid var(--accent-color);
  }

  .event-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 20px rgba(var(--accent-color-rgb), 0.15);
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
    color: var(--accent-color);
    opacity: 0.8;
  }

  .event-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .edit-button, .qr-button {
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

  .edit-button:hover, .qr-button:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .edit-button:active, .qr-button:active {
    transform: translateY(0);
  }

  .edit-button :global(svg), .qr-button :global(svg) {
    color: var(--accent-color);
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

  .menu-container {
    position: relative;
  }

  .menu-button {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
  }

  .menu-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    background: rgba(30, 30, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    padding: 0.5rem;
    min-width: 150px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 10;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.875rem;
    cursor: pointer;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
  }

  .menu-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .menu-item.delete {
    color: #ff4d4d;
  }

  .menu-item.delete:hover {
    background: rgba(255, 77, 77, 0.1);
  }
</style>
