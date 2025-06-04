import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  console.log('🔍 [customize] Starting customize page load...');
  
  // User and organization are already verified by +layout.server.ts
  // We can access the user directly from locals
  // We can safely use non-null assertion (!) because layout.server.ts guarantees user exists
  const user = locals.user!;
  
  console.log('🔑 [customize] User from layout:', { 
    userId: user.id, 
    email: user.email 
  });

  // Get user's organization details
  console.log('🔍 [customize] Fetching organization details for user:', user.id);
  const { data: organization, error: orgError } = await locals.supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (orgError) {
    console.error('❌ [customize] Error fetching organization details:', orgError);
    return { error: 'Failed to load organization details' };
  }

  if (!organization) {
    console.log('ℹ️ [customize] No organization details found');
    return { error: 'Organization not found' };
  }

  console.log('✅ [customize] Organization loaded:', {
    id: organization.id,
    name: organization.name,
    hasSettings: !!organization.settings_json
  });

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      settings_json: organization.settings_json || {}
    }
  };
}; 