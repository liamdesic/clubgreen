import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  console.log('🔍 [customize] Starting customize page load...');
  
  // 1. Get the current session and verify the user
  const { data: { session }, error: sessionError } = await locals.supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('❌ [customize] Session error or no session:', sessionError?.message);
    const errorMessage = 'Please log in to access customization';
    throw redirect(303, `/login?redirectTo=${encodeURIComponent('/dashboard/customize')}&error=${encodeURIComponent(errorMessage)}`);
  }
  
  // Verify the user with a fresh call to getUser
  const { data: { user }, error: userError } = await locals.supabase.auth.getUser(session.access_token);
  
  if (userError || !user) {
    console.error('❌ [customize] User verification failed:', userError?.message);
    const errorMessage = 'Your session has expired. Please log in again.';
    throw redirect(303, `/login?redirectTo=${encodeURIComponent('/dashboard/customize')}&error=${encodeURIComponent(errorMessage)}`);
  }
  
  console.log('🔑 [customize] User authenticated and verified:', { 
    userId: user.id, 
    email: user.email 
  });
  
  // Update the session with the verified user
  locals.user = user;
  locals.session = session;

  // Get user's organization
  console.log('🔍 [customize] Fetching organization for user:', user.id);
  const { data: organization, error: orgError } = await locals.supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (orgError) {
    console.error('❌ [customize] Error fetching organization:', orgError);
    throw redirect(303, '/onboarding');
  }

  if (!organization) {
    console.log('ℹ️ [customize] No organization found, redirecting to onboarding');
    throw redirect(303, '/onboarding');
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