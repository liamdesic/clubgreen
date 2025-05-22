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
    const redirectTo = url.searchParams.get('redirectTo') || `${url.origin}/dashboard`;
    console.log('Server: Redirect URL:', redirectTo);
    
    // Initialize Supabase on the server
    const supabase = createSupabaseServer();
    
    // Send the magic link
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo
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
