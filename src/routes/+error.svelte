<script lang="ts">
  import { page } from '$app/stores';
  import { Search, Lock, Key, AlertTriangle, CreditCard, HelpCircle } from 'lucide-svelte';

  // Define error content based on status code
  const errorContent = {
    // Not Found
    404: {
      title: 'Page Not Found',
      message: "We couldn't find the page you're looking for.",
      action: 'Go to Dashboard',
      actionLink: '/dashboard',
      icon: Search
    },
    // Forbidden
    403: {
      title: 'Access Denied',
      message: "You don't have permission to access this resource.",
      action: 'Go to Dashboard',
      actionLink: '/dashboard',
      icon: Lock
    },
    // Unauthorized
    401: {
      title: 'Authentication Required',
      message: 'Please sign in to access this resource.',
      action: 'Sign In',
      actionLink: '/login',
      icon: Key
    },
    // Server Error
    500: {
      title: 'Server Error',
      message: 'Something went wrong on our end. Please try again later.',
      action: 'Go to Dashboard',
      actionLink: '/dashboard',
      icon: AlertTriangle
    },
    // Payment Required
    402: {
      title: 'Subscription Required',
      message: 'This feature requires an active subscription.',
      action: 'Manage Subscription',
      actionLink: '/dashboard/settings',
      icon: CreditCard
    },
    // Default
    default: {
      title: 'Oops! Something Went Wrong',
      message: 'An unexpected error occurred.',
      action: 'Go to Dashboard',
      actionLink: '/dashboard',
      icon: HelpCircle
    }
  };

  // Get current error from page store
  $: error = $page.error;
  $: status = $page.status;
  
  // Get appropriate error content based on status code
  $: content = errorContent[status as keyof typeof errorContent] || errorContent.default;
</script>

<svelte:head>
  <title>{content.title} | ldrboard</title>
</svelte:head>

<div class="error-page">
 
  
  <div class="error-container">
    <div class="status-code">{status}</div>
    <div class="icon-container">
      <svelte:component this={content.icon} size={80} strokeWidth={1.5} />
    </div>
    <h1>{content.title}</h1>
    <p>{content.message}</p>
    {#if error?.message && status !== 404}
      <div class="error-details">
        <p class="error-message">{error.message}</p>
      </div>
    {/if}
    <div class="actions">
      <a href={content.actionLink} class="action-button">{content.action}</a>
      <a href="/" class="secondary-action">Go Home</a>
    </div>
  </div>
</div>

<style>

  .error-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    width: 100%;
    position: relative;
    color: white !important;
    background-color: rgba(0, 0, 0, 1);
    font-family: var(--font-body);
  }

  .error-container {
    position: relative;
    z-index: 10;
    max-width: 600px;
    padding: 3rem;
    text-align: center;
    background: rgba(28, 24, 33, 0.7);
    border-radius: 1rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .status-code {
    position: absolute;
    top: -30px;
    right: 200px;
    font-size: 1.5rem;
    font-weight: bold;
    background: var(--gradient-color);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 1rem;
    font-family: var(--font-header);
  }

  .icon-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 1.5rem;
    color: var(--accent-color);
  }

  h1 {
    font-family: var(--font-header);
    font-size: 2.5rem;
    margin-bottom: 1rem;
    background: var(  --gradient-color);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    font-family: var(--font-body);
    font-size: 1.2rem;
    color: white;
    margin-bottom: 2rem;
    opacity: 0.9;
  }

  .error-details {
    background: rgba(28, 24, 33, 0.5);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 2rem;
    text-align: left;
    border: 1px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(5px);
  }

  .error-message {
    font-family: monospace;
    font-size: 0.9rem;
    margin: 0;
    color: var(--accent-color-300);
    word-break: break-word;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .action-button {
    background: var(--accent-gradient-medium);
    color: white;
    padding: 0.75rem 2rem;
    border-radius: 2rem;
    font-weight: bold;
    text-decoration: none;
    transition: all 0.2s ease;
    font-family: var(--font-body);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    background: var(--accent-gradient-strong);
  }

  .secondary-action {
    color: var(--accent-color-300);
    text-decoration: none;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    font-family: var(--font-body);
  }

  .secondary-action:hover {
    color: var(--accent-color);
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .error-container {
      padding: 2rem;
      margin: 1rem;
    }

    .status-code {
      top: -20px;
      right: -10px;
      font-size: 1.2rem;
    }

    h1 {
      font-size: 2rem;
    }

    .icon-container :global(svg) {
      width: 60px;
      height: 60px;
    }
  }
</style>
