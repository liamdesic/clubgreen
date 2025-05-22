<script>
  export let type = 'button';
  export let variant = 'primary'; // or 'outline', 'light', 'dark'
</script>

<button type={type} class={`btn ${variant}`}>
  <slot />
</button>

<style>
  .btn {
    text-align: center;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 1rem;
    padding: 0.65rem 1.4rem;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    transition: var(--transition);
    text-shadow: 5px 5px 7px rgba(86, 48, 163, 0.4); /* purple glow */
  }

  .primary {
    background: var(--gradient-color);
    color: white;
    border: none;
  }

  .outline {
    background: transparent;
    color: var(--color-accent-purple);
    border: 2px solid var(--color-accent-purple);
  }

  .light {
    background: var(--gradient-light);
    color: var(--color-black);
  }

  .dark {
    background: var(--gradient-dark);
    color: white;
  }

  .btn:hover {
    transform: scale(1.03);
  }
</style>
