<script lang="ts">
  import { onMount, browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { invalidateAll } from '$app/navigation';

  let status = 'processing'; // 'processing' | 'success' | 'error'
  let error = '';
  let redirectPath = '/dashboard';

  onMount(async () => {
    // Only run this on the client side
    if (!browser) {
      console.log('Auth callback: Not running in browser environment');
      return;
    }
    
    console.group('Auth Callback Processing');
    console.log('Current URL:', window.location.href);
    
    try {
      // Extract tokens from URL hash
      const hash = window.location.hash;
      console.log('URL hash:', hash ? 'Present' : 'Empty');
      
      if (!hash) {
        const error = new Error('No authentication data found in URL');
        console.error('Auth error:', error);
        throw error;
      }
      
      // Try to parse tokens from the hash
      console.log('Parsing URL hash...');
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type');
      
      console.log('Auth tokens found:', { 
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        type: type || 'none'
      });
      
      console.log('Auth type:', type || 'regular sign-in');
      
      if (!access_token || !refresh_token) {
        throw new Error('Missing authentication tokens in URL');
      }

      console.log('Setting Supabase session...');
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error(`Authentication failed: ${sessionError.message}`);
      }

      if (!data.session) {
        throw new Error('No session data returned');
      }

      console.log('Authentication successful, user:', data.user?.email);
      
      // Handle different auth flows
      if (type === 'signup' || type === 'signup_confirm') {
        redirectPath = '/onboarding';
        console.log('New user signup detected, redirecting to onboarding');
      }
      
      // Clear the URL hash to prevent re-processing on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Invalidate all data to ensure the UI updates
      await invalidateAll();
      
      // Update status and redirect
      status = 'success';
      console.log('Redirecting to:', redirectPath);
      
      // Use window.location for a full page reload to ensure all auth state is properly set
      window.location.href = redirectPath;
      
    } catch (err) {
      console.error('Auth callback error:', err);
      status = 'error';
      error = err instanceof Error ? err.message : 'An unknown error occurred';
    } finally {
      console.groupEnd();
    }
  });
</script>

<div class="auth-callback-container">
  {#if status === 'processing'}
    <div class="processing-state">
      <LoadingSpinner size="lg" />
      <p>Completing your sign-in...</p>
    </div>
  {:else if status === 'error'}
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>Authentication Error</h2>
      <p class="error-message">{error}</p>
      <button 
        class="retry-button" 
        on:click={() => goto('/login')}
      >
        Return to Login
      </button>
    </div>
  {/if}
</div>

<style>
  .auth-callback-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: 2rem;
  }
  
  .processing-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }
  
  .processing-state p {
    font-size: 1.25rem;
    color: var(--text-primary);
  }
  
  .error-state {
    max-width: 500px;
    background: var(--bg-surface);
    border: 1px solid var(--border-error);
    border-radius: 0.5rem;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .error-message {
    color: var(--text-error);
    background: var(--bg-error);
    padding: 1rem;
    border-radius: 0.375rem;
    margin: 1rem 0;
    font-family: monospace;
    font-size: 0.9rem;
    word-break: break-word;
  }
  
  .retry-button {
    margin-top: 1.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .retry-button:hover {
    background: var(--primary-hover);
  }
</style>
  