import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabaseClient';
import { organizationSchema } from '$lib/validations';
import { toISOString } from '$lib/utils/generalUtils';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const user = await locals.getUser();
  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Get the organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', params.id)
    .single();

  if (orgError) {
    console.error('Error fetching organization:', orgError);
    throw error(404, 'Organization not found');
  }

  // Check if user owns the organization
  if (org.owner_id !== user.id) {
    throw error(403, 'Forbidden');
  }

  // Get the update data
  const updates = await request.json();

  // Format datetime fields to ISO strings
  const formattedOrg = {
    ...org,
    ...updates,
    created_at: org.created_at ? toISOString(org.created_at) : null,
    updated_at: org.updated_at ? toISOString(org.updated_at) : null,
    trial_ends_at: org.trial_ends_at ? toISOString(org.trial_ends_at) : null
  };

  // Validate the update data
  const result = organizationSchema.safeParse(formattedOrg);
  if (!result.success) {
    console.error('Invalid organization data:', result.error);
    throw error(400, 'Invalid organization data');
  }

  // Update the organization
  const { data: updatedOrg, error: updateError } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating organization:', updateError);
    throw error(500, 'Failed to update organization');
  }

  // Format the response data
  const formattedResponse = {
    ...updatedOrg,
    created_at: updatedOrg.created_at ? toISOString(updatedOrg.created_at) : null,
    updated_at: updatedOrg.updated_at ? toISOString(updatedOrg.updated_at) : null,
    trial_ends_at: updatedOrg.trial_ends_at ? toISOString(updatedOrg.trial_ends_at) : null
  };

  return json(formattedResponse);
}; 