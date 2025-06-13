
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { showToast } from '$lib/stores/toastStore';
  import { debounce } from '$lib/utils/generalUtils';

  export let initialData: any;
  export let onSave: (data: any) => Promise<void>;
  export let validate: (data: any) => boolean;
  export let loading = false;

  const dispatch = createEventDispatcher<{
    save: { data: any };
    error: { error: string };
  }>();

  let formData = initialData;
  let saving = false;
  let error: string | undefined = undefined;

  // Debounced save function
  const debouncedSave = debounce(async (data: any) => {
    if (!validate(data)) {
      showToast('Please fix validation errors before saving', 'error');
      return;
    }

    saving = true;
    error = undefined;

    try {
      await onSave(data);
      showToast('Changes saved successfully', 'success');
      dispatch('save', { data });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save changes';
      showToast(error, 'error');
      dispatch('error', { error });
    } finally {
      saving = false;
    }
  }, 1000);

  // Watch for changes in formData
  $: if (formData !== initialData) {
    debouncedSave(formData);
  }

  // Reset form data when initialData changes
  $: if (initialData) {
    formData = initialData;
  }

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    formData = {
      ...formData,
      [target.name]: target.value
    };
  }
</script>

<form 
  class="auto-save-form"
  on:submit|preventDefault={() => debouncedSave(formData)}
  on:change={handleChange}
>
  {#if loading}
    <div class="loading">Loading form data...</div>
  {:else if error}
    <div class="error-message">
      <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
      <p>{error}</p>
    </div>
  {:else}
    <slot {formData} />
    
    {#if saving}
      <div class="saving-indicator">
        <span class="saving-dot"></span>
        <span class="saving-dot"></span>
        <span class="saving-dot"></span>
      </div>
    {/if}
  {/if}
</form>

<style>
  .auto-save-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .error-message {
    background-color: #fff5f5;
    border: 1px solid #feb2b2;
    color: #e53e3e;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    margin: 1rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .saving-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
  }

  .saving-dot {
    width: 6px;
    height: 6px;
    background-color: currentColor;
    border-radius: 50%;
    animation: saving 1.4s infinite ease-in-out both;
  }

  .saving-dot:nth-child(1) {
    animation-delay: -0.32s;
  }

  .saving-dot:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes saving {
    0%, 80%, 100% { 
      transform: scale(0);
    }
    40% { 
      transform: scale(1);
    }
  }
</style> 