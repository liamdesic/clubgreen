<script lang="ts">
  import { onMount } from 'svelte';
  import TransitionOverlay from '$lib/components/leaderboard/TransitionOverlay.svelte';
  
  // State
  let showTransition = false;
  let transitionDuration = 1000; // 1 second by default
  let loopInterval = 3000; // 3 seconds between transitions
  let accentColor = '#3498db'; // Default blue
  let logoUrl = '/logos/ldrb-logo-colourlight.svg'; // Default logo
  let loopActive = false;
  let loopTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Sample accent colors
  const accentColors = [
    { name: 'Blue', value: '#3498db' },
    { name: 'Green', value: '#2ecc71' },
    { name: 'Red', value: '#e74c3c' },
    { name: 'Purple', value: '#9b59b6' },
    { name: 'Orange', value: '#e67e22' },
    { name: 'Yellow', value: '#f1c40f' },
    { name: 'Teal', value: '#1abc9c' }
  ];
  
  // Sample logos
  const sampleLogos = [
    { name: 'None', url: '' },
    { name: 'LDRB Logo Light', url: '/logos/ldrb-logo-colourlight.svg' },
    { name: 'LDRB Logo Dark', url: '/logos/ldrb-logo-colourdark.svg' },
    { name: 'LDRB Logo White', url: '/logos/ldrb-logo-white.svg' },
    { name: 'LDRB Logo Black', url: '/logos/ldrb-logo-black.svg' },
    { name: 'LDRB Icon White', url: '/logos/ldrb-icon-white.svg' },
    { name: 'LDRB Icon Black', url: '/logos/ldrb-icon-black.svg' }
  ];
  
  function startLoop() {
    if (loopActive) return;
    
    loopActive = true;
    playTransition();
  }
  
  function stopLoop() {
    loopActive = false;
    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }
  }
  
  function playTransition() {
    if (!loopActive) return;
    
    showTransition = true;
    
    // Schedule next transition after the current one completes
    // This ensures we don't try to start a new transition while one is in progress
  }
  
  function onTransitionComplete() {
    showTransition = false;
    
    // Schedule next transition if loop is active
    if (loopActive) {
      loopTimer = setTimeout(() => {
        playTransition();
      }, loopInterval);
    }
  }
  
  onMount(() => {
    return () => {
      if (loopTimer) {
        clearTimeout(loopTimer);
      }
    };
  });
</script>

<div class="container">
  <h1>Transition Overlay Test</h1>
  
  <div class="controls">
    <div class="control-group">
      <h2>Playback Controls</h2>
      <div class="button-group">
        <button on:click={startLoop} disabled={loopActive}>
          Start Loop
        </button>
        <button on:click={stopLoop} disabled={!loopActive}>
          Stop Loop
        </button>
        <button on:click={() => showTransition = true} disabled={showTransition}>
          Play Once
        </button>
      </div>
    </div>
    
    <div class="control-group">
      <h2>Timing</h2>
      <div class="slider-group">
        <label>
          Transition Duration: {transitionDuration}ms
          <input 
            type="range" 
            min="500" 
            max="3000" 
            step="100" 
            bind:value={transitionDuration}
          />
        </label>
        
        <label>
          Loop Interval: {loopInterval}ms
          <input 
            type="range" 
            min="2000" 
            max="10000" 
            step="500" 
            bind:value={loopInterval}
          />
        </label>
      </div>
    </div>
    
    <div class="control-group">
      <h2>Appearance</h2>
      
      <div class="select-group">
        <label>
          Accent Color:
          <select bind:value={accentColor}>
            {#each accentColors as color}
              <option value={color.value}>{color.name}</option>
            {/each}
          </select>
        </label>
        
        <div class="color-preview" style="background-color: {accentColor};"></div>
      </div>
      
      <div class="select-group">
        <label>
          Logo:
          <select bind:value={logoUrl}>
            {#each sampleLogos as logo}
              <option value={logo.url}>{logo.name}</option>
            {/each}
          </select>
        </label>
      </div>
    </div>
  </div>
  
  <div class="preview-area">
    <h2>Preview Area</h2>
    <div class="preview-content">
      <p>This is sample content that will be behind the transition overlay.</p>
      <p>The transition overlay will appear on top of this content.</p>
      <p>Current status: {showTransition ? 'Transition active' : 'No transition'}</p>
    </div>
  </div>
  
  <!-- Transition Overlay -->
  <TransitionOverlay 
    active={showTransition}
    accentColor={accentColor}
    logoUrl={logoUrl}
    duration={transitionDuration}
    on:complete={onTransitionComplete}
  />
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  h1, h2 {
    margin-top: 0;
  }
  
  .controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
    background-color: #f5f5f5;
    padding: 1.5rem;
    border-radius: 8px;
  }
  
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .button-group {
    display: flex;
    gap: 0.5rem;
  }
  
  button {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
  
  button:hover:not(:disabled) {
    background-color: #2980b9;
  }
  
  button:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
  
  .slider-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-weight: 500;
  }
  
  input[type="range"] {
    width: 100%;
  }
  
  select {
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  
  .select-group {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .color-preview {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 2px solid #ddd;
  }
  
  .preview-area {
    background-color: #f9f9f9;
    padding: 2rem;
    border-radius: 8px;
    min-height: 300px;
  }
  
  .preview-content {
    text-align: center;
    padding: 2rem;
  }
</style>
