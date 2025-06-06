<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  let emptyState: HTMLDivElement | null = null;
</script>

<div class="empty-state" bind:this={emptyState}>
  <div class="empty-state-content">
    <div class="empty-state-artwork">
      <img src="/skeleton/AddEventPre.png" alt="Pre-event artwork" class="pre-image" />
      <img src="/skeleton/AddEventPost.png" alt="Post-event artwork" class="post-image" />
    </div>
    <h2>Welcome to Your Dashboard</h2>
    <p>Create your first event to get started with Club Green</p>
    <button 
      class="create-event-btn"
      on:mouseenter={() => emptyState?.classList.add('hover')}
      on:mouseleave={() => emptyState?.classList.remove('hover')}
      on:click={() => dispatch('createEvent')}
    >
      Create Your First Event
    </button>
  </div>
</div>

<style>
  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .empty-state-artwork {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    z-index: 0;
    opacity: 0.15;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .empty-state-artwork img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .empty-state-artwork .pre-image {
    opacity: 1;
  }

  .empty-state-artwork .post-image {
    opacity: 0;
  }

  .empty-state.hover .pre-image {
    opacity: 0 !important;
  }

  .empty-state.hover .post-image {
    opacity: 1 !important;
  }

  .empty-state.hover .empty-state-artwork {
    transform: translate(-50%, -55%);
    filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.3));
  }

  .empty-state-content {
    max-width: 500px;
    padding: 3rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 1;
    backdrop-filter: blur(10px);
  }

  .empty-state h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: white;
    font-family: 'Inter', sans-serif;
  }

  .empty-state p {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 2rem;
    font-family: 'Inter', sans-serif;
  }

  .create-event-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--accent-color, #4CAF50);
    color: white;
    border: none;
    border-radius: 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: 'Inter', sans-serif;
    position: relative;
    z-index: 2;
  }

  .create-event-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .create-event-btn:active {
    transform: translateY(0);
  }
</style> 