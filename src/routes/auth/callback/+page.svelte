<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  type AuthStatus = 'processing' | 'success' | 'pkce_verifier_missing' | 'error';
  
  let status: AuthStatus = 'processing';
  let error = '';
  let redirectPath = '/dashboard';
  let autoCloseTimer: ReturnType<typeof setTimeout>;

  function closeTab() {
    window.close();
  }
  
  // Auto-close the tab after 10 seconds if in PKCE verifier missing state
  function startAutoClose() {
    if (status === 'pkce_verifier_missing') {
      autoCloseTimer = setTimeout(() => {
        window.close();
      }, 10000); // 10 seconds
    }
  }
  
  onMount(() => {
    return () => {
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    };
  });

  onMount(async () => {
    try {
      // Check for modern PKCE code flow
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      if (!code) {
        throw new Error('No authentication data found in URL');
      }

      // Try to exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        // Check for PKCE verifier missing error
        if (exchangeError.message?.includes('code and code verifier')) {
          status = 'pkce_verifier_missing';
          startAutoClose(); // Start auto-close timer
          return;
        }
        throw exchangeError;
      }

      if (!data.session) {
        throw new Error('No session data returned');
      }

      // Check if this is a new signup
      const type = url.searchParams.get('type');
      if (type === 'signup' || type === 'signup_confirm') {
        redirectPath = '/onboarding';
      }

      status = 'success';
      window.location.href = redirectPath;
    } catch (err) {
      console.error('Auth callback error:', err);
      error = err instanceof Error ? err.message : 'An unknown error occurred';
      status = 'error';
    }
  });
</script>

<div class="auth-container">
  {#if status === 'processing'}
    <div class="processing-state">
      <LoadingSpinner />
      <p>Logging you in...</p>
    </div>
  
  {:else if status === 'success'}
    <div class="success-state">
      <div class="icon">✅</div>
      <h2>Successfully logged in!</h2>
      <p>Redirecting you to your dashboard...</p>
    </div>
  
  {:else if status === 'pkce_verifier_missing'}
    <div class="pkce-missing-state">
      <div class="icon">🔗</div>
      <h2>✅ Email Confirmed!</h2>
      <p class="message">
        <strong>For security, this link must be opened in the same browser tab where you signed up.</strong>
        <br><br>
        Please return to the original tab to continue. This tab will close automatically in 10 seconds.
      </p>
      <div class="button-group">
        <button class="button primary" on:click={closeTab}>
          Close Tab Now
        </button>
        <a href="/login" class="button secondary">
          Use Password Instead
        </a>
      </div>
    </div>
  
  {:else if status === 'error'}
    <div class="error-state">
      <div class="icon">❌</div>
      <h2>Authentication Error</h2>
      <p class="error-message">{error}</p>
      <a href="/login" class="button primary">Back to Login</a>
    </div>
  {/if}
</div>

<style>
  .auth-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    text-align: center;
    background: var(--bg-primary);
  }

  .processing-state,
  .success-state,
  .pkce-missing-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    max-width: 500px;
    width: 100%;
    padding: 2.5rem;
    background: var(--bg-surface);
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .icon {
    font-size: 3.5rem;
    margin-bottom: 1rem;
    line-height: 1;
  }

  h2 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
  }


  .message {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0.5rem 0 1.5rem;
  }

  .button-group {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.75rem;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    margin: 0;
  }

  .button.primary {
    background: var(--primary);
    color: white;
    border: 2px solid transparent;
  }

  .button.primary:hover {
    background: var(--primary-hover);
    transform: translateY(-1px);
  }

  .button.secondary {
    background: transparent;
    color: var(--primary);
    border: 2px solid var(--primary);
  }

  .button.secondary:hover {
    background: rgba(var(--primary-rgb), 0.1);
    transform: translateY(-1px);
  }
  
  @media (max-width: 480px) {
    .button-group {
      flex-direction: column;
      width: 100%;
    }
    
    .button {
      width: 100%;
    }
  }

  .error-message {
    background: var(--bg-error);
    color: var(--text-error);
    padding: 1rem;
    border-radius: 0.5rem;
    font-family: monospace;
    font-size: 0.9rem;
    text-align: left;
    width: 100%;
    margin: 1rem 0;
    word-break: break-word;
  }

  a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 600;
  }

  a:hover {
    text-decoration: underline;
  }
</style>
  