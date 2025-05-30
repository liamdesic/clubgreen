<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { page } from '$app/stores';
  import { showToast } from '$lib/toastStore';
  import DashboardHeader from '$lib/DashboardHeader.svelte';
  import FileUpload from '$lib/FileUpload.svelte';
  import '$lib/styles/theme.css';
  import '$lib/styles/base.css';

  // State
  let loading = true;
  let saving = false;
  let organization = {
    id: '',
    name: 'Organization',
    slug: '',
    settings: {
      logo_url: '',
      accent_color: '#00c853',
      ad_image_url: '',
      ad_link: '',
      billing_email: ''
    }
  };
  
  // Track if slug has been manually edited
  let isSlugManuallyEdited = false;

  // File upload states
  let logoUrl = '';
  let adImageUrl = '';

  // Initialize organization data
  async function loadOrganization() {
    try {
      console.log('🔍 [settings] Starting to load organization...');
      loading = true;
      
      // Get the current session
      console.log('🔑 [settings] Getting session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ [settings] Error getting session:', sessionError);
        throw new Error('Failed to get session');
      }
      
      if (!session?.access_token) {
        console.log('ℹ️ [settings] No active session found');
        throw new Error('No active session');
      }
      
      console.log('🔑 [settings] Session found, verifying user...');
      
      // Verify the session by getting the user
      const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
      
      if (userError || !user) {
        console.error('❌ [settings] Session verification failed:', userError);
        await supabase.auth.signOut();
        throw new Error('Session verification failed');
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
          hasSettings: !!orgData.settings_json
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
  }

  function handleAdUpload(event: CustomEvent) {
    adImageUrl = event.detail.url;
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
          <label>Organization Logo</label>
          <FileUpload 
            initialUrl={organization.settings.logo_url}
            label="Upload Logo" 
            folder="organization-logos"
            on:upload={(e) => {
              logoUrl = e.detail.url;
              organization.settings.logo_url = e.detail.url;
              console.log('Logo URL updated:', e.detail.url);
            }}
          />
          {#if organization.settings.logo_url}
            <div class="current-file">
              <span>Current: </span>
              <a href={organization.settings.logo_url} target="_blank" rel="noopener noreferrer">
                View Current Logo
              </a>
            </div>
          {/if}
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
          <label>Ad Image</label>
          <FileUpload 
            label="Upload Ad Image" 
            folder="ads"
            on:upload={handleAdUpload}
            initialUrl={organization.settings.ad_image_url}
          />
          {#if organization.settings.ad_image_url && !adImageUrl}
            <div class="current-file">
              <span>Current: </span>
              <a href={organization.settings.ad_image_url} target="_blank" rel="noopener noreferrer">
                View Current Ad Image
              </a>
            </div>
          {/if}
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
      
      <!-- Billing Information -->
      <div class="settings-section">
        <h2>Billing</h2>
        
        <div class="form-group">
          <label for="billing-email">Billing Email</label>
          <input
            type="email"
            id="billing-email"
            bind:value={organization.settings.billing_email}
            placeholder="billing@example.com"
          />
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
  .input-with-prefix {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
  }
  
  .input-with-prefix .prefix {
    padding: 0.5rem 0.75rem;
    background: #f8fafc;
    color: #64748b;
    font-size: 0.9em;
    border-right: 1px solid #e2e8f0;
    white-space: nowrap;
  }
  
  .input-with-prefix input {
    flex: 1;
    border: none;
    padding: 0.5rem 0.75rem;
    font-size: 1em;
    outline: none;
    min-width: 0; /* Allow input to shrink below content size */
  }
  
  .hint {
    display: block;
    margin-top: 0.25rem;
    color: #64748b;
    font-size: 0.85em;
  }
  
  :global(body) {
    background: var(--light-gradient);
    min-height: 100vh;
    margin: 0;
  }

  .settings-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
  }

  .settings-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  h1 {
    font-size: 2.25rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 2.5rem 0;
    text-align: center;
    letter-spacing: -0.5px;
  }
  
  .settings-section {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
    border: 1px solid rgba(0, 0, 0, 0.04);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .settings-section:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
  
  .form-group {
    margin-bottom: 1.75rem;
  }
  
  .form-group:last-child {
    margin-bottom: 0;
  }
  
  .form-group:last-child {
    margin-bottom: 0;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.75rem;
    font-weight: 600;
    color: #374151;
    font-size: 0.95rem;
    letter-spacing: -0.25px;
  }
  
  input[type="text"],
  input[type="email"],
  input[type="color"] {
    width: 100%;
    padding: 0.875rem 1.125rem;
    border: 1.5px solid #e5e7eb;
    border-radius: 10px;
    font-size: 1rem;
    background: #f9fafb;
    color: #1f2937;
    transition: all 0.25s ease;
    font-family: inherit;
  }
  
  input[type="text"]:focus,
  input[type="email"]:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
    background: white;
  }
  
  .current-file {
    margin-top: 0.75rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  
  .current-file a {
    color: var(--accent-color);
    text-decoration: none;
    font-weight: 500;
  }
  
  .current-file a:hover {
    text-decoration: underline;
  }
  
  .color-picker {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .color-picker input[type="color"] {
    width: 60px;
    height: 40px;
    padding: 0;
    border: 2px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
  }
  
  .form-actions {
    margin-top: 2rem;
    display: flex;
    justify-content: flex-end;
  }
  
  .danger-zone {
    margin-top: 4rem;
    padding-top: 2rem;
    border-top: 1px solid #f0f0f0;
  }
  
  .danger-zone h3 {
    color: #dc2626;
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }
  
  .button.danger {
    background-color: #dc2626;
    color: white;
    border: 1px solid #dc2626;
  }
  
  .button.danger:hover {
    background-color: #b91c1c;
    border-color: #b91c1c;
  }
  
  .button {
    padding: 0.875rem 2.25rem;
    background: var(--accent-color, #4f46e5);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    width: auto;
    letter-spacing: 0.25px;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0);
    transition: background 0.3s ease;
    border-radius: 8px;
  }
  
  .button:hover {
    background: var(--accent-hover, #4338ca);
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  
  .button:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }
  
  .button:focus-visible {
    outline: 2px solid var(--accent-color, #4f46e5);
    outline-offset: 2px;
  }
  
  .button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    opacity: 0.7;
  }
  
  .button.primary {
    background: var(--accent-color, #4f46e5);
    color: white;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  
  .button.primary:hover {
    background: var(--accent-hover, #4338ca);
  }
  
  .loading {
    text-align: center;
    padding: 3rem 0;
    color: var(--text-secondary);
    font-size: 1.1rem;
  }
  
  h2 {
    margin-top: 0;
    margin-bottom: 1.75rem;
    color: #111827;
    font-size: 1.375rem;
    font-weight: 700;
    padding-bottom: 1rem;
    border-bottom: 1px solid #f3f4f6;
    letter-spacing: -0.5px;
  }
</style>
