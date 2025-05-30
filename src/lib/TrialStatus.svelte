<script lang="ts">
  import { Clock } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { showToast } from '$lib/toastStore';

  export let trialEndsAt: string | null = null;
  export let organizationId: string | null = null;
  
  let daysLeft = 0;
  let isTrialActive = false;
  let loading = true;

  // Format the trial end date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate days remaining in trial
  const calculateDaysLeft = () => {
    if (!trialEndsAt) return 0;
    const endDate = new Date(trialEndsAt);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Handle upgrade button click
  const handleUpgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { organizationId }
      });
      
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
      showToast('Failed to load checkout page. Please try again.', 'error');
    }
  };

  onMount(() => {
    console.log('TrialStatus component mounted');
    console.log('Trial ends at:', trialEndsAt);
    
    if (trialEndsAt) {
      daysLeft = calculateDaysLeft();
      isTrialActive = daysLeft > 0;
      
      console.log('Days left in trial:', daysLeft);
      console.log('Is trial active:', isTrialActive);
    } else {
      console.log('No trial end date found');
    }
    
    console.log('Organization ID:', organizationId);
    loading = false;
  });
</script>

{#if !loading && isTrialActive && daysLeft !== null}
  <div class="trial-status">
    <Clock size={16} class="trial-icon" />
    <span class="trial-text">
      {daysLeft > 0 
        ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in trial`
        : 'Trial ending today'}
    </span>
    <button on:click={handleUpgrade} class="upgrade-button">
      Upgrade now
    </button>
  </div>
{/if}

<style>
  .trial-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    padding: 6px 12px;
    font-size: 14px;
    margin-right: 12px;
    color: var(--color-text);
  }
  
  .trial-icon {
    color: var(--color-primary);
  }
  
  .trial-text {
    font-weight: 500;
  }
  
  .upgrade-button {
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 16px;
    padding: 2px 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .upgrade-button:hover {
    background: var(--color-primary-dark);
  }
</style>
