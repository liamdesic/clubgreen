<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { createBrowserClient } from '@supabase/ssr';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import FileUpload from '$lib/components/FileUpload.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import type { User } from '@supabase/supabase-js';
  import type { Database } from '$lib/database.types';
  import { organizationFormSchema } from '$lib/validations/organizationForm';
  import type { OrganizationFormData } from '$lib/validations/organizationForm';
  import type { FormErrorResponse } from '$lib/validations/errorSchemas';
  import { organizationSettingsSchema } from '$lib/validations/organizationSettings';
  import '$lib/styles/theme.css';

  // Get data from server load function with proper typing
  const props = $props<{
    data: {
      user: User | null;
      org: Database['public']['Tables']['organizations']['Row'] | null;
      redirectTo: string;
      formValues?: {
        name: string;
        slug: string;
        logoUrl?: string;
      };
      errors?: FormErrorResponse;
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
  
  // Real-time slug validation
  let slugValidation = $state<{
    isValid: boolean;
    message: string;
    type: 'success' | 'warning' | 'error';
  }>({ isValid: true, message: '', type: 'success' });
  
  // Update slug when name changes if it hasn't been manually edited
  $effect(() => {
    if (organizationName && !slugManuallyEdited) {
      organizationSlug = generateSlug(organizationName);
    }
  });
  
  // Real-time slug validation
  $effect(() => {
    if (!organizationSlug) {
      slugValidation = { isValid: false, message: 'URL slug is required', type: 'error' };
      return;
    }
    
    // Check length
    if (organizationSlug.length < 3) {
      slugValidation = { isValid: false, message: 'URL must be at least 3 characters', type: 'error' };
      return;
    }
    
    if (organizationSlug.length > 30) {
      slugValidation = { isValid: false, message: 'URL must be 30 characters or less', type: 'error' };
      return;
    }
    
    // Check for invalid characters
    if (!/^[a-z0-9-]+$/.test(organizationSlug)) {
      slugValidation = { isValid: false, message: 'URL can only contain lowercase letters, numbers, and hyphens', type: 'error' };
      return;
    }
    
    // Check for consecutive hyphens
    if (organizationSlug.includes('--')) {
      slugValidation = { isValid: false, message: 'URL cannot contain consecutive hyphens', type: 'error' };
      return;
    }
    
    // Check for leading/trailing hyphens
    if (organizationSlug.startsWith('-') || organizationSlug.endsWith('-')) {
      slugValidation = { isValid: false, message: 'URL cannot start or end with a hyphen', type: 'error' };
      return;
    }
    
    // All good
    slugValidation = { isValid: true, message: 'URL looks good!', type: 'success' };
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
  
  // Handle slug manual edit with auto-hyphenation
  function handleSlugInput(event: Event) {
    slugManuallyEdited = true;
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    // Auto-convert spaces to hyphens and clean up
    const cleanedValue = value
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
      .replace(/\s+/g, '-')     // Convert spaces to hyphens
      .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '');   // Remove leading/trailing hyphens
    
    // Update the slug if it changed
    if (cleanedValue !== value) {
      organizationSlug = cleanedValue;
    }
  }

  // Handle logo upload
  function handleLogoUpload(event: CustomEvent<{ url: string }>) {
    logoUrl = event.detail.url;
  }
</script>

<div class="onboarding-wrapper">
  <div class="onboarding-header">
    <h1>Welcome to</h1>
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

    <form 
      method="POST" 
      class="onboarding-form" 
      bind:this={formEl}
      use:enhance={({ formData, cancel }) => {
        // Client-side validation before submission
        if (!organizationName.trim()) {
          formError = 'Organization name is required';
          cancel();
          return;
        }
        
        if (!slugValidation.isValid) {
          formError = 'Please fix the URL before submitting';
          cancel();
          return;
        }
        
        isSubmitting = true;
        formError = '';
        
        return async ({ result, update }) => {
          isSubmitting = false;
          
          if (result.type === 'success') {
            if (result.data?.redirectTo) {
              goto(result.data.redirectTo);
            } else {
              goto('/dashboard');
            }
          } else if (result.type === 'failure') {
            formError = result.data?.message || 'An error occurred. Please try again.';
          }
          
          await update();
        };
      }}
    >
      <div class="form-group">
        <label for="organizationName">
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
          placeholder="Acme Inc."
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {#if errors.name}
          <small class="error-text" id="name-error">{errors.name.join(', ')}</small>
        {/if}
      </div>

      <div class="form-group">
        <label for="organizationSlug">
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
            class="url-input"
            style="border: none !important; background:none;"
            required
            aria-invalid={errors.slug || !slugValidation.isValid ? 'true' : undefined}
            aria-describedby={errors.slug ? 'slug-error' : 'slug-validation'}
          />
        </div>
        {#if errors.slug}
          <small class="error-text" id="slug-error">{errors.slug.join(', ')}</small>
        {:else if slugValidation.message}
          <small 
            class="validation-text {slugValidation.type}" 
            id="slug-validation"
          >
            {slugValidation.message}
          </small>
        {/if}
        <small>This will be your organization's unique URL</small>
      </div>

      <div class="form-group">
        <label for="logo-upload">
          Organization Logo (Optional)
        </label>
        <div class="logo-upload-container">
          {#if logoUrl}
            <div class="logo-preview">
              <img src={logoUrl} alt="Organization logo preview" class="logo-preview-image" />
            </div>
          {/if}
          <small class="logo-upload-note">
            {logoUrl 
              ? 'Your logo will be displayed on a dark background. If this doesn\'t look right, change to a light logo.'
              : 'Your logo will be displayed on a dark background, so light/white logos work best.'
            }
          </small>
          <FileUpload 
            on:uploaded={handleLogoUpload}
            initialUrl={logoUrl}
            folder="organizations"
            theme="dark"
          />
        </div>
      </div>

      <div class="form-actions">
        <button
          type="submit"
          disabled={isSubmitting}
          class="onboarding-button"
        >
          {#if isSubmitting}
            Setting up...
          {:else}
            Get Started
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .onboarding-wrapper {
    min-height: 100vh;
    background: #0f0f1a;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    box-sizing: border-box;
  }

  .onboarding-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  h1 {
    color: white;
    font-family: var(--brand-font-header-bold);
    font-weight: 700;
    font-size: 2.5rem;
    margin: 0 0 1rem 0;
  }

  .logo-container {
    margin: 1rem 0 1.5rem 0;
  }

  .logo-image {
    height: 60px;
    width: auto;
  }

  .onboarding-subtitle {
    color: rgba(255, 255, 255, 0.8);
    font-family: var(--brand-font-body);
    font-size: 1.1rem;
    margin: 0;
  }

  .onboarding-card {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 1.5rem;
    padding: 2.5rem;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 4px 24px 0 rgba(0,0,0,0.12);
  }

  .error-message {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .error-icon {
    color: #ff6b6b;
    flex-shrink: 0;
  }

  .error-text {
    color: #ff6b6b;
    font-family: var(--brand-font-body);
    margin: 0;
    font-size: 0.9rem;
    display: block;
    margin-top: 0.25rem;
  }

  .validation-text {
    font-family: var(--brand-font-body);
    margin: 0;
    font-size: 0.875rem;
    display: block;
    margin-top: 0.25rem;
    font-weight: 500;
  }

  .validation-text.success {
    color: var(--gradient-color);
  }

  .validation-text.warning {
    color: #ffa726;
  }

  .validation-text.error {
    color: #ff6b6b;
  }

  .onboarding-form {
    width: 100%;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: white;
    font-family: var(--brand-font-body);
  }

  .form-group input[type="text"] {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    color: white;
    font-size: 1rem;
    font-family: var(--brand-font-body);
    transition: border-color 0.2s ease, background-color 0.2s ease;
    box-sizing: border-box;
  }

  .form-group input[type="text"]:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.12);
  }

  .form-group input[type="text"]::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .form-group small {
    color: rgba(255, 255, 255, 0.7);
    font-family: var(--brand-font-body);
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }

  .url-input-container {
    display: flex;
    align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }

  .url-input-container:focus-within {
    border-color: var(--color-accent-purple);
    background: rgba(255, 255, 255, 0.12);
  }

  .url-prefix {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
    padding: 0.75rem 1rem;
    font-family: var(--brand-font-body);
    border-right: 1px solid rgba(255, 255, 255, 0.2);
    white-space: nowrap;
  }

  .url-input {
    flex: 1;
    padding: 0.75rem;
    border: none;
    background: transparent;
    color: white;
    font-size: 1rem;
    font-family: var(--brand-font-body);
    outline: none !important;
  }

  .url-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }


  .form-actions {
    margin-top: 2rem;
    display: flex;
    justify-content: center;
  }

  .onboarding-button {
    width: 100%;
    padding: 0.875rem 2rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--gradient-color);
    color: white;
    border: none;
    font-size: 1.1rem;
    font-family: var(--brand-font-body);
  }

  .onboarding-button:hover:not(:disabled) {
    background: var(--gradient-color);
    filter: brightness(1.2);
    transform: translateY(-5px);
    filter: hue-rotate(80deg);
    box-shadow: 0 0 10px var(--gradient-color);
  }

  .onboarding-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  @media (max-width: 600px) {
    .onboarding-card {
      padding: 2rem 1.5rem;
      margin: 1rem;
    }
    
    .logo-image {
      height: 50px;
    }
    
    h1 {
      font-size: 2rem;
    }

    .url-input-container {
      flex-direction: column;
    }

    .url-prefix {
      border-right: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      width: 100%;
      text-align: center;
    }
  }
</style>
