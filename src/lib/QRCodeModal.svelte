<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import QRCode from 'qrcode';
  import { Check, Phone, Monitor, Download, Copy, ExternalLink } from 'lucide-svelte';
  
  type QRCodeType = 'leaderboard' | 'scorecard';
  
  export let organization = '';
  export let shortCode = '';
  export let accessUuid = '';
  
  // Generate the correct URLs for the new routing system
  $: baseUrl = window.location.origin;
  $: leaderboardUrl = `${baseUrl}/${organization}/lb/${shortCode}`;
  $: scorecardUrl = `${baseUrl}/${organization}/${shortCode}?access=${accessUuid}&view=scorecard`;
  export let onClose;
  
  let leaderboardQrCode = '';
  let scorecardQrCode = '';
  let copiedType: QRCodeType | null = null;
  let downloadedType: QRCodeType | null = null;
  
  onMount(async () => {
    // Add modal-open class to body
    document.body.classList.add('modal-open');
    
    // Generate QR codes
    leaderboardQrCode = await QRCode.toDataURL(leaderboardUrl, { width: 300 });
    scorecardQrCode = await QRCode.toDataURL(scorecardUrl, { width: 300 });
  });

  onDestroy(() => {
    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
  });
  
  async function downloadQRCode(type: QRCodeType) {
    const url = type === 'leaderboard' ? leaderboardQrCode : scorecardQrCode;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show downloaded feedback
    downloadedType = type;
    setTimeout(() => {
      if (downloadedType === type) {
        downloadedType = null;
      }
    }, 2000);
  }
  
  async function copyToClipboard(text: string, type: QRCodeType) {
    try {
      await navigator.clipboard.writeText(text);
      copiedType = type;
      setTimeout(() => {
        if (copiedType === type) {
          copiedType = null;
        }
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }
</script>

<div 
  class="modal-overlay" 
  on:click|self={onClose}
  on:keydown={(e) => e.key === 'Escape' && onClose()}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  tabindex="-1"
  aria-label="Close modal"
>
  <div class="modal-content">
    <button class="close-button" on:click={onClose} aria-label="Close QR Code">
      &times;
    </button>
    
    <h2 id="modal-title">Share Links</h2>
    
    <div class="qr-grid">
      <!-- Leaderboard QR -->
      <div class="qr-item">
        <div class="qr-icon">
          <Monitor size={90} />
        </div>
        <h3>Leaderboard</h3>
        <img src={leaderboardQrCode} alt="Leaderboard QR Code" />
        <p>Scan to view the leaderboard</p>
        <div class="url-display">
          <input type="text" readonly value={leaderboardUrl} />
          <div class="url-actions">
            <button 
              class:copied={copiedType === 'leaderboard'}
              on:click|preventDefault={() => copyToClipboard(leaderboardUrl, 'leaderboard')}
              aria-label="Copy leaderboard link"
            >
              {#if copiedType === 'leaderboard'}
                <Check size={16} /> Copied!
              {:else}
                <Copy size={16} /> Copy
              {/if}
            </button>
            <a 
              href={leaderboardUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              class="go-button"
              aria-label="Open leaderboard in new tab"
            >
              <ExternalLink size={16} /> Go
            </a>
          </div>
        </div>
        <button 
          class="download-button" 
          on:click|preventDefault={() => downloadQRCode('leaderboard')}
        >
          {#if downloadedType === 'leaderboard'}
            <Check size={16} /> Downloaded!
          {:else}
            <Download size={16} /> Download QR
          {/if}
        </button>
      </div>
      
      <!-- Scorecard QR -->
      <div class="qr-item">
        <div class="qr-icon">
          <Phone size={90} />
        </div>
        <h3>Scorecard</h3>
        <img src={scorecardQrCode} alt="Scorecard QR Code" />
        <p>Scan to submit a scorecard</p>
        <div class="url-display">
          <input type="text" readonly value={scorecardUrl} />
          <div class="url-actions">
            <button 
              class:copied={copiedType === 'scorecard'}
              on:click|preventDefault={() => copyToClipboard(scorecardUrl, 'scorecard')}
              aria-label="Copy scorecard link"
            >
              {#if copiedType === 'scorecard'}
                <Check size={16} /> Copied!
              {:else}
                <Copy size={16} /> Copy
              {/if}
            </button>
            <a 
              href={scorecardUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              class="go-button"
              aria-label="Open scorecard in new tab"
            >
              <ExternalLink size={16} /> Go
            </a>
          </div>
        </div>
        <button 
          class="download-button" 
          on:click|preventDefault={() => downloadQRCode('scorecard')}
        >
          {#if downloadedType === 'scorecard'}
            <Check size={16} /> Downloaded!
          {:else}
            <Download size={16} /> Download QR
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .modal-content {
    background: #1e1a26;
    padding: 2rem;
    border-radius: 12px;
    max-width: 900px;
    width: 100%;
    position: relative;
    color: white;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    margin: auto;
    max-height: 90vh;
    overflow-y: auto;
  }

  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: white;
    transition: color 0.2s;
    padding: 0.5rem;
    border-radius: 4px;
  }

  .close-button:hover {
    color: var(--gradient-color);
    background: rgba(255, 255, 255, 0.1);
  }

  h2 {
    margin: 0 0 2rem;
    font-size: 1.5rem;
    text-align: center;
    color: white;
  }

  .qr-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 1.5rem;
  }

  .qr-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    padding: 1.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .qr-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  .qr-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--gradient-color), #8a2be2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .qr-icon svg {
    color: white;
  }

  h3 {
    margin: 0.5rem 0 1rem;
    font-size: 1.25rem;
    color: white;
  }

  .qr-item img {
    width: 180px;
    height: 180px;
    background: white;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .qr-item p {
    margin: 0 0 1rem;
    color: #aaa;
    text-align: center;
    font-size: 0.9rem;
  }

  .url-display {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .url-actions {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }
  
  .url-actions > * {
    flex: 1;
  }

  .url-display input {
    flex: 1;
    padding: 0.6rem 0.8rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #333;
    border-radius: 6px;
    color: white;
    font-size: 0.9rem;
    transition: border-color 0.2s;
  }

  .url-display input:focus {
    outline: none;
    border-color: var(--gradient-color);
  }

  .url-display button,
  .url-display .go-button {
    padding: 0.5rem 1rem;
    background: #333;
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: 500;
    transition: all 0.2s;
    text-decoration: none;
    font-size: 0.9rem;
  }
  
  .url-display .go-button {
    background: var(--accent-color, #4f46e5);
  }
  
  .url-display .go-button:hover {
    background: var(--accent-hover, #4338ca);
  }

  .url-display button:hover {
    background: #444;
  }

  .url-display button.copied {
    background: #10b981;
    color: white;
  }

  .download-button {
    margin-top: auto;
    padding: 0.7rem 1.5rem;
    background: var(--gradient-color);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
  }

  .download-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .download-button:active {
    transform: translateY(0);
  }

  /* Prevent body scroll when modal is open */
  :global(body.modal-open) {
    overflow: hidden;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .qr-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    
    .modal-content {
      padding: 1.5rem;
      margin: 1rem;
      max-height: calc(100vh - 2rem);
    }

    .modal-overlay {
      align-items: flex-start;
      padding: 0.5rem;
    }
  }
</style>
