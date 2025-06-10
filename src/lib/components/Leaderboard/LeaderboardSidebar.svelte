<script lang="ts">
  import type { Event } from '$lib/validations';
  import type { Organization } from '$lib/validations';

  export let event: Event;
  export let organization: Organization;
  export let qrCodeDataUrl: string | null = null;
</script>

<div class="sidebar">
  <!-- Ad Image -->
  {#if organization?.ad_image_url || event?.ads_image_url}
    <div class="ad-container">
      <a href={event?.ads_url || '#'} class="ad-banner">
        <img 
          src={event?.ads_image_url || organization.ad_image_url} 
          alt={event?.ads_text || 'Advertisement'}
          class="ad-image"
        />
        {#if event?.ads_text}
          <div class="ad-text">{event.ads_text}</div>
        {/if}
      </a>
    </div>
  {:else if event?.ads_text}
    <div class="ad-container">
      <a href={event?.ads_url || '#'} class="ad-banner text-only">
        {event.ads_text}
      </a>
    </div>
  {/if}
  <!-- QR Code -->
  <div class="qr-box">
    <div class="qr-title">
      <h2>Scan to Play!</h2>
      <p>Scan to enter scores</p>
    </div>
    {#if qrCodeDataUrl}
      <div class="qr-code-container">
        <img 
          src={qrCodeDataUrl} 
          alt="Scorecard QR Code" 
          class="qr-code"
        />
      </div>
    {:else}
      <div class="qr-placeholder">Generating QR Code...</div>
    {/if}
  </div>
</div>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    width: 280px;
    flex-shrink: 0;
    padding: 0 1rem;
    box-sizing: border-box;
  }

  /* Ad Container Styles */
  .ad-container {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    height: 420px;
    max-width: 300px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
  }

  .ad-banner {
    display: flex;
    flex-direction: column;
    height: 100%;
    text-decoration: none;
    color: #0f2f2e;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    position: relative;
  }

  .ad-banner:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }

  .ad-banner.text-only {
    padding: 1.5rem;
    text-align: center;
    font-weight: 500;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #0f2f2e;
    background: #f8fafc;
  }

  .ad-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .ad-text {
    padding: 0.8rem 1rem;
    text-align: center;
    font-size: 0.95rem;
    color: #0f2f2e;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    margin: 0;
  }

  /* QR Box Styles */
  .qr-box {
    background: white;
    color: #0f2f2e;
    border-radius: 16px;
    padding: 1.2rem;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    width: 100%;
    box-sizing: border-box;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .qr-box:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }

  .qr-title h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    color: var(--accent-color);
    font-weight: 700;
  }

  .qr-title p {
    display: none;
    margin: 0 0 1.2rem 0;
    color: #666;
    font-size: 1rem;
  }

  .qr-code-container {
    background: none;
    padding: 1rem 0rem 1rem 0rem;
    border-radius: 12px;
    margin: 0 auto;
    width: fit-content;
  }

  .qr-code {
    width: 160px;
    height: 160px;
    object-fit: contain;
    border-radius: 8px;
  }

  .qr-placeholder {
    padding: 1.5rem;
    color: #666;
    background: #f8fafc;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  /* Responsive Styles */
  @media (max-width: 1024px) {
    .sidebar {
      flex-direction: row;
      justify-content: center;
      width: 100%;
    }

    .ad-container {
      height: 200px;
    }
  }

  @media (max-width: 768px) {
    .ad-container {
      height: 180px;
    }

    .ad-text {
      font-size: 0.85rem;
      padding: 0.6rem 0.8rem;
    }
  }
</style> 