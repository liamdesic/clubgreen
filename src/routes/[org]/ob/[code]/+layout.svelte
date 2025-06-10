<script>
  export let data;
</script>

<main class="leaderboard-page">
  <slot />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f8f9fa;
  }
  
  .leaderboard-page {
    min-height: 100vh;
    padding: 2rem 1rem;
    background-color: #f8f9fa;
  }
</style>
