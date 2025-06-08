import { writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import { organizationSchema, type Organization } from '$lib/validation';
import { z } from 'zod';

// Helper function to convert Date objects to ISO strings for Supabase
function prepareForSupabase<T extends Record<string, any>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (value instanceof Date) {
        return [key, value.toISOString()];
      }
      return [key, value];
    })
  ) as T;
}

function createOrgSource() {
  const { subscribe, set } = writable<Organization | null>(null);
  const loading = writable<boolean>(false);
  const error = writable<string | null>(null);

  async function fetchOrg(orgId: string) {
    loading.set(true);
    error.set(null);
    const { data, error: err } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    if (err) {
      error.set(err.message);
      set(null);
      loading.set(false);
      return;
    }
    const parsed = organizationSchema.safeParse(data);
    if (!parsed.success) {
      error.set('Validation failed for organization row');
      set(null);
      loading.set(false);
      return;
    }
    set(parsed.data);
    loading.set(false);
  }

  async function updateOrg(orgId: string, updates: Partial<Organization>) {
    loading.set(true);
    error.set(null);
    const updateData = prepareForSupabase(updates);
    const { data, error: err } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', orgId)
      .select()
      .single();
    if (err) {
      error.set(err.message);
      loading.set(false);
      return;
    }
    const parsed = organizationSchema.safeParse(data);
    if (!parsed.success) {
      error.set('Validation failed after update');
      loading.set(false);
      return;
    }
    set(parsed.data);
    loading.set(false);
  }

  return {
    subscribe,
    fetchOrg,
    updateOrg,
    loading,
    error
  };
}

export const orgSource = createOrgSource();
