<script>
  import { showToast } from '$lib/toastStore.js';
  import ToastHost from '$lib/ToastHost.svelte';
  import { toasts } from '$lib/toastStore.js';

  function triggerSuccess() {
    showToast('✅ Toast from global store!', 'success');
  }

  function triggerError() {
    showToast('❌ Something went wrong.', 'error');
  }

  function triggerInfo() {
    showToast('ℹ️ Heads up!', 'info');
  }
</script>

<h1>Toast Test Page</h1>

<button on:click={triggerSuccess}>Trigger Success Toast</button>
<button on:click={triggerError}>Trigger Error Toast</button>
<button on:click={triggerInfo}>Trigger Info Toast</button>
