<script lang="ts">
  import { createBrowserClient } from '@supabase/ssr';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { z } from 'zod';
  import { Mail } from 'lucide-svelte/icons';
  import '$lib/styles/theme.css';

  // Create the Supabase client for browser
  const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

  // Form state
  let email = '';
  let password = '';
  let mode = 'login'; // 'login' or 'signup'
  let loading = false;
  let errorMessage = '';
  let successMessage = '';
  let magicLinkSent = false;

  // Get redirect URL from query params
  let redirectTo = '/dashboard';
  
  onMount(() => {
    const url = new URL(window.location.href);
    const redirectParam = url.searchParams.get('redirectTo');
    if (redirectParam) {
      redirectTo = redirectParam;
    }
  });

  // Zod schema for form validation
  const authSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  });

  // Constants
  const DUMMY_PASSWORD = 'thisShouldNeverFailValidation';
  
  // Form validation
  function validateForm(validatePassword = true) {
    const dataToValidate = validatePassword 
      ? { email, password }
      : { email, password: DUMMY_PASSWORD }; // Use dummy password when not validating
    
    const result = authSchema.safeParse(dataToValidate);
    if (!result.success) {
      errorMessage = result.error.errors[0].message;
      return false;
    }
    return true;
  }

  // Handle login with email and password
  async function handleEmailPasswordAuth() {
    errorMessage = '';
    successMessage = '';
    
    if (!validateForm()) return;
    
    loading = true;
    
    if (mode === 'login') {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        // Successful login - redirect
        await goto(redirectTo);
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      } finally {
        loading = false;
      }
    } else {
      // Signup mode
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
          }
        });
        
        if (error) throw error;
        
        // Show magic link sent page for signup
        magicLinkSent = true;
        password = ''; // Clear password on successful signup
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Failed to sign up';
      } finally {
        loading = false;
      }
    }
  }

  // Handle magic link auth
  async function handleMagicLinkAuth() {
    // Prevent duplicate sends
    if (magicLinkSent) return;
    
    errorMessage = '';
    successMessage = '';
    
    if (!validateForm(false)) return; // Only validate email for magic link
    
    loading = true;
    
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
        }
      });
      
      if (error) throw error;
      
      magicLinkSent = true;
      successMessage = 'Magic link sent! Check your email.';
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
    } finally {
      loading = false;
    }
  }

  // Toggle between login and signup modes
  function toggleMode() {
    mode = mode === 'login' ? 'signup' : 'login';
    errorMessage = '';
    successMessage = '';
    magicLinkSent = false;
    password = ''; // Reset password field when switching modes
  }
</script>

<div class="login-wrapper">
  <div class="login-header">
    <img src="/logos/ldrb-logo-colourlight.svg" alt="ldrboard logo" class="login-logo" />
  </div>

  <div class="login-card">
    <h1>{mode === 'login' ? 'Log In' : 'Sign Up'}</h1>
    
    {#if errorMessage}
      <div class="error-message" aria-live="polite">{errorMessage}</div>
    {/if}
    
    {#if successMessage}
      <div class="success-message" aria-live="polite">{successMessage}</div>
    {/if}
    
    {#if magicLinkSent}
      <div class="magic-link-sent">
        <div class="mail-icon-container">
          <Mail size={80} class="mail-icon" />
        </div>
        <h2>Check your email</h2>
        <p>{mode === 'signup' ? 'We\'ve sent you a verification email. Click the link in your email to verify your account.' : 'We\'ve sent you a magic link to sign in. Click the link in your email to continue.'}</p>
        <button on:click={() => magicLinkSent = false} class="text-button">
          Try another method
        </button>
      </div>
    {:else}
      <form on:submit|preventDefault={handleEmailPasswordAuth} class="login-form">
        <fieldset disabled={loading} class="form-fieldset">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              bind:value={email} 
              placeholder="your@email.com" 
              autocomplete="email"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              bind:value={password} 
              placeholder="••••••••" 
              autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>
          
          <button type="submit" class="login-button">
            {#if loading}
              Loading...
            {:else}
              {mode === 'login' ? 'Log In' : 'Sign Up'}
            {/if}
          </button>
        </fieldset>
      </form>
      
      {#if mode === 'login'}
        <div class="divider"><span>or</span></div>
        
        <fieldset disabled={loading} class="form-fieldset">
          <button on:click={handleMagicLinkAuth} class="magic-link-button">
            {#if loading}
              Loading...
            {:else}
              Continue with Magic Link
            {/if}
          </button>
        </fieldset>
      {/if}
    {/if}
    
    <div class="mode-toggle">
      {#if mode === 'login'}
        Don't have an account? <button on:click={toggleMode} class="text-button">Sign Up</button>
      {:else}
        Already have an account? <button on:click={toggleMode} class="text-button">Log In</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .login-wrapper {
    min-height: 100vh;
    background: #0f0f1a;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    box-sizing: border-box;
  }

  .login-header {
    margin-bottom: 3rem;
    text-align: center;
  }

  .login-logo {
    height: 60px;
    width: auto;
  }

  .login-card {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 1.5rem;
    padding: 2.5rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 4px 24px 0 rgba(0,0,0,0.12);
  }

  h1 {
    color: white;
    font-family: var(--brand-font-header-bold);
    font-weight: 700;
    font-size: 2rem;
    text-align: center;
    margin-bottom: 2rem;
    margin-top: 0;
  }

  .error-message {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    font-family: var(--brand-font-body);
  }

  .success-message {
    background: rgba(76, 175, 80, 0.1);
    border: 1px solid rgba(76, 175, 80, 0.3);
    color: var(--gradient-color);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    font-family: var(--brand-font-body);
  }

  .form-fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }

  .form-fieldset:disabled {
    opacity: 0.7;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: white;
    font-family: var(--brand-font-body);
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08) !important;
    color: white !important;
    font-size: 1rem;
    font-family: var(--brand-font-body);
    transition: border-color 0.2s ease, background-color 0.2s ease;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--gradient-color);
    background: rgba(255, 255, 255, 0.12) !important;
  }

  .form-group input::placeholder {
    color: rgba(255, 255, 255, 0.5) !important;
  }

  /* Chrome-specific input styling fixes */
  .form-group input:-webkit-autofill,
  .form-group input:-webkit-autofill:hover,
  .form-group input:-webkit-autofill:focus,
  .form-group input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.08) inset !important;
    -webkit-text-fill-color: white !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    transition: background-color 5000s ease-in-out 0s;
    -webkit-transition: background-color 5000s ease-in-out 0s;
  }

  /* Force Chrome to respect our dark styling */
  @media screen and (-webkit-min-device-pixel-ratio:0) {
    .form-group input {
      background: rgba(255, 255, 255, 0.08) !important;
      color: white !important;
      -webkit-appearance: none;
    }
    
    .form-group input:focus {
      background: rgba(255, 255, 255, 0.12) !important;
    }
  }

  .login-button, .magic-link-button {
    width: 100%;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--gradient-color);
    color: white;
    border: none;
    font-size: 1rem;
    font-family: var(--brand-font-body);
    margin-top: 1rem;
  }

  .login-button:hover:not(:disabled), .magic-link-button:hover:not(:disabled) {
    background: var(--gradient-color);
  }

  .login-button:disabled, .magic-link-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .magic-link-button {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
  }

  .magic-link-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }

  .divider {
    text-align: center;
    margin: 1.5rem 0;
    color: rgba(255, 255, 255, 0.7);
    font-family: var(--brand-font-body);
    position: relative;
  }

  .divider span {
    z-index: 700;
    text-shadow: 0px 0px 10px rgba(0,0,0,0, 0.9);
  }

  .divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.05);
  }

  .divider::after {
    background: rgba(255, 255, 255, 1);
    padding: 0 1rem;
    position: relative;
  }

  .mode-toggle {
    text-align: center;
    margin-top: 1.5rem;
    color: rgba(255, 255, 255, 0.7);
    font-family: var(--brand-font-body);
  }

  .text-button {
    background: none;
    border: none;
    color: var(--gradient-color);
    cursor: pointer;
    text-decoration: underline;
    font-family: var(--brand-font-body);
    font-size: inherit;
  }

  .text-button:hover {
    color: var(--gradient-light);
  }

  .magic-link-sent {
    text-align: center;
    padding: 3rem 2rem;
    color: white;
    font-family: var(--brand-font-body);
    min-height: 300px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .mail-icon-container {
    margin-bottom: 2rem;
    position: relative;
  }

  .magic-link-sent :global(.mail-icon) {
    color: var(--gradient-color);
    filter: drop-shadow(0 0 20px rgba(var(--gradient-color-rgb, 139, 69, 255), 0.3));
    animation: pulse 2s ease-in-out infinite alternate;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      filter: drop-shadow(0 0 20px rgba(var(--gradient-color-rgb, 139, 69, 255), 0.3));
    }
    100% {
      transform: scale(1.05);
      filter: drop-shadow(0 0 30px rgba(var(--gradient-color-rgb, 139, 69, 255), 0.5));
    }
  }

  .magic-link-sent h2 {
    color: white;
    font-family: var(--brand-font-header-bold);
    font-weight: 700;
    font-size: 1.75rem;
    margin: 0 0 1.5rem 0;
  }

  .magic-link-sent p {
    margin-bottom: 2.5rem;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.6;
    font-size: 1.1rem;
    max-width: 300px;
  }

  @media (max-width: 480px) {
    .login-card {
      padding: 2rem 1.5rem;
      margin: 1rem;
    }
    
    .login-logo {
      height: 50px;
    }
    
    h1 {
      font-size: 1.75rem;
    }
  }
</style>
