<script>
  import { toasts, removeToast } from '$lib/stores/toastStore';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div 
      class="toast {toast.type}"
      in:fly={{ y: 20, duration: 300, easing: quintOut }}
      out:fly={{ y: 20, duration: 200, opacity: 0, easing: quintOut }}
      role="alert"
    >
      <span class="toast-message">{toast.message}</span>
      <button 
        class="toast-close" 
        on:click|stopPropagation={() => removeToast(toast.id)}
        aria-label="Close notification"
      >
        &times;
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 2rem;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    z-index: 10000;
    pointer-events: none;
    padding: 0 1rem;
  }

  .toast {
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 1rem 2rem 1rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    position: relative;
    min-width: 300px;
    max-width: 500px;
    pointer-events: auto;
  }

  .toast-message {
    flex: 1;
  }

  .toast-close {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.5rem;
    line-height: 1;
    padding: 0 0.25rem;
    cursor: pointer;
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    transition: color 0.2s ease;
  }

  .toast-close:hover {
    color: white;
  }

  .toast.success { border-left: 4px solid #00c853; }
  .toast.error { border-left: 4px solid #e53935; }
  .toast.info { border-left: 4px solid #42a5f5; }
</style>
