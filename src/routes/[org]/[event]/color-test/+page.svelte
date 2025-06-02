<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import '$lib/styles/theme.css';
  
  let event = null;
  let loading = true;
  let error = null;
  
  // Color categories for display
  const colorCategories = [
    {
      title: 'Accent Color Scale',
      colors: [
        { name: 'accent-color-100', label: '100 (Very Light)' },
        { name: 'accent-color-200', label: '200 (Light)' },
        { name: 'accent-color-300', label: '300 (Medium Light)' },
        { name: 'accent-color-400', label: '400 (Slightly Light)' },
        { name: 'accent-color-500', label: '500 (Base Color)' },
        { name: 'accent-color-600', label: '600 (Slightly Dark)' },
        { name: 'accent-color-700', label: '700 (Medium Dark)' },
        { name: 'accent-color-800', label: '800 (Dark)' },
        { name: 'accent-color-900', label: '900 (Very Dark)' }
      ]
    },
    {
      title: 'Saturation Variations',
      colors: [
        { name: 'accent-color-desaturated', label: 'Desaturated' },
        { name: 'accent-color', label: 'Base Color' },
        { name: 'accent-color-saturated', label: 'Saturated' }
      ]
    },
    {
      title: 'Legacy Support',
      colors: [
        { name: 'accent-color-light', label: 'Light (Legacy)' },
        { name: 'accent-color', label: 'Base Color' },
        { name: 'accent-color-dark', label: 'Dark (Legacy)' }
      ]
    }
  ];
  
  // Gradient categories
  const gradientCategories = [
    {
      title: 'Gradient Variations',
      gradients: [
        { name: 'accent-gradient-light', label: 'Light Gradient' },
        { name: 'accent-gradient-medium', label: 'Medium Gradient' },
        { name: 'accent-gradient-dark', label: 'Dark Gradient' },
        { name: 'accent-gradient-very-dark', label: 'Very Dark Gradient' }
      ]
    }
  ];
  
  async function fetchEventData() {
    try {
      loading = true;
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*, organizations(*)')
        .eq('slug', $page.params.event)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (data) {
        event = data;
        // Set the accent color from event settings
        if (browser && event?.settings_json?.accent_color) {
          document.documentElement.style.setProperty('--accent-color', event.settings_json.accent_color);
        }
      }
    } catch (err) {
      console.error('Error fetching event data:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    fetchEventData();
  });
  
  function getContrastColor(colorVar) {
    // This is a simplified approach - for production, you'd want a more sophisticated contrast calculation
    // For now, we'll just use white text on darker colors and black text on lighter colors
    const darkColors = [
      'accent-color-600', 
      'accent-color-700', 
      'accent-color-800', 
      'accent-color-900',
      'accent-color-dark'
    ];
    
    return darkColors.includes(colorVar) ? '#ffffff' : '#000000';
  }
</script>

<div class="color-showcase">
  <header>
    <h1>Accent Color Showcase</h1>
    {#if event}
      <p class="event-info">
        Event: <strong>{event.name}</strong> | 
        Base Accent Color: <span class="color-pill" style="background-color: var(--accent-color)">{event.settings_json?.accent_color || '#00c853'}</span>
      </p>
    {/if}
  </header>

  {#if loading}
    <div class="loading">Loading event data...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else}
    <div class="color-sections">
      <!-- Solid Color Variations -->
      {#each colorCategories as category}
        <section class="color-section">
          <h2>{category.title}</h2>
          <div class="color-grid">
            {#each category.colors as color}
              <div class="color-item">
                <div 
                  class="color-swatch" 
                  style="background-color: var(--{color.name}); color: {getContrastColor(color.name)}"
                >
                  <span class="color-name">{color.label}</span>
                  <span class="color-var">var(--{color.name})</span>
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/each}

      <!-- Gradient Variations -->
      {#each gradientCategories as category}
        <section class="color-section">
          <h2>{category.title}</h2>
          <div class="color-grid">
            {#each category.gradients as gradient}
              <div class="color-item gradient-item">
                <div 
                  class="color-swatch gradient-swatch" 
                  style="background: {getGradientValue(gradient.name)}; color: white"
                >
                  <span class="color-name">{gradient.label}</span>
                  <span class="color-var">var(--{gradient.name})</span>
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</div>

<style>
  .color-showcase {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    font-family: var(--font-body);
    background-color: white;
    min-height: 100vh;
  }
  
  header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #eee;
  }
  
  h1 {
    margin-bottom: 0.5rem;
  }
  
  .event-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .color-pill {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 50px;
    color: white;
    font-weight: 500;
    font-family: monospace;
  }
  
  .color-sections {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }
  
  .color-section h2 {
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }
  
  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  
  .color-item {
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  
  .color-swatch {
    height: 120px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform 0.2s ease;
  }
  
  .color-swatch:hover {
    transform: scale(1.02);
  }
  
  .gradient-swatch {
    height: 150px;
  }
  
  .color-name {
    font-weight: 600;
    font-size: 1.1rem;
  }
  
  .color-var {
    font-family: monospace;
    opacity: 0.8;
  }
  
  .loading, .error {
    padding: 2rem;
    text-align: center;
    background: #f5f5f5;
    border-radius: var(--radius);
  }
  
  .error {
    background: #ffebee;
    color: #c62828;
  }
</style>