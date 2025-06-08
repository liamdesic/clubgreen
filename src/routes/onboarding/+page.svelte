<script lang="ts">
  import { goto } from '$app/navigation';
  import { createBrowserClient } from '@supabase/ssr';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import FileUpload from '$lib/FileUpload.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { z } from 'zod';
  import type { User } from '@supabase/supabase-js';
  import type { Organization } from '$lib/validations';
  import '$lib/styles/onboarding.css';
  
  // Get data from server load function with proper typing
  const props = $props<{
    data: {
      user: User | null;
      org: Organization | null;
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
    }
  }>();
  
  // Destructure data from props
  const { data } = props;
  
  // Initialize Supabase client
  const supabase = createBrowserClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY
  );

  // Form state
  let organizationName = $state(props.data.formValues?.name || '');
  let organizationSlug = $state(props.data.formValues?.slug || '');
  let logoUrl = $state(props.data.formValues?.logoUrl || '');
  let logoFile = $state<File | null>(null);
  let logoPreview = $state('');
  let isSubmitting = $state(false);
  let formError = $state<string>('');
  let formEl: HTMLFormElement | null = null;
  
  // Define type for form errors
  type FormErrors = {
    name?: string[];
    slug?: string[];
    logoUrl?: string[];
  };
  
  // Get errors from form action if any
  const errors = $derived(data.errors || {} as FormErrors);
  
  // Track if slug has been manually edited
  let slugManuallyEdited = $state(false);
  
  // Update slug when name changes if it hasn't been manually edited
  $effect(() => {
    if (organizationName && !slugManuallyEdited) {
      organizationSlug = generateSlug(organizationName);
    }
  });
  
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
  function handleLogoUpload(event: CustomEvent<{ url: string }>) {
    logoUrl = event.detail.url;
  }
  
  // No need to check authentication on mount since it's handled by the server

  // Handle form submission with validation
  async function handleSubmit(event: Event) {
    event.preventDefault();
    isSubmitting = true;
    formError = '';
    
    try {
      // Basic validation
      if (!organizationName.trim()) {
        throw new Error('Organization name is required');
      }
      
      const formData = new FormData();
      formData.append('name', organizationName);
      formData.append('slug', organizationSlug);
      if (logoUrl) formData.append('logoUrl', logoUrl);
      
      const response = await fetch('/onboarding', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to submit form');
      }
      
      // Redirect on success
      if (responseData.redirectTo) {
        goto(responseData.redirectTo);
      }
    } catch (err) {
      formError = err instanceof Error ? err.message : 'An error occurred';
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
    {#if formError}
      <div class="error-message">
        <div class="error-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="error-text">{formError}</p>
      </div>
    {/if}

    <form onsubmit={handleSubmit} class="onboarding-form" bind:this={formEl}>
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
          bind:value={organizationName}
          class="form-input"
          placeholder="Acme Inc."
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {#if errors.name}
          <span class="error-text" id="name-error">{errors.name.join(', ')}</span>
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
            bind:value={organizationSlug}
            oninput={handleSlugInput}
            class="form-input url-input"
            required
            aria-invalid={errors.slug ? 'true' : undefined}
            aria-describedby={errors.slug ? 'slug-error' : undefined}
          />
          {#if errors.slug}
            <span class="error-text" id="slug-error">{errors.slug.join(', ')}</span>
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
            on:uploaded={handleLogoUpload}
            initialUrl={logoUrl}
            folder="organizations"
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
