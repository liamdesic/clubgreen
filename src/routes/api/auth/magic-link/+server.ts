import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

// Create a Supabase client on the server side
const createSupabaseServer = () => {
  // Access environment variables using SvelteKit's env module
  // We need to dynamically import these since they're only available at runtime
  let supabaseUrl = '';
  let supabaseAnonKey = '';
  
  try {
    // Try to access the environment variables from various places
    supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 
                 import.meta.env.VITE_SUPABASE_URL || 
                 process.env.PUBLIC_SUPABASE_URL || 
                 '';
                 
    supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 
                     import.meta.env.VITE_SUPABASE_ANON_KEY || 
                     process.env.PUBLIC_SUPABASE_ANON_KEY || 
                     '';
  } catch (e) {
    console.error('Server: Error accessing environment variables:', e);
  }
  
  console.log('Server: Supabase URL available:', !!supabaseUrl);
  console.log('Server: Supabase Anon Key available:', !!supabaseAnonKey);
  console.log('Server: Environment variable sources checked:', 
    'import.meta.env.PUBLIC_*, import.meta.env.VITE_*, process.env.PUBLIC_*');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Server: Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    // Parse the request body
    const { email } = await request.json();
    
    if (!email) {
      return json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    console.log('Server: Processing magic link request for:', email);
    
    // Get the redirect URL from the client
    // Get the final destination URL from the client, if provided
    const clientRedirectTo = url.searchParams.get('redirectTo');

    // Detect if running locally or in production
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const redirectBase = isLocal
      ? 'http://localhost:5173'
      : 'https://score.clubgreen.au';
    
    // The magic link itself should redirect back to the /login page for token processing.
    // We append the original clientRedirectTo to the /login URL's query string, so /login knows where to go after processing.
    let emailVerificationRedirect = `${redirectBase}/login`;
    if (clientRedirectTo) {
      emailVerificationRedirect += `?redirectTo=${encodeURIComponent(clientRedirectTo)}`;
    }
    
    console.log('Server: Email Verification Redirect URL (for magic link):', emailVerificationRedirect);
    if (clientRedirectTo) {
      console.log('Server: Final destination after login:', clientRedirectTo);
    }
    
    // Initialize Supabase on the server
    const supabase = createSupabaseServer();
    
    // Send the magic link
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: emailVerificationRedirect // Magic link sends user to /login with tokens
      }
    });
    
    if (error) {
      console.error('Server: Magic link error:', error);
      return json({ success: false, error: error.message }, { status: 500 });
    }
    
    console.log('Server: Magic link generated successfully');
    return json({ success: true, data });
    
  } catch (err) {
    console.error('Server: Exception in magic link generation:', err);
    return json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
};
