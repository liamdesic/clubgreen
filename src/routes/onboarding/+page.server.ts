import { redirect } from '@sveltejs/kit';
import { getSecureSession } from '$lib/supabaseClient';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  console.log('🔍 [onboarding] Starting onboarding load...');
  
  const { session, user } = await getSecureSession();
  
  if (!session || !user) {
    console.error('❌ [onboarding] Session error or no session');
    // Add redirect URL to bring the user back to onboarding after login
    const errorMessage = 'Please log in to access the onboarding page';
    throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}&error=${encodeURIComponent(errorMessage)}`);
  }
  
  console.log('🔑 [onboarding] User authenticated and verified:', { 
    userId: user.id, 
    email: user.email 
  });
  
  // Update the session with the verified user
  locals.user = user;
  locals.session = session;

  // Check if user already has an organization
  console.log('🔍 [onboarding] Checking if user already has organizations');
  const { data: organizations, error: orgError } = await locals.supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('owner_id', user.id);

  if (orgError) {
    console.error('❌ [onboarding] Error checking organizations:', orgError);
  } else if (organizations && organizations.length > 0) {
    console.log('ℹ️ [onboarding] User already has organizations, redirecting to dashboard');
    throw redirect(303, '/dashboard');
  }

  return {
    session,
    user
  };
};
