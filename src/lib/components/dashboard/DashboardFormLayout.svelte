<script lang="ts">
  import type { Organization } from '$lib/validations';
  import { showToast } from '$lib/stores/toastStore';
  import DashboardPageHeader from './DashboardPageHeader.svelte';
  import '$lib/styles/dashboard.css';

  export let title: string;
  export let subtitle: string | undefined = undefined;
  export let loading = false;
  export let error: string | undefined = undefined;
  export let organization: Organization;

  // Show error toast when error prop changes
  $: if (error) {
    showToast(error, 'error');
  }
</script>

<div class="dashboard-wrapper">
  <div class="dashboard-main">
    <!-- Header with breadcrumbs -->
    <DashboardPageHeader 
      organizationName={organization.name}
      eventTitle={title}
      accentColor={organization.color_palette?.[0] ?? '#4CAF50'}
    />

    <!-- Main Content -->
    <main class="dashboard-content">
      {#if loading}
        <div class="loading">Loading...</div>
      {:else if error}
        <div class="error-message">
          <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
          <p>{error}</p>
        </div>
      {:else}
        <div class="form-container">
          {#if subtitle}
            <p class="form-subtitle">{subtitle}</p>
          {/if}
          <slot />
        </div>
      {/if}
    </main>
  </div>
</div>

<style>
  .dashboard-wrapper {
    min-height: 100vh;
    background: #0f0f1a;
    color: white;
  }

  .dashboard-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .dashboard-content {
    margin-top: 2rem;
  }

  .form-container {
    background: rgba(0,0,0,0.12);
    border-radius: 1.5rem;
    padding: 1.5rem;
    box-shadow: 0 4px 24px 0 rgba(0,0,0,0.12);
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .form-subtitle {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .error-message {
    background-color: #fff5f5;
    border: 1px solid #feb2b2;
    color: #e53e3e;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    margin: 1rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  @media (max-width: 768px) {
    .dashboard-main {
      padding: 1rem;
    }

    .form-container {
      padding: 1rem;
    }
  }
</style> 