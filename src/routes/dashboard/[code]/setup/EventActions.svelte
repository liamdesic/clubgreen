<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { showToast } from '$lib/stores/toastStore';

  export let saving = false;
  export let archived = false;
  export let unsavedChanges = false;

  const dispatch = createEventDispatcher();

  function handleArchive() {
    if (!confirm('Are you sure you want to archive this event? This action cannot be undone.')) {
      return;
    }
    dispatch('archive');
  }

  function handleDelete() {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    dispatch('delete');
  }

  function handleSave() {
    dispatch('save');
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<section class="form-block">
  <h2 class="form-block-title">Event Actions</h2>
  
  <div class="actions">
    <div class="primary-actions">
      <button 
        class="button primary" 
        on:click={handleSave}
        disabled={saving || !unsavedChanges}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
      
      <button 
        class="button secondary" 
        on:click={handleCancel}
        disabled={saving || !unsavedChanges}
      >
        Cancel
      </button>
    </div>

    <div class="danger-actions">
      {#if !archived}
        <button 
          class="button danger" 
          on:click={handleArchive}
          disabled={saving}
        >
          Archive Event
        </button>
      {/if}
      
      <button 
        class="button danger" 
        on:click={handleDelete}
        disabled={saving}
      >
        Delete Event
      </button>
    </div>
  </div>
</section>

<style>
  .actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .primary-actions,
  .danger-actions {
    display: flex;
    gap: 1rem;
  }

  .danger-actions {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--surface-3);
  }

  .button {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .button.primary {
    background: var(--accent);
    color: white;
  }

  .button.primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .button.secondary {
    background: var(--surface-3);
    color: var(--text-1);
  }

  .button.secondary:hover:not(:disabled) {
    background: var(--surface-4);
  }

  .button.danger {
    background: var(--error);
    color: white;
  }

  .button.danger:hover:not(:disabled) {
    background: var(--error-hover);
  }
</style> 