<script>
  import '$lib/styles/login.css';
  import '$lib/styles/theme.css';
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { tweened } from 'svelte/motion';
  import { cubicInOut } from 'svelte/easing';
  import { Mail } from 'lucide-svelte';
  import { RotateCcw } from 'lucide-svelte';
  import { ArrowRight } from 'lucide-svelte';
  import Button from '$lib/components/Button.svelte';




  let email = '';
  let password = '';
  let error = '';
  let mode = 'login'; // or 'signup'
  let showResetModal = false;
  let resetEmail = '';
  let resetStatus = '';
  let resetLoading = false;
  let loading = false;
  let step = 'enter-email'; // or 'verify-code'
  let otpCode = '';
  let linkSent = false;





  const bgX = tweened(0, { duration: 100, easing: cubicInOut});


 // Watch mode and animate
  $: if (mode === 'login') {
    bgX.set(0); // login is on the left
  } else {
    bgX.set(100); // signup is on the right (percent-based)
  }



async function handleAuth() {
  error = '';
  if (!email) {
    error = 'Please enter your email.';
    return;
  }

  loading = true;
  
  // Debug logs
  console.log('Starting magic link authentication');
  console.log('Current origin:', window.location.origin);
  console.log('Redirect URL:', `${window.location.origin}/dashboard`);
  
  // Log Supabase auth availability
  console.log('Supabase auth available:', supabase && supabase.auth ? 'Yes' : 'No');
  
  try {
    // First, check if we can get the current session to verify Supabase connection
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Current session check:', sessionData ? 'Success' : 'No session');
    
    // Attempt to send magic link
    console.log('Sending magic link to:', email);
    const { data: otpData, error: magicErr } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    loading = false;
    console.log('OTP data received:', otpData ? 'Yes' : 'No');

    if (magicErr) {
      console.error('Magic link error:', magicErr);
      error = magicErr.message;
    } else {
      console.log('Magic link sent successfully');
      linkSent = true;
    }
  } catch (e) {
    console.error('Exception during magic link auth:', e);
    loading = false;
    error = 'An unexpected error occurred. Please try again.';
  }
}


async function verifyCode() {
  error = '';
  loading = true;
  
  console.log('Verifying OTP code');
  console.log('Email:', email);
  console.log('Code length:', otpCode.length);

  try {
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email'
    });

    loading = false;

    if (verifyErr) {
      console.error('OTP verification error:', verifyErr);
      error = 'Invalid or expired code.';
    } else {
      console.log('OTP verification successful, redirecting to dashboard');
      goto('/dashboard');
    }
  } catch (e) {
    console.error('Exception during OTP verification:', e);
    loading = false;
    error = 'An unexpected error occurred during verification.';
  }
}


async function sendReset() {
  loading = true;

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail);

  loading = false;

  error = resetError ? resetError.message : '✅ Reset email sent.';
}

function resetToStart() {
  email = '';
  linkSent = false;
  error = '';
  step = 'enter-email';
}


</script>

<div class="login-page">

  <svg width="0" height="0">
  <linearGradient id="magic" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#689ef9" />
    <stop offset="100%" stop-color="#6e4ef4" />
  </linearGradient>
</svg>



  <img src="/logos/ldrb-logo-colourlight.svg" alt="ldrboard logo" class="logo fade-in-up" />
<div class="login-card fade-in-up delay-200">
{#if step === 'enter-email' && !linkSent}
  <div class="login-tabs">
    <div class="bg-slide {mode === 'login' ? 'left-radius' : 'right-radius'}"
         style="transform: translateX({$bgX}%);"></div>
    <div class="tab" class:active={mode === 'login'} on:click={() => mode = 'login'}>Log-In</div>
    <div class="tab" class:active={mode === 'signup'} on:click={() => mode = 'signup'}>Sign-Up</div>
  </div>

  <form class="login-form" on:submit|preventDefault={handleAuth}>
    <label>Email</label>
    <input type="email" bind:value={email} placeholder="you@example.com" required />
    <Button type="submit" disabled={loading}>
  {#if loading}
    Sending...
  {:else}
    Send Magic Link <ArrowRight size="16" style="margin-left: 0.5rem;" />
  {/if}
</Button>

  </form>

  <a class="forgot-link" on:click={() => step = 'forgot-password'}>
    Forgot Password?
  </a>
{/if}

{#if step === 'forgot-password'}
  <form class="forgot-password" on:submit|preventDefault={sendReset}>
    <h2>🔐 Reset your password</h2>
    <input type="email" bind:value={resetEmail} placeholder="Enter your email" />
    <Button type="submit">{loading ? 'Sending...' : 'Send Reset Link'}</Button>
    <p class="resend-text" on:click={() => step = 'enter-email'}>← Back to login</p>
  </form>
{/if}

{#if linkSent}
  <div class="link-sent-view">
    <button class="retry-icon" on:click={resetToStart} title="Start Over">
      <RotateCcw size="24" />
    </button>

    <Mail size="64" stroke-width="1.8" color="url(#magic)" />
    <h2>Magic Link Sent!</h2>
    <p>We've sent a login link to <strong>{email}</strong></p>
    <Button on:click={handleAuth}>Resend</Button>
  </div>
{/if}



</div>







  <footer>© 2025 Club Green</footer>


</div>


