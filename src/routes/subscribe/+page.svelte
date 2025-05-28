<script lang="ts">
  import { onMount } from 'svelte';
  import { loadStripe, type Stripe } from '@stripe/stripe-js';
  import { browser } from '$app/environment';
  import '$lib/styles/base.css';
  import '$lib/styles/theme.css';
  import '$lib/styles/subscribe.css';
  
  let stripePromise: Promise<Stripe | null>;
  let testMode = false; // Disable test mode by default
  let testEmail = 'test@example.com';
  let isLoading = false;
  let error = '';
  
  onMount(async () => {
    if (browser) {
      try {
        // Get the publishable key from environment
        const publishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;
        
        console.log('Stripe publishable key:', 
          publishableKey ? `${publishableKey.substring(0, 8)}...` : 'Not found');
        
        if (!publishableKey) {
          throw new Error('Missing Stripe publishable key');
        }
        
        if (!publishableKey.startsWith('pk_')) {
          throw new Error('Invalid Stripe publishable key format');
        }
        
        // Load Stripe with your publishable key
        stripePromise = loadStripe(publishableKey);
        
        console.log('Stripe.js loaded successfully');
        
        // Enable test mode only if explicitly set in URL
        const urlParams = new URLSearchParams(window.location.search);
        testMode = urlParams.get('testMode') === 'true';
        
        // If in test mode, update URL to show test mode is active
        if (testMode && !window.location.search.includes('testMode=true')) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('testMode', 'true');
          window.history.replaceState({}, '', newUrl);
        }
      } catch (err) {
        console.error('Failed to initialize Stripe:', err);
        error = 'Failed to initialize payment system. Please try again later.';
      }
    }
  });

  async function handleSubscribe() {
    if (testMode) {
      isLoading = true;
      error = '';
      console.log('Test subscription with email:', testEmail);
      // Simulate API call with a slight delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.href = '/dashboard?testMode=true&subscribed=true';
      return;
    }

    try {
      console.log('Starting subscription process...');
      isLoading = true;
      error = '';
      
      if (!stripePromise) {
        const errorMsg = 'Failed to load Stripe';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('Sending request to create-checkout endpoint...');
      // Call our create-checkout endpoint
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include' // Ensure cookies are sent with the request
      });
      
      console.log('Received response status:', response.status);
      
      let result;
      try {
        result = await response.json();
        console.log('Response data:', JSON.stringify(result, null, 2));
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        const errorMsg = result?.message || 
                        result?.error?.message || 
                        `Server returned ${response.status} status`;
        console.error('Server error response:', errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!result?.url) {
        const errorMsg = 'No redirect URL received from server';
        console.error(errorMsg, { result });
        throw new Error(errorMsg);
      }
      
      console.log('Redirecting to Stripe Checkout...');
      // Redirect to Stripe Checkout
      window.location.href = result.url;
      
    } catch (err) {
      console.error('Checkout process failed:', {
        error: err,
        message: err.message,
        stack: err.stack
      });
      
      error = err instanceof Error 
        ? `Failed to start checkout: ${err.message}` 
        : 'An unexpected error occurred';
        
      // Show more detailed error in development
      if (import.meta.env.DEV) {
        error += '\n\n' + (err.stack || '');
      }
    } finally {
      isLoading = false;
      // Only reset loading state if there was an error
      // (otherwise we're redirecting)
      if (error) {
        isLoading = false;
      }
    }
  }

  async function startTrial() {
    if (testMode) {
      isLoading = true;
      error = '';
      console.log('Starting test trial with email:', testEmail);
      // Simulate API call with a slight delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.href = '/dashboard?testMode=true&trial_started=true';
      return;
    }
    
    try {
      isLoading = true;
      error = '';
      
      const response = await fetch('/api/start-trial', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to start trial');
      }
      
      // Show success state before redirect
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to dashboard with success state
      window.location.href = '/dashboard?trial_started=true';
      
    } catch (err) {
      console.error('Trial start error:', err);
      error = err instanceof Error ? 
        `Failed to start trial: ${err.message}` : 
        'An unexpected error occurred';
      
      // Auto-dismiss error after 5 seconds
      if (error) {
        setTimeout(() => {
          error = '';
        }, 5000);
      }
    } finally {
      // Keep loading state during redirect
      if (!error) return;
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
        class:loading={isLoading}
        class="plan-button secondary"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {#if isLoading}
          <span class="spinner" aria-hidden="true"></span>
          {#if testMode}
            <span>Starting Test Trial...</span>
          {:else}
            <span>Starting Your Trial...</span>
          {/if}
        {:else}
          Start Free Trial
          {#if testMode}
            <span class="test-indicator">(Test Mode)</span>
          {/if}
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
        class:loading={isLoading}
        class="plan-button primary"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {#if isLoading}
          <span class="spinner" aria-hidden="true"></span>
          {#if testMode}
            <span>Preparing Checkout...</span>
          {:else}
            <span>Preparing Your Subscription...</span>
          {/if}
        {:else}
          Subscribe Now
          {#if testMode}
            <span class="test-indicator">(Test Mode)</span>
          {/if}
        {/if}
      </button>
    </div>
  </div>
  
  <div class="trial-note">
    <p>Start with a free 10-day trial. No credit card required. Cancel anytime.</p>
  </div>
</div>
