<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fly, scale, slide } from 'svelte/transition';
  import { quintInOut, elasticOut, quintIn, quintOut } from 'svelte/easing';

  
  export let accentColor = '#3498db'; // Default accent color
  export let logoUrl = ''; // Organization logo URL
  export let active = false; // Whether the transition is active
  export let duration = 500; // Duration in ms
  export let useThemeColors = true; // Whether to use theme.css color variations
  
  const dispatch = createEventDispatcher();
  let mounted = false;
  let visible = false;
  
  onMount(() => {
    mounted = true;
  });
  
  // When transition completes, notify parent
  function onTransitionComplete() {
    // Wait for all transitions to complete before notifying parent
    // Calculate the longest transition duration including delays
    // For the main transitions and additional layered elements
    const bottomWipeOutDuration = duration * 0.9 + duration * 0.1; // duration + delay
    const logoOutDuration = duration * 0.3 + duration * 0.1; // duration + delay
    const diagonalWipeOutDuration = duration * 0.8 + duration * 0.2; // duration + delay
    
    // Use the longest duration plus a small buffer
    const totalDuration = Math.max(bottomWipeOutDuration, logoOutDuration, diagonalWipeOutDuration) + 100;
    
    setTimeout(() => {
      dispatch('complete');
    }, totalDuration);
  }
  
  // Watch for active changes
  $: if (active && mounted && !visible) {
    visible = true;
    onTransitionComplete();
  } else if (!active && visible) {
    // Delay hiding overlay until all transitions complete
    const bottomWipeOutDuration = duration * 0.9 + duration * 0.1; // duration + delay
    const logoOutDuration = duration * 0.3 + duration * 0.1; // duration + delay
    const diagonalWipeOutDuration = duration * 0.8 + duration * 0.2; // duration + delay
    
    // Use the longest duration plus a small buffer
    const hideDelay = Math.max(bottomWipeOutDuration, logoOutDuration, diagonalWipeOutDuration) + 100;
    
    setTimeout(() => {
      visible = false;
    }, hideDelay);
  }
  
  // Set CSS variable for accent color
  $: if (useThemeColors && mounted) {
    document.documentElement.style.setProperty('--accent-color', accentColor);
  }
</script>

{#if visible && mounted}
  <div 
    class="overlay-container"
    style="--overlay-accent-color: {accentColor};"
  >
    <!-- Left diagonal wipes -->
    <!-- First left wipe (comes in slightly before) -->
    <div 
      class="wipe-left wipe-left-first"
      in:fly={{ x: -2200, duration: duration * 0.8, easing: quintInOut, delay: duration * 0.05 }}
      out:fly={{ x: -2200, duration: duration * 0.8, easing: quintInOut, delay: duration * 0.05 }}
    ></div>
    
    <!-- Main left wipe -->
    <div 
      class="wipe-left"
      in:fly={{ x: -2000, duration: duration * 0.8, easing: quintInOut, delay: duration * 0.1 }}
      out:fly={{ x: -2000, duration: duration * 0.8, easing: quintInOut, delay: duration * 0.1 }}
    ></div>
    
    <!-- Right diagonal wipes -->
    <!-- First right wipe (comes in slightly before) -->
    <div 
      class="wipe-right wipe-right-first"
      in:fly={{ x: 2200, duration: duration * 0.8, delay: duration * 0.15, easing: quintInOut }}
      out:fly={{ x: 2200, duration: duration * 0.8, delay: duration * 0.15, easing: quintInOut }}
    ></div>
    
    <!-- Main right wipe -->
    <div 
      class="wipe-right"
      in:fly={{ x: 2000, duration: duration * 0.8, delay: duration * 0.2, easing: quintInOut }}
      out:fly={{ x: 2000, duration: duration * 0.8, delay: duration * 0.2, easing: quintInOut }}
    ></div>
    
    <!-- Bottom to top full screen wipes -->
    <!-- First bottom wipe (comes in slightly before) -->
    <div 
      class="wipe-bottom wipe-bottom-first"
      in:slide={{ duration: duration * 0.9, delay: duration * 0.05, easing: quintInOut }}
      out:fly={{ y: -1200, duration: duration * 0.9, delay: duration * 0.05, easing: quintInOut, opacity: 1 }}
    ></div>
    
    <!-- Main bottom wipe -->
    <div 
      class="wipe-bottom"
      in:slide={{ duration: duration * 0.9, delay: duration * 0.1, easing: quintInOut }}
      out:fly={{ y: -1200, duration: duration * 0.9, delay: duration * 0.1, easing: quintInOut, opacity: 1 }}
    ></div>
    
    <!-- Logo in center -->
    
      <div 
        class="logo-container"
        in:scale={{ start: 0.3, duration: duration * 0.8, delay: duration * 0.3, easing: elasticOut }}
        out:scale={{ start: 0.3, duration: duration * 0.3, delay: duration * 0.1, easing: quintIn }}
      >
        {#if logoUrl}
          <img 
            src={logoUrl} 
            alt="Organization logo" 
            class="logo" 
            on:error={(e) => {
              console.error('[TransitionOverlay] Logo failed to load:', logoUrl);
              const target = e.target as HTMLImageElement;
              if (target) target.style.display = 'none';
            }}
            loading="eager"
          />
        {/if}
      </div>
   
  </div>
{/if}

<style>
  .overlay-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    pointer-events: none;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }
  
  .wipe-left, .wipe-right {
    z-index: 999;
    position: absolute;
    height: 100%;
    width: 60%;
    background-color: var(--accent-color-700, var(--overlay-accent-color));
    opacity: 0.9;
  }
  
  .wipe-left-first, .wipe-right-first {
    z-index: 998;
    opacity: 0.6;
    width: 65%;
  }
  
  .wipe-left {
    left: -50%;
    transform: skewX(-15deg);
  }
  
  .wipe-left-first {
    left: -55%;
    transform: skewX(-18deg);
  }
  
  .wipe-right {
    right: -50%;
    transform: skewX(-15deg);
  }
  
  .wipe-right-first {
    right: -55%;
    transform: skewX(-18deg);
  }
  
  .wipe-bottom {
    position: absolute;
    height: 120%; /* Extra height to ensure full coverage */
    width: 100%;
    background: var(--accent-gradient-medium, var(--overlay-accent-color));
    bottom: 0;
    transform-origin: bottom center;
    z-index: 990;
    opacity: 1; /* Ensure full opacity */
    will-change: transform; /* Optimize for animations */
    transform: translateZ(0); /* Force GPU acceleration */
  }
  
  .wipe-bottom-first {
    z-index: 989;
    opacity: 0.7;
    height: 125%;
    background: var(--accent-gradient-light, var(--overlay-accent-color));
    bottom: -5px;
    will-change: transform; /* Optimize for animations */
    transform: translateZ(0); /* Force GPU acceleration */
  }
  
  .logo-container {
    position: absolute;
    z-index: 1002;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }
  
  .logo {
    max-width: 35vw;
    max-height: 35vh;
    width: 350px; /* Add explicit width */
    height: auto; /* Maintain aspect ratio */
    filter: drop-shadow(0 0 15px rgba(0, 0, 0, 0.6));
    object-fit: contain;
    will-change: transform; /* Improves animation performance */
  }
</style>
