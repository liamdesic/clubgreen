<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Plus } from 'lucide-svelte';

  export let colors: string[] = ['#00c853'];
  export let maxColors = 6;
  export let mode: 'customize' | 'select' = 'customize';
  export let selectedColor: string | null = null;

  const dispatch = createEventDispatcher<{
    update: { colors: string[] };
    select: { color: string };
  }>();

  function updateColor(index: number, value: string) {
    if (mode === 'customize') {
      colors[index] = value;
      dispatch('update', { colors: [...colors] });
    }
  }

  function addColor() {
    if (mode === 'customize' && colors.length < maxColors) {
      colors = [...colors, '#000000'];
      dispatch('update', { colors: [...colors] });
    }
  }

  function removeColor(index: number) {
    if (mode === 'customize' && colors.length > 1) {
      colors = colors.filter((_, i) => i !== index);
      dispatch('update', { colors: [...colors] });
    }
  }

  function selectColor(color: string) {
    if (mode === 'select') {
      selectedColor = color;
      dispatch('select', { color });
    }
  }
</script>

<div class="color-palette">
  <div class="color-list">
    {#each colors as color, i}
      <div class="color-item">
        {#if mode === 'customize'}
          <input 
            type="color" 
            bind:value={colors[i]}
            on:input={() => updateColor(i, colors[i])}
          />
          {#if colors.length > 1}
            <button 
              type="button" 
              class="remove-color" 
              on:click={() => removeColor(i)}
              aria-label="Remove color {i + 1}"
            >
              ×
            </button>
          {/if}
        {:else}
          <button
            type="button"
            class="color-swatch {selectedColor === color ? 'selected' : ''}"
            style="background: {color}; opacity: {selectedColor === color ? '1' : '0.5'}"
            on:click={() => selectColor(color)}
            on:mouseenter={(e) => e.currentTarget.style.opacity = '1'}
            on:mouseleave={(e) => e.currentTarget.style.opacity = selectedColor === color ? '1' : '0.5'}
            aria-label="Select color {color}"
            title="Click to select this color"
          ></button>
        {/if}
      </div>
    {/each}

    {#if mode === 'customize' && colors.length < maxColors}
      <button 
        type="button" 
        class="add-color-button" 
        on:click={addColor}
      >
        <Plus size={20} />
        <span>Add Color</span>
      </button>
    {/if}
  </div>
</div>

<style>
  .color-palette {
    margin: 1rem 0;
  }

  .color-list {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }

  .color-item {
    position: relative;
    display: flex;
    align-items: center;
  }

  input[type="color"] {
    width: 48px;
    height: 48px;
    padding: 0;
    border: 2px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    background: none;
  }

  input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 6px;
  }

  input[type="color"]::-moz-color-swatch {
    border: none;
    border-radius: 6px;
  }

  .color-swatch {
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    padding: 0;
    transition: opacity 0.2s ease, transform 0.1s ease;
  }

  .color-swatch:hover {
    transform: translateY(-1px);
  }

  .color-swatch.selected {
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .remove-color {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ff4444;
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    line-height: 1;
    padding: 0;
  }

  .add-color-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: 2px dashed #ddd;
    border-radius: 8px;
    background: none;
    cursor: pointer;
    font-size: 14px;
    color: #666;
    height: 48px;
  }

  .add-color-button:hover {
    border-color: #999;
    color: #333;
  }
</style> 