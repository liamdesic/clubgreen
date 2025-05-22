<script lang="ts">
  /**
   * Button component for consistent styling across the application
   */
  export let type: 'button' | 'submit' | 'reset' = "button";
  export let disabled = false;
  export let variant: 'primary' | 'secondary' | 'outline' = "primary";
  export let size: 'small' | 'medium' | 'large' = "medium";
  export let fullWidth = false;
</script>

<button
  {type}
  {disabled}
  class="button {variant} {size} {fullWidth ? 'full-width' : ''}"
  on:click
>
  <slot />
</button>

<style>
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    outline: none;
    font-family: inherit;
  }

  .button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Variants */
  .primary {
    background: linear-gradient(135deg, #689ef9 0%, #6e4ef4 100%);
    color: white;
    box-shadow: 0 2px 10px rgba(110, 78, 244, 0.2);
  }

  .primary:hover:not(:disabled) {
    box-shadow: 0 4px 14px rgba(110, 78, 244, 0.4);
    transform: translateY(-1px);
  }

  .secondary {
    background-color: #f3f4f6;
    color: #374151;
  }

  .secondary:hover:not(:disabled) {
    background-color: #e5e7eb;
  }

  .outline {
    background-color: transparent;
    color: #6e4ef4;
    border: 1px solid #6e4ef4;
  }

  .outline:hover:not(:disabled) {
    background-color: rgba(110, 78, 244, 0.05);
  }

  /* Sizes */
  .small {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .medium {
    padding: 0.625rem 1.25rem;
    font-size: 1rem;
  }

  .large {
    padding: 0.75rem 1.5rem;
    font-size: 1.125rem;
  }

  .full-width {
    width: 100%;
  }
</style>
