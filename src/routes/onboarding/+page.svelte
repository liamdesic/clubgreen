<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import FileUpload from '$lib/FileUpload.svelte';
  import '$lib/styles/onboarding.css';

  // Form state
  let organizationName = '';
  let organizationSlug = '';
  let logoUrl = '';
  let isSubmitting = false;
  let error = '';
  
  // Generate slug from organization name
  $: if (organizationName) {
    organizationSlug = organizationName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
  }

  // Handle logo upload
  function handleLogoUpload(event: CustomEvent) {
    logoUrl = event.detail.url;
  }

  // Handle form submission
  async function handleSubmit() {
    if (!organizationName) {
      error = 'Organization name is required';
      return;
    }

    isSubmitting = true;
    error = '';

    try {
      // Get current user with fresh session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Auth error:', userError);
        // Try to refresh the session first
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.user) {
          throw new Error('Session expired. Please log in again.');
        }
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
            }
          }
        ])
        .select()
        .single();

      if (orgError) throw orgError;

      // Force a hard redirect to refresh the session
      window.location.href = '/dashboard';
    } catch (err) {
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
