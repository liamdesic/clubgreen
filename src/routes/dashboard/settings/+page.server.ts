import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  console.log('🔍 [settings] Starting settings page load...');
  
  // 1. Get the current session and verify the user
  const { data: { session }, error: sessionError } = await locals.supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('❌ [settings] Session error or no session:', sessionError?.message);
    const errorMessage = 'Please log in to access settings';
    throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}&error=${encodeURIComponent(errorMessage)}`);
  }
  
  // Verify the user with a fresh call to getUser
  const { data: { user }, error: userError } = await locals.supabase.auth.getUser(session.access_token);
  
  if (userError || !user) {
    console.error('❌ [settings] User verification failed:', userError?.message);
    const errorMessage = 'Your session has expired. Please log in again.';
    throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}&error=${encodeURIComponent(errorMessage)}`);
  }
  
  console.log('🔑 [settings] User authenticated and verified:', { 
    userId: user.id, 
    email: user.email 
  });
  
  // Update the session with the verified user
  locals.user = user;
  locals.session = session;

  // Check if user has organizations
  console.log('🔍 [settings] Checking if user has organizations');
  const { data: organizations, error: orgError } = await locals.supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id);

  if (orgError) {
    console.error('❌ [settings] Error checking organizations:', orgError);
  } else if (!organizations || organizations.length === 0) {
    console.log('ℹ️ [settings] User has no organizations, redirecting to onboarding');
    throw redirect(303, '/onboarding');
  }

  // No need to return data here as the client will fetch what it needs
  return {
    user: {
      id: user.id,
      email: user.email
    }
  };
};
