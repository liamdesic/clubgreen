<script lang="ts">
  import Plus from 'lucide-svelte/icons/plus';
  import Minus from 'lucide-svelte/icons/minus';
  import { createEventDispatcher } from 'svelte';

  export let value: number = 9;
  export let minValue: number = 1;
  export let id: string = 'hole-count';

  const dispatch = createEventDispatcher<{
    change: { value: number }
  }>();

  function increment() {
    const newValue = Math.max(minValue, Number(value) + 1);
    value = newValue;
    dispatch('change', { value: newValue });
  }

  function decrement() {
    if (Number(value) > minValue) {
      const newValue = Number(value) - 1;
      value = newValue;
      dispatch('change', { value: newValue });
    }
  }

  function handleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const newValue = input.value === '' ? minValue : Math.max(minValue, Number(input.value));
    value = newValue;
    dispatch('change', { value: newValue });
  }
</script>

<div class="hole-selector">
  <div class="number-box-container">
    <div class="input-group">
      <input
        {id}
        class="number-box"
        type="number"
        min={minValue}
        {value}
        on:input={handleInput}
      />
      <div class="button-group">
        <button 
          type="button" 
          class="number-btn" 
          on:click={increment} 
          aria-label="Increase holes"
        >
          <Plus size={28} />
        </button>
        <button 
          type="button" 
          class="number-btn" 
          on:click={decrement} 
          aria-label="Decrease holes" 
          disabled={Number(value) <= minValue}
        >
          <Minus size={28} />
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .hole-selector {
    display: flex;
    flex-direction: column;
  }

  .number-box-container {
    display: flex;
    align-items: center;
  }

  .input-group {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
  }

  .button-group {
    gap: 0.5rem;
    display: flex;
    flex-direction: column;
    margin-left: 0.5rem;
  }

  .number-box {
    width: 80px;
    height: 80px;
    background: transparent;
    color: var(--text-primary);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    line-height: 1.1;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    /* Hide number input spinners for Chrome, Safari, Edge */
    -webkit-appearance: none;
    -moz-appearance: textfield;
    appearance: textfield;
  }

  /* Hide number input spinners for Chrome, Safari, Edge */
  .number-box::-webkit-outer-spin-button,
  .number-box::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Hide number input spinners for all browsers */
  .number-box[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .number-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-accent-purple);
    color: #fff;
    border: none;
    font-size: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  }

  .number-btn:hover:not(:disabled) {
    background: var(--color-accent-dark-purple);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .number-btn:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .number-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
</style>
