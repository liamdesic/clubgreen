<script lang="ts">
  import { goto } from '$app/navigation';
  import { createBrowserClient } from '@supabase/ssr';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import FileUpload from '$lib/FileUpload.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { z } from 'zod';
  import '$lib/styles/onboarding.css';
  
  // Get data from server load function with proper typing
  export let data: {
    user: any;
    org: any;
    redirectTo: string;
    formValues?: {
      name: string;
      slug: string;
      logoUrl?: string;
    };
    errors?: {
      name?: string[];
      slug?: string[];
      logoUrl?: string[];
    };
    success?: boolean;
  };
  
  // Initialize Supabase client
  const supabase = createBrowserClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY
  );

  // Form state
  let name = data.formValues?.name || '';
  let slug = data.formValues?.slug || '';
  let logoUrl = data.formValues?.logoUrl || '';
  let isSubmitting = false;
  let error = '';
  let formEl: HTMLFormElement;
  
  // Define type for form errors
  type FormErrors = {
    name?: string[];
    slug?: string[];
    logoUrl?: string[];
  };
  
  // Get errors from form action if any
  const errors: FormErrors = data.errors || {};
  
  // Track if slug has been manually edited
  let slugManuallyEdited = false;
  
  // Update slug when name changes if it hasn't been manually edited
  $: if (name && !slugManuallyEdited) {
    slug = generateSlug(name);
  }
  
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
  
  // Handle slug manual edit
  function handleSlugInput() {
    slugManuallyEdited = true;
  }

  // Handle logo upload
  function handleLogoUpload(event: CustomEvent) {
    logoUrl = event.detail.url;
  }
  
  // No need to check authentication on mount since it's handled by the server

  // Handle form submission with validation
  function handleSubmit(e: Event) {
    // Prevent default form submission
    e.preventDefault();
    
    // Basic validation
    if (!name) {
      error = 'Organization name is required';
      return;
    }
    
    // Clear any previous errors
    error = '';
    isSubmitting = true;
    
    // Manually submit the form if validation passes
    if (formEl) {
      formEl.submit();
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

    <form method="POST" bind:this={formEl} on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="organizationName" class="form-label">
          Organization Name
        </label>
        <input
          type="hidden"
          name="logoUrl"
          value={logoUrl}
        />
        <input
          id="organizationName"
          name="name"
          type="text"
          required
          bind:value={name}
          class="form-input"
          placeholder="Acme Inc."
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {#if errors.name}
          <span class="error-text" id="name-error">{errors.name}</span>
        {/if}
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
            name="slug"
            bind:value={slug}
            on:input={handleSlugInput}
            class="form-input url-input"
            placeholder="acme-inc"
            aria-invalid={errors.slug ? 'true' : undefined}
            aria-describedby={errors.slug ? 'slug-error' : undefined}
          />
          {#if errors.slug}
            <span class="error-text" id="slug-error">{errors.slug}</span>
          {/if}
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
          {#if isSubmitting}
            <span class="loading-spinner">
              <LoadingSpinner size="sm" />
            </span>
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
