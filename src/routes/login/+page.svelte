<script lang="ts">
  import { createBrowserClient } from '@supabase/ssr';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { z } from 'zod';

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
        
        // Show success message for signup
        successMessage = 'Please check your email to verify your account';
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

<div class="auth-container {mode}">
  <h1>{mode === 'login' ? 'Log In' : 'Sign Up'}</h1>
  
  {#if errorMessage}
    <div class="error" aria-live="polite">{errorMessage}</div>
  {/if}
  
  {#if successMessage}
    <div class="success" aria-live="polite">{successMessage}</div>
  {/if}
  
  <form on:submit|preventDefault={handleEmailPasswordAuth}>
    <fieldset disabled={loading}>
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
      
      <button type="submit">
        {#if loading}
          Loading...
        {:else}
          {mode === 'login' ? 'Log In' : 'Sign Up'}
        {/if}
      </button>
    </fieldset>
  </form>
  
  {#if mode === 'login'}
    <div class="divider">or</div>
    
    {#if magicLinkSent}
      <div class="magic-link-sent">
        <p>Check your email for the magic link.</p>
        <button on:click={() => magicLinkSent = false} class="text-button">
          Try another method
        </button>
      </div>
    {:else}
      <fieldset disabled={loading}>
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
