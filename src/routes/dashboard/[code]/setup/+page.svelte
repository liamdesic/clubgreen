<script lang="ts">
  import { onMount } from 'svelte';
  import type { TimeFilter } from '$lib/validations/timeFilter';
  import type { Event, Organization } from '$lib/validations';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { showToast } from '$lib/stores/toastStore';
  import DashboardPageHeader from '$lib/components/dashboard/DashboardPageHeader.svelte';
  import EventForm from './EventForm.svelte';
  import { eventSource } from '$lib/stores/source/eventSource';
  import '$lib/styles/dashboard.css';

  // Get data from both layout and page server
  export let data: { event: Event; org: Organization };

  let loading = false;
  let error: string | null = null;

  async function handleArchive() {
    try {
      await eventSource.updateEvent(data.event.id, { archived: true });
      showToast('Event archived successfully', 'success');
      goto('/dashboard');
    } catch (err) {
      showToast('Failed to archive event', 'error');
    }
  }

  async function handleDelete() {
    try {
      await eventSource.deleteEvent(data.event.id);
      showToast('Event deleted successfully', 'success');
      goto('/dashboard');
    } catch (err) {
      showToast('Failed to delete event', 'error');
    }
  }
</script>

<div class="dashboard-wrapper">
  <div class="dashboard-main">
    <!-- Header with breadcrumbs -->
    <DashboardPageHeader 
      organizationName={data.org.name}
      eventTitle={data.event.title}
      accentColor={data.event.accent_color ?? '#4CAF50'}
    />

    <!-- Main Content -->
    <main class="dashboard-content">
      {#if loading}
        <div class="loading">Loading...</div>
      {:else if error}
        <div class="error">{error}</div>
      {:else}
        <EventForm 
          event={data.event} 
          organization={data.org}
        />

        <div class="danger-zone">
          <h3>Danger Zone</h3>
          <div class="danger-actions">
            <button class="danger-button archive" on:click={handleArchive}>
              Archive Event
            </button>
            <button class="danger-button delete" on:click={handleDelete}>
              Delete Event
            </button>
          </div>
        </div>
      {/if}
    </main>
  </div>
</div>

<style>
  .dashboard-wrapper {
    min-height: 100vh;
    background: #0f0f1a;
    color: white;
  }

  .dashboard-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    padding-top: 100px; /* Account for fixed header */
  }

  .dashboard-content {
    margin-top: 2rem;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
  }

  .error {
    color: #ff6b6b;
  }

  .danger-zone {
    margin-top: 2rem;
    padding: 1.5rem;
    background: var(--card-bg);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .danger-zone h3 {
    color: #ff6b6b;
    margin-bottom: 1rem;
  }

  .danger-actions {
    display: flex;
    gap: 1rem;
  }

  .danger-button {
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .danger-button.archive {
    background: #f59e0b;
    color: white;
    border: none;
  }

  .danger-button.archive:hover {
    background: #d97706;
  }

  .danger-button.delete {
    background: transparent;
    color: #ff6b6b;
    border: 1px solid #ff6b6b;
  }

  .danger-button.delete:hover {
    background: rgba(255, 107, 107, 0.1);
  }
</style>
