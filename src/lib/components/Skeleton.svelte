<script lang="ts">
  // Type of skeleton to display
  export let type: 'card' | 'list' | 'table' | 'form' = 'card';
  
  // Number of items to show
  export let count = 3;
  
  // Optional width for individual items
  export let width: string | undefined = undefined;
  
  // Optional height for individual items
  export let height: string | undefined = undefined;
  
  // Optional class for custom styling
  export let className: string = '';
</script>

<div class="skeleton-container {type} {className}">
  {#each Array(count) as _, i}
    {#if type === 'card'}
      <div class="skeleton-card" style="width: {width}; height: {height};">
        <div class="skeleton-header">
          <div class="skeleton-logo"></div>
          <div class="skeleton-title"></div>
        </div>
        <div class="skeleton-content">
          <div class="skeleton-stats">
            <div class="skeleton-stat"></div>
            <div class="skeleton-stat"></div>
          </div>
          <div class="skeleton-actions">
            <div class="skeleton-button"></div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      </div>
    {:else if type === 'list'}
      <div class="skeleton-list-item" style="width: {width}; height: {height};">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-text">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>
    {:else if type === 'table'}
      <div class="skeleton-table-row" style="width: {width}; height: {height};">
        <div class="skeleton-cell"></div>
        <div class="skeleton-cell"></div>
        <div class="skeleton-cell"></div>
        <div class="skeleton-cell"></div>
      </div>
    {:else if type === 'form'}
      <div class="skeleton-form" style="width: {width}; height: {height};">
        <div class="skeleton-field"></div>
        <div class="skeleton-field"></div>
        <div class="skeleton-field"></div>
        <div class="skeleton-button"></div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .skeleton-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .skeleton-container.card {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .skeleton-container.list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .skeleton-container.table {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .skeleton-container.form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 600px;
  }

  /* Common skeleton styles */
  .skeleton-card,
  .skeleton-list-item,
  .skeleton-table-row,
  .skeleton-form {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .skeleton-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .skeleton-logo {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background: var(--skeleton-gradient);
    animation: shimmer 1.5s infinite;
  }

  .skeleton-title {
    flex: 1;
    height: 24px;
    border-radius: 4px;
    background: var(--skeleton-gradient);
    animation: shimmer 1.5s infinite;
  }

  .skeleton-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .skeleton-stats {
    display: flex;
    gap: 1rem;
  }

  .skeleton-stat {
    flex: 1;
    height: 40px;
    border-radius: 8px;
    background: var(--skeleton-gradient);
    animation: shimmer 1.5s infinite;
  }

  .skeleton-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .skeleton-button {
    flex: 1;
    height: 36px;
    border-radius: 18px;
    background: var(--skeleton-gradient);
    animation: shimmer 1.5s infinite;
  }

  /* List item styles */
  .skeleton-list-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
  }

  .skeleton-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--skeleton-gradient);
    animation: shimmer 1.5s infinite;
  }

  .skeleton-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .skeleton-line {
    height: 16px;
    border-radius: 4px;
    background: var(--skeleton-gradient);
    animation: shimmer 1.5s infinite;
  }

  .skeleton-line:first-child {
    width: 60%;
  }

  .skeleton-line:last-child {
    width: 40%;
  }

  /* Table styles */
  .skeleton-table-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  .skeleton-cell {
    height: 24px;
    border-radius: 4px;
    background: var(--skeleton-gradient);
    animation: shimmer 1.5s infinite;
  }

  /* Form styles */
  .skeleton-form {
    padding: 2rem;
  }

  .skeleton-field {
    height: 48px;
    border-radius: 8px;
    background: var(--skeleton-gradient);
    animation: shimmer 1.5s infinite;
    margin-bottom: 1rem;
  }

  /* Animation */
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  /* CSS Variables */
  :global(:root) {
    --skeleton-gradient: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.1) 25%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0.1) 75%
    );
  }

  /* Responsive styles */
  @media (max-width: 768px) {
    .skeleton-container.card {
      grid-template-columns: 1fr;
    }

    .skeleton-table-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style> 