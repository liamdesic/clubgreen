<script lang="ts">
  // Number of skeleton items to show
  export let count = 3;
</script>

<div class="skeleton-container">
  {#each Array(count) as _, i}
    <div class="skeleton-card">
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
  {/each}
</div>

<style>
  .skeleton-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    padding: 1rem;
  }

  .skeleton-card {
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
    background: linear-gradient(90deg, 
      rgba(255, 255, 255, 0.1) 25%, 
      rgba(255, 255, 255, 0.2) 50%, 
      rgba(255, 255, 255, 0.1) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-title {
    flex: 1;
    height: 24px;
    border-radius: 4px;
    background: linear-gradient(90deg, 
      rgba(255, 255, 255, 0.1) 25%, 
      rgba(255, 255, 255, 0.2) 50%, 
      rgba(255, 255, 255, 0.1) 75%
    );
    background-size: 200% 100%;
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
    background: linear-gradient(90deg, 
      rgba(255, 255, 255, 0.1) 25%, 
      rgba(255, 255, 255, 0.2) 50%, 
      rgba(255, 255, 255, 0.1) 75%
    );
    background-size: 200% 100%;
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
    background: linear-gradient(90deg, 
      rgba(255, 255, 255, 0.1) 25%, 
      rgba(255, 255, 255, 0.2) 50%, 
      rgba(255, 255, 255, 0.1) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @media (max-width: 768px) {
    .skeleton-container {
      grid-template-columns: 1fr;
    }
  }
</style> 