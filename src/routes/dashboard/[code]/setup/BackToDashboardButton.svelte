<script lang="ts">
  import '$lib/styles/EditEvent.css';
  export let onBack: () => void;
</script>

<button type="button" class="btn btn-secondary" style="margin-bottom: var(--spacing-md);" on:click={onBack}>
  ← Back to Dashboard
</button> 