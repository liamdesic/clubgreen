import { redirect, type Actions, type ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ url, locals }) => {
  const code = url.searchParams.get('code');
  const type = url.searchParams.get('type');

  // Check if already authenticated to avoid retrying code exchange
  const { session, user } = await locals.getSession();
  if (session && user) {
    console.log('✅ [auth/callback] User already authenticated, skipping code exchange');
    throw redirect(303, '/dashboard');
  }

  // Only proceed with code exchange if we have a code
  if (code) {
    try {
      // Exchange code for session
      const { error: exchangeError } = await locals.supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error('❌ [auth/callback] Code exchange failed:', exchangeError.message);
        throw redirect(303, '/login?error=' + encodeURIComponent(exchangeError.message));
      }
      
      // Refresh session after code exchange
      const { session: newSession, user: newUser } = await locals.getSession();
      if (!newSession || !newUser) {
        console.error('❌ [auth/callback] Failed to get session after code exchange');
        throw redirect(303, '/login?error=session_failed');
      }

      // Determine redirect path based on the type parameter
      const redirectTo = type === 'signup' || type === 'signup_confirm'
        ? '/onboarding'
        : '/dashboard';
      
      console.log('✅ [auth/callback] Authentication successful for user:', newUser.email);
      throw redirect(303, redirectTo);
    } catch (error) {
      if (error instanceof Response) {
        // This is a redirect response, just pass it through
        throw error;
      }
      
      console.error('❌ [auth/callback] Auth callback error:', error);
      throw redirect(303, '/login?error=' + encodeURIComponent(
        error instanceof Error ? error.message : 'Authentication failed. Please try again.'
      ));
    }
  } else {
    // No code provided
    console.error('❌ [auth/callback] No code provided in URL');
    throw redirect(303, '/login?error=missing_code');
  }
};

// For form submissions - not currently used but keeping interface consistent
export const actions: Actions = {
  default: async ({ request, locals }) => {
    // Handle any form submissions if needed in the future
    return { success: true };
  }
};
