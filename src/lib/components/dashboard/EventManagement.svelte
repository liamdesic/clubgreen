<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { showToast } from '$lib/stores/toastStore';
  import { eventSource } from '$lib/stores/source/eventSource';
  import type { Event, Organization } from '$lib/validations';
  import { supabase } from '$lib/supabaseClient';

  // Props
  export let organization: Organization;
  export let event: Event;

  // State
  let isEditing = false;
  let isArchiving = false;
  let isDeleting = false;
  let showConfirmDelete = false;
  let showConfirmArchive = false;
  let archivedModalOpen = false;

  const dispatch = createEventDispatcher();

  // --- EVENT HANDLERS ---
  async function handleEdit() {
    isEditing = true;
    console.log('🔧 [EventManagement] Dispatching edit event:', {
      id: event.id,
      title: event.title,
      short_code: event.short_code
    });
    dispatch('edit', { event });
  }

  async function handleArchive(event: Event) {
    try {
      await eventSource.updateEvent(event.id, {
        archived: true
      });
      showToast('Event archived successfully', 'success');
    } catch (error) {
      console.error('Error archiving event:', error);
      showToast('Failed to archive event', 'error');
    }
  }

  async function handleDelete(event: Event) {
    try {
      await eventSource.deleteEvent(event.id);
      showToast('Event deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting event:', error);
      showToast('Failed to delete event', 'error');
    }
  }

  function confirmArchive() {
    showConfirmArchive = true;
  }

  function confirmDelete() {
    showConfirmDelete = true;
  }

  function cancelArchive() {
    showConfirmArchive = false;
  }

  function cancelDelete() {
    showConfirmDelete = false;
  }
</script>

<div class="event-management">
  <div class="actions">
    <button 
      class="action-button edit"
      on:click={handleEdit}
      disabled={isEditing || isArchiving || isDeleting}
    >
      Edit
    </button>
    
    <button 
      class="action-button archive"
      on:click={confirmArchive}
      disabled={isEditing || isArchiving || isDeleting}
    >
      Archive
    </button>
    
    <button 
      class="action-button delete"
      on:click={confirmDelete}
      disabled={isEditing || isArchiving || isDeleting}
    >
      Delete
    </button>
  </div>

  <!-- Archive Confirmation Modal -->
  {#if showConfirmArchive}
    <div class="modal-overlay" on:click|self={cancelArchive}>
      <div class="modal">
        <h3>Archive Event</h3>
        <p>Are you sure you want to archive this event? This will move it to the archived section.</p>
        <div class="modal-actions">
          <button class="cancel" on:click={cancelArchive}>Cancel</button>
          <button 
            class="confirm archive" 
            on:click={handleArchive}
            disabled={isArchiving}
          >
            {isArchiving ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if showConfirmDelete}
    <div class="modal-overlay" on:click|self={cancelDelete}>
      <div class="modal">
        <h3>Delete Event</h3>
        <p>Are you sure you want to delete this event? This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="cancel" on:click={cancelDelete}>Cancel</button>
          <button 
            class="confirm delete" 
            on:click={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .event-management {
    position: relative;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-button {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: white;
  }

  .action-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }

  .action-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-button.edit {
    color: var(--color-accent-blue, #3b82f6);
  }

  .action-button.archive {
    color: var(--color-accent-yellow, #eab308);
  }

  .action-button.delete {
    color: var(--color-accent-red, #ef4444);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal {
    background: rgba(24, 24, 40, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    padding: 1.5rem;
    max-width: 400px;
    width: 90%;
    color: white;
  }

  .modal h3 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .modal p {
    margin: 0 0 1.5rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }

  .modal-actions button {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .modal-actions .cancel {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
  }

  .modal-actions .cancel:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .modal-actions .confirm {
    border: none;
    color: white;
  }

  .modal-actions .confirm.archive {
    background: var(--color-accent-yellow, #eab308);
  }

  .modal-actions .confirm.delete {
    background: var(--color-accent-red, #ef4444);
  }

  .modal-actions .confirm:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .modal-actions .confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style> 