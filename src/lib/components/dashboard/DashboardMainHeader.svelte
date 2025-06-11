<script lang="ts">
  import type { Organization } from '$lib/validations';
  import { User, Settings, Palette } from 'lucide-svelte/icons';
  import TrialStatus from '$lib/components/dashboard/TrialStatus.svelte';

  export let organization: Organization | null = null;
  export let loading = false;
</script>

<header class="dashboard-header">
  <div class="dashboard-title">
    {#if organization?.settings_json?.logo_url}
      <img 
        src={organization.settings_json.logo_url} 
        alt="{organization.name} logo" 
        class="org-logo"
      />
    {:else}
      <h1>{organization?.name || 'My Organization'}</h1>
    {/if}
  </div>
  <img src="/logos/ldrb-logo-colourlight.svg" alt="ldrboard logo" class="dashboard-logo" />
  <div class="header-right">
    <div class="header-pills">
      {#if organization?.trial_ends_at}
        <TrialStatus 
          trialEndsAt={organization.trial_ends_at} 
          organizationId={organization.id} 
        />
      {/if}
      {#if organization}
        <a 
          href="/dashboard/customize"
          class="user-pill" 
          aria-label="Customize your leaderboard"
        >
          <Palette size="16" />
          <span>Customize</span>
        </a>
        <a 
          href="/dashboard/settings"
          class="user-pill" 
          aria-label="Account settings"
        >
          <User size="16" />
          <span>{organization.name || 'My Organization'}</span>
          <Settings size="16" class="gear-button" />
        </a>
      {:else if loading}
        <div class="user-pill">
          <div class="skeleton-loader" style="width: 120px; height: 24px;"></div>
        </div>
      {:else}
        <a href="/dashboard/settings" class="user-pill">
          <User size="16" />
          <span>Set Up Organization</span>
        </a>
      {/if}
    </div>
  </div>
</header>

<style>
  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0;
    margin-bottom: 2rem;
    font-family: 'Inter', sans-serif;
  }

  .dashboard-title {
    display: flex;
    align-items: center;
    min-height: 40px;
  }

  .org-logo {
    height: 40px;
    width: auto;
    object-fit: contain;
    display: block;
  }

  .dashboard-logo {
    height: 40px;
    width: auto;
  }

  .header-right {
    display: flex;
    align-items: center;
  }

  .header-pills {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .user-pill {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 1rem;
    background: var(--gradient-light);
    color: black;
    border-radius: 999px;
    font-size: 0.9rem;
    text-decoration: none;
    transition: all 0.2s ease;
    border: none;
    cursor: pointer;
  }

  .user-pill:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    background: var(--gradient-light-hover, var(--gradient-light));
  }

  .user-pill:active {
    transform: translateY(0);
  }

  .gear-button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .user-pill:hover .gear-button {
    transform: rotate(15deg);
  }

  .skeleton-loader {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 4px;
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @media (max-width: 768px) {
    .dashboard-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .header-pills {
      flex-direction: column;
      width: 100%;
    }

    .user-pill {
      width: 100%;
      justify-content: center;
    }
  }
</style> 