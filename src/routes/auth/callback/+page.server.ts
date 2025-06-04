import { redirect, type Actions, type ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ url, locals, cookies, request }) => {
  const logPrefix = '[AUTH:CALLBACK]';
  const code = url.searchParams.get('code');
  const type = url.searchParams.get('type');
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    console.log(`🔍 ${logPrefix} Auth callback with code: ${code ? '✓' : '✗'} type: ${type || 'none'}`);
  }

  // Check if already authenticated to avoid retrying code exchange
  const { session, user } = await locals.getSession();
  
  if (session && user) {
    if (isDev) {
      console.log(`✅ ${logPrefix} User already authenticated: ${user.email}`);
    }
    return redirect(303, '/dashboard');
  }

  // Only proceed with code exchange if we have a code
  if (code) {
    try {
      // Exchange code for session
      const exchangeResult = await locals.supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeResult.error) {
        if (isDev) {
          console.error(`❌ ${logPrefix} Code exchange failed: ${exchangeResult.error.message}`);
        }
        return redirect(303, '/login?error=' + encodeURIComponent(exchangeResult.error.message));
      }
      
      // Refresh session after code exchange
      const { session: newSession, user: newUser } = await locals.getSession();
      
      if (!newSession || !newUser) {
        if (isDev) {
          console.error(`❌ ${logPrefix} Failed to get session after code exchange`);
        }
        return redirect(303, '/login?error=session_failed');
      }

      // Determine redirect path based on the type parameter
      const redirectTo = type === 'signup' || type === 'signup_confirm'
        ? '/onboarding'
        : '/dashboard';
      
      if (isDev) {
        console.log(`✅ ${logPrefix} Auth success: ${newUser.email} → ${redirectTo}`);
      }
      return redirect(303, redirectTo);
    } catch (error) {
      // Check if this is a redirect response
      if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
        // This is a redirect object, just return it
        return error;
      }
      
      // Only non-redirect errors should reach this point
      if (isDev) {
        console.error(`❌ ${logPrefix} Auth error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      return redirect(303, '/login?error=' + encodeURIComponent(
        error instanceof Error ? error.message : 'Authentication failed. Please try again.'
      ));
    }
  } else {
    // No code provided
    if (isDev) {
      console.error(`❌ ${logPrefix} No code provided in URL`);
    }
    return redirect(303, '/login?error=missing_code');
  }
};

// For form submissions - not currently used but keeping interface consistent
export const actions: Actions = {
  default: async ({ request, locals }) => {
    // Handle any form submissions if needed in the future
    return { success: true };
  }
};
