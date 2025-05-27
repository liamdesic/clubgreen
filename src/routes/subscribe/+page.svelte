<script lang="ts">
  import { onMount } from 'svelte';
  import { loadStripe } from '@stripe/stripe-js';
  import { browser } from '$app/environment';
  import '../../../lib/styles/subscribe.css';
  
  let stripePromise;
  let testMode = true; // Enable test mode by default
  let testEmail = 'test@example.com';
  let isLoading = false;
  let error = '';
  
  onMount(() => {
    if (browser) {
      // Load Stripe with your publishable key
      stripePromise = loadStripe(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY);
      
      // Check for test mode in URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('testMode')) {
        testMode = urlParams.get('testMode') === 'true';
      }
    }
  });

  async function handleSubscribe() {
    if (testMode) {
      isLoading = true;
      console.log('Test subscription with email:', testEmail);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.href = '/dashboard?testMode=true&subscribed=true';
      return;
    }

    try {
      isLoading = true;
      const stripe = await stripePromise;
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId: 'price_xxxxxxxx',
          email: testEmail,
          testMode
        }),
      });
      
      const session = await response.json();
      if (session.error) throw new Error(session.error);
      
      await stripe.redirectToCheckout({ sessionId: session.id });
    } catch (err) {
      console.error('Error:', err);
      error = err.message || 'Failed to process subscription';
    } finally {
      isLoading = false;
    }
  }

  async function startTrial() {
    if (testMode) {
      isLoading = true;
      console.log('Starting test trial with email:', testEmail);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.href = '/dashboard?testMode=true&trialStarted=true';
      return;
    }
    
    try {
      isLoading = true;
      // Your actual trial start API call would go here
      const response = await fetch('/api/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });
      
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Error:', err);
      error = err.message || 'Failed to start trial';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="subscribe-container">
  {#if testMode}
    <div class="test-mode-banner">
      <h3>🛠️ Test Mode Active</h3>
      <p>All actions are simulated. No real payments will be processed.</p>
      <div class="test-email">
        <label for="test-email">Test Email:</label>
        <input 
          type="email" 
          id="test-email" 
          bind:value={testEmail} 
          placeholder="test@example.com"
          disabled={isLoading}
        />
      </div>
    </div>
  {/if}

  <div class="subscribe-header">
    <h1>Get Started with ldrboard</h1>
    <p>Choose the option that works best for you</p>
  </div>
  
  {#if error}
    <div class="error-message">
      <p>{error}</p>
      <button on:click={() => error = ''} class="dismiss-button">×</button>
    </div>
  {/if}
  
  <div class="plans-grid">
    <!-- Free Trial Card -->
    <div class="plan-card trial">
      <div class="plan-badge">Popular</div>
      <h2>Free Trial</h2>
      <div class="plan-price">$0<small>/for 10 days</small></div>
      <p class="plan-description">Try all features for free, no credit card required</p>
      
      <ul class="plan-features">
        <li>✓ Full access to all features</li>
        <li>✓ Create unlimited events</li>
        <li>✓ Set up custom leaderboards</li>
        <li>✓ Real-time score tracking</li>
        <li>✓ 10 days of free usage</li>
      </ul>
      
      <button 
        on:click={startTrial} 
        class="plan-button secondary"
        disabled={isLoading}
      >
        {#if isLoading && !testMode}
          <span class="spinner"></span>
        {:else}
          Start Free Trial
        {/if}
        {#if testMode}
          <span class="test-indicator">(Test Mode)</span>
        {/if}
      </button>
    </div>
    
    <!-- Paid Subscription Card -->
    <div class="plan-card premium">
      <h2>Premium</h2>
      <div class="plan-price">$20<small>/month</small></div>
      <p class="plan-description">Full access to all features</p>
      
      <ul class="plan-features">
        <li>✓ Everything in Free Trial, plus:</li>
        <li>✓ Unlimited events and players</li>
        <li>✓ Custom branding options</li>
        <li>✓ Priority email support</li>
        <li>✓ Regular updates & improvements</li>
      </ul>
      
      <button 
        on:click={handleSubscribe} 
        class="plan-button primary"
        disabled={isLoading}
      >
        {#if isLoading && !testMode}
          <span class="spinner"></span>
        {:else}
          Subscribe Now
        {/if}
        {#if testMode}
          <span class="test-indicator">(Test Mode)</span>
        {/if}
      </button>
    </div>
  </div>
  
  <div class="trial-note">
    <p>Start with a free 10-day trial. No credit card required. Cancel anytime.</p>
  </div>
</div>
