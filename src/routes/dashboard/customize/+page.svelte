<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { showToast } from '$lib/toastStore';
  import DashboardHeader from '$lib/DashboardHeader.svelte';
  import FileUpload from '$lib/FileUpload.svelte';
  import ColorPalette from '$lib/components/ColorPalette.svelte';
  import '$lib/styles/theme.css';
  import '$lib/styles/base.css';
  import '$lib/styles/DashboardSettings.css';

  // State
  let loading = true;
  let saving = false;
  let organization = {
    id: '',
    name: 'Organization',
    settings: {
      logo_url: '',
      accent_color: '#00c853',
      ad_image_url: '',
      ad_link: '',
      color_palette: ['#00c853']
    }
  };

  // File upload states
  let logoUrl = '';
  let adImageUrl = '';
  let unsavedChanges = false;

  // Initialize organization data
  async function loadOrganization() {
    try {
      console.log('🔍 [customize] Starting to load organization...');
      loading = true;
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ [customize] No valid session found');
        const errorMessage = 'Please log in to access customization';
        window.location.href = `/login?redirectTo=${encodeURIComponent('/dashboard/customize')}&error=${encodeURIComponent(errorMessage)}`;
        return;
      }
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [customize] No valid user found');
        const errorMessage = 'Your session has expired. Please log in again.';
        await supabase.auth.signOut();
        window.location.href = `/login?redirectTo=${encodeURIComponent('/dashboard/customize')}&error=${encodeURIComponent(errorMessage)}`;
        return;
      }

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
        console.log('📦 [customize] Loading organization data:', {
          id: orgData.id,
          name: orgData.name,
          hasSettings: !!orgData.settings_json,
          colorPalette: orgData.settings_json?.color_palette || ['#00c853']
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
        
        // Ensure color_palette exists
        if (!organization.settings.color_palette) {
          console.log('🎨 [customize] Initializing default color palette');
          organization.settings.color_palette = ['#00c853'];
        }
        
        console.log('✅ [customize] Organization loaded with palette:', organization.settings.color_palette);
      }

    } catch (err) {
      console.error('❌ [customize] Error loading organization:', err);
      showToast('Failed to load organization data', 'error');
    } finally {
      loading = false;
    }
  }

  // Handle file upload completion
  function handleLogoUpload(event: CustomEvent) {
    logoUrl = event.detail.url;
    organization.settings.logo_url = logoUrl;
    unsavedChanges = true;
  }

  function handleAdUpload(event: CustomEvent) {
    adImageUrl = event.detail.url;
    organization.settings.ad_image_url = adImageUrl;
    unsavedChanges = true;
  }

  function handleColorPaletteUpdate(event: CustomEvent<{ colors: string[] }>) {
    console.log('🎨 [customize] Color palette updated:', event.detail.colors);
    organization.settings.color_palette = event.detail.colors;
    unsavedChanges = true;
  }

  // Save customization settings
  async function saveSettings() {
    try {
      console.log('💾 [customize] Saving settings with palette:', organization.settings.color_palette);
      saving = true;
      
      const updateData = {
        settings_json: {
          ...organization.settings,
          logo_url: logoUrl || organization.settings.logo_url,
          ad_image_url: adImageUrl || organization.settings.ad_image_url,
          color_palette: organization.settings.color_palette
        }
      };
      
      const { error: updateError } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organization.id);
      
      if (updateError) throw updateError;
      
      console.log('✅ [customize] Settings saved successfully');
      showToast('Customization saved successfully!', 'success');
      unsavedChanges = false;
    } catch (err) {
      console.error('❌ [customize] Error saving settings:', err);
      showToast('Failed to save customization', 'error');
    } finally {
      saving = false;
    }
  }

  function cancelChanges() {
    console.log('↩️ [customize] Canceling changes, reloading organization data');
    loadOrganization();
    unsavedChanges = false;
  }

  // Initialize on mount
  onMount(() => {
    loadOrganization();
  });
</script>

<DashboardHeader 
  organizationName={organization.name}
  eventTitle="Customize"
/>

<div class="settings-container">
  {#if loading}
    <div class="loading">Loading customization options...</div>
  {:else}
    <div class="settings-form">
      <h1>Customize Appearance</h1>
      
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
            on:upload={handleLogoUpload}
            theme="dark"
          />
        </div>
      </div>
      
      <!-- Color Palette Section -->
      <div class="settings-section">
        <h2>Color Palette</h2>
        
        <div class="form-group">
          <ColorPalette 
            colors={organization.settings.color_palette}
            on:update={handleColorPaletteUpdate}
          />
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
            theme="dark"
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
      
      <div class="form-actions">
        <button 
          class="button primary" 
          on:click|preventDefault={saveSettings} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Customization'}
        </button>
        <button 
          class="button secondary" 
          on:click|preventDefault={cancelChanges} 
          disabled={!unsavedChanges}
        >
          Cancel
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

  .button.secondary {
    background: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }

  .button.secondary:hover {
    background: #e5e5e5;
  }
</style> 