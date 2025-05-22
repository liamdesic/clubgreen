<script>
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount } from 'svelte';
  
  // Game state
  let currentPlayerIndex = 0;
  let gameState = 'instructions'; // 'instructions', 'playing', 'results'
  let timer = 0;
  let timerInterval;
  let results = [];
  let formattedTimer = '0.00';
  let currentPlayer = null;
  
  // Export the component
  export let isOpen = false;
  export let players = [];
  export let onClose = () => {};
  export let onComplete = (results) => {};

  const customEase = cubicOut;

  // Initialize the game
  function initGame() {
    currentPlayerIndex = 0;
    gameState = 'instructions';
    timer = 0;
    results = [];
    currentPlayer = players[0];
  }

  // Start the game
  function startGame() {
    gameState = 'playing';
    startTimer();
  }

  // Start the timer
  function startTimer() {
    timer = 0;
    const startTime = Date.now();

    timerInterval = setInterval(() => {
      timer = (Date.now() - startTime) / 1000 - 3; // Subtract 3 seconds for countdown
      formattedTimer = timer >= 0 ? `+${timer.toFixed(2)}` : timer.toFixed(2);

      // Auto-stop after 10 seconds
      if (timer > 10) {
        stopTimer();
      }
    }, 10);
  }

  // Stop the timer
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;

      // Save the result
      const score = Math.abs(timer); // Closer to 0 is better
      const time = formattedTimer;

      results.push({
        player: currentPlayer,
        score,
        time
      });

      // Move to next player or show results
      if (currentPlayerIndex < players.length - 1) {
        currentPlayerIndex++;
        currentPlayer = players[currentPlayerIndex];
        gameState = 'instructions';
      } else {
        gameState = 'results';
        // Sort results by score (closest to 0 first)
        results.sort((a, b) => a.score - b.score);
      }
    }
  }

  // Handle click to stop timer
  function handleClick() {
    if (gameState === 'playing' && timerInterval) {
      stopTimer();
    }
  }

  // Complete the game and close modal
  function completeGame() {
    onComplete(results);
    onClose();
  }

  // Initialize on mount
  onMount(() => {
    initGame();
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  });

  // Update current player when players change
  $: if (players.length > 0) {
    currentPlayer = players[currentPlayerIndex];
  }
</script>

{#if isOpen}
  <div class="modal-overlay" on:click|self={onClose}>
    <div class="modal-content" role="dialog" aria-labelledby="tiebreaker-title" aria-describedby="tiebreaker-instructions">
      {#if gameState === 'instructions'}
        <h2 id="tiebreaker-title">Tiebreaker: {currentPlayer.name}</h2>
        <p id="tiebreaker-instructions">Click the button when the timer hits 0.00. Closest to zero wins!</p>
        <button class="button" on:click={startGame}>
          Start Game
        </button>
      {/if}

      {#if gameState === 'playing'}
        <h2>Click when timer hits 0.00!</h2>
        <div 
          class="timer-display" 
          on:click={handleClick}
          role="button"
          tabindex="0"
          on:keydown={e => e.key === 'Enter' || e.key === ' ' ? handleClick() : null}
        >
          {formattedTimer}
        </div>
        <p class="hint">Click anywhere to stop the timer</p>
      {/if}

      {#if gameState === 'results'}
        <h2>Tiebreaker Results</h2>
        <div class="results">
          {#each results as result, i}
            <div class="result">
              <span class="rank">{i + 1}.</span>
              <span class="name">{result.player.name}</span>
              <span class="time">{result.time}s</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }
  
  .vs-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin: 2rem 0;
    font-size: 1.5rem;
    font-weight: bold;
  }
  
  .vs {
    background: var(--accent-color);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .timer-display {
    font-size: 4rem;
    font-family: monospace;
    margin: 2rem 0;
    font-weight: bold;
  }
  
  button {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 0.8rem 2rem;
    border-radius: 50px;
    font-size: 1.1rem;
    cursor: pointer;
    margin-top: 1rem;
    transition: transform 0.2s, background 0.2s;
  }
  
  button:hover {
    transform: translateY(-2px);
    background: color-mix(in srgb, var(--accent-color), black 10%);
  }
  
  .stop-button {
    background: #e74c3c;
    font-size: 1.5rem;
    padding: 1rem 3rem;
  }
  
  .results-list {
    margin: 2rem 0;
    text-align: left;
  }
  
  .result-item {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
    margin: 0.5rem 0;
    background: #f8f9fa;
    border-radius: 8px;
    align-items: center;
  }
  
  .winner-badge {
    background: #2ecc71;
    color: white;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.9rem;
    margin-left: 1rem;
  }
</style>
