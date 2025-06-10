<script lang="ts">
  import { Clock } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { showToast } from '$lib/stores/toastStore';

  export let trialEndsAt: string | null = null;
  export let organizationId: string | null = null;
  
  let daysLeft = 0;
  let isTrialActive = false;
  let loading = true;

  // Debug log when props change
  $: console.log('🔄 TrialStatus props updated:', {
    trialEndsAt,
    organizationId,
    hasTrialEndsAt: !!trialEndsAt,
    currentTime: new Date().toISOString()
  });

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
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
      showToast(error.message || 'Failed to load checkout page. Please try again.', 'error');
    }
  };

  onMount(() => {
    console.log('🎯 TrialStatus component mounted with:', {
      trialEndsAt,
      organizationId,
      currentTime: new Date().toISOString()
    });
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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  
  .trial-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(249, 115, 22, 0.1); /* Semi-transparent orange */
    border: 1px solid rgba(249, 115, 22, 0.2);
    border-radius: 20px;
    padding: 4px 12px 4px 8px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: white; /* Darker orange for text */
    margin-right: 8px;
    transition: all 0.2s ease;
    line-height: 1.2;
  }
  
  .trial-status:hover {
    background: rgba(249, 115, 22, 0.15);
    border-color: rgba(249, 115, 22, 0.3);
  }
  
  .trial-icon {
    color: #ea580c; /* Orange-600 */
    width: 14px;
    height: 14px;
  }
  
  .trial-text {
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  
  .upgrade-button {
    background: #ea580c; /* Orange-600 */
    color: white;
    border: none;
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-left: 2px;
    letter-spacing: -0.01em;
  }
  
  .upgrade-button:hover {
    background: #c2410c; /* Orange-700 */
    transform: translateY(-1px);
  }
</style>
