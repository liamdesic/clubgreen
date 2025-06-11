<script lang="ts">
  export let visible: boolean = false;
  export let onContinue: () => void;
  export let onStartNew: () => void;
</script>

{#if visible}
  <div class="recovery-modal">
    <div class="modal-content">
      <h2>Welcome Back</h2>
      <p>We found a saved game in progress. Would you like to continue where you left off?</p>
      <div class="button-col">
        <button class="continue" on:click={onContinue}>
          Continue
          <span class="icon">
            <!-- Lucide: arrow-right -->
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </span>
        </button>
        <button class="start-new" on:click={onStartNew}>
          <span class="icon">
            <!-- Lucide: rotate-ccw -->
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-7V8"/></svg>
          </span>
          Start New Game
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
.recovery-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0,0,0,0.8);
  z-index: 1000;
}
.modal-content {
  padding: 2rem;
  max-width: 90%;
  width: 400px;
  text-align: center;
  color: white;
  background-color: #1e1a26;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.modal-content h2 {
  margin-top: 0;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: white;
  font-family: 'obviously', 'Inter', sans-serif;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  font-weight: 700;
}
.modal-content p {
  margin-bottom: 2rem;
  line-height: 1.5;
  color: #d0d0d0;
  font-size: 1.1rem;
}
.button-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}
.icon {
  display: inline-flex;
  align-items: center;
  margin-left: 0.5rem;
}
.continue .icon {
  transition: transform 0.2s ease;
}
.continue:hover .icon {
  transform: translateX(4px);
}
.button-col .continue {
  font-family: 'obviously', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 600;
  font-size: 1.4rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  background-color: var(--accent-color, #00c853);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.button-col .continue:hover {
  background: #00b34a;
}
.button-col .start-new {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 1.05rem;
  font-weight: 600;
  background: none;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0 0.2rem 0;
  transition: color 0.2s;
}
.button-col .start-new:hover {
  color: var(--accent-color, #00c853);
  text-decoration: underline;
}
.button-col .icon {
  display: inline-flex;
  vertical-align: middle;
  margin-right: 0.25rem;
}
</style> 