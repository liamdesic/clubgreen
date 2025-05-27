<script lang="ts">
  import { onMount } from 'svelte';
  import { loadStripe } from '@stripe/stripe-js';
  import '../../../lib/styles/subscribe.css';
  
  let stripePromise;
  
  onMount(() => {
    // Load Stripe with your publishable key
    stripePromise = loadStripe(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY);
  });

  async function handleSubscribe() {
    try {
      const stripe = await stripePromise;
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId: 'price_xxxxxxxx' }), // Replace with your actual price ID
      });
      
      const session = await response.json();
      await stripe.redirectToCheckout({ sessionId: session.id });
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function startTrial() {
    // This would typically make an API call to your backend
    console.log('Starting free trial');
    // Redirect to dashboard after trial starts
    window.location.href = '/dashboard';
  }
</script>

<div class="subscribe-container">
  <div class="subscribe-header">
    <h1>Get Started with ldrboard</h1>
    <p>Choose the option that works best for you</p>
  </div>
  
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
      
      <button on:click={startTrial} class="plan-button secondary">
        Start Free Trial
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
      
      <button on:click={handleSubscribe} class="plan-button primary">
        Subscribe Now
      </button>
    </div>
  </div>
  
  <div class="trial-note">
    <p>Start with a free 10-day trial. No credit card required. Cancel anytime.</p>
  </div>
</div>
