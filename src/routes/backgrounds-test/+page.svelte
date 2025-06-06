<script lang="ts">
  import { onMount } from 'svelte';
  import SlidingBarsBackground from '$lib/components/SlidingBarsBackground.svelte';
  import GradientMeshBackground from '$lib/components/GradientMeshBackground.svelte';
  import ParticleWaveBackground from '$lib/components/ParticleWaveBackground.svelte';
  import NoiseFlowBackground from '$lib/components/NoiseFlowBackground.svelte';
  import '$lib/styles/theme.css';
  
  // Background options
  const backgrounds = [
    { id: 'sliding-bars', name: 'Sliding Bars' },
    { id: 'gradient-mesh', name: 'Gradient Mesh' },
    { id: 'particle-wave', name: 'Particle Wave' },
    { id: 'noise-flow', name: 'Noise Flow' }
  ];
  
  // State
  let activeBackground = 'gradient-mesh';
  let accentColor = '#00c853'; // Default accent color
  let useThemeColors = true;
  let opacity = 0.7;
  let speed = 0.5;
  
  // Background-specific settings
  let complexity = 5; // For GradientMesh
  let particleCount = 100; // For ParticleWave and NoiseFlow
  let waveAmplitude = 50; // For ParticleWave
  let waveFrequency = 0.02; // For ParticleWave
  let noiseScale = 0.005; // For NoiseFlow
  let blurAmount = 0; // For SlidingBars
  
  // Additional NoiseFlow settings
  let particleSize = 5;
  let trailLength = 0.15;
  let connectionDistance = 150;
  let connectionThickness = 1.5;
  let connectionOpacity = 0.5;
  let showNoiseFlowSettings = true; // Toggle for settings panel
  
  // Predefined color options
  const colorOptions = [
    { name: 'Green', value: '#00c853' },
    { name: 'Blue', value: '#2196f3' },
    { name: 'Purple', value: '#6e4ef4' },
    { name: 'Red', value: '#f44336' },
    { name: 'Orange', value: '#ff9800' },
    { name: 'Pink', value: '#e91e63' }
  ];
  
  function setBackground(bg: string) {
    activeBackground = bg;
  }
  
  function setAccentColor(color: string) {
    accentColor = color;
    
    // Update CSS variable for the entire page
    document.documentElement.style.setProperty('--accent-color', color);
  }
  
  onMount(() => {
    // Set initial accent color CSS variable
    document.documentElement.style.setProperty('--accent-color', accentColor);
    
    return () => {
      // Reset accent color when component is destroyed
      document.documentElement.style.setProperty('--accent-color', '#00c853');
    };
  });
</script>

<svelte:head>
  <title>Animated Backgrounds Test</title>
</svelte:head>

<div class="page-container">
  <div class="background-container">
    {#if activeBackground === 'sliding-bars'}
      <SlidingBarsBackground 
        {accentColor} 
        {useThemeColors} 
        {opacity} 
        duration={speed * 6} 
        {blurAmount}
      >
        <div class="content-overlay">
          <h1>Sliding Bars Background</h1>
          <p>Simple CSS-based animated gradient background</p>
        </div>
      </SlidingBarsBackground>
    {:else if activeBackground === 'gradient-mesh'}
      <GradientMeshBackground 
        {accentColor} 
        {useThemeColors} 
        {opacity} 
        {speed} 
        {complexity}
      >
        <div class="content-overlay">
          <h1>Gradient Mesh Background</h1>
          <p>WebGL-powered animated gradient mesh with simplex noise</p>
        </div>
      </GradientMeshBackground>
    {:else if activeBackground === 'particle-wave'}
      <ParticleWaveBackground 
        {accentColor} 
        {useThemeColors} 
        {opacity} 
        {speed} 
        {particleCount} 
        {waveAmplitude}
        {waveFrequency}
      >
        <div class="content-overlay">
          <h1>Particle Wave Background</h1>
          <p>Canvas-based particle system with wave motion</p>
        </div>
      </ParticleWaveBackground>
    {:else if activeBackground === 'noise-flow'}
      <NoiseFlowBackground 
        {accentColor} 
        {useThemeColors} 
        {opacity} 
        {speed} 
        {particleCount} 
        {noiseScale}
        {particleSize}
        {trailLength}
        {connectionDistance}
        {connectionThickness}
        {connectionOpacity}
        showSettings={showNoiseFlowSettings}
      >
        <div class="content-overlay">
          <h1>Noise Flow Background</h1>
          <p>Particles flowing through a Perlin noise field</p>
        </div>
      </NoiseFlowBackground>
    {/if}
  </div>
  
  <div class="controls-panel">
    <div class="controls-header">
      <h2>Background Controls</h2>
      <button class="close-button" on:click={() => window.history.back()}>Back</button>
    </div>
    
    <div class="control-section">
      <h3>Select Background</h3>
      <div class="button-group">
        {#each backgrounds as bg}
          <button 
            class:active={activeBackground === bg.id} 
            on:click={() => setBackground(bg.id)}
          >
            {bg.name}
          </button>
        {/each}
      </div>
    </div>
    
    <div class="control-section">
      <h3>Accent Color</h3>
      <div class="color-options">
        {#each colorOptions as color}
          <button 
            class="color-button" 
            style="background-color: {color.value};" 
            aria-label="Set color to {color.name}"
            on:click={() => setAccentColor(color.value)}
            class:active={accentColor === color.value}
          ></button>
        {/each}
        <div class="color-picker-container">
          <input 
            type="color" 
            id="custom-color" 
            bind:value={accentColor} 
            on:input={() => setAccentColor(accentColor)}
          />
          <label for="custom-color">Custom</label>
        </div>
      </div>
      
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={useThemeColors} />
        Use theme color variations
      </label>
    </div>
    
    <div class="control-section">
      <h3>Common Settings</h3>
      <div class="slider-control">
        <label for="opacity">Opacity: {opacity.toFixed(1)}</label>
        <input 
          type="range" 
          id="opacity" 
          bind:value={opacity} 
          min="0.1" 
          max="1" 
          step="0.1" 
        />
      </div>
      
      <div class="slider-control">
        <label for="speed">Speed: {speed.toFixed(1)}</label>
        <input 
          type="range" 
          id="speed" 
          bind:value={speed} 
          min="0.1" 
          max="2" 
          step="0.1" 
        />
      </div>
    </div>
    
    <!-- Background-specific settings -->
    {#if activeBackground === 'sliding-bars'}
      <div class="control-section">
        <h3>Sliding Bars Settings</h3>
        <div class="slider-control">
          <label for="blur">Blur: {blurAmount}px</label>
          <input 
            type="range" 
            id="blur" 
            bind:value={blurAmount} 
            min="0" 
            max="50" 
            step="1" 
          />
        </div>
      </div>
    {:else if activeBackground === 'gradient-mesh'}
      <div class="control-section">
        <h3>Gradient Mesh Settings</h3>
        <div class="slider-control">
          <label for="complexity">Complexity: {complexity}</label>
          <input 
            type="range" 
            id="complexity" 
            bind:value={complexity} 
            min="1" 
            max="10" 
            step="1" 
          />
        </div>
      </div>
    {:else if activeBackground === 'particle-wave'}
      <div class="control-section">
        <h3>Particle Wave Settings</h3>
        <div class="slider-control">
          <label for="particleCount">Particle Count: {particleCount}</label>
          <input 
            type="range" 
            id="particleCount" 
            bind:value={particleCount} 
            min="50" 
            max="500" 
            step="10" 
          />
        </div>
        
        <div class="slider-control">
          <label for="waveAmplitude">Wave Amplitude: {waveAmplitude}</label>
          <input 
            type="range" 
            id="waveAmplitude" 
            bind:value={waveAmplitude} 
            min="10" 
            max="100" 
            step="5" 
          />
        </div>
        
        <div class="slider-control">
          <label for="waveFrequency">Wave Frequency: {waveFrequency.toFixed(3)}</label>
          <input 
            type="range" 
            id="waveFrequency" 
            bind:value={waveFrequency} 
            min="0.005" 
            max="0.05" 
            step="0.005" 
          />
        </div>
      </div>
    {:else if activeBackground === 'noise-flow'}
      <div class="control-section">
        <h3>Noise Flow Settings</h3>
        <div class="slider-control">
          <label for="noiseParticleCount">Particle Count: {particleCount}</label>
          <input 
            type="range" 
            id="noiseParticleCount" 
            bind:value={particleCount} 
            min="50" 
            max="300" 
            step="10" 
          />
        </div>
        <div class="slider-control">
          <label for="noiseScale">Noise Scale: {noiseScale.toFixed(3)}</label>
          <input 
            type="range" 
            id="noiseScale" 
            bind:value={noiseScale} 
            min="0.001" 
            max="0.01" 
            step="0.001" 
          />
        </div>
        <div class="slider-control">
          <label for="particleSize">Particle Size: {particleSize.toFixed(1)}</label>
          <input 
            type="range" 
            id="particleSize" 
            bind:value={particleSize} 
            min="1" 
            max="10" 
            step="0.5" 
          />
        </div>
        <div class="slider-control">
          <label for="trailLength">Trail Length: {trailLength.toFixed(2)}</label>
          <input 
            type="range" 
            id="trailLength" 
            bind:value={trailLength} 
            min="0.01" 
            max="0.5" 
            step="0.01" 
          />
        </div>
        <div class="slider-control">
          <label for="connectionDistance">Connection Distance: {connectionDistance}</label>
          <input 
            type="range" 
            id="connectionDistance" 
            bind:value={connectionDistance} 
            min="50" 
            max="300" 
            step="10" 
          />
        </div>
        <div class="slider-control">
          <label for="connectionThickness">Connection Thickness: {connectionThickness.toFixed(1)}</label>
          <input 
            type="range" 
            id="connectionThickness" 
            bind:value={connectionThickness} 
            min="0.5" 
            max="3" 
            step="0.1" 
          />
        </div>
        <div class="slider-control">
          <label for="connectionOpacity">Connection Opacity: {connectionOpacity.toFixed(1)}</label>
          <input 
            type="range" 
            id="connectionOpacity" 
            bind:value={connectionOpacity} 
            min="0.1" 
            max="1" 
            step="0.1" 
          />
        </div>
        <div class="checkbox-control">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={showNoiseFlowSettings} />
            Show NoiseFlow Settings Panel
          </label>
        </div>
        
        <div class="settings-output">
          <h4>Current Settings (Copy & Paste)</h4>
          <pre class="settings-text">
Particle Size: {particleSize}
Particle Count: {particleCount}
Speed: {speed}
Opacity: {opacity}
Noise Scale: {noiseScale}
Trail Length: {trailLength}
Connection Distance: {connectionDistance}
Connection Thickness: {connectionThickness}
Connection Opacity: {connectionOpacity}
          </pre>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .page-container {
    display: flex;
    width: 100%;
    height: 100vh;
    position: relative;
  }
  
  .background-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
  
  .content-overlay {
    position: relative;
    z-index: 10;
    padding: 2rem;
    color: white;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  
  .content-overlay h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: white;
  }
  
  .content-overlay p {
    font-size: 1.2rem;
    max-width: 600px;
    color: rgba(255, 255, 255, 0.9);
  }
  
  .controls-panel {
    width: 350px;
    background-color: rgba(28, 24, 33, 0.95);
    color: white;
    padding: 1.5rem;
    overflow-y: auto;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
    z-index: 100;
  }
  
  .controls-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .controls-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: white;
  }
  
  .close-button {
    background-color: transparent;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: var(--radius, 12px);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .close-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .control-section {
    margin-bottom: 2rem;
  }
  
  .control-section h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.9);
  }
  
  .button-group {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  
  button {
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: var(--radius, 12px);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  button:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  
  button.active {
    background-color: var(--accent-color, #00c853);
    border-color: var(--accent-color, #00c853);
  }
  
  .color-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .color-button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    padding: 0;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .color-button.active {
    border-color: white;
    transform: scale(1.1);
  }
  
  .color-picker-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  
  input[type="color"] {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: none;
    cursor: pointer;
    padding: 0;
  }
  
  input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
    border-radius: 50%;
  }
  
  input[type="color"]::-webkit-color-swatch {
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .slider-control {
    margin-bottom: 1rem;
  }
  
  .slider-control label {
    display: block;
    margin-bottom: 0.5rem;
    color: rgba(255, 255, 255, 0.8);
  }
  
  input[type="range"] {
    width: 100%;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    height: 6px;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: var(--accent-color, #00c853);
    cursor: pointer;
  }
  
  .settings-output {
    margin-top: 1rem;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius, 12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .settings-output h4 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: rgba(255, 255, 255, 0.9);
  }
  
  .settings-text {
    background-color: rgba(0, 0, 0, 0.3);
    padding: 1rem;
    border-radius: var(--radius, 8px);
    font-family: monospace;
    white-space: pre;
    overflow-x: auto;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
    line-height: 1.4;
    margin: 0;
    user-select: all; /* Makes it easy to select all text with one click */
  }
  
  @media (max-width: 768px) {
    .page-container {
      flex-direction: column;
    }
    
    .controls-panel {
      width: 100%;
      height: 50%;
      overflow-y: auto;
    }
  }
</style>
