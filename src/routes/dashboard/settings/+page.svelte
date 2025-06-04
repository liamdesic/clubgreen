<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { page } from '$app/stores';
  import { showToast } from '$lib/toastStore';
  import DashboardHeader from '$lib/DashboardHeader.svelte';
  import FileUpload from '$lib/FileUpload.svelte';
  import '$lib/styles/theme.css';
  import '$lib/styles/base.css';
  import '$lib/styles/DashboardSettings.css';

  // State
  let loading = true;
  let saving = false;
  let loadingSubscription = false;
  let organization = {
    id: '',
    name: 'Organization',
    slug: '',
    stripe_customer_id: '',
    stripe_subscription_id: '',
    subscription_status: '',
    current_period_end: null,
    trial_ends_at: null,
    payment_up_to_date: true,
    settings: {
      logo_url: '',
      accent_color: '#00c853',
      ad_image_url: '',
      ad_link: '',
      billing_email: ''
    }
  };
  
  // Subscription data
  let subscriptionData: {
    status: string;
    trialDaysLeft: number;
    currentPeriodEnd: string | null;
    hasActiveSubscription: boolean;
    isInTrial: boolean;
    isTrialExpired: boolean;
    isCanceling: boolean;
  } = {
    status: '',
    trialDaysLeft: 0,
    currentPeriodEnd: null,
    hasActiveSubscription: false,
    isInTrial: false,
    isTrialExpired: false,
    isCanceling: false
  };
  
  // Track if slug has been manually edited
  let isSlugManuallyEdited = false;

  // File upload states
  let logoUrl = '';
  let adImageUrl = '';

  // Process subscription data
  function processSubscriptionData() {
    // Calculate trial days left if in trial
    if (organization.trial_ends_at) {
      const trialEnd = new Date(organization.trial_ends_at);
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      subscriptionData.trialDaysLeft = diffDays > 0 ? diffDays : 0;
      subscriptionData.isInTrial = diffDays > 0;
      subscriptionData.isTrialExpired = diffDays <= 0;
    } else {
      subscriptionData.isInTrial = false;
      subscriptionData.isTrialExpired = false;
    }
    
    // Process subscription status
    const status = organization.subscription_status || 'inactive';
    subscriptionData.status = status;
    subscriptionData.hasActiveSubscription = ['active', 'trialing', 'active_canceling'].includes(status);
    subscriptionData.isCanceling = status === 'active_canceling';
    
    // Format current period end date
    if (organization.current_period_end) {
      const endDate = new Date(organization.current_period_end);
      subscriptionData.currentPeriodEnd = endDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }
  
  // Open Stripe Customer Portal for managing subscription
  
  async function updateBillingInfo() {
    try {
      showToast('Opening billing portal...', 'info');
      
      // Call the billing-portal API endpoint
      const response = await fetch('/api/billing-portal', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Check for specific error messages
        if (errorData.message && errorData.message.includes('Stripe Customer Portal is not configured')) {
          console.error('Stripe Customer Portal configuration error:', errorData.message);
          showToast('Failed to open billing portal: Stripe Customer Portal is not configured', 'error');
          return;
        }
        
        throw new Error(errorData.message || 'Failed to open billing portal');
      }
      
      const { url } = await response.json();
      
      // Redirect to the Stripe customer portal
      window.location.href = url;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      showToast('Failed to open billing portal', 'error');
    }
  }
  
  // Cancel subscription
  async function cancelSubscription() {
    if (!confirm('Are you sure you want to cancel your subscription? Your subscription will remain active until the end of your current billing period.')) {
      return;
    }
    
    try {
      // Set optimistic UI update
      const originalStatus = subscriptionData.status;
      subscriptionData.status = 'active_canceling';
      
      // Call the cancel-subscription API endpoint
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ organizationId: organization.id })
      });
      
      if (!response.ok) {
        // Revert optimistic update on error
        subscriptionData.status = originalStatus;
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel subscription');
      }
      
      const result = await response.json();
      
      // Update UI with cancellation info
      organization.subscription_status = 'active_canceling';
      processSubscriptionData();
      
      showToast('Subscription will be canceled at the end of the billing period', 'success');
    } catch (err) {
      console.error('Error canceling subscription:', err);
      showToast('Failed to cancel subscription', 'error');
    }
  }
  
  // Redirect to checkout for subscription
  async function redirectToCheckout() {
    try {
      showToast('Preparing checkout...', 'info');
      
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          organizationId: organization.id 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      showToast('Failed to reactivate subscription', 'error');
    }
  }
  
  // Initialize organization data
  async function loadOrganization() {
    try {
      console.log('🔍 [settings] Starting to load organization...');
      loading = true;
      
      // Get the current session
      console.log('🔑 [settings] Getting session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ [settings] No valid session found');
        const errorMessage = 'Please log in to access settings';
        window.location.href = `/login?redirectTo=${encodeURIComponent('/dashboard/settings')}&error=${encodeURIComponent(errorMessage)}`;
        return;
      }
      
      // Get the current user
      console.log('👤 [settings] Getting user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [settings] No valid user found');
        const errorMessage = 'Your session has expired. Please log in again.';
        await supabase.auth.signOut();
        window.location.href = `/login?redirectTo=${encodeURIComponent('/dashboard/settings')}&error=${encodeURIComponent(errorMessage)}`;
        return;
      }
      
      console.log('✅ [settings] User verified:', user.email);

      // Get organization data
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (orgError) {
        console.error('❌ Error loading organization data:', orgError);
        throw orgError;
      }
      
      if (orgData) {
        console.log('✅ Loaded organization data:', {
          id: orgData.id,
          name: orgData.name,
          hasSettings: !!orgData.settings_json,
          hasSubscription: !!orgData.stripe_subscription_id
        });
        organization = {
          ...orgData,
          settings: {
            ...organization.settings,
            ...(orgData.settings_json || {})
          }
        };
        logoUrl = organization.settings.logo_url || '';
        adImageUrl = organization.settings.ad_image_url || '';
        
        if (organization.settings.logo_url) {
          console.log('🖼️ Loaded organization logo URL:', organization.settings.logo_url);
        } else {
          console.log('ℹ️ No organization logo found in settings');
        }
        
        if (organization.settings.ad_image_url) {
          console.log('🖼️ Loaded ad image URL:', organization.settings.ad_image_url);
        }
        
        // Process subscription data
        processSubscriptionData();
      }

    } catch (err) {
      console.error('Error loading organization:', err);
      showToast('Failed to load organization data', 'error');
    } finally {
      loading = false;
    }
  }

  // Handle file upload completion
  function handleLogoUpload(event: CustomEvent) {
    logoUrl = event.detail.url;
    // Update organization settings when logo URL changes (including when cleared)
    organization.settings.logo_url = logoUrl;
  }

  function handleAdUpload(event: CustomEvent) {
    adImageUrl = event.detail.url;
    // Update organization settings when ad image URL changes (including when cleared)
    organization.settings.ad_image_url = adImageUrl;
  }

  // Save organization settings
  async function saveSettings() {
    try {
      saving = true;
      
      // Validate slug format
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(organization.slug)) {
        showToast('Slug can only contain lowercase letters, numbers, and hyphens', 'error');
        return;
      }
      
      // Check if slug is already taken
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', organization.slug)
        .neq('id', organization.id)
        .single();
        
      if (existingOrg) {
        showToast('This URL is already taken. Please choose a different one.', 'error');
        return;
      }
      
      // Prepare the update data
      const updateData = {
        name: organization.name,
        slug: organization.slug,
        settings_json: {
          ...organization.settings,
          logo_url: logoUrl || organization.settings.logo_url,
          ad_image_url: adImageUrl || organization.settings.ad_image_url
        }
      };
      
      // Only include updated_at if the column exists
      try {
        // Try to update with updated_at first
        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', organization.id);
        
        if (updateError) throw updateError;
      } catch (e) {
        // If that fails, try without updated_at
        console.log('Retrying without updated_at...');
        const { error: updateError } = await supabase
          .from('organizations')
          .update(updateData)
          .eq('id', organization.id);
        
        if (updateError) throw updateError;
      }
      
      showToast('Settings saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast('Failed to save settings', 'error');
    } finally {
      saving = false;
    }
  }

  // Initialize on mount
  onMount(() => {
    loadOrganization();
  });
</script>

<DashboardHeader 
  organizationName={organization.name}
  eventTitle="Settings"
/>

<div class="settings-container">
  {#if loading}
    <div class="loading">Loading organization settings...</div>
  {:else}
    <div class="settings-form">
      <h1>Organization Settings</h1>
      
      <!-- Organization Info Section -->
      <div class="settings-section">
        <h2>Organization Information</h2>
        
        <div class="form-group">
          <label for="org-name">Organization Name</label>
          <input
            type="text"
            id="org-name"
            bind:value={organization.name}
            placeholder="Enter organization name"
            on:input={() => {
              // Auto-generate slug if it hasn't been manually edited
              if (!isSlugManuallyEdited) {
                organization.slug = organization.name
                  .toLowerCase()
                  .replace(/[^\w\s-]/g, '') // Remove special chars
                  .replace(/\s+/g, '-')     // Replace spaces with -
                  .replace(/-+/g, '-')      // Replace multiple - with single -
                  .substring(0, 50);        // Limit length
              }
            }}
          />
        </div>
        
        <div class="form-group">
          <label for="org-slug">Organization URL</label>
          <div class="input-with-prefix">
            <span class="prefix">clubgreen.app/</span>
            <input
              type="text"
              id="org-slug"
              bind:value={organization.slug}
              placeholder="your-org"
              on:input={() => isSlugManuallyEdited = true}
            />
          </div>
          <small class="hint">Used in your organization's URL. Only letters, numbers, and hyphens are allowed.</small>
        </div>
      </div>
      
      <!-- Branding Section -->
      <div class="settings-section">
        <h2>Branding</h2>
        
        <div class="form-group">
          <label for="org-logo">Organization Logo</label>
          <FileUpload 
            id="org-logo"
            initialUrl={organization.settings.logo_url}
            label="Upload Logo" 
            folder="organization-logos"
            on:upload={(e) => {
              logoUrl = e.detail.url;
              organization.settings.logo_url = e.detail.url;
              console.log('Logo URL updated:', e.detail.url);
            }}
          />

        </div>
        
        <div class="form-group">
          <label for="accent-color">Accent Color</label>
          <div class="color-picker">
            <input
              type="color"
              id="accent-color"
              bind:value={organization.settings.accent_color}
            />
            <span>{organization.settings.accent_color}</span>
          </div>
        </div>
      </div>
      
      <!-- Ad Settings -->
      <div class="settings-section">
        <h2>Advertisement</h2>
        
        <div class="form-group">
          <label for="ad-image">Ad Image</label>
          <FileUpload 
            id="ad-image"
            label="Upload Ad Image" 
            folder="ads"
            on:upload={handleAdUpload}
            initialUrl={organization.settings.ad_image_url}
          />

        </div>
        
        <div class="form-group">
          <label for="ad-link">Ad Link URL</label>
          <input
            type="text"
            id="ad-link"
            bind:value={organization.settings.ad_link}
            placeholder="https://example.com"
          />
        </div>
      </div>
      
      <!-- Subscription & Billing Information -->
      <div class="form-block">
        <h2>Subscription & Billing</h2>
        
        <div class="subscription-section">
          <h3>Subscription</h3>
          
          <div class="subscription-status">
            <div class="status-label">Status:</div>
            {#if subscriptionData.hasActiveSubscription}
              {#if subscriptionData.status === 'active'}
                <div class="status-badge active">Active</div>
              {:else if subscriptionData.status === 'trialing'}
                <div class="status-badge trialing">Trial</div>
              {:else if subscriptionData.status === 'active_canceling'}
                <div class="status-badge canceling">Active - Canceling</div>
              {:else}
                <div class="status-badge inactive">Inactive</div>
              {/if}
            {:else}
              <div class="status-badge inactive">No Active Subscription</div>
            {/if}
          </div>
          
          {#if subscriptionData.hasActiveSubscription && subscriptionData.currentPeriodEnd}
            <div class="subscription-detail">
              <div class="detail-label">
                {subscriptionData.isCanceling ? 'Access Until:' : 'Next Billing Date:'}
              </div>
              <div class="detail-value">{subscriptionData.currentPeriodEnd}</div>
            </div>
          {/if}
          
          <div class="subscription-actions">
            {#if subscriptionData.hasActiveSubscription}
              <button class="button primary" on:click={updateBillingInfo}>
                Manage Subscription
              </button>
            {:else}
              <button class="button primary" on:click={redirectToCheckout}>
                Subscribe
              </button>
            {/if}
          </div>
        </div>
        
        <div class="form-divider"></div>
        
        <div class="form-group">
          <label for="billing_email">Billing Email</label>
          <input
            type="text"
            id="billing_email"
            bind:value={organization.settings.billing_email}
            placeholder="Enter billing email"
          />
        </div>
        
        <div class="form-actions">
          <button class="button primary" on:click={saveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Billing Info'}
          </button>
        </div>
      </div>
      
      <div class="form-actions">
        <button 
          class="button primary" 
          on:click|preventDefault={saveSettings} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
      
      <div class="danger-zone">
        <h3>Danger Zone</h3>
        <button 
          class="button danger" 
          on:click|preventDefault={async () => {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Custom styles not covered by DashboardSettings.css */
  :global(body) {
    margin: 0;
  }
  
  /* Loading state is now handled by DashboardSettings.css */
  /* h2 styling is now handled by DashboardSettings.css */
</style>
