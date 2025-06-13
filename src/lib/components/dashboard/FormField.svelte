
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let label: string;
  export let name: string;
  export let type: 'text' | 'number' | 'email' | 'password' | 'url' | 'tel' = 'text';
  export let value: string | number = '';
  export let placeholder = '';
  export let required = false;
  export let disabled = false;
  export let error: string | undefined = undefined;
  export let help: string | undefined = undefined;
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;
  export let step: number | undefined = undefined;

  const dispatch = createEventDispatcher<{
    change: { value: string | number; name: string };
  }>();

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const newValue = type === 'number' ? Number(target.value) : target.value;
    dispatch('change', { value: newValue, name });
  }
</script>

<div class="form-field">
  <label for={name} class="label">
    {label}
    {#if required}
      <span class="required">*</span>
    {/if}
  </label>

  <input
    {type}
    {name}
    id={name}
    {value}
    {placeholder}
    {required}
    {disabled}
    {min}
    {max}
    {step}
    on:change={handleChange}
    class:error
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error || help ? `${name}-help` : undefined}
  />

  {#if error}
    <div class="error-message" id={`${name}-error`}>
      <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
      <span>{error}</span>
    </div>
  {/if}

  {#if help}
    <div class="help-text" id={`${name}-help`}>
      {help}
    </div>
  {/if}
</div>

<style>
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .label {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
  }

  .required {
    color: #f56565;
    margin-left: 0.25rem;
  }

  input {
    padding: 0.75rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.375rem;
    background-color: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.875rem;
    transition: all 0.2s ease-in-out;
  }

  input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
  }

  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input.error {
    border-color: #f56565;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #f56565;
    font-size: 0.75rem;
  }

  .help-text {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
  }
</style> 