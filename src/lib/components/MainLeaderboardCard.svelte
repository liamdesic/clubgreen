<script lang="ts">
  export let organizationSlug: string | null;

  // Placeholder for transition time value
  let transitionTime = '5 seconds'; // Example value

  // Example options for the dropdown
  const transitionOptions = [
    '3 seconds',
    '5 seconds',
    '10 seconds',
    '15 seconds',
    '20 seconds'
  ];

  // Construct the example URL
  $: leaderboardUrl = organizationSlug ? `https://ldrboard.com/leaderboard/${organizationSlug}` : '';

  async function copyUrl() {
    if (leaderboardUrl) {
      try {
        await navigator.clipboard.writeText(leaderboardUrl);
        alert('URL copied to clipboard!'); // Simple feedback
      } catch (err) {
        console.error('Failed to copy URL: ', err);
        alert('Failed to copy URL.');
      }
    }
  }
</script>

<div class="main-leaderboard-card">
  <div class="card-header">
    <span class="live-indicator">🔴 Live</span>
    <h3 class="card-title">Main Leaderboard</h3>
  </div>

  <div class="card-section url-section">
    <label for="leaderboard-url">URL</label>
    <div class="url-input-container">
      <input
        id="leaderboard-url"
        type="text"
        value={leaderboardUrl}
        readonly
        aria-label="Main Leaderboard URL"
      />
      <button class="copy-button" aria-label="Copy URL" on:click={copyUrl}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-copy"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
        </svg>
      </button>
    </div>
  </div>

  <div class="card-section settings-section">
    <label for="transition-time">Settings</label>
    <div class="transition-time-dropdown">
      <label for="transition-time">Transition Time</label>
      <select id="transition-time" bind:value={transitionTime}>
        {#each transitionOptions as option}
          <option value={option}>{option}</option>
        {/each}
      </select>
      <span class="dropdown-arrow">▼</span>
    </div>
  </div>
</div>

<style>
  .main-leaderboard-card {
    background-color: #181828; /* Dark background */
    border-radius: 1.5rem; /* Rounded corners */
    padding: 1.5rem;
    color: #fff; /* White text */
    font-family: 'Inter', sans-serif; /* Inter font */
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 300px; /* Ensure it has a reasonable minimum width */
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .live-indicator {
    font-size: 0.9rem;
    font-weight: 600;
    color: red; /* Red dot */
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }

  .card-section {
    display: flex;
    flex-direction: column;
  }

  .card-section label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 0.5rem;
  }

  .url-input-container {
    display: flex;
    background-color: rgba(255, 255, 255, 0.08); /* Slightly lighter input background */
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .url-input-container input[type="text"] {
    flex-grow: 1;
    background: none;
    border: none;
    padding: 0.75rem 1rem;
    color: #fff;
    font-size: 1rem;
    font-family: 'Inter', sans-serif;
    outline: none;
  }

  .copy-button {
    background: none;
    border: none;
    padding: 0.75rem 1rem;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.7); /* Icon color */
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease-in-out;
  }

  .copy-button:hover {
    color: #fff;
  }

  .transition-time-dropdown {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  .transition-time-dropdown label {
      /* Hide this label visually if the section label is sufficient */
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
  }

  .transition-time-dropdown select {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 1rem; /* Adjust padding for arrow */
    background-color: rgba(255, 255, 255, 0.08); /* Slightly lighter dropdown background */
    border: none;
    border-radius: 0.5rem;
    color: #fff;
    font-size: 1rem;
    font-family: 'Inter', sans-serif;
    -webkit-appearance: none; /* Remove default arrow */
    -moz-appearance: none; /* Remove default arrow */
    appearance: none; /* Remove default arrow */
    cursor: pointer;
    outline: none;
  }

  .dropdown-arrow {
    position: absolute;
    top: 50%;
    right: 1rem;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.7); /* Arrow color */
    pointer-events: none; /* Don't block clicks on the select */
  }
</style> 