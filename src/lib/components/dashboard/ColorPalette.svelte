<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Plus } from 'lucide-svelte';

  export let colors: string[] = ['#00c853'];
  export let maxColors = 6;

  const dispatch = createEventDispatcher<{
    update: { colors: string[] };
  }>();

  function updateColor(index: number, value: string) {
    colors[index] = value;
    dispatch('update', { colors: [...colors] });
  }

  function addColor() {
    if (colors.length < maxColors) {
      colors = [...colors, '#000000'];
      dispatch('update', { colors: [...colors] });
    }
  }

  function removeColor(index: number) {
    if (colors.length > 1) {
      colors = colors.filter((_, i) => i !== index);
      dispatch('update', { colors: [...colors] });
    }
  }
</script>

<div class="color-palette">
  <div class="description">
    <h3>Brand Colors</h3>
    <p>Add your brand colors to use them when creating events. These colors will be available in your event creation tools.</p>
  </div>
  <div class="color-list">
    {#each colors as color, i}
      <div class="color-item">
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
      </div>
    {/each}

    {#if colors.length < maxColors}
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

  .description {
    margin-bottom: 1rem;
  }

  .description h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  .description p {
    font-size: 0.875rem;
    color: #666;
    margin: 0;
    line-height: 1.4;
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