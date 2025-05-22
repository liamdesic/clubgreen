<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { Mail, Check, ArrowRight, RotateCcw  } from 'lucide-svelte';
  import Button from '$lib/components/Button.svelte';
  import { tweened } from 'svelte/motion';
  import { cubicInOut } from 'svelte/easing';
  import '$lib/styles/base.css';
  import '$lib/styles/theme.css';
  import '$lib/styles/login.css';

  
  // State variables
  let email = '';
  let error = '';
  let loading = false;
  let linkSent = false;
  let processingAuth = false;
  let authError = '';
  let finalRedirectTo = '/dashboard'; // Default redirect destination
  let step = 'enter-email';
  let mode = 'login';

  // Animation for tab switching
  const bgX = tweened(0, { duration: 100, easing: cubicInOut});
  
  // Watch mode and animate
  $: if (mode === 'login') {
    bgX.set(0); // login is on the left
  } else {
    bgX.set(100); // signup is on the right (percent-based)
  }
  
  // Process the authentication token if it exists in the URL hash
  onMount(async () => {
    console.log('Login page mounted, full URL:', window.location.href);
    
    // Check for redirectTo query parameter from the server redirect or initial navigation
    const queryParams = new URLSearchParams(window.location.search);
    const serverRedirectTo = queryParams.get('redirectTo');
    
    if (serverRedirectTo) {
      finalRedirectTo = serverRedirectTo;
      console.log('Login page: Final redirect destination set to:', finalRedirectTo);
    }
    
    // Try multiple methods to detect the hash
    let accessToken = null;
    let refreshToken = null;
    
    // Method 1: Direct hash access
    const hash = window.location.hash;
    console.log('URL hash detected (method 1):', hash ? 'Yes' : 'No');
    
    if (hash) {
      // Extract tokens from the hash
      try {
        const params = new URLSearchParams(hash.substring(1));
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
        console.log('Method 1 - Access token found:', accessToken ? 'Yes' : 'No');
      } catch (e) {
        console.error('Error parsing hash with URLSearchParams:', e);
      }
    }
    
    // Method 2: Check the full URL for tokens
    if (!accessToken) {
      const fullUrl = window.location.href;
      console.log('Checking full URL for tokens');
      
      if (fullUrl.includes('access_token=')) {
        try {
          // Extract the hash part manually
          const hashPart = fullUrl.split('#')[1];
          if (hashPart) {
            const params = new URLSearchParams(hashPart);
            accessToken = params.get('access_token');
            refreshToken = params.get('refresh_token');
            console.log('Method 2 - Access token found:', accessToken ? 'Yes' : 'No');
          }
        } catch (e) {
          console.error('Error extracting token from full URL:', e);
        }
      }
    }
    
    // Method 3: Manual parsing as a last resort
    if (!accessToken && window.location.href.includes('access_token=')) {
      try {
        const urlParts = window.location.href.split('#');
        if (urlParts.length > 1) {
          const hashParams = urlParts[1].split('&');
          for (const part of hashParams) {
            if (part.startsWith('access_token=')) {
              accessToken = part.split('=')[1];
              console.log('Method 3 - Access token found:', accessToken ? 'Yes (truncated for security)' : 'No');
            }
            if (part.startsWith('refresh_token=')) {
              refreshToken = part.split('=')[1];
            }
          }
        }
      } catch (e) {
        console.error('Error with manual token extraction:', e);
      }
    }
    
    console.log('Final token detection result - Access token found:', accessToken ? 'Yes' : 'No');
    
    if (accessToken) {
      processingAuth = true;
      console.log('Processing authentication with detected tokens');
      
      try {
        console.log('Setting session with tokens');
        
        // Check if Supabase client is properly initialized
        if (!supabase || !supabase.auth || typeof supabase.auth.setSession !== 'function') {
          console.error('Supabase client not properly initialized');
          console.log('Supabase client state:', supabase ? 'Exists' : 'Undefined');
          console.log('Auth object:', supabase?.auth ? 'Exists' : 'Undefined');
          console.log('setSession method:', typeof supabase?.auth?.setSession);
          throw new Error('Authentication service unavailable');
        }
        
        // Set the session with the tokens
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });
        
        if (error) {
          console.error('Error setting session:', error);
          authError = error.message;
          throw error;
        }
        
        // Manually set cookies for additional persistence
        document.cookie = `sb-access-token=${accessToken}; path=/; max-age=3600; SameSite=Lax; secure`;
        document.cookie = `sb-refresh-token=${refreshToken}; path=/; max-age=3600; SameSite=Lax; secure`;
        
        console.log('Session set successfully:', data.session ? 'Yes' : 'No');
        
        // Verify the session was actually set
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Session verified:', sessionData.session ? 'Yes' : 'No');
        
        if (!sessionData.session) {
          throw new Error('Failed to establish session after setting tokens');
        }
        
        // Clear the hash and redirect to the final destination
        if (window.history && window.history.replaceState) {
          const url = new URL(window.location.href);
          url.hash = '';
          url.searchParams.delete('redirectTo');
          window.history.replaceState({}, document.title, url.toString());
          console.log('URL cleaned up');
        }
        
        console.log('Redirecting to:', finalRedirectTo);
        // Ensure the path is properly formatted (should start with '/' and be absolute)
        const redirectPath = finalRedirectTo.startsWith('/') ? finalRedirectTo : `/${finalRedirectTo}`;
        console.log('Formatted redirect path:', redirectPath);
        
        // Use a small timeout to ensure the browser has time to process everything
        setTimeout(() => {
          console.log('Executing redirect now...');
          goto(redirectPath, { replaceState: true });
        }, 100);
      } catch (err) {
        console.error('Error processing authentication:', err);
        authError = err instanceof Error ? err.message : 'Authentication failed';
      } finally {
        processingAuth = false;
      }
    }
  });
  
  // Handle magic link authentication
  async function handleAuth() {
    if (!email) {
      error = 'Please enter your email';
      return;
    }
    
    error = '';
    loading = true;
    
    try {
      console.log('Sending magic link to:', email);
      console.log('Redirect after login:', finalRedirectTo);
      
      // Call the server-side API to send the magic link
      const response = await fetch(`/api/auth/magic-link?redirectTo=${encodeURIComponent(finalRedirectTo)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Failed to send magic link. Please try again.';
        throw new Error(errorMessage);
      }
      
      // Show success message
      linkSent = true;
    } catch (err) {
      console.error('Error sending magic link:', err);
      error = err instanceof Error ? err.message : 'An unexpected error occurred';
    } finally {
      loading = false;
    }
  }
  
  // Reset the form
  function resetForm() {
    email = '';
    linkSent = false;
    error = '';
  }
  
  // Reset to start function
  function resetToStart() {
    email = '';
    linkSent = false;
    error = '';
    step = 'enter-email';
    mode = 'login';
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
  
    {#if processingAuth}
      <div class="auth-processing">
        <div class="spinner"></div>
        <p>Processing authentication...</p>
      </div>
    {:else if authError}
      <div class="auth-error">
        <p>Authentication Error:</p>
        <p class="error-message">{authError}</p>
        <Button on:click={() => authError = ''}>Try Again</Button>
      </div>
    {:else}
      {#if step === 'enter-email' && !linkSent}
        <div class="login-tabs" role="tablist" aria-label="Login options">
          <div class="bg-slide {mode === 'login' ? 'left-radius' : 'right-radius'}"
               style="transform: translateX({$bgX}%);"></div>
          <button 
            type="button"
            class="tab" 
            class:active={mode === 'login'} 
            on:click={() => mode = 'login'}
            on:keydown={e => e.key === 'Enter' && (mode = 'login')}
            role="tab"
            aria-selected={mode === 'login'}
            tabindex={mode === 'login' ? 0 : -1}
          >Log-In</button>
          <button 
            type="button"
            class="tab" 
            class:active={mode === 'signup'} 
            on:click={() => mode = 'signup'}
            on:keydown={e => e.key === 'Enter' && (mode = 'signup')}
            role="tab"
            aria-selected={mode === 'signup'}
            tabindex={mode === 'signup' ? 0 : -1}
          >Sign-Up</button>
        </div>

        <form class="login-form" on:submit|preventDefault={handleAuth}>
          <label for="email-input">Email</label>
          <input id="email-input" type="email" bind:value={email} placeholder="you@example.com" required />
          <Button type="submit" disabled={loading}>
            {#if loading}
              Sending...
            {:else}
              Send Magic Link <ArrowRight size="16" style="margin-left: 0.5rem;" />
            {/if}
          </Button>
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
          <p>Click the link in your email to log in.</p>
          <Button on:click={handleAuth} disabled={loading}>
            {#if loading} Resending... {:else} Resend Magic Link {/if}
          </Button>
        </div>
      {/if}
      
      {#if error && step === 'enter-email'}
        <p class="error-message global-error">{error}</p>
      {/if}
    {/if}
  </div>

  <footer>© 2025 Club Green</footer>
</div>

<style>
  .global-error {
    margin-top: 1rem;
    text-align: center;
    color: var(--danger-color, red); /* Ensure --danger-color is defined or use a fallback */
  }
</style>


