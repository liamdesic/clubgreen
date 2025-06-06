<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  // Add critical CSS for black background to prevent white flash
  onMount(() => {
    if (browser) {
      document.documentElement.style.backgroundColor = 'black';
      document.body.style.backgroundColor = 'black';
    }
  });
</script>

<svelte:head>
  <!-- Critical CSS loaded inline to prevent FOUC (Flash of Unstyled Content) -->
  <style>
    html, body {
      background-color: black !important;
      margin: 0;
      padding: 0;
    }
    
    /* Ensure the page container also has a black background */
    .page-container {
      background-color: black !important;
      min-height: 100vh;
    }
  </style>
  
  <!-- Preload critical CSS -->
  <link rel="preload" href="/leaderboard-preload.css" as="style">
  <link rel="stylesheet" href="/leaderboard-preload.css">
</svelte:head>

<slot />
