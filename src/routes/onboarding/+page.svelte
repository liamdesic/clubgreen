<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import FileUpload from '$lib/FileUpload.svelte';
  import { showToast } from '$lib/toastStore';
  import { onMount } from 'svelte';
  import '$lib/styles/onboarding.css';

  // Form state
  let organizationName = '';
  let organizationSlug = '';
  let logoUrl = '';
  let isSubmitting = false;
  let isStartingTrial = false;
  let error = '';
  let successMessage = '';
  
  // Generate slug from organization name
  function generateSlug(name: string, randomSuffix: boolean = false): string {
    let slug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
      
    if (randomSuffix) {
      const randomString = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${randomString}`;
    }
    
    return slug;
  }
  
  $: if (organizationName) {
    organizationSlug = generateSlug(organizationName);
  }

  // Handle logo upload
  function handleLogoUpload(event: CustomEvent) {
    logoUrl = event.detail.url;
  }
  
  // Check authentication when component mounts
  onMount(async () => {
    console.log('🚀 [onboarding] Component mounted, verifying authentication...');
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error('Auth error on onboarding page:', error);
        const errorMessage = 'Please log in to access the onboarding page';
        goto(`/login?redirectTo=/onboarding&error=${encodeURIComponent(errorMessage)}`);
        return;
      }
      
      console.log('✅ [onboarding] User is authenticated');
    } catch (error) {
      console.error('🔥 [onboarding] Error checking authentication:', error);
      showToast('An error occurred. Please refresh and try again.', 'error');
    }
  });

  // Handle form submission
  async function handleSubmit() {
    if (!organizationName) {
      error = 'Organization name is required';
      return;
    }

    isSubmitting = true;
    error = '';
    
    // Verify authentication before proceeding
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      showToast('Your session has expired. Please log in again.', 'error');
      goto('/login?redirectTo=/onboarding');
      return;
    }

    try {
      // Get current user with fresh session
      const { data, error: userError } = await supabase.auth.getUser();
      const user = data?.user;
      
      if (userError || !user) {
        console.error('Auth error:', userError);
        // Try to refresh the session first
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.user) {
          const errorMessage = 'Session expired. Please log in again.';
          goto(`/login?redirectTo=/onboarding&error=${encodeURIComponent(errorMessage)}`);
          return;
        }
      }

      if (!user) {
        throw new Error('User session not found');
      }
      
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([
          { 
            name: organizationName,
            slug: organizationSlug,
            owner_id: user.id,
            settings_json: {
              logo_url: logoUrl
            },
            payment_up_to_date: false
          }
        ])
        .select()
        .single();

      if (orgError) throw orgError;

      // Update the displayed slug in case it was modified
      organizationSlug = orgData.slug;
      
      // Start the free trial
      isStartingTrial = true;
      successMessage = 'Organization created! Starting your free trial...';
      
      try {
        const response = await fetch('/api/start-trial', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to start trial');
        }
        
        // Update success message before redirecting
        successMessage = 'Trial started successfully! Redirecting to dashboard...';
        
        // Wait a moment to show the success message
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } catch (error) {
        const trialError = error as Error;
        console.error('Trial start error:', trialError);
        throw new Error(`Organization created, but we couldn't start your trial: ${trialError.message || 'Unknown error'}. Please contact support.`);
      }
    } catch (error) {
      const err = error as Error;
      console.error('Error during onboarding:', err);
      error = err.message || 'An error occurred during onboarding. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="onboarding-container">
  <div class="onboarding-header">
    <h1 class="onboarding-title">Welcome to</h1>
    <div class="logo-container">
      <img src="/logos/ldrb-logo-colourlight.svg" alt="ldrboard" class="logo-image" />
    </div>
    <p class="onboarding-subtitle">
      Let's set up your organization to get started
    </p>
  </div>

  <div class="onboarding-card">
    {#if error}
      <div class="error-message">
        <div class="error-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="error-text">{error}</p>
      </div>
    {:else if successMessage}
      <div class="success-message">
        <div class="success-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="success-text">
          {successMessage}
          {#if isStartingTrial}
            <span class="loading-dots">...</span>
          {/if}
        </p>
      </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="organizationName" class="form-label">
          Organization Name
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          bind:value={organizationName}
          class="form-input"
          placeholder="Acme Inc."
        />
      </div>

      <div class="form-group">
        <label for="organizationSlug" class="form-label">
          Organization URL
        </label>
        <div class="url-input-container">
          <span class="url-prefix">ldrboard.co/</span>
          <input
            type="text"
            id="organizationSlug"
            name="organizationSlug"
            bind:value={organizationSlug}
            class="form-input url-input"
            placeholder="acme-inc"
          />
        </div>
        <p class="form-note">
          This will be your organization's unique URL
        </p>
      </div>

      <div class="form-group">
        <label for="logo-upload" class="form-label">
          Organization Logo (Optional)
        </label>
        <div class="logo-upload-container">
          {#if logoUrl}
            <div class="logo-preview">
              <img src={logoUrl} alt="Organization logo preview" class="logo-image" />
            </div>
          {/if}
          <p id="logo-upload-hint" class="logo-upload-note">
            {logoUrl 
              ? 'Your logo will be displayed on a dark background. If this doesn\'t look right, change to a light logo.'
              : 'Your logo will be displayed on a dark background, so light/white logos work best.'
            }
          </p>
          <FileUpload 
            id="logo-upload"
            label="Choose a file" 
            folder="organization-logos"
            on:upload={handleLogoUpload}
            ariaDescribedBy="logo-upload-hint"
          />
        </div>
      </div>

      <div class="form-group">
        <button
          type="submit"
          disabled={isSubmitting}
          class="btn btn-primary"
        >
          {isSubmitting ? 'Setting up...' : 'Get Started'}
        </button>
      </div>
    </form>
  </div>
</div>
