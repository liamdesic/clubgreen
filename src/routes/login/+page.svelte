<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase, type Session } from '$lib/supabaseClient';
  import { Mail, Check, ArrowRight, RotateCcw, Eye, EyeOff, Lock, User } from 'lucide-svelte';
  
  // Error handling
  let authError: string | null = null;
  import '$lib/styles/login.css';
  import Button from '$lib/components/Button.svelte';
  import { tweened } from 'svelte/motion';
  import { cubicInOut } from 'svelte/easing';
  import '$lib/styles/base.css';
  import '$lib/styles/theme.css';
  import '$lib/styles/login.css';

  
  // State variables
  let email = '';
  let password = '';
  let confirmPassword = '';
  let showPassword = false;
  let error = '';
  let loading = false;
  let linkSent = false;
  let processingAuth = false;
  let finalRedirectTo = '/dashboard'; // Default redirect destination
  let step = 'enter-email';
  let mode = 'login';
  
  // Rate limiting for magic link sends
  let lastMagicLinkSent = 0;
  const MAGIC_LINK_COOLDOWN = 60 * 1000; // 1 minute cooldown

  // Animation for tab switching
  const bgX = tweened(0, { duration: 100, easing: cubicInOut});
  
  // Watch mode and animate
  $: if (mode === 'login') {
    bgX.set(0); // login is on the left
  } else {
    bgX.set(100); // signup is on the right (percent-based)
  }
  
  // Handle auth state changes
  let authSubscription: { unsubscribe: () => void } | null = null;
  
  onMount(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      console.log('🔑 [AUTH] Auth state changed:', event);
      
      if (event === 'SIGNED_IN') {
        console.log('✅ [AUTH] User signed in, redirecting to:', finalRedirectTo);
        window.location.href = finalRedirectTo;
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      }
    });
    
    authSubscription = subscription;
    
    // Cleanup function
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
        console.log('🔌 [AUTH] Cleaned up auth subscription');
      }
    };
  });
  
  // Cleanup on component destroy
  onDestroy(() => {
    if (authSubscription) {
      authSubscription.unsubscribe();
      console.log('🔌 [AUTH] Cleaned up auth subscription on destroy');
    }
  });

  onMount(async () => {
    console.log('Login page mounted, full URL:', window.location.href);
    
    // Check for redirectTo query parameter from the server redirect or initial navigation
    const queryParams = new URLSearchParams(window.location.search);
    const serverRedirectTo = queryParams.get('redirectTo');
    
    if (serverRedirectTo) {
      finalRedirectTo = serverRedirectTo;
      console.log('Login page: Final redirect destination set to:', finalRedirectTo);
    }

    // Check if user is already signed in
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) {
      console.log('User already signed in, redirecting to:', finalRedirectTo);
      window.location.href = finalRedirectTo;
      return;
    } else if (error) {
      console.error('Error getting user:', error);
    }
    
    // Parse tokens from URL hash (Supabase's standard location for auth tokens)
    let accessToken = null;
    let refreshToken = null;
    
    const hash = window.location.hash;
    if (hash) {
      try {
        const params = new URLSearchParams(hash.substring(1));
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
        
        if (accessToken) {
          console.log('Auth tokens found in URL hash');
          // Clear the hash from the URL without reloading
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (e) {
        console.error('Error parsing auth tokens from URL hash:', e);
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
        
        console.log('Session set successfully:', data.session ? 'Yes' : 'No');
        
        // Verify the user session
        const { data: { user: verifiedUser }, error: verificationError } = await supabase.auth.getUser();
        console.log('User session established:', verifiedUser ? 'Yes' : 'No');
        
        if (verificationError || !verifiedUser) {
          console.error('Failed to verify user:', verificationError);
          throw new Error('Failed to authenticate user after setting tokens');
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
  
  // Toggle password visibility
  function togglePassword() {
    showPassword = !showPassword;
  }

  // Handle form submission (both login and signup)
  async function handleAuth() {
    console.group('🔐 [AUTH] Authentication Flow');
    console.log('📱 Mode:', mode);
    console.log('📧 Email:', email);
    
    // Basic validation
    if (!email) {
      error = 'Please enter your email';
      console.error('❌ [AUTH] Validation error: Email is required');
      console.groupEnd();
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        error = 'Passwords do not match';
        console.error('❌ [AUTH] Validation error: Passwords do not match');
        console.groupEnd();
        return;
      }
      
      if (password.length < 8) {
        error = 'Password must be at least 8 characters';
        console.error('❌ [AUTH] Validation error: Password too short');
        console.groupEnd();
        return;
      }
    }
    
    error = '';
    loading = true;
    
    try {
      let result;
      
      if (mode === 'login') {
        console.log('🔑 [AUTH] Attempting email/password login');
        result = await supabase.auth.signInWithPassword({
          email,
          password
        });
        console.log('✅ [AUTH] Login attempt completed');
      } else {
        console.log('👤 [SIGNUP] Starting signup process for:', email);
        const signUpOptions = {
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: email.split('@')[0] // Add some basic user data
            }
          }
        };
        console.log('📝 [SIGNUP] Signup options:', JSON.stringify({
          ...signUpOptions,
          password: '***' // Don't log actual password
        }));
        
        result = await supabase.auth.signUp(signUpOptions);
        console.log('✅ [SIGNUP] Signup request completed');
      }
      
      console.log('📋 [AUTH] Auth result:', {
        user: result.data?.user ? {
          id: result.data.user.id,
          email: result.data.user.email,
          email_confirmed: result.data.user.email_confirmed_at ? true : false
        } : null,
        session: !!result.data?.session,
        error: result.error
      });
      
      if (result.error) {
        console.error('❌ [AUTH] Authentication error:', result.error);
        throw result.error;
      }
      
      // If signup, check if email confirmation is needed
      if (mode === 'signup') {
        if (result.data?.user?.identities?.length === 0) {
          console.log('ℹ️ [SIGNUP] User already exists, showing login option');
          error = 'An account with this email already exists. Please log in instead.';
          mode = 'login';
          return;
        } else if (result.data?.user) {
          console.log('🎉 [SIGNUP] New user created successfully:', {
            userId: result.data.user.id,
            emailConfirmed: !!result.data.user.email_confirmed_at
          });
          
          // If email is not confirmed, show message to check email
          if (!result.data.user.email_confirmed_at) {
            console.log('📧 [SIGNUP] Email confirmation required, showing check email message');
            step = 'check-email';
            return;
          }
        }
      }
      
      // If we get here, authentication was successful
      console.log('✅ [AUTH] Authentication successful, redirecting to:', finalRedirectTo);
      goto(finalRedirectTo, { replaceState: true });
      
    } catch (err) {
      console.error('Authentication error:', err);
      error = err instanceof Error ? err.message : 'An unexpected error occurred';
    } finally {
      loading = false;
      console.groupEnd();
    }
  }
  
  // Handle email sign in (magic link) with rate limiting
  async function handleEmailSignIn() {
    console.log('📧 [AUTH] Starting email sign in process');
    
    if (!email) {
      setError('Please enter your email');
      console.error('❌ [AUTH] No email provided');
      return;
    }
    
    // Check rate limiting
    const now = Date.now();
    const timeSinceLastSend = now - lastMagicLinkSent;
    
    if (timeSinceLastSend < MAGIC_LINK_COOLDOWN) {
      const timeLeft = Math.ceil((MAGIC_LINK_COOLDOWN - timeSinceLastSend) / 1000);
      setError(`Please wait ${timeLeft} seconds before sending another magic link`);
      return;
    }

    loading = true;
    setError('');
    console.log('⏳ [AUTH] Sending magic link to:', email);
    
    try {
      const redirectUrl = window.location.origin + finalRedirectTo;
      console.log('🔄 [AUTH] Setting redirect URL to:', redirectUrl);
      
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (signInError) {
        console.error('❌ [AUTH] Failed to send magic link:', signInError);
        throw signInError;
      }
      
      // Update last sent time on success
      lastMagicLinkSent = now;
      console.log('✅ [AUTH] Magic link sent successfully to:', email);
      linkSent = true;
      step = 'link-sent';
      console.log('📬 [AUTH] UI updated to show link sent state');
    } catch (err) {
      console.error('❌ [AUTH] Error in handleEmailSignIn:', {
        error: err,
        message: err.message,
        email: email
      });
      setError(err.message || 'Failed to send magic link. Please try again.');
    } finally {
      loading = false;
      console.log('🏁 [AUTH] Email sign in process completed');
    }
  }
  
  // Helper function to set error message
  function setError(message: string) {
    error = message;
    // Auto-clear error after 5 seconds
    if (message) {
      setTimeout(() => {
        if (error === message) {
          error = '';
        }
      }, 5000);
    }
  }
  
  // Reset the form
  function resetForm() {
    email = '';
    password = '';
    confirmPassword = '';
    linkSent = false;
    error = '';
  }
  
  // Reset to start function
  function resetToStart() {
    email = '';
    password = '';
    confirmPassword = '';
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
    {#if error}
      <div class="global-error" role="alert">
        <p class="error-message">{error}</p>
      </div>
    {/if}
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
          <div class="form-group">
            <label for="email-input">Email</label>
            <div class="input-with-icon">
              <User size={18} class="input-icon" />
              <input 
                id="email-input" 
                type="email" 
                bind:value={email} 
                placeholder="you@example.com" 
                required 
                autocomplete={mode === 'signup' ? 'email' : 'username'}
              />
            </div>
          </div>
          
          {#if mode === 'login' || mode === 'signup'}
            <div class="form-group">
              <label for="password-input">Password</label>
              <div class="input-with-icon">
                <Lock size={18} class="input-icon" />
                <input 
                  id="password-input" 
                  type={showPassword ? 'text' : 'password'}
                  bind:value={password}
                  placeholder="••••••••"
                  required
                  autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minlength="8"
                  pattern=".{8,}"
                  title="Password must be at least 8 characters long" />
                <button 
                  type="button" 
                  class="toggle-password" 
                  on:click={togglePassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                
                  {#if showPassword}
                    <EyeOff size={18} />
                  {:else}
                    <Eye size={18} />
                  {/if}
                </button>
              </div>
            </div>
          
            {#if mode === 'signup'}
              <div class="form-group">
                <label for="confirm-password-input">Confirm Password</label>
                <div class="input-with-icon">
                  <Lock size={18} class="input-icon" />
                  <input 
                    id="confirm-password-input" 
                    type={showPassword ? 'text' : 'password'} 
                    bind:value={confirmPassword} 
                    placeholder="••••••••" 
                    required
                    minlength="8"
                    autocomplete="new-password"
                  />
                </div>
              </div>
            {/if}
          {/if}
          
          <Button type="submit" disabled={loading} class="auth-button">
            {#if loading}
              <span class="spinner"></span>
              {mode === 'login' ? 'Logging in...' : 'Creating account...'}
            {:else}
              {mode === 'login' ? 'Log In' : 'Sign Up'} <ArrowRight size="16" style="margin-left: 0.5rem;" />
            {/if}
          </Button>
          
          {#if mode === 'login'}
            <div class="divider">
              <span>or</span>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              on:click={handleEmailSignIn} 
              disabled={loading}
              class="magic-link-button"
            >
              <Mail size={16} style="margin-right: 0.5rem;" />
              Sign in with Magic Link
            </Button>
          {/if}
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
          <Button on:click={handleEmailSignIn} disabled={loading}>
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
