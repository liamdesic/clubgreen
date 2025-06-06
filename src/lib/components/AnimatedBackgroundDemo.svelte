<script>
  import { onMount } from 'svelte';
  import SlidingBarsBackground from './SlidingBarsBackground.svelte';
  import GradientMeshBackground from './GradientMeshBackground.svelte';
  import ParticleWaveBackground from './ParticleWaveBackground.svelte';
  import NoiseFlowBackground from './NoiseFlowBackground.svelte';
  
  let activeBackground = 'gradient-mesh';
  let accentColor = '#00c853'; // Default accent color
  
  // Demo controls
  let useThemeColors = true;
  let opacity = 0.7;
  let speed = 0.5;
  
  // Background-specific controls
  let complexity = 5; // For GradientMesh
  let particleCount = 100; // For ParticleWave
  let waveAmplitude = 50; // For ParticleWave
  let noiseScale = 0.005; // For NoiseFlow
  
  function setBackground(bg) {
    activeBackground = bg;
  }
  
  onMount(() => {
    // Try to get accent color from CSS variable
    const computedStyle = getComputedStyle(document.documentElement);
    const themeAccentColor = computedStyle.getPropertyValue('--accent-color').trim();
    if (themeAccentColor) {
      accentColor = themeAccentColor;
    }
  });
</script>

<div class="demo-container">
  <div class="background-container">
    {#if activeBackground === 'sliding-bars'}
      <SlidingBarsBackground 
        {accentColor} 
        {useThemeColors} 
        {opacity} 
        duration={speed * 6} 
      >
        <div class="content-overlay">
          <h2>Sliding Bars Background</h2>
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
          <h2>Gradient Mesh Background</h2>
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
      >
        <div class="content-overlay">
          <h2>Particle Wave Background</h2>
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
      >
        <div class="content-overlay">
          <h2>Noise Flow Background</h2>
          <p>Particles flowing through a Perlin noise field</p>
        </div>
      </NoiseFlowBackground>
    {/if}
  </div>
  
  <div class="controls">
    <h3>Select Background</h3>
    <div class="button-group">
      <button 
        class:active={activeBackground === 'sliding-bars'} 
        on:click={() => setBackground('sliding-bars')}
      >
        Sliding Bars
      </button>
      <button 
        class:active={activeBackground === 'gradient-mesh'} 
        on:click={() => setBackground('gradient-mesh')}
      >
        Gradient Mesh
      </button>
      <button 
        class:active={activeBackground === 'particle-wave'} 
        on:click={() => setBackground('particle-wave')}
      >
        Particle Wave
      </button>
      <button 
        class:active={activeBackground === 'noise-flow'} 
        on:click={() => setBackground('noise-flow')}
      >
        Noise Flow
      </button>
    </div>
    
    <h3>Common Settings</h3>
    <div class="control-group">
      <label>
        <input type="checkbox" bind:checked={useThemeColors} />
        Use Theme Colors
      </label>
      
      <label>
        Accent Color:
        <input type="color" bind:value={accentColor} disabled={useThemeColors} />
      </label>
      
      <label>
        Opacity:
        <input type="range" bind:value={opacity} min="0.1" max="1" step="0.1" />
        <span>{opacity.toFixed(1)}</span>
      </label>
      
      <label>
        Speed:
        <input type="range" bind:value={speed} min="0.1" max="2" step="0.1" />
        <span>{speed.toFixed(1)}</span>
      </label>
    </div>
    
    {#if activeBackground === 'gradient-mesh'}
      <h3>Gradient Mesh Settings</h3>
      <div class="control-group">
        <label>
          Complexity:
          <input type="range" bind:value={complexity} min="1" max="10" step="1" />
          <span>{complexity}</span>
        </label>
      </div>
    {:else if activeBackground === 'particle-wave'}
      <h3>Particle Wave Settings</h3>
      <div class="control-group">
        <label>
          Particle Count:
          <input type="range" bind:value={particleCount} min="50" max="500" step="10" />
          <span>{particleCount}</span>
        </label>
        
        <label>
          Wave Amplitude:
          <input type="range" bind:value={waveAmplitude} min="10" max="100" step="5" />
          <span>{waveAmplitude}</span>
        </label>
      </div>
    {:else if activeBackground === 'noise-flow'}
      <h3>Noise Flow Settings</h3>
      <div class="control-group">
        <label>
          Particle Count:
          <input type="range" bind:value={particleCount} min="100" max="2000" step="100" />
          <span>{particleCount}</span>
        </label>
        
        <label>
          Noise Scale:
          <input type="range" bind:value={noiseScale} min="0.001" max="0.01" step="0.001" />
          <span>{noiseScale.toFixed(3)}</span>
        </label>
      </div>
    {/if}
  </div>
</div>

<style>
  .demo-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
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
  
  .content-overlay h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: white;
  }
  
  .content-overlay p {
    font-size: 1.2rem;
    max-width: 600px;
    color: rgba(255, 255, 255, 0.9);
  }
  
  .controls {
    background-color: rgba(28, 24, 33, 0.9);
    color: white;
    padding: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  
  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  input[type="range"] {
    flex: 1;
    max-width: 200px;
  }
  
  h3 {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.9);
  }
</style>
