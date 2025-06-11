<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Plus } from 'lucide-svelte';

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('click');
  }
</script>

<button 
  class="add-event-card"
  on:click={handleClick}
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
  aria-label="Add new event"
>
  <div class="add-event-content">
    <Plus size={48} />
    <span>Add Round</span>
  </div>
</button>

<style>
  .add-event-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5rem;
    padding: 2rem;
    width: 100%;
    height: 100%;
    min-height: 280px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .add-event-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .add-event-card:active {
    transform: translateY(-2px);
  }

  .add-event-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .add-event-content span {
    font-size: 1.25rem;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
  }

  .add-event-content :global(svg) {
    color: rgba(255, 255, 255, 0.9);
    transition: transform 0.3s ease;
  }

  .add-event-card:hover :global(svg) {
    transform: scale(1.1);
  }
</style> 