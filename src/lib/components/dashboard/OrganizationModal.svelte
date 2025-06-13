<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { showToast } from '$lib/stores/toastStore';
  import { Edit3, LogOut, User, Settings, CreditCard } from 'lucide-svelte';
  import type { Organization } from '$lib/validations';

  export let organization: Organization;
  export let show = false;

  const dispatch = createEventDispatcher();

  let editingName = false;
  let editingSlug = false;
  let tempName = organization.name;
  let tempSlug = organization.slug;
  let saving = false;

  // Status mapping based on Stripe webhook statuses
  function getStatusInfo(status: string) {
    switch (status) {
      case 'active':
        return { text: 'Active', color: '#10b981', action: 'Manage' };
      case 'trialing':
        return { text: 'Trial', color: '#3b82f6', action: 'Upgrade' };
      case 'past_due':
        return { text: 'Past Due', color: '#ef4444', action: 'Manage' };
      case 'canceled':
        return { text: 'Canceled', color: '#6b7280', action: 'Subscribe' };
      default:
        return { text: 'Inactive', color: '#6b7280', action: 'Subscribe' };
    }
  }

  $: statusInfo = getStatusInfo(organization.subscription_status || 'inactive');

  function handleOutsideClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  function close() {
    show = false;
    editingName = false;
    editingSlug = false;
    tempName = organization.name;
    tempSlug = organization.slug;
  }

  function startEditingName() {
    editingName = true;
    tempName = organization.name;
  }

  function startEditingSlug() {
    editingSlug = true;
    tempSlug = organization.slug;
  }

  async function saveName() {
    if (!tempName.trim()) {
      showToast('Organization name cannot be empty', 'error');
      return;
    }

    saving = true;
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: tempName.trim() })
        .eq('id', organization.id);

      if (error) throw error;
      
      organization.name = tempName.trim();
      editingName = false;
      showToast('Organization name updated', 'success');
    } catch (err) {
      console.error('Error updating name:', err);
      showToast('Failed to update name', 'error');
    } finally {
      saving = false;
    }
  }

  async function saveSlug() {
    if (!tempSlug.trim()) {
      showToast('Organization slug cannot be empty', 'error');
      return;
    }

    // Basic slug validation
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(tempSlug.trim())) {
      showToast('Slug can only contain lowercase letters, numbers, and hyphens', 'error');
      return;
    }

    saving = true;
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ slug: tempSlug.trim() })
        .eq('id', organization.id);

      if (error) throw error;
      
      organization.slug = tempSlug.trim();
      editingSlug = false;
      showToast('Organization slug updated', 'success');
    } catch (err) {
      console.error('Error updating slug:', err);
      showToast('Failed to update slug', 'error');
    } finally {
      saving = false;
    }
  }

  function cancelEdit(field: string) {
    if (field === 'name') {
      editingName = false;
      tempName = organization.name;
    } else if (field === 'slug') {
      editingSlug = false;
      tempSlug = organization.slug;
    }
  }

  async function handleBilling() {
    try {
      showToast('Opening billing portal...', 'info');
      
      const response = await fetch('/api/billing-portal', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to open billing portal');
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      showToast('Failed to open billing portal', 'error');
    }
  }

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      dispatch('logout');
    } catch (error) {
      console.error('Error signing out:', error);
      showToast('Failed to sign out. Please try again.', 'error');
    }
  }

  function handleKeydown(event: KeyboardEvent, field: string) {
    if (event.key === 'Enter') {
      if (field === 'name') saveName();
      else if (field === 'slug') saveSlug();
    } else if (event.key === 'Escape') {
      cancelEdit(field);
    }
  }
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={handleOutsideClick}>
    <div class="org-modal">
      <!-- Billing Status Section -->
      <div class="modal-section">
        <div class="billing-status">
          <div class="status-label">Billing Status</div>
          <button class="billing-button" on:click={handleBilling}>
            <div class="status-pill" style="background-color: {statusInfo.color}20; color: {statusInfo.color}; border: 1px solid {statusInfo.color}40;">
              {statusInfo.text}
            </div>
            <div class="billing-action">
              <CreditCard size="16" />
              <span>{statusInfo.action}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Organization Details Section -->
      <div class="modal-section">
        <!-- Organization Name -->
        <div class="org-field">
          <label class="field-label">Organization Name</label>
          {#if editingName}
            <div class="edit-field">
              <input
                type="text"
                bind:value={tempName}
                class="field-input"
                on:keydown={(e) => handleKeydown(e, 'name')}
                disabled={saving}
                autoFocus
              />
              <div class="edit-actions">
                <button class="save-btn" on:click={saveName} disabled={saving}>
                  {saving ? '...' : '✓'}
                </button>
                <button class="cancel-btn" on:click={() => cancelEdit('name')}>✕</button>
              </div>
            </div>
          {:else}
            <div class="field-display">
              <span class="field-value">{organization.name}</span>
              <button class="edit-icon" on:click={startEditingName}>
                <Edit3 size="16" />
              </button>
            </div>
          {/if}
        </div>

        <!-- Organization Slug -->
        <div class="org-field">
          <label class="field-label">Organization Slug</label>
          {#if editingSlug}
            <div class="edit-field">
              <input
                type="text"
                bind:value={tempSlug}
                class="field-input"
                on:keydown={(e) => handleKeydown(e, 'slug')}
                disabled={saving}
                autoFocus
              />
              <div class="edit-actions">
                <button class="save-btn" on:click={saveSlug} disabled={saving}>
                  {saving ? '...' : '✓'}
                </button>
                <button class="cancel-btn" on:click={() => cancelEdit('slug')}>✕</button>
              </div>
            </div>
          {:else}
            <div class="field-display">
              <span class="field-value">{organization.slug}</span>
              <button class="edit-icon" on:click={startEditingSlug}>
                <Edit3 size="16" />
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Actions Section -->
      <div class="modal-section">
        <button class="logout-button" on:click={handleLogout}>
          <LogOut size="16" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 80px 2rem 2rem 2rem; /* Top padding accounts for header */
  }

  .org-modal {
    background: #1a1b2e;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 380px;
    color: white;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-section {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-section:last-child {
    border-bottom: none;
  }

  /* Billing Status */
  .billing-status {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .status-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.7);
  }

  .billing-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .billing-button:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .status-pill {
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
  }

  .billing-action {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
  }

  /* Organization Fields */
  .org-field {
    margin-bottom: 1.25rem;
  }

  .org-field:last-child {
    margin-bottom: 0;
  }

  .field-label {
    display: block;
    font-size: 0.9rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 0.5rem;
  }

  .field-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .field-display:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .field-value {
    font-size: 1rem;
    font-weight: 500;
    color: white;
  }

  .edit-icon {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .edit-icon:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  .edit-field {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .field-input {
    flex: 1;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
    font-size: 1rem;
    outline: none;
    transition: all 0.2s ease;
  }

  .field-input:focus {
    border-color: #4CAF50;
    background: rgba(255, 255, 255, 0.15);
  }

  .edit-actions {
    display: flex;
    gap: 0.25rem;
  }

  .save-btn, .cancel-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .save-btn {
    background: #4CAF50;
    color: white;
  }

  .save-btn:hover:not(:disabled) {
    background: #45a049;
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cancel-btn {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Logout Button */
  .logout-button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .logout-button:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 80px 1rem 1rem 1rem;
    }

    .org-modal {
      max-width: none;
    }
  }
</style>