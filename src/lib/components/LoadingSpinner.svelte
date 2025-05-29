<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let color: string = 'currentColor';
  export let label: string = 'Loading...';
  export let showLabel: boolean = false;
  export let fullWidth: boolean = false;
  export let center: boolean = true;

  // Size mapping for different spinner sizes
  const sizeMap = {
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem'
  };

  // Border width based on size
  const borderWidth = {
    sm: '0.125rem',
    md: '0.1875rem',
    lg: '0.25rem',
    xl: '0.3125rem'
  };
</script>

<div 
  class="loading-spinner"
  class:fullWidth
  class:center
  aria-busy="true"
  aria-live="polite"
  aria-label={label}
>
  <div 
    class="spinner"
    style="
      --spinner-size: {sizeMap[size]};
      --spinner-color: {color};
      --border-width: {borderWidth[size]};
    "
  ></div>
  {#if showLabel}
    <span class="sr-only">{label}</span>
  {/if}
</div>

<style>
  .loading-spinner {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
  }

  .full-width {
    width: 100%;
    justify-content: center;
  }

  .center {
    margin: 0 auto;
  }

  .spinner {
    width: var(--spinner-size);
    height: var(--spinner-size);
    border: var(--border-width) solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: var(--spinner-color, currentColor);
    animation: spin 1s ease-in-out infinite;
    display: inline-block;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Screen reader only text */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
