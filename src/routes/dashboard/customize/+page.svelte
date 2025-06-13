<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { showToast } from '$lib/stores/toastStore';
  import DashboardHeader from '$lib/components/dashboard/DashboardPageHeader.svelte';
  import FileUpload from '$lib/components/FileUpload.svelte';
  import ColorPalette from '$lib/components/dashboard/ColorPalette.svelte';
  import '$lib/styles/dashboard.css';

  // State
  let loading = true;
  let saving = false;
  let organization = {
    id: '',
    name: 'Organization',
    logo_url: '',
    ads_image_url: '',
    color_palette: ['#00c853']
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
          logo_url: orgData.logo_url,
          color_palette: orgData.color_palette || ['#00c853']
        });
        
        organization = {
          ...orgData,
          color_palette: orgData.color_palette || ['#00c853']
        };
        logoUrl = organization.logo_url || '';
        adImageUrl = organization.ads_image_url || '';
        
        console.log('✅ [customize] Organization loaded with palette:', organization.color_palette);
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
    organization.logo_url = logoUrl;
    unsavedChanges = true;
  }

  function handleAdUpload(event: CustomEvent) {
    adImageUrl = event.detail.url;
    organization.ads_image_url = adImageUrl;
    unsavedChanges = true;
  }

  function handleColorPaletteUpdate(event: CustomEvent<{ colors: string[] }>) {
    console.log('🎨 [customize] Color palette updated:', event.detail.colors);
    organization.color_palette = event.detail.colors;
    unsavedChanges = true;
  }


  // Save customization settings
  async function saveSettings() {
    try {
      console.log('💾 [customize] Saving settings with palette:', organization.color_palette);
      saving = true;
      
      const updateData = {
        logo_url: logoUrl || organization.logo_url,
        ads_image_url: adImageUrl || organization.ads_image_url,
        color_palette: organization.color_palette
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

<div class="dashboard-wrapper">
  <div class="dashboard-main">
    <!-- Header with breadcrumbs -->
    <DashboardHeader 
      organizationName={organization.name}
      eventTitle="Customize"
    />

    <!-- Main Content -->
    <main class="dashboard-content">
      {#if loading}
        <div class="loading">Loading customization options...</div>
      {:else}
        <form class="customize-form">
          <section class="live-section">
            <h3>Branding</h3>
            
            <div class="form-group">
              <label for="org-logo">Organization Logo</label>
              <FileUpload 
                id="org-logo"
                initialUrl={organization.logo_url}
                label="Upload Logo" 
                folder="organization-logos"
                on:upload={handleLogoUpload}
                theme="dark"
              />
            </div>
          </section>
          
          <section class="live-section">
            <h3>Color Palette</h3>
            
            <div class="form-group">
              <ColorPalette 
                colors={organization.color_palette}
                on:update={handleColorPaletteUpdate}
              />
            </div>
          </section>

          <section class="live-section">
            <h3>Advertisement</h3>
            
            <div class="form-group">
              <label for="ad-image">Ad Image</label>
              <FileUpload 
                id="ad-image"
                label="Upload Ad Image" 
                folder="ads"
                on:upload={handleAdUpload}
                initialUrl={organization.ads_image_url}
                theme="dark"
              />
            </div>
            
            <div class="form-group">
              <label for="ad-link">Ad Link URL</label>
              <input
                type="text"
                id="ad-link"
                bind:value={organization.ad_link}
                placeholder="https://example.com"
              />
            </div>
          </section>
          
          <div class="form-actions">
            <button 
              type="button"
              class="save-button"
              class:has-unsaved-changes={unsavedChanges}
              on:click={saveSettings} 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Customization'}
            </button>
            <button 
              type="button"
              class="cancel-button" 
              on:click={cancelChanges} 
              disabled={!unsavedChanges}
            >
              Cancel
            </button>
          </div>
        </form>
      {/if}
    </main>
  </div>
</div>

<style>
  .dashboard-wrapper {
    min-height: 100vh;
    background: #0f0f1a;
    color: white;
  }

  .dashboard-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    padding-top: 100px; /* Account for fixed header */
  }

  .dashboard-content {
    margin-top: 2rem;
  }

  .loading {
    text-align: center;
    padding: 2rem;
  }

  .save-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--card-bg);
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .save-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .save-button.has-unsaved-changes {
    background: var(--accent-color, #4CAF50);
    color: white;
    border-color: var(--accent-color, #4CAF50);
  }

  .save-button.has-unsaved-changes:hover {
    background: var(--accent-color-hover, #45a049);
  }

  .cancel-button {
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.3);
    margin-left: 1rem;
  }

  .cancel-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cancel-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
</style> 