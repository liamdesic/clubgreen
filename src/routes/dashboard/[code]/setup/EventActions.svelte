<script lang="ts">
  import '$lib/styles/EditEvent.css';
  export let saving: boolean;
  export let archived: boolean;
  export let onSave: () => void;
  export let onCancel: () => void;
  export let onArchive: () => void;
  export let unsavedChanges: boolean;
</script>

<div class="form-actions" style="margin-top: var(--spacing-md); display: flex; gap: var(--spacing-md);">
  <button type="button" class="btn btn-primary" on:click={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
  <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={!unsavedChanges}>Cancel</button>
  <button 
    type="button" 
    class="btn btn-danger" 
    on:click={onArchive} 
    disabled={saving || archived}
    title={archived ? 'This event is archived' : 'Archive this event'}
  >
    {archived ? 'Archived' : 'Archive Event'}
  </button>
</div> 